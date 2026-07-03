import { CategoryRepository } from "../repositories/CategoryRepository.js";
import { ValidationError, ConflictError, NotFoundError } from "../errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";

const publisher = initEventPublisher();

export class CategoryService {
  static async createCategory(organizationId, data, actorUserId) {
    // Check duplicate slug
    const existing = await CategoryRepository.findCategoryBySlug(data.slug, organizationId);
    if (existing) {
      throw new ConflictError(`Category with slug '${data.slug}' already exists.`);
    }

    let depth = 0;
    let materializedPath = `/${data.slug}/`;

    if (data.parentId) {
      const parent = await CategoryRepository.findById("categories", data.parentId, organizationId);
      if (!parent) {
        throw new NotFoundError("Parent category not found.");
      }
      depth = parent.depth + 1;
      materializedPath = `${parent.materialized_path}${data.slug}/`;
    }

    const category = await CategoryRepository.create("categories", {
      organization_id: organizationId,
      parent_id: data.parentId || null,
      name: data.name,
      slug: data.slug,
      materialized_path: materializedPath,
      depth,
      sort_order: data.sortOrder || 0,
      created_by: actorUserId
    });

    // Publish event
    publisher.publish("category.created", { id: category.id, organizationId, name: category.name });
    return category;
  }

  static async setAttributeTemplate(categoryId, organizationId, schema, actorUserId) {
    const category = await CategoryRepository.findById("categories", categoryId, organizationId);
    if (!category) {
      throw new NotFoundError("Category not found.");
    }

    // Validate schema structure using schema validation helper
    if (!schema || typeof schema.properties !== "object") {
      throw new ValidationError("Invalid template: schema must define properties.");
    }

    const template = await CategoryRepository.upsertCategoryTemplate(
      categoryId,
      organizationId,
      schema,
      actorUserId
    );

    return template;
  }

  /**
   * Validates dynamic product attributes against category json-schema template
   */
  static async validateAttributes(categoryId, organizationId, attributes) {
    const template = await CategoryRepository.findCategoryTemplate(categoryId, organizationId);
    if (!template) {
      return true; // No template restrictions defined
    }

    const schema = template.attribute_schema;
    const properties = schema.properties || {};
    const errors = {};

    for (const [key, rules] of Object.entries(properties)) {
      const value = attributes[key];

      // Required check
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors[key] = `${rules.display_name || key} is required.`;
        continue;
      }

      if (value !== undefined && value !== null && value !== "") {
        // Type check
        if (rules.field_type === "number") {
          const num = Number(value);
          if (isNaN(num)) {
            errors[key] = `${rules.display_name} must be a number.`;
          }
        } else if (rules.field_type === "boolean") {
          if (typeof value !== "boolean" && value !== "true" && value !== "false") {
            errors[key] = `${rules.display_name} must be a boolean.`;
          }
        } else if (rules.field_type === "date") {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors[key] = `${rules.display_name} must be a valid date.`;
          }
        } else if (rules.field_type === "select") {
          if (Array.isArray(rules.options) && !rules.options.includes(value)) {
            errors[key] = `${rules.display_name} value must be one of: ${rules.options.join(", ")}`;
          }
        }

        // Regex check
        if (rules.regex) {
          try {
            const regex = new RegExp(rules.regex);
            if (!regex.test(String(value))) {
              errors[key] = rules.validation || `${rules.display_name} failed validation format.`;
            }
          } catch (e) {
            console.error("Invalid regex in attribute template:", rules.regex);
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Dynamic attribute validation failed.", errors);
    }

    return true;
  }
}
