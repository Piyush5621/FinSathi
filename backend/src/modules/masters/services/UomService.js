import { UomRepository } from "../repositories/UomRepository.js";
import { ValidationError, ConflictError, NotFoundError } from "../errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";

const publisher = initEventPublisher();

export class UomService {
  static async createGroup(organizationId, data, actorUserId) {
    const existing = await UomRepository.findGroupByCodeOrName(data.name, organizationId);
    if (existing) {
      throw new ConflictError(`UOM Group with name '${data.name}' already exists.`);
    }

    const group = await UomRepository.create("uom_groups", {
      organization_id: organizationId,
      name: data.name,
      created_by: actorUserId
    });

    // Publish event
    publisher.publish("uom.group_created", { id: group.id, organizationId, name: group.name });
    return group;
  }

  static async createUnit(organizationId, data, actorUserId) {
    // Check duplicate code
    const existing = await UomRepository.findUomByCode(data.code, organizationId);
    if (existing) {
      throw new ConflictError(`UOM unit with code '${data.code}' already exists.`);
    }

    // Verify group exists
    const group = await UomRepository.findById("uom_groups", data.uomGroupId, organizationId);
    if (!group) {
      throw new NotFoundError("UOM Group not found.");
    }

    // Conversion verification
    let baseUnitId = null;
    let conversionFactor = 1.0;
    
    if (!data.isBase) {
      if (!data.baseUnitId) {
        throw new ValidationError("baseUnitId is required if unit is not a base unit.");
      }
      
      const baseUnit = await UomRepository.findById("units_of_measure", data.baseUnitId, organizationId);
      if (!baseUnit) {
        throw new NotFoundError("Base UOM unit not found.");
      }
      if (baseUnit.uom_group_id !== data.uomGroupId) {
        throw new ValidationError("Base unit must belong to the same UOM Group.");
      }

      baseUnitId = data.baseUnitId;
      conversionFactor = data.conversionFactor || 1.0;
    }

    const unit = await UomRepository.create("units_of_measure", {
      organization_id: organizationId,
      uom_group_id: data.uomGroupId,
      code: data.code,
      name: data.name,
      is_base: data.isBase,
      base_unit_id: baseUnitId,
      conversion_factor: conversionFactor,
      created_by: actorUserId
    });

    // Publish event
    publisher.publish("uom.created", { id: unit.id, organizationId, code: unit.code });
    return unit;
  }

  /**
   * Safe conversion engine (Only conversions within the same group allowed)
   */
  static async convert(organizationId, { fromCode, toCode, quantity }) {
    const [fromUnit, toUnit] = await Promise.all([
      UomRepository.findUomByCode(fromCode, organizationId),
      UomRepository.findUomByCode(toCode, organizationId)
    ]);

    if (!fromUnit) {
      throw new NotFoundError(`Source UOM '${fromCode}' not found.`);
    }
    if (!toUnit) {
      throw new NotFoundError(`Target UOM '${toCode}' not found.`);
    }

    if (fromUnit.uom_group_id !== toUnit.uom_group_id) {
      throw new ValidationError(
        `Invalid Conversion: Source '${fromCode}' and Target '${toCode}' belong to different UOM groups.`
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError("Quantity must be a positive number.");
    }

    // 1. Convert to base unit quantity
    const baseQty = qty * Number(fromUnit.conversion_factor);

    // 2. Convert from base unit to target unit quantity
    const targetQty = baseQty / Number(toUnit.conversion_factor);

    return {
      from: fromCode,
      to: toCode,
      inputQuantity: qty,
      outputQuantity: Number(targetQty.toFixed(4)),
      conversionFactor: Number((Number(fromUnit.conversion_factor) / Number(toUnit.conversion_factor)).toFixed(6))
    };
  }
}
