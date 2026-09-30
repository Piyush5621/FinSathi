export const EventRegistry = {
  // Sales & Billing Domain
  SALE_CREATED: 'SaleCreated',
  SALE_RETURNED: 'SaleReturned',
  INVOICE_GENERATED: 'InvoiceGenerated',

  // Inventory Domain
  STOCK_ADJUSTED: 'StockAdjusted',
  LOW_STOCK_DETECTED: 'LowStockDetected',

  // Customers & Khata Domain
  PAYMENT_RECEIVED: 'PaymentReceived',

  // Security & Compliance Domain
  AUDIT_LOG_RECORDED: 'AuditLogRecorded'
};
