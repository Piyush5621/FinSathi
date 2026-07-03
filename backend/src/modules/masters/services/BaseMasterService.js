import { BaseRepository } from "../repositories/BaseRepository.js";
import { NotFoundError } from "../errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";

const publisher = initEventPublisher();

export class BaseMasterService {
  static async find(table, organizationId, queryParams = {}) {
    const filters = queryParams.filters || {};
    const pagination = queryParams.pagination || {};
    const sort = queryParams.sort || {};

    return BaseRepository.find(table, {
      organizationId,
      filters,
      pagination,
      sort
    });
  }

  static async findById(table, id, organizationId) {
    const record = await BaseRepository.findById(table, id, organizationId);
    if (!record) {
      throw new NotFoundError(`${table} record not found.`);
    }
    return record;
  }

  static async create(table, organizationId, data, actorUserId) {
    const record = await BaseRepository.create(table, {
      ...data,
      organization_id: organizationId,
      created_by: actorUserId
    });

    publisher.publish(`${table}.created`, { id: record.id, organizationId });
    return record;
  }

  static async update(table, id, organizationId, data, actorUserId) {
    // Check exists first
    await this.findById(table, id, organizationId);

    const record = await BaseRepository.update(table, id, organizationId, {
      ...data,
      updated_by: actorUserId
    });

    publisher.publish(`${table}.updated`, { id: record.id, organizationId });
    return record;
  }

  static async softDelete(table, id, organizationId, actorUserId) {
    await this.findById(table, id, organizationId);

    const record = await BaseRepository.softDelete(table, id, organizationId, actorUserId);
    
    publisher.publish(`${table}.deleted`, { id: record.id, organizationId });
    return record;
  }

  static async restore(table, id, organizationId) {
    const record = await BaseRepository.restore(table, id, organizationId);
    if (!record) {
      throw new NotFoundError(`${table} record not found.`);
    }
    
    publisher.publish(`${table}.restored`, { id: record.id, organizationId });
    return record;
  }

  static async hardDelete(table, id, organizationId) {
    await this.findById(table, id, organizationId);
    await BaseRepository.hardDelete(table, id, organizationId);
    
    publisher.publish(`${table}.hard_deleted`, { id, organizationId });
  }
}
