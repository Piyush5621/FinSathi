export class WarehouseStockDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.warehouseId = record.warehouse_id;
    this.productId = record.product_id;
    this.variantId = record.variant_id;
    this.onHand = Number(record.on_hand);
    this.reserved = Number(record.reserved);
    this.available = Number(record.available);
    this.incoming = Number(record.incoming);
    this.outgoing = Number(record.outgoing);
  }
}

export class InventoryMovementDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.warehouseId = record.warehouse_id;
    this.productId = record.product_id;
    this.variantId = record.variant_id;
    this.batchId = record.batch_id;
    this.serialNumber = record.serial_number;
    this.quantity = Number(record.quantity);
    this.movementType = record.movement_type;
    this.referenceType = record.reference_type;
    this.referenceId = record.reference_id;
    this.unitCost = Number(record.unit_cost);
    this.totalCost = Number(record.total_cost);
    this.valuationMethod = record.valuation_method;
    this.createdAt = record.created_at;
  }
}

export class BatchDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.productId = record.product_id;
    this.warehouseId = record.warehouse_id;
    this.batchNumber = record.batch_number;
    this.supplierBatch = record.supplier_batch;
    this.manufacturingDate = record.manufacturing_date;
    this.expiryDate = record.expiry_date;
    this.purchaseCost = Number(record.purchase_cost);
    this.receivedDate = record.received_date;
    this.status = record.status;
  }
}

export class SerialDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.productId = record.product_id;
    this.warehouseId = record.warehouse_id;
    this.batchId = record.batch_id;
    this.serialNumber = record.serial_number;
    this.status = record.status;
    this.warrantyExpiryDate = record.warranty_expiry_date;
    this.soldAt = record.sold_at;
  }
}

export class AdjustmentDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.warehouseId = record.warehouse_id;
    this.adjustmentNumber = record.adjustment_number;
    this.reason = record.reason;
    this.remarks = record.remarks;
    this.status = record.status;
    this.adjustmentType = record.adjustment_type;
    this.createdAt = record.created_at;
  }
}

export class TransferDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.sourceWarehouseId = record.source_warehouse_id;
    this.targetWarehouseId = record.target_warehouse_id;
    this.transferNumber = record.transfer_number;
    this.status = record.status;
    this.shippedAt = record.shipped_at;
    this.receivedAt = record.received_at;
  }
}

export class ReservationDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.warehouseId = record.warehouse_id;
    this.productId = record.product_id;
    this.variantId = record.variant_id;
    this.quantity = Number(record.quantity);
    this.expiresAt = record.expires_at;
    this.status = record.status;
    this.referenceType = record.reference_type;
    this.referenceId = record.reference_id;
  }
}
