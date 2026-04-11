import PDFDocument from 'pdfkit';
import { supabase } from '../config/db.js';
import { SalesRepository } from '../repositories/SalesRepository.js';
import { CustomerRepository } from '../repositories/CustomerRepository.js';
import numberToWords from 'number-to-words';

export const PdfService = {
  async generateAndUploadInvoice(saleId) {
    try {
      const sale = await SalesRepository.findById(saleId);
      if (!sale) throw new Error("Sale not found");

      let customer = { name: 'Cash Customer', phone: '', address: '' };
      if (sale.customer_id) {
        customer = await CustomerRepository.findById(sale.customer_id);
      }

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          const pdfData = Buffer.concat(buffers);
          const fileName = `invoices/FS-${sale.id}-${Date.now()}.pdf`;

          try {
            // If Supabase is properly configured
            if (supabase.storage) {
              const { data, error } = await supabase.storage
                .from('finsathi-assets')
                .upload(fileName, pdfData, {
                  contentType: 'application/pdf',
                  upsert: true
                });

              if (error) {
                console.error("Supabase Storage Error:", error);
                throw error;
              }

              const { data: publicUrlData } = supabase.storage
                .from('finsathi-assets')
                .getPublicUrl(fileName);

              resolve(publicUrlData.publicUrl);
            } else {
              // Mock URL if no storage available
              resolve(`https://mock-storage.com/${fileName}`);
            }
          } catch (uploadErr) {
            console.error("Upload failed in PDF Service", uploadErr);
            reject(uploadErr);
          }
        });

        // 📝 Generate PDF Content
        doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Invoice No: FS-${sale.id}`);
        doc.text(`Date: ${new Date(sale.date || sale.created_at).toLocaleDateString()}`);
        doc.text(`GSTIN: 27AADCB2230M1Z2`); // Sample GSTIN
        doc.moveDown();

        doc.text(`Billed To:`);
        doc.text(`Name: ${customer.name}`);
        if (customer.phone) doc.text(`Phone: ${customer.phone}`);
        if (customer.address) doc.text(`Address: ${customer.address}`);
        doc.moveDown();

        // Items Table Header
        const startY = doc.y;
        doc.text('Item', 50, startY);
        doc.text('Qty', 250, startY);
        doc.text('Price', 300, startY);
        doc.text('Amount', 400, startY);
        doc.moveTo(50, doc.y + 5).lineTo(500, doc.y + 5).stroke();
        doc.moveDown(0.5);

        // Items
        let currentY = doc.y;
        (sale.items || []).forEach(item => {
          const itemAmt = item.price * item.quantity;
          doc.text(item.name || 'Product', 50, currentY);
          doc.text(item.quantity?.toString(), 250, currentY);
          doc.text(item.price?.toString(), 300, currentY);
          doc.text(itemAmt.toString(), 400, currentY);
          currentY += 20;
        });

        doc.y = currentY + 10;
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown();

        // Summary
        doc.text(`Subtotal: Rs. ${sale.subtotal}`, { align: 'right' });
        if (sale.discount_percent > 0) {
          doc.text(`Discount: ${sale.discount_percent}%`, { align: 'right' });
        }
        if (sale.tax_amount > 0) {
          doc.text(`Tax (GST): Rs. ${sale.tax_amount}`, { align: 'right' });
        }
        doc.fontSize(14).text(`Total: Rs. ${sale.total}`, { align: 'right' });
        doc.moveDown();

        // Total in words
        try {
          const totalWords = numberToWords.toWords(Math.round(sale.total)).toUpperCase();
          doc.fontSize(10).text(`Amount in words: RUPEES ${totalWords} ONLY`);
        } catch(e) {
          doc.fontSize(10).text(`Amount in words: Rs. ${sale.total}`); // Fallback
        }

        doc.end();
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
};
