import { createCategorySchema, categoryTemplateSchema } from "../validators/masterValidator.js";
import { CategoryService } from "../services/CategoryService.js";
import { BaseMasterService } from "../services/BaseMasterService.js";
import { CategoryDto } from "../dto/masterDto.js";
import { ValidationError } from "../errors/appErrors.js";

export class CategoryController {
  static async createCategory(req, res, next) {
    try {
      const result = createCategorySchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const category = await CategoryService.createCategory(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Category created successfully.",
        data: new CategoryDto(category)
      });
    } catch (err) {
      next(err);
    }
  }

  static async listCategories(req, res, next) {
    try {
      const { page, limit, sortField, sortAscending, ...filters } = req.query;
      const { data, count } = await BaseMasterService.find("categories", req.tenantId, {
        filters,
        pagination: { page: Number(page) || 1, limit: Number(limit) || 20 },
        sort: { field: sortField, ascending: sortAscending !== "false" }
      });

      res.status(200).json({
        success: true,
        data: data.map(c => new CategoryDto(c)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      await BaseMasterService.softDelete("categories", id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "Category soft deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreCategory(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("categories", id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "Category restored successfully.",
        data: new CategoryDto(restored)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Dynamic Form Schema Mappings ---
  static async setAttributeTemplate(req, res, next) {
    try {
      const { id: categoryId } = req.params;
      const result = categoryTemplateSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Invalid template schema format", result.error.format());
      }

      const template = await CategoryService.setAttributeTemplate(
        categoryId,
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(200).json({
        success: true,
        message: "Category attribute template updated successfully.",
        data: template
      });
    } catch (err) {
      next(err);
    }
  }

  static async validateAttributes(req, res, next) {
    try {
      const { id: categoryId } = req.params;
      const attributes = req.body;

      await CategoryService.validateAttributes(categoryId, req.tenantId, attributes);

      res.status(200).json({
        success: true,
        message: "Attributes validated successfully."
      });
    } catch (err) {
      next(err);
    }
  }
}
