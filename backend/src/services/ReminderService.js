import { supabase } from "../config/db.js";
import cron from "node-cron";

export const ReminderService = {
  /** ⚙️ Get settings for a user */
  async getSettings(userId) {
    const { data, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Return default if not exists
    if (error && error.code === 'PGRST116') {
      return { enabled: false, threshold: 500, days_past_due: 7, template: 'Hi {CustomerName}, your pending due of ₹{Amount} for bill {InvoiceNo} is past its due date. Please clear it soon.' };
    }
    if (error) throw error;
    return data;
  },

  /** 💾 Update settings for a user */
  async updateSettings(userId, payload) {
    const { data, error } = await supabase
      .from('reminder_settings')
      .upsert({ ...payload, user_id: userId, updated_at: new Date() })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /** 🚀 Messaging Wrapper (Twilio/WhatsApp Simulation) */
  async sendMessage(phone, message) {
    console.log(`[MessagingService] Sending to ${phone}: ${message}`);
    // Simulate API call
    // if (process.env.TWILIO_SID) { /* real twilio code */ }
    return { success: true };
  },

  /** 🕵️ Logic to find who should receive reminders (Daily Job) */
  async processAllReminders() {
    console.log("[Reminders] Starting daily scan...");
    
    // 1. Get all active reminder configurations
    const { data: configs, error: configErr } = await supabase
      .from('reminder_settings')
      .select('*, users(business_name)')
      .eq('enabled', true);
    
    if (configErr) return console.error("[Reminders] Failed to load configs", configErr);

    for (const config of configs) {
      const { user_id, threshold, days_past_due, template, users } = config;
      const shopName = users?.business_name || "FinSathi";

      // 2. Query unpaid sales for this user where due_date + days_past_due matches today
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - days_past_due);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('*, customer:customers(name, phone)')
        .eq('user_id', user_id)
        .eq('payment_status', 'unpaid')
        .eq('due_date', targetDateStr)
        .gt('total', threshold);

      if (salesErr) {
          console.error(`[Reminders] Error fetching sales for user ${user_id}`, salesErr);
          continue;
      }

      // 3. Process each sale
      for (const sale of sales) {
        if (!sale.customer?.phone) continue;

        // Populate template
        let msg = template
          .replace('{CustomerName}', sale.customer.name)
          .replace('{Amount}', sale.total)
          .replace('{InvoiceNo}', sale.invoice_no)
          .replace('{ShopName}', shopName);

        // 4. Send & Log
        try {
          const result = await this.sendMessage(sale.customer.phone, msg);
          
          await supabase.from('reminder_logs').insert({
              user_id,
              customer_id: sale.customer_id,
              sale_id: sale.id,
              phone: sale.customer.phone,
              message: msg,
              status: result.success ? 'sent' : 'failed'
          });

          if (result.success) {
            await supabase.from('sales').update({ last_reminder_sent: new Date() }).eq('id', sale.id);
          }
        } catch (err) {
          console.error(`[Reminders] Failed for sale ${sale.id}`, err);
        }
      }
    }
    console.log("[Reminders] Daily scan complete.");
  },

  /** ⏰ Start the daily CRON Job */
  init() {
    // Runs at 09:00 AM every day
    cron.schedule('0 9 * * *', () => {
      this.processAllReminders();
    });
    console.log("[Reminders] Automated Cron Job initialized for 09:00 AM daily.");
  }
};
