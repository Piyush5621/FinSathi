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

      const product = await ProductService.createProduct(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      const details = await ProductService.getProductDetails(product.id, req.tenantId);

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

      const details = await ProductService.getProductDetails(product.id, req.tenantId);

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
      const details = await ProductService.getProductDetails(id, req.tenantId);

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

      const variant = await ProductService.createVariant(
        productId,
        req.tenantId,
        result.data,
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

  static async search(req, res, next) {
    try {
      const { query, barcode, status, productType, limit, page } = req.query;

      const { data, count } = await ProductService.search(req.tenantId, {
        query,
        barcode,
        status,
        productType,
        limit: Number(limit) || 10,
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
