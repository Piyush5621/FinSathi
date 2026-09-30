import { StockService } from "../services/StockService.js";
import { ValidationError } from "../../masters/errors/appErrors.js";

export class StockController {
  static async postRestock(req, res, next) {
    try {
      const { 
        productId, product_id, 
        variantId, variant_id, 
        quantity, 
        cost_price, costPrice, 
        selling_price, sellingPrice, 
        wholesale_price, wholesalePrice,
        batch_name, batchName,
        store_id, storeId
      } = req.body;

      const pId = productId || product_id;
      if (!pId) throw new ValidationError("Product ID is required for restock.");

      const result = await StockService.restockItem({
        organizationId: req.tenantId,
        storeId: req.headers['x-store-id'] || store_id || storeId,
        productId: pId,
        variantId: variantId || variant_id || null,
        quantity,
        costPrice: costPrice !== undefined ? costPrice : cost_price,
        sellingPrice: sellingPrice !== undefined ? sellingPrice : selling_price,
        wholesalePrice: wholesalePrice !== undefined ? wholesalePrice : wholesale_price,
        batchName: batchName || batch_name,
        userId: req.user.user_id || req.user.id || req.user.staff_id
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async postAdjustment(req, res, next) {
    try {
      const {
        productId, product_id,
        variantId, variant_id,
        quantity,
        adjustment_type, adjustmentType,
        reason,
        remarks,
        batch_id, batchId,
        store_id, storeId
      } = req.body;

      const pId = productId || product_id || req.params.id;
      if (!pId) throw new ValidationError("Product ID is required for adjustment.");

      const result = await StockService.adjustStock({
        organizationId: req.tenantId,
        storeId: req.headers['x-store-id'] || store_id || storeId,
        productId: pId,
        variantId: variantId || variant_id || null,
        quantity,
        adjustmentType: adjustmentType || adjustment_type || 'decrease',
        reason: reason || 'Stock Adjustment',
        remarks: remarks || '',
        batchId: batchId || batch_id || null,
        userId: req.user.user_id || req.user.id || req.user.staff_id
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async postTransfer(req, res, next) {
    try {
      const {
        source_store_id, sourceStoreId,
        destination_store_id, destinationStoreId, target_store_id,
        productId, product_id,
        variantId, variant_id,
        quantity,
        remarks
      } = req.body;

      const pId = productId || product_id || req.params.id;
      if (!pId) throw new ValidationError("Product ID is required for stock transfer.");

      const result = await StockService.transferStock({
        organizationId: req.tenantId,
        sourceStoreId: sourceStoreId || source_store_id || req.headers['x-store-id'],
        destinationStoreId: destinationStoreId || destination_store_id || target_store_id,
        productId: pId,
        variantId: variantId || variant_id || null,
        quantity,
        remarks,
        userId: req.user.user_id || req.user.id || req.user.staff_id
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getMovements(req, res, next) {
    try {
      const { store_id, product_id, limit, offset } = req.query;
      const movements = await StockService.getMovements({
        organizationId: req.tenantId,
        storeId: req.headers['x-store-id'] || store_id || null,
        productId: product_id || null,
        limit: limit || 50,
        offset: offset || 0
      });

      res.status(200).json({
        success: true,
        data: movements
      });
    } catch (err) {
      next(err);
    }
  }

  static async postBulkImport(req, res, next) {
    try {
      const { products, store_id, storeId } = req.body;
      const result = await StockService.bulkImport({
        organizationId: req.tenantId,
        storeId: req.headers['x-store-id'] || store_id || storeId,
        userId: req.user.user_id || req.user.id || req.user.staff_id,
        products
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getStoreBalance(req, res, next) {
    try {
      const storeId = req.headers['x-store-id'] || req.query.store_id;
      const productId = req.query.product_id || req.params.id;
      const variantId = req.query.variant_id || null;

      if (!storeId || !productId) {
        throw new ValidationError("store_id and product_id are required.");
      }

      const balance = await StockService.getStoreBalance(storeId, productId, variantId);
      res.status(200).json({ success: true, balance });
    } catch (err) {
      next(err);
    }
  }
}
