export const PLANS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    limits: {
      invoices_per_month: 50,
      products: 100,
      customers: 50,
      businesses: 1,
      storage_mb: 100,
    },
    features: {
      gst_invoice: true,
      pdf_download: true,
      whatsapp_share: false,
      barcode_scan: false,
      gst_reports: false,
      bulk_export: false,
      multi_business: false,
      priority_support: false,
    }
  },
  pro: {
    name: 'Pro',
    price_monthly: 499,
    price_yearly: 4999,          // ~2 months free
    razorpay_plan_id_monthly: 'plan_XXXXX',
    razorpay_plan_id_yearly:  'plan_YYYYY',
    limits: {
      invoices_per_month: -1,    // -1 = unlimited
      products: 10000,
      customers: 5000,
      businesses: 1,
      storage_mb: 2048,
    },
    features: {
      gst_invoice: true,
      pdf_download: true,
      whatsapp_share: true,
      barcode_scan: true,
      gst_reports: true,
      bulk_export: true,
      multi_business: false,
      priority_support: false,
    }
  },
  business: {
    name: 'Business',
    price_monthly: 999,
    price_yearly: 9999,
    razorpay_plan_id_monthly: 'plan_ZZZZZ',
    razorpay_plan_id_yearly:  'plan_WWWWW',
    limits: {
      invoices_per_month: -1,
      products: -1,
      customers: -1,
      businesses: 5,
      storage_mb: 10240,
    },
    features: {
      gst_invoice: true,
      pdf_download: true,
      whatsapp_share: true,
      barcode_scan: true,
      gst_reports: true,
      bulk_export: true,
      multi_business: true,
      priority_support: true,
    }
  }
};
