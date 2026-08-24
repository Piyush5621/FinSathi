import { registerSchema, loginSchema, tokenRefreshSchema, changePasswordSchema } from "../validators/authValidator.js";
import { OrganizationBootstrapService } from "../services/OrganizationBootstrapService.js";
import { AuthenticationService } from "../services/AuthenticationService.js";
import { parseRequestInfo } from "../utils/requestParser.js";
import { UserDto, OrganizationDto } from "../dto/authDto.js";
import { ValidationError } from "../errors/appErrors.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

function getCookie(req, name) {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export class AuthController {
  static async register(req, res, next) {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const { name, email, password, phone } = result.data;
      const orgData = {
        businessName: result.data.businessName,
        businessType: result.data.businessType,
        city: result.data.city,
        state: result.data.state,
        address: result.data.address,
        gstin: result.data.gstin,
        logoUrl: result.data.logoUrl,
        ...parseRequestInfo(req)
      };

      const { organization, owner } = await OrganizationBootstrapService.bootstrap(
        { name, email, password, phone },
        orgData
      );

      const requestInfo = parseRequestInfo(req);
      const sessionData = await AuthenticationService.login(
        email,
        password,
        requestInfo
      );

      if (res.cookie && sessionData.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, sessionData.refreshToken, REFRESH_COOKIE_OPTIONS);
      }

      res.status(201).json({
        success: true,
        message: "Organization bootstrapped and owner registered successfully.",
        data: {
          organization: new OrganizationDto(organization),
          owner: new UserDto(owner),
          accessToken: sessionData.accessToken,
          session: sessionData.session
        },
        token: sessionData.accessToken,
        user: sessionData.session
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const identifier = result.data.emailOrPhone || result.data.email || result.data.phone;
      const requestInfo = parseRequestInfo(req);
      const sessionData = await AuthenticationService.login(
        identifier,
        result.data.password,
        requestInfo
      );

      if (res.cookie && sessionData.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, sessionData.refreshToken, REFRESH_COOKIE_OPTIONS);
      }

      res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
          accessToken: sessionData.accessToken,
          session: sessionData.session
        },
        token: sessionData.accessToken,
        user: sessionData.session
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req, res, next) {
    try {
      const tokenFromCookie = getCookie(req, REFRESH_COOKIE_NAME);
      const rawToken = tokenFromCookie || req.body?.refreshToken;

      const result = tokenRefreshSchema.safeParse({ refreshToken: rawToken });
      if (!result.success) {
        throw new ValidationError("Refresh token is required.", result.error.format());
      }

      const requestInfo = parseRequestInfo(req);
      const tokens = await AuthenticationService.refresh(result.data.refreshToken, requestInfo);

      if (res.cookie && tokens.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
      }

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully.",
        data: {
          accessToken: tokens.accessToken
        },
        token: tokens.accessToken,
        accessToken: tokens.accessToken
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const requestInfo = parseRequestInfo(req);
      const actorInfo = {
        organizationId: req.user.tenant_id,
        userId: req.user.user_id,
        staffId: req.user.staff_id,
        device: requestInfo.deviceName,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      };

      await AuthenticationService.logout(req.user.session_id, actorInfo);

      if (res.clearCookie) {
        res.clearCookie(REFRESH_COOKIE_NAME, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          path: "/"
        });
      }

      res.status(200).json({
        success: true,
        message: "Logged out successfully from this device."
      });
    } catch (err) {
      next(err);
    }
  }

  static async logoutAll(req, res, next) {
    try {
      const requestInfo = parseRequestInfo(req);
      const actorInfo = {
        organizationId: req.user.tenant_id,
        userId: req.user.user_id,
        staffId: req.user.staff_id,
        device: requestInfo.deviceName,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      };

      await AuthenticationService.logoutAll(req.user.user_id, req.user.staff_id, actorInfo);

      if (res.clearCookie) {
        res.clearCookie(REFRESH_COOKIE_NAME, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          path: "/"
        });
      }

      res.status(200).json({
        success: true,
        message: "Logged out successfully from all devices."
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const result = changePasswordSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const requestInfo = parseRequestInfo(req);
      const actorInfo = {
        organizationId: req.user.tenant_id,
        userId: req.user.user_id,
        staffId: req.user.staff_id,
        device: requestInfo.deviceName,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      };

      await AuthenticationService.changePassword(
        req.user.user_id,
        req.user.staff_id,
        result.data.oldPassword,
        result.data.newPassword,
        actorInfo
      );

      res.status(200).json({
        success: true,
        message: "Password changed successfully. All other sessions invalidated."
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req, res, next) {
    try {
      let profile = null;
      if (req.user.user_id) {
        profile = await AuthRepository.findOwnerById(req.user.user_id);
        if (profile) profile = new UserDto(profile);
      } else if (req.user.staff_id) {
        profile = await AuthRepository.findStaffById(req.user.staff_id);
        if (profile) profile = new StaffDto(profile);
      }

      if (!profile) {
        throw new ValidationError("Profile not found.");
      }

      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updates = { ...req.body };
      delete updates.email;
      delete updates.id;
      delete updates.organization_id;
      delete updates.organizationId;
      delete updates.user_id;
      delete updates.staff_id;

      let updated = null;
      if (req.user.user_id) {
        updated = await AuthRepository.updateOwner(req.user.user_id, updates);
        res.status(200).json({ success: true, message: "Profile updated successfully.", data: new UserDto(updated) });
      } else if (req.user.staff_id) {
        updated = await AuthRepository.updateStaff(req.user.staff_id, updates);
        res.status(200).json({ success: true, message: "Profile updated successfully.", data: new StaffDto(updated) });
      } else {
        throw new ValidationError("Invalid profile context.");
      }
    } catch (err) {
      next(err);
    }
  }
}
