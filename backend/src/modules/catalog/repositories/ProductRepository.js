import { BaseRepository } from "../../masters/repositories/BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class ProductRepository extends BaseRepository {
  static async findBySku(sku, organizationId) {
    const { data, error } = await adminSupabase
      .from("inventory")
      .select("*")
      .eq("sku", sku)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findByBarcode(barcode, organizationId) {
    const cleanCode = String(barcode).trim();
    // 1. Check product_barcodes table first
    const { data: barcodeRecord, error: barcodeErr } = await adminSupabase
      .from("product_barcodes")
      .select("*")
      .eq("barcode_value", cleanCode)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (barcodeErr) throw barcodeErr;
    if (barcodeRecord) {
      const { data: product, error: prodErr } = await adminSupabase
        .from("inventory")
        .select("*")
        .eq("id", barcodeRecord.product_id)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .maybeSingle();

      if (prodErr) throw prodErr;
      if (product) {
        return { product, variantId: barcodeRecord.variant_id };
      }
    }

    // 2. Fallback: Check product_variants by SKU
    const { data: variantRecord } = await adminSupabase
      .from("product_variants")
      .select("*")
      .eq("sku", cleanCode)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (variantRecord) {
      const { data: product } = await adminSupabase
        .from("inventory")
        .select("*")
        .eq("id", variantRecord.product_id)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .maybeSingle();

      if (product) {
        return { product, variantId: variantRecord.id, variant: variantRecord };
      }
    }

    // 3. Fallback: Check inventory by SKU
    const { data: skuProduct } = await adminSupabase
      .from("inventory")
      .select("*")
      .eq("sku", cleanCode)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (skuProduct) {
      return { product: skuProduct, variantId: null };
    }

    return null;
  }

  static async findBundleComponents(parentProductId, organizationId) {
    const { data, error } = await adminSupabase
      .from("product_bundles")
      .select("*, component:inventory!product_bundles_component_product_id_fkey(*)")
      .eq("parent_product_id", parentProductId)
      .eq("organization_id", organizationId);

    if (error) throw error;
    return data;
  }

  static async saveBundleComponents(parentProductId, organizationId, components, actorUserId) {
    // Drop existing components first
    const { error: delErr } = await adminSupabase
      .from("product_bundles")
      .delete()
      .eq("parent_product_id", parentProductId)
      .eq("organization_id", organizationId);

    if (delErr) throw delErr;

    if (!components || components.length === 0) return [];

    const rows = components.map(c => ({
      parent_product_id: parentProductId,
      component_product_id: c.componentProductId,
      quantity: c.quantity,
      organization_id: organizationId,
      created_by: actorUserId
    }));

    const { data, error: insErr } = await adminSupabase
      .from("product_bundles")
      .insert(rows)
      .select();

    if (insErr) throw insErr;
    return data;
  }

  static async saveSpecifications(productId, organizationId, specifications, actorUserId) {
    const { data, error } = await adminSupabase
      .from("product_specifications")
      .upsert({
        product_id: productId,
        organization_id: organizationId,
        attributes: specifications,
        updated_at: new Date().toISOString(),
        created_by: actorUserId
      }, { onConflict: "product_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findSpecifications(productId, organizationId) {
    const { data, error } = await adminSupabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", productId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
