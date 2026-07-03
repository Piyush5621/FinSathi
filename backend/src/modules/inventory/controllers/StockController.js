import {
  postOpeningStockSchema,
  postAdjustmentSchema,
  shipTransferSchema,
  receiveTransferSchema,
  createReservationSchema
} from "../validators/stockValidator.js";
import { StockService } from "../services/StockService.js";
import { ValidationError, NotFoundError } from "../../masters/errors/appErrors.js";
import { WarehouseStockDto, InventoryMovementDto, TransferDto, ReservationDto } from "../dto/stockDto.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class StockController {
  static async postOpeningStock(req, res, next) {
    try {
      const result = postOpeningStockSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const { stock, movement } = await StockService.postOpeningStock(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Opening stock posted successfully.",
        data: {
          stock: new WarehouseStockDto(stock),
          movement: new InventoryMovementDto(movement)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async postAdjustment(req, res, next) {
    try {
      const result = postAdjustmentSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const { stock, movement, adjustment } = await StockService.postAdjustment(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Stock adjustment processed successfully.",
        data: {
          stock: new WarehouseStockDto(stock),
          movement: new InventoryMovementDto(movement)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async shipTransfer(req, res, next) {
    try {
      const result = shipTransferSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const transfer = await StockService.shipTransfer(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Stock transfer shipped successfully.",
        data: new TransferDto(transfer)
      });
    } catch (err) {
      next(err);
    }
  }

  static async receiveTransfer(req, res, next) {
    try {
      const { id } = req.params;
      const result = receiveTransferSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const transfer = await StockService.receiveTransfer(
        id,
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(200).json({
        success: true,
        message: "Stock transfer received and completed successfully.",
        data: new TransferDto(transfer)
      });
    } catch (err) {
      next(err);
    }
  }

  static async createReservation(req, res, next) {
    try {
      const result = createReservationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const reservation = await StockService.createReservation(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Stock reserved successfully.",
        data: new ReservationDto(reservation)
      });
    } catch (err) {
      next(err);
    }
  }

  static async releaseReservation(req, res, next) {
    try {
      const { id } = req.params;
      const reservation = await StockService.releaseReservation(
        id,
        req.tenantId,
        req.user.user_id || req.user.staff_id
      );

      res.status(200).json({
        success: true,
        message: "Stock reservation released successfully.",
        data: new ReservationDto(reservation)
      });
    } catch (err) {
      next(err);
    }
  }

  static async getWarehouseBalance(req, res, next) {
    try {
      const { warehouseId, productId, variantId } = req.query;

      if (!warehouseId || !productId) {
        throw new ValidationError("Both warehouseId and productId are required.");
      }

      const balance = await StockService.getWarehouseBalance(
        warehouseId,
        productId,
        variantId || null,
        req.tenantId
      );

      res.status(200).json({
        success: true,
        data: balance
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMovementHistory(req, res, next) {
    try {
      const { warehouseId, productId, variantId, limit = 10, page = 1 } = req.query;

      let dbQuery = adminSupabase
        .from("inventory_movements")
        .select("*", { count: "exact" })
        .eq("organization_id", req.tenantId);

      if (warehouseId) dbQuery = dbQuery.eq("warehouse_id", warehouseId);
      if (productId) dbQuery = dbQuery.eq("product_id", productId);
      if (variantId) dbQuery = dbQuery.eq("variant_id", variantId);

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, count, error } = await dbQuery
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: data.map(m => new InventoryMovementDto(m)),
        count
      });
    } catch (err) {
      next(err);
    }
  }
}
