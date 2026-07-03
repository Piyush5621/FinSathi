import { TokenService } from "../services/TokenService.js";
import { AuthRepository } from "../repositories/AuthRepository.js";
import { RbacRepository } from "../repositories/RbacRepository.js";
import { AuditRepository } from "../repositories/AuditRepository.js";
import { createSupabaseUserClient } from "../../../config/db.js";
import { UnauthorizedError, ForbiddenError } from "../errors/appErrors.js";
import { parseRequestInfo } from "../utils/requestParser.js";

/**
 * 1. Authenticate Token Middleware
 * Verifies the JWT token and checks the jwt_version and active status in DB
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Access Denied: No token provided.");
    }

    const decoded = TokenService.verifyAccessToken(token);

    // Verify against DB to check for token invalidation / lockout / active status
    if (decoded.user_id) {
      const user = await AuthRepository.findOwnerById(decoded.user_id);
      if (!user || !user.is_active) {
        throw new UnauthorizedError("Account suspended or inactive.");
      }
      if (user.jwt_version !== decoded.jwt_version) {
        throw new UnauthorizedError("Session has been invalidated. Please log in again.");
      }
    } else if (decoded.staff_id) {
      const staff = await AuthRepository.findStaffById(decoded.staff_id);
      if (!staff || !staff.is_login_enabled) {
        throw new UnauthorizedError("Staff account disabled or inactive.");
      }
      if (staff.jwt_version !== decoded.jwt_version) {
        throw new UnauthorizedError("Session has been invalidated. Please log in again.");
      }
    } else {
      throw new UnauthorizedError("Invalid token subject.");
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Attach Tenant Context Middleware
 * Extracts organization_id and initializes request-scoped Supabase client
 */
export const attachTenant = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    
    req.tenantId = req.user.tenant_id;
    // Instantiate a request-scoped Supabase client that sends user JWT headers
    req.db = createSupabaseUserClient(req.token);
    
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Attach Permissions Middleware
 * Resolves permissions and overrides for staff
 */
export const attachPermissions = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const { user_id, staff_id } = req.user;

    // Owner gets all access
    if (user_id && !staff_id) {
      req.isOwner = true;
      req.permissions = ["*"];
      return next();
    }

    req.isOwner = false;
    
    // Resolve active store context (read from header, default to active_store_id or first assignment)
    const storeId = req.headers["x-store-id"];
    if (!storeId) {
      // If store context not established, fallback to check overrides only or restrict
      req.permissions = [];
      return next();
    }

    // Get staff role inside active store context
    const mapping = await RbacRepository.findStaffStoreRole(storeId, staff_id);
    let rolePermissions = [];
    
    if (mapping && mapping.role_id) {
      const rolePerms = await RbacRepository.findRolePermissions(mapping.role_id);
      rolePermissions = rolePerms.map(rp => rp.permissions.key);
    }

    // Get overrides
    const overrides = await RbacRepository.findUserPermissionOverrides(staff_id);
    const overrideKeys = overrides.map(o => o.permissions.key);

    // Merge permissions
    const merged = new Set([...rolePermissions, ...overrideKeys]);
    req.permissions = Array.from(merged);

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Authorize Permission Middleware Factory
 * Checks if permission key is present in user's permission set
 */
export const authorize = (requiredPermissionKey) => {
  return (req, res, next) => {
    if (!req.user || !req.permissions) {
      return next(new UnauthorizedError());
    }

    if (req.isOwner || req.permissions.includes("*") || req.permissions.includes(requiredPermissionKey)) {
      return next();
    }

    next(new ForbiddenError(`Access Denied: Lacks '${requiredPermissionKey}' permission.`));
  };
};

/**
 * 5. Audit Logging Middleware
 * Log mutating successful requests to compliance audit logs
 */
export const audit = async (req, res, next) => {
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Intercept response to check for success before logging
  const originalJson = res.json;
  res.json = function (body) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };

  res.on("finish", async () => {
    // Only log successful operations
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    try {
      const tenantId = req.tenantId || req.user?.tenant_id;
      if (!tenantId) return;

      const actorUserId = req.user?.user_id || null;
      const actorStaffId = req.user?.staff_id || null;
      
      const requestInfo = parseRequestInfo(req);
      
      // Determine target UUID from response or request params
      let targetId = req.params.id || null;
      const resBody = res.locals.responseBody;
      if (resBody && resBody.success && resBody.data && resBody.data.id) {
        targetId = resBody.data.id;
      }

      const eventType = `${req.method.toLowerCase()}_${req.baseUrl.split("/").pop() || "action"}`;

      await AuditRepository.createLoginHistory({
        organization_id: tenantId,
        actor_user_id: actorUserId,
        actor_staff_id: actorStaffId,
        target_id: targetId,
        event_type: eventType,
        ip_address: requestInfo.ipAddress,
        user_agent: requestInfo.userAgent,
        device: requestInfo.deviceName || requestInfo.operatingSystem,
        metadata: {
          path: req.originalUrl,
          body: req.body ? { ...req.body, password: undefined, oldPassword: undefined, newPassword: undefined } : null
        }
      }).catch(err => {
        console.error("[Audit Pipeline] Failed to write audit log:", err.message);
      });
    } catch (err) {
      console.error("[Audit Pipeline] Interception error:", err.message);
    }
  });

  next();
};
