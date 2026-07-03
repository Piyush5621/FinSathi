import {
  updatePreferencesSchema,
  createFinancialYearSchema,
  createTaxCategorySchema,
  createGstRateSchema,
  createHsnSchema,
  createNumberingSeriesSchema
} from "../validators/masterValidator.js";
import { SettingService } from "../services/SettingService.js";
import { PreferencesDto, FinancialYearDto, TaxCategoryDto, GstRateDto, HsnDto, NumberingSeriesDto } from "../dto/masterDto.js";
import { ValidationError } from "../errors/appErrors.js";
import { ImportJob } from "../utils/importInfrastructure.js";
import { z } from "zod";

export class SettingController {
  // --- Preferences ---
  static async getPreferences(req, res, next) {
    try {
      const prefs = await SettingService.getPreferences(req.tenantId);
      res.status(200).json({
        success: true,
        data: new PreferencesDto(prefs)
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePreferences(req, res, next) {
    try {
      const result = updatePreferencesSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const prefs = await SettingService.updatePreferences(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(200).json({
        success: true,
        message: "Preferences updated successfully.",
        data: new PreferencesDto(prefs)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Financial Years ---
  static async createFinancialYear(req, res, next) {
    try {
      const result = createFinancialYearSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await SettingService.createFinancialYear(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Financial Year registered successfully.",
        data: new FinancialYearDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  static async activateFinancialYear(req, res, next) {
    try {
      const { id } = req.params;
      const record = await SettingService.activateFinancialYear(
        id,
        req.tenantId,
        req.user.user_id || req.user.staff_id
      );

      res.status(200).json({
        success: true,
        message: "Financial Year activated successfully.",
        data: new FinancialYearDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- GST Rates & Tax Categories ---
  static async createTaxCategory(req, res, next) {
    try {
      const result = createTaxCategorySchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await SettingService.createTaxCategory(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Tax category registered successfully.",
        data: new TaxCategoryDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  static async createGstRate(req, res, next) {
    try {
      const result = createGstRateSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await SettingService.createGstRate(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "GST Rate registered successfully.",
        data: new GstRateDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  static async createHsnCode(req, res, next) {
    try {
      const result = createHsnSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await SettingService.createHsnCode(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "HSN Code registered successfully.",
        data: new HsnDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Numbering Series ---
  static async createNumberingSeries(req, res, next) {
    try {
      const result = createNumberingSeriesSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.format());
      }

      const record = await SettingService.createNumberingSeries(
        req.tenantId,
        result.data,
        req.user.user_id || req.user.staff_id
      );

      res.status(201).json({
        success: true,
        message: "Numbering series registered successfully.",
        data: new NumberingSeriesDto(record)
      });
    } catch (err) {
      next(err);
    }
  }

  static async generateDocNumber(req, res, next) {
    try {
      const { type } = req.query;
      if (!type) {
        throw new ValidationError("Missing document type parameter.");
      }

      const docNumber = await SettingService.generateNextNumber(type, req.tenantId);
      res.status(200).json({
        success: true,
        data: { documentNumber: docNumber }
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Reusable Import API ---
  static async importPreview(req, res, next) {
    try {
      const { type, data } = req.body;
      if (!type || !Array.isArray(data)) {
        throw new ValidationError("Missing import type or raw data array.");
      }

      let schema;
      if (type === "hsn") schema = createHsnSchema;
      else if (type === "brand") schema = z.object({ name: z.string().min(1) });
      else throw new ValidationError(`Import type '${type}' not supported.`);

      const summary = await ImportJob.run({
        data,
        schema,
        previewMode: true
      });

      res.status(200).json({
        success: true,
        message: "Import data parsed in preview mode successfully.",
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
}
