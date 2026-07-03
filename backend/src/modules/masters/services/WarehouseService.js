import { WarehouseRepository } from "../repositories/WarehouseRepository.js";
import { ValidationError, ConflictError, NotFoundError } from "../errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";

const publisher = initEventPublisher();

export class WarehouseService {
  static async createWarehouse(organizationId, data, actorUserId) {
    const existing = await WarehouseRepository.findByName(data.name, organizationId);
    if (existing) {
      throw new ConflictError(`Warehouse with name '${data.name}' already exists.`);
    }

    if (data.isMainHub) {
      // Clear main hub status for other warehouses
      await WarehouseRepository.clearMainHubStatus(organizationId);
    }

    const warehouse = await WarehouseRepository.create("warehouses", {
      organization_id: organizationId,
      name: data.name,
      warehouse_type: data.warehouseType || "general",
      address: data.address || null,
      contact_phone: data.contactPhone || null,
      is_main_hub: data.isMainHub || false,
      created_by: actorUserId
    });

    // Publish event
    publisher.publish("warehouse.created", { id: warehouse.id, organizationId, name: warehouse.name });
    return warehouse;
  }

  static async updateWarehouse(id, organizationId, data, actorUserId) {
    const warehouse = await WarehouseRepository.findById("warehouses", id, organizationId);
    if (!warehouse) {
      throw new NotFoundError("Warehouse not found.");
    }

    if (data.name && data.name !== warehouse.name) {
      const existing = await WarehouseRepository.findByName(data.name, organizationId);
      if (existing) {
        throw new ConflictError(`Warehouse with name '${data.name}' already exists.`);
      }
    }

    if (data.isMainHub) {
      await WarehouseRepository.clearMainHubStatus(organizationId);
    }

    const updated = await WarehouseRepository.update("warehouses", id, organizationId, {
      ...data,
      updated_by: actorUserId
    });

    // Publish event
    publisher.publish("warehouse.updated", { id: updated.id, organizationId, name: updated.name });
    return updated;
  }
}
