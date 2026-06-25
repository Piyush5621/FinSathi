import axios from 'axios';
import "dotenv/config";

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneId = process.env.WHATSAPP_PHONE_ID;
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneId}/messages`;
  }

  async sendPaymentReminder(phoneNumber, invoiceDetails) {
    if (!this.token || !this.phoneId) {
      console.warn('WhatsApp credentials missing. Skipping standard WhatsApp delivery. Make sure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are configured.');
      return { success: false, error: 'WHATSAPP_NOT_CONFIGURED', fallbackRequired: true };
    }

    try {
      // Ensure phone number starts with country code (fallback to India 91 if length is 10)
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: 'payment_reminder', // Pre-approved template name
          language: {
            code: 'en_GB'
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: invoiceDetails.customer_name },
                { type: 'text', text: invoiceDetails.invoice_no },
                { type: 'text', text: `₹${invoiceDetails.amount}` },
                { type: 'text', text: invoiceDetails.business_name },
                { type: 'text', text: invoiceDetails.payment_link }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id || null,
        fallbackRequired: false
      };
    } catch (error) {
      console.error('WhatsApp API sending failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        fallbackRequired: true
      };
    }
  }
}

const whatsappService = new WhatsAppService();
export default whatsappService;
