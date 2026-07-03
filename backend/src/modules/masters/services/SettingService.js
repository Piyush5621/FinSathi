import { PreferenceRepository } from "../repositories/PreferenceRepository.js";
import { TaxRepository } from "../repositories/TaxRepository.js";
import { NumberingRepository } from "../repositories/NumberingRepository.js";
import { ValidationError, ConflictError, NotFoundError } from "../errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";

const publisher = initEventPublisher();

export class SettingService {
  // --- Preferences ---
  static async getPreferences(organizationId) {
    let prefs = await PreferenceRepository.findPreferences(organizationId);
    if (!prefs) {
      // Initialize defaults
      prefs = await PreferenceRepository.upsertPreferences(organizationId, {
        currency_code: "INR",
        currency_symbol: "₹",
        timezone: "Asia/Kolkata",
        billing_preferences: {},
        inventory_preferences: {}
      });
    }
    return prefs;
  }

  static async updatePreferences(organizationId, data, actorUserId) {
    const prefs = await PreferenceRepository.upsertPreferences(organizationId, {
      currency_code: data.currencyCode,
      currency_symbol: data.currencySymbol,
      timezone: data.timezone,
      billing_preferences: data.billingPreferences || {},
      inventory_preferences: data.inventoryPreferences || {},
      created_by: actorUserId
    });

    publisher.publish("preferences.updated", { organizationId });
    return prefs;
  }

  // --- Financial Years ---
  static async createFinancialYear(organizationId, data, actorUserId) {
    const existing = await PreferenceRepository.findFinancialYearByName(data.name, organizationId);
    if (existing) {
      throw new ConflictError(`Financial Year '${data.name}' already exists.`);
    }

    if (data.isActive) {
      await PreferenceRepository.deactivateAllFinancialYears(organizationId);
    }

    const fy = await PreferenceRepository.create("financial_years", {
      organization_id: organizationId,
      name: data.name,
      start_date: data.startDate,
      end_date: data.endDate,
      is_active: data.isActive,
      is_closed: false,
      created_by: actorUserId
    });

    publisher.publish("financial_year.created", { id: fy.id, organizationId, name: fy.name });
    return fy;
  }

  static async activateFinancialYear(id, organizationId, actorUserId) {
    const fy = await PreferenceRepository.findById("financial_years", id, organizationId);
    if (!fy) {
      throw new NotFoundError("Financial Year not found.");
    }

    await PreferenceRepository.deactivateAllFinancialYears(organizationId);
    const updated = await PreferenceRepository.update("financial_years", id, organizationId, {
      is_active: true,
      updated_by: actorUserId
    });

    publisher.publish("financial_year.activated", { id: updated.id, organizationId });
    return updated;
  }

  // --- GST & Tax Masters ---
  static async createTaxCategory(organizationId, data, actorUserId) {
    const existing = await TaxRepository.findTaxCategoryByName(data.name, organizationId);
    if (existing) {
      throw new ConflictError(`Tax Category '${data.name}' already exists.`);
    }

    const tc = await TaxRepository.create("tax_categories", {
      organization_id: organizationId,
      name: data.name,
      created_by: actorUserId
    });

    return tc;
  }

  static async createGstRate(organizationId, data, actorUserId) {
    const taxCat = await TaxRepository.findById("tax_categories", data.taxCategoryId, organizationId);
    if (!taxCat) {
      throw new NotFoundError("Tax Category not found.");
    }

    const existing = await TaxRepository.findGstRateByTaxCategoryAndRate(data.taxCategoryId, data.rate, organizationId);
    if (existing) {
      throw new ConflictError(`GST Rate of ${data.rate}% already exists for this tax category.`);
    }

    const rate = await TaxRepository.create("gst_rates", {
      organization_id: organizationId,
      tax_category_id: data.taxCategoryId,
      rate: data.rate,
      effective_from: data.effectiveFrom || new Date().toISOString().split("T")[0],
      created_by: actorUserId
    });

    publisher.publish("gst.updated", { id: rate.id, organizationId, rate: rate.rate });
    return rate;
  }

  static async createHsnCode(organizationId, data, actorUserId) {
    const existing = await TaxRepository.findHsnByCode(data.hsnCode, organizationId);
    if (existing) {
      throw new ConflictError(`HSN Code '${data.hsnCode}' already exists.`);
    }

    if (data.gstRateId) {
      const rate = await TaxRepository.findById("gst_rates", data.gstRateId, organizationId);
      if (!rate) {
        throw new NotFoundError("GST Rate not found.");
      }
    }

    const hsn = await TaxRepository.create("hsn_masters", {
      organization_id: organizationId,
      hsn_code: data.hsnCode,
      gst_rate_id: data.gstRateId || null,
      description: data.description || null,
      created_by: actorUserId
    });

    return hsn;
  }

  // --- Numbering Series ---
  static async createNumberingSeries(organizationId, data, actorUserId) {
    const existing = await NumberingRepository.findSeries(
      data.documentType,
      data.fiscalYear,
      data.prefix,
      organizationId
    );

    if (existing) {
      throw new ConflictError(`Numbering Series with prefix '${data.prefix}' already exists for document type '${data.documentType}' and fiscal year '${data.fiscalYear}'.`);
    }

    const series = await NumberingRepository.create("numbering_series", {
      organization_id: organizationId,
      document_type: data.documentType,
      prefix: data.prefix,
      suffix: data.suffix || null,
      next_number: data.nextNumber || 1,
      padding_zeroes: data.paddingZeroes || 5,
      fiscal_year: data.fiscalYear,
      reset_policy: data.resetPolicy || "never",
      branch_id: data.branchId || null,
      warehouse_id: data.warehouseId || null,
      is_active: data.isActive !== false,
      created_by: actorUserId
    });

    return series;
  }

  /**
   * Evaluates and increments the next available document sequence number
   */
  static async generateNextNumber(documentType, organizationId) {
    const activeFy = await PreferenceRepository.findActiveFinancialYear(organizationId);
    if (!activeFy) {
      throw new ValidationError("No active financial year configured. Cannot generate document number.");
    }

    const series = await NumberingRepository.findActiveSeriesForDoc(documentType, activeFy.name, organizationId);
    if (!series) {
      throw new ValidationError(`No active Numbering Series configured for document type '${documentType}' in ${activeFy.name}.`);
    }

    const numStr = String(series.next_number).padStart(series.padding_zeroes, "0");
    const formatted = `${series.prefix}${numStr}${series.suffix || ""}`;

    // Increment next number
    await NumberingRepository.incrementSeries(series.id, series.next_number + 1);

    // Publish event
    publisher.publish("numbering.changed", {
      documentType,
      organizationId,
      prefix: series.prefix,
      nextNumber: series.next_number + 1
    });

    return formatted;
  }
}
