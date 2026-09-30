import { createProductSchema, updateProductSchema, createVariantSchema } from "../validators/catalogValidator.js";
import { ProductService } from "../services/ProductService.js";
import { BaseMasterService } from "../../masters/services/BaseMasterService.js";
import { ProductDto, VariantDto } from "../dto/catalogDto.js";
import { ValidationError } from "../../masters/errors/appErrors.js";

export class ProductController {
  static async createProduct(req, res, next) {
    try {
      const result = createProductSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const storeId = req.headers["x-store-id"] || result.data.storeId;
      const product = await ProductService.createProduct(
        req.tenantId,
        { ...result.data, storeId },
        req.user.user_id || req.user.staff_id
      );

      const details = await ProductService.getProductDetails(product.id, req.tenantId, storeId);

      res.status(201).json({
        success: true,
        message: "Product created successfully.",
        data: new ProductDto(details)
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const result = updateProductSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const product = await ProductService.updateProduct(
        id,
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      const storeId = req.headers["x-store-id"] || null;
      const details = await ProductService.getProductDetails(product.id, req.tenantId, storeId);

      res.status(200).json({
        success: true,
        message: "Product updated successfully.",
        data: new ProductDto(details)
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProductDetails(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.headers["x-store-id"] || req.query.store_id || null;
      const details = await ProductService.getProductDetails(id, req.tenantId, storeId);

      res.status(200).json({
        success: true,
        data: new ProductDto(details)
      });
    } catch (err) {
      next(err);
    }
  }

  static async createVariant(req, res, next) {
    try {
      const { id: productId } = req.params;
      const result = createVariantSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const storeId = req.headers["x-store-id"] || result.data.storeId || null;
      const variant = await ProductService.createVariant(
        productId,
        req.tenantId,
        { ...result.data, storeId },
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Product variant created successfully.",
        data: new VariantDto(variant)
      });
    } catch (err) {
      next(err);
    }
  }

  static async lookupBarcode(req, res, next) {
    try {
      const { barcode } = req.params;
      const storeId = req.headers["x-store-id"] || req.query.store_id || null;
      const match = await ProductService.findByBarcode(barcode, req.tenantId, storeId);
      if (!match) {
        return res.status(404).json({
          success: false,
          error: "BARCODE_NOT_FOUND",
          message: `No product or variant found for barcode '${barcode}'.`
        });
      }

      res.status(200).json({
        success: true,
        data: new ProductDto(match),
        matchedVariantId: match.matchedVariantId || null,
        matchedVariant: match.matchedVariant || null
      });
    } catch (err) {
      next(err);
    }
  }

  static async search(req, res, next) {
    try {
      const { query, barcode, status, productType, limit, page, store_id, storeId } = req.query;
      const effectiveStoreId = req.headers["x-store-id"] || store_id || storeId || null;

      const { data, count } = await ProductService.search(req.tenantId, {
        query,
        barcode,
        status,
        productType,
        storeId: effectiveStoreId,
        limit: Number(limit) || 100,
        page: Number(page) || 1
      });

      res.status(200).json({
        success: true,
        data: data.map(p => new ProductDto(p)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async archiveProduct(req, res, next) {
    try {
      const { id } = req.params;
      const archived = await ProductService.archive(id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "Product archived successfully.",
        data: new ProductDto(archived)
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreProduct(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("inventory", id, req.tenantId);
      const details = await ProductService.getProductDetails(restored.id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "Product restored successfully.",
        data: new ProductDto(details)
      });
    } catch (err) {
      next(err);
    }
  }
}
