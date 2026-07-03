import { rbacAssignSchema, toggleOverrideSchema } from "../validators/authValidator.js";
import { RbacService } from "../services/RbacService.js";
import { parseRequestInfo } from "../utils/requestParser.js";
import { ValidationError } from "../errors/appErrors.js";

export class RbacController {
  static async getPermissionsMatrix(req, res, next) {
    try {
      const matrix = await RbacService.getPermissionsMatrix();
      res.status(200).json({
        success: true,
        message: "Permissions matrix retrieved successfully.",
        data: matrix
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateRolePermissions(req, res, next) {
    try {
      const { id: roleId } = req.params;
      const { permissionIds } = req.body;

      const requestInfo = parseRequestInfo(req);
      const actorInfo = {
        organizationId: req.user.tenant_id,
        userId: req.user.user_id,
        staffId: req.user.staff_id,
        device: requestInfo.deviceName,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      };

      await RbacService.updateRolePermissions(roleId, permissionIds, actorInfo);

      res.status(200).json({
        success: true,
        message: "Role permissions updated successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStaffOverrides(req, res, next) {
    try {
      const { id: staffId } = req.params;
      const overrides = await RbacService.getStaffOverrides(staffId);

      res.status(200).json({
        success: true,
        message: "Staff permission overrides retrieved successfully.",
        data: overrides
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleStaffOverride(req, res, next) {
    try {
      const { id: staffId } = req.params;
      const result = toggleOverrideSchema.safeParse(req.body);
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

      await RbacService.toggleStaffOverride(
        staffId,
        result.data.permissionId,
        result.data.grant,
        actorInfo
      );

      res.status(200).json({
        success: true,
        message: "Staff permission override updated successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async assignStaffStoreRole(req, res, next) {
    try {
      const result = rbacAssignSchema.safeParse(req.body);
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

      const assignment = await RbacService.assignStaffStoreRole(
        result.data.storeId,
        result.data.staffId,
        result.data.roleId,
        actorInfo
      );

      res.status(200).json({
        success: true,
        message: "Staff member mapped to store role successfully.",
        data: assignment
      });
    } catch (err) {
      next(err);
    }
  }
}
