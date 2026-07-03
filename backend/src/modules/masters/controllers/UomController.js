import { createUomGroupSchema, createUomSchema } from "../validators/masterValidator.js";
import { UomService } from "../services/UomService.js";
import { BaseMasterService } from "../services/BaseMasterService.js";
import { UomGroupDto, UomDto } from "../dto/masterDto.js";
import { ValidationError } from "../errors/appErrors.js";

export class UomController {
  // --- Groups ---
  static async createGroup(req, res, next) {
    try {
      const result = createUomGroupSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const group = await UomService.createGroup(req.tenantId, result.data, req.user.user_id || req.user.staff_id);
      res.status(201).json({
        success: true,
        message: "UOM Group created successfully.",
        data: new UomGroupDto(group)
      });
    } catch (err) {
      next(err);
    }
  }

  static async listGroups(req, res, next) {
    try {
      const { page, limit, sortField, sortAscending, ...filters } = req.query;
      const { data, count } = await BaseMasterService.find("uom_groups", req.tenantId, {
        filters,
        pagination: { page: Number(page) || 1, limit: Number(limit) || 10 },
        sort: { field: sortField, ascending: sortAscending !== "false" }
      });

      res.status(200).json({
        success: true,
        data: data.map(g => new UomGroupDto(g)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteGroup(req, res, next) {
    try {
      const { id } = req.params;
      await BaseMasterService.softDelete("uom_groups", id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "UOM Group soft deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreGroup(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("uom_groups", id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "UOM Group restored successfully.",
        data: new UomGroupDto(restored)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Units ---
  static async createUnit(req, res, next) {
    try {
      const result = createUomSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const unit = await UomService.createUnit(req.tenantId, result.data, req.user.user_id || req.user.staff_id);
      res.status(201).json({
        success: true,
        message: "UOM unit created successfully.",
        data: new UomDto(unit)
      });
    } catch (err) {
      next(err);
    }
  }

  static async listUnits(req, res, next) {
    try {
      const { page, limit, sortField, sortAscending, ...filters } = req.query;
      const { data, count } = await BaseMasterService.find("units_of_measure", req.tenantId, {
        filters,
        pagination: { page: Number(page) || 1, limit: Number(limit) || 20 },
        sort: { field: sortField, ascending: sortAscending !== "false" }
      });

      res.status(200).json({
        success: true,
        data: data.map(u => new UomDto(u)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUnit(req, res, next) {
    try {
      const { id } = req.params;
      await BaseMasterService.softDelete("units_of_measure", id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "UOM unit soft deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreUnit(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("units_of_measure", id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "UOM unit restored successfully.",
        data: new UomDto(restored)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- UOM Conversion Calculator ---
  static async convert(req, res, next) {
    try {
      const { from, to, quantity } = req.query;
      if (!from || !to || !quantity) {
        throw new ValidationError("Missing required parameters: from, to, quantity.");
      }

      const result = await UomService.convert(req.tenantId, {
        fromCode: from,
        toCode: to,
        quantity
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}
