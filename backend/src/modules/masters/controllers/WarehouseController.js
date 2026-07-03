import { createWarehouseSchema, updateWarehouseSchema } from "../validators/masterValidator.js";
import { WarehouseService } from "../services/WarehouseService.js";
import { BaseMasterService } from "../services/BaseMasterService.js";
import { WarehouseDto } from "../dto/masterDto.js";
import { ValidationError } from "../errors/appErrors.js";

export class WarehouseController {
  static async createWarehouse(req, res, next) {
    try {
      const result = createWarehouseSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const warehouse = await WarehouseService.createWarehouse(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Warehouse created successfully.",
        data: new WarehouseDto(warehouse)
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const result = updateWarehouseSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const warehouse = await WarehouseService.updateWarehouse(
        id,
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(200).json({
        success: true,
        message: "Warehouse updated successfully.",
        data: new WarehouseDto(warehouse)
      });
    } catch (err) {
      next(err);
    }
  }

  static async listWarehouses(req, res, next) {
    try {
      const { page, limit, sortField, sortAscending, ...filters } = req.query;
      const { data, count } = await BaseMasterService.find("warehouses", req.tenantId, {
        filters,
        pagination: { page: Number(page) || 1, limit: Number(limit) || 10 },
        sort: { field: sortField, ascending: sortAscending !== "false" }
      });

      res.status(200).json({
        success: true,
        data: data.map(w => new WarehouseDto(w)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      await BaseMasterService.softDelete("warehouses", id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "Warehouse soft deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("warehouses", id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "Warehouse restored successfully.",
        data: new WarehouseDto(restored)
      });
    } catch (err) {
      next(err);
    }
  }
}
