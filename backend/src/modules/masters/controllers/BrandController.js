import { createCompanySchema, createBrandSchema, updateCompanySchema, updateBrandSchema } from "../validators/masterValidator.js";
import { BaseMasterService } from "../services/BaseMasterService.js";
import { CompanyDto, BrandDto } from "../dto/masterDto.js";
import { ValidationError } from "../errors/appErrors.js";

export class BrandController {
  // --- Companies (Manufacturers) ---
  static async createCompany(req, res, next) {
    try {
      const result = createCompanySchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await BaseMasterService.create(
        "companies",
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Manufacturer created successfully.",
        data: new CompanyDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  static async listCompanies(req, res, next) {
    try {
      const { page, limit, sortField, sortAscending, ...filters } = req.query;
      const { data, count } = await BaseMasterService.find("companies", req.tenantId, {
        filters,
        pagination: { page: Number(page) || 1, limit: Number(limit) || 20 },
        sort: { field: sortField, ascending: sortAscending !== "false" }
      });

      res.status(200).json({
        success: true,
        data: data.map(c => new CompanyDto(c)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCompany(req, res, next) {
    try {
      const { id } = req.params;
      await BaseMasterService.softDelete("companies", id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "Manufacturer soft deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreCompany(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("companies", id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "Manufacturer restored successfully.",
        data: new CompanyDto(restored)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Brands ---
  static async createBrand(req, res, next) {
    try {
      const result = createBrandSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await BaseMasterService.create(
        "brands",
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Brand created successfully.",
        data: new BrandDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  static async listBrands(req, res, next) {
    try {
      const { page, limit, sortField, sortAscending, ...filters } = req.query;
      const { data, count } = await BaseMasterService.find("brands", req.tenantId, {
        filters,
        pagination: { page: Number(page) || 1, limit: Number(limit) || 20 },
        sort: { field: sortField, ascending: sortAscending !== "false" }
      });

      res.status(200).json({
        success: true,
        data: data.map(b => new BrandDto(b)),
        count
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteBrand(req, res, next) {
    try {
      const { id } = req.params;
      await BaseMasterService.softDelete("brands", id, req.tenantId, req.user.user_id || req.user.staff_id);
      res.status(200).json({
        success: true,
        message: "Brand soft deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreBrand(req, res, next) {
    try {
      const { id } = req.params;
      const restored = await BaseMasterService.restore("brands", id, req.tenantId);
      res.status(200).json({
        success: true,
        message: "Brand restored successfully.",
        data: new BrandDto(restored)
      });
    } catch (err) {
      next(err);
    }
  }
}
