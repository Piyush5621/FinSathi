import { supabase } from '../config/db.js';

export const GstService = {
  /**
   * Generates GSTR-1 (Sales) summary data for a given date range.
   * Phase 5: GSTR Report Generator
   */
  async getGstr1Report(userId, fromDate, toDate) {
    try {
      // 1. Fetch all sales with customer details and items in range
      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          id,
          invoice_no,
          total,
          subtotal,
          gst_percent,
          date,
          payment_status,
          customers (
            name,
            phone,
            id
          )
        `)
        .eq('user_id', userId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // 2. Format into GSTR-1 structure (Simplified for MSMEs)
      // Dividing into B2B (if GSTIN existed) and B2C
      const report = {
        summary: {
          totalInvoices: sales.length,
          totalValue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
          totalTaxableValue: sales.reduce((sum, s) => sum + (s.subtotal || 0), 0),
          totalGst: sales.reduce((sum, s) => sum + ((s.total || 0) - (s.subtotal || 0)), 0),
        },
        invoices: sales.map(s => ({
          invoiceNo: s.invoice_no || `FS-${s.id}`,
          date: new Date(s.date).toLocaleDateString(),
          customer: s.customers?.name || 'Cash Customer',
          taxableValue: s.subtotal || 0,
          gstRate: s.gst_percent || 0,
          totalValue: s.total || 0,
          status: s.payment_status
        }))
      };

      return report;
    } catch (err) {
      console.error('[GST Service] Error:', err);
      throw err;
    }
  }
};
