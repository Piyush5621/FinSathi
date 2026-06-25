import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

/**
 * Handle WhatsApp Delivery Callbacks (Meta Graph API Webhook)
 * Receives POST requests from Meta when message status changes.
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const { entry } = req.body;

    if (entry && entry[0]?.changes && entry[0].changes[0]?.value?.statuses) {
      const statuses = entry[0].changes[0].value.statuses;
      
      for (const status of statuses) {
        const messageId = status.id;
        const deliveryStatus = status.status; // 'sent', 'delivered', 'read', 'failed'
        
        // Update the sales (invoice) table with the new status
        await supabase
          .from('sales')
          .update({ whatsapp_status: deliveryStatus })
          .eq('whatsapp_message_id', messageId);
          
        // If failed, trigger SMS fallback
        // if (deliveryStatus === 'failed') { await SmsService.sendFallback(...) }
      }
    }
    
    // Meta requires a 200 OK response to webhooks immediately
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    res.sendStatus(500);
  }
});

/**
 * Handle WhatsApp Webhook Verification (Meta Graph API)
 * Meta sends a GET request to verify the webhook URL.
 */
router.get('/whatsapp', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

export default router;
