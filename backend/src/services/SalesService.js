import { SalesRepository } from "../repositories/SalesRepository.js";
import { InventoryRepository } from "../repositories/InventoryRepository.js";
import { ReminderService } from "./ReminderService.js";
import { supabase } from "../config/db.js";

export const SalesService = {
    async getAllSales(userId) {
        // Keeps the existing chart format for backward compatibility if needed
        const data = await SalesRepository.findAllSales(userId, 100, 'date', false); 
        return data.map((item) => {
            const raw = item.date || item.created_at || null;
            const name = raw
                ? new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                : item.name || "";
            return {
                name,
                value: Number(item.total ?? item.amount ?? item.value ?? 0),
            };
        });
    },

    async getSalesList(userId) {
        return await SalesRepository.findAllSales(userId, 100);
    },

    async getWeeklySales(userId) {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString(); // Now

        // Using findSalesByDateRange which sorts ascending by default usually
        const data = await SalesRepository.findSalesByDateRange(userId, startDate, endDate);

        // Group sales by day of week
        const dailySales = Array(7).fill(0);
        data.forEach((sale) => {
            const dayIndex = new Date(sale.created_at || sale.date).getDay(); // 0–6
            dailySales[dayIndex] += (Number(sale.total) || 0);
        });

        const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return labels.map((name, i) => ({
            name,
            value: dailySales[i],
        }));
    },

    async createSale(userId, salePayload) {
        const {
            customer_id,
            items,
            subtotal,
            gst_percent,
            discount_percent,
            discount, // Getting discount amount
            tax_amount, // Getting tax amount
            total,
            payment_method,
            payment_status,
            amount_paid
        } = salePayload;

        // Logic for auto-setting amount_paid based on status
        let finalAmountPaid = Number(amount_paid || 0);
        if (payment_status === 'paid') {
            finalAmountPaid = Number(total);
        } else if (payment_status === 'unpaid') {
            finalAmountPaid = 0;
        }

        // Calculate tax_amount if missing but gst_percent is present
        let finalTax = Number(tax_amount);
        if (isNaN(finalTax)) {
            if (gst_percent && subtotal) {
                // Assuming exclusive tax: subtotal * percent / 100
                finalTax = (Number(subtotal) * Number(gst_percent)) / 100;
            } else {
                finalTax = 0;
            }
        }

        // 1. Create Sale
        const saleData = {
            customer_id,
            invoice_no: `INV-${Date.now()}`, // Inject unique invoice number to satisfy DB constraint
            items, // JSONB
            subtotal,
            discount_percent: discount_percent || discount || 0,
            tax_amount: finalTax,
            total,
            payment_method,
            payment_status,
            amount_paid: finalAmountPaid,
            date: new Date().toISOString(),
            due_date: salePayload.due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        const sale = await SalesRepository.create(userId, saleData);

        // 3. AUTO-SEND WHATSAPP (New Feature)
        try {
            const settings = await ReminderService.getSettings(userId);
            if (settings?.auto_send_on_create) {
                // Fetch customer phone number
                const { data: customer } = await supabase.from('customers').select('name, phone').eq('id', customer_id).single();
                
                if (customer?.phone) {
                    const { data: userData } = await supabase.from('users').select('business_name').eq('id', userId).single();
                    const shopName = userData?.business_name || "FinSathi";
                    const msg = `Hi ${customer.name}, your bill #${sale.invoice_no} of ₹${total} has been generated.`;
                    
                    // We don't await this to keep the API response snappy
                    ReminderService.sendMessage(customer.phone, sale, shopName, msg).catch(e => console.error("Auto-send background error:", e));
                }
            }
        } catch (autoErr) {
            console.error("WhatsApp Auto-send check failed:", autoErr);
        }

        // 4. Update Customer Khata (Ledger)
        if (customer_id && sale.payment_status !== 'paid') {
            try {
                const credit_amount = Number(sale.total) - Number(sale.amount_paid);
                if (credit_amount > 0) {
                    // Get current customer balance
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('outstanding_balance')
                        .eq('id', customer_id)
                        .single();
                        
                    const newBalance = Number(customer?.outstanding_balance || 0) + credit_amount;
                    
                    await supabase
                        .from('customers')
                        .update({ outstanding_balance: newBalance })
                        .eq('id', customer_id);
                }
            } catch (ledgerErr) {
                console.error("Khata Ledger Update failed:", ledgerErr);
            }
        }

        // 5. Check and Update Inventory Stock (Batch Aware)
        if (items && Array.isArray(items)) {
            // First pass: Validate stock
            for (const item of items) {
                if (!item.quantity) continue;
                if (item.batchId) {
                    const { data: batch } = await supabase.from('inventory_batches').select('stock').eq('id', item.batchId).single();
                    if (!batch || batch.stock < item.quantity) {
                        throw new Error(`Insufficient stock for batch of product ${item.productId}. Available: ${batch?.stock || 0}, Required: ${item.quantity}`);
                    }
                } else {
                    const { data: inv } = await supabase.from('inventory').select('stock').eq('id', item.productId).single();
                    if (!inv || inv.stock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${item.productId}. Available: ${inv?.stock || 0}, Required: ${item.quantity}`);
                    }
                }
            }

            // Second pass: Update stock
            for (const item of items) {
                if (!item.quantity) continue;

                if (item.batchId) {
                    // A. Batch-Specific Update
                    const { data: batch, error } = await InventoryRepository.getBatchById(userId, item.batchId);

                    if (!error && batch) {
                        const newStock = batch.stock - item.quantity;

                        const updates = {
                            stock: newStock,
                            updated_at: new Date().toISOString()
                        };

                        if (newStock <= 0) {
                            updates.zero_stock_since = new Date().toISOString();
                        } else {
                            updates.zero_stock_since = null;
                        }

                        await InventoryRepository.updateBatch(userId, item.batchId, updates);
                    } else {
                        console.warn(`Batch ${item.batchId} not found, trying fallback.`);
                    }
                }

                // Fallback or Legacy: Update Master Stock
                if (!item.batchId && item.productId) {
                    await InventoryRepository.decrementMasterStockLegacy(item.productId, item.quantity);
                }
            }
        }

        return sale;
    },

    async updateSale(userId, id, updateData) {
        // Logic to sync amount_paid if payment_status changes
        if (updateData.payment_status) {
            if (updateData.payment_status === 'paid') {
                updateData.amount_paid = updateData.total; // Fully paid
            } else if (updateData.payment_status === 'unpaid') {
                updateData.amount_paid = 0;
            } else if (updateData.payment_status === 'partial') {
                // partial logic is complex without explicit amount input, 
                // but usually 'updateData' might come with amount_paid if user edited it.
                // If not, we leave it or default? 
                // SAFE implementation: If user passes amount_paid, use it. 
                // If not and status is partial, we don't auto-set it (or assume 0? No).
            }
        }

        // Also if 'total' changed and it's 'paid', we should update 'amount_paid' to new total?
        // Yes, if status is 'paid', amount_paid should equal total.
        if (updateData.payment_status === 'paid' && updateData.total) {
            updateData.amount_paid = updateData.total;
        }

        // Fetch original sale to calculate balance difference
        const originalSale = await SalesRepository.findById(userId, id);

        const sale = await SalesRepository.update(userId, id, updateData);

        // Khata Adjustment on Update
        if (originalSale && originalSale.customer_id) {
            const oldCredit = Number(originalSale.total) - Number(originalSale.amount_paid);
            const newCredit = Number(sale.total) - Number(sale.amount_paid);
            const diff = newCredit - oldCredit;
            
            if (diff !== 0) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('outstanding_balance')
                    .eq('id', originalSale.customer_id)
                    .single();
                    
                const newBalance = Number(customer?.outstanding_balance || 0) + diff;
                await supabase
                    .from('customers')
                    .update({ outstanding_balance: newBalance })
                    .eq('id', originalSale.customer_id);
            }
        }

        return sale;
    },

    async deleteSale(userId, saleId) {
        // 1. Fetch sale to get items for restocking
        let sale;
        try {
            sale = await SalesRepository.findById(userId, saleId);
        } catch (err) {
            // If invalid ID syntax (e.g. uuid vs int), current helper might throw
            throw new Error(`Invalid Sale ID or Sale Not Found: ${err.message}`);
        }

        if (!sale) throw new Error("Sale not found");

        const items = sale.items; // JSONB column assumed

        // 2. Restore Inventory (Best Effort)
        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (!item.quantity) continue;
                if (!item.batchId) continue;

                try {
                    const { data: batch, error } = await InventoryRepository.getBatchById(userId, item.batchId);
                    if (!error && batch) {
                        const newStock = batch.stock + item.quantity;
                        await InventoryRepository.updateBatch(userId, item.batchId, {
                            stock: newStock,
                            updated_at: new Date().toISOString(),
                            zero_stock_since: null
                        });
                    }
                } catch (invErr) {
                    console.error(`Failed to restore stock for batch ${item.batchId}:`, invErr);
                    // Continue deletion even if stock restore fails
                }
            }
        }

        // 3. Khata Reversal
        if (sale.customer_id && sale.payment_status !== 'paid') {
            const credit_amount = Number(sale.total) - Number(sale.amount_paid);
            if (credit_amount > 0) {
                try {
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('outstanding_balance')
                        .eq('id', sale.customer_id)
                        .single();
                        
                    const newBalance = Number(customer?.outstanding_balance || 0) - credit_amount;
                    
                    await supabase
                        .from('customers')
                        .update({ outstanding_balance: newBalance })
                        .eq('id', sale.customer_id);
                } catch (ledgerErr) {
                    console.error("Khata Reversal failed:", ledgerErr);
                }
            }
        }

        // 4. Delete Sale
        // We'll try to delete. If it fails due to FK, we catch it.
        try {
            // Attempt to manually delete linked items if they exist as a table (handling potential lack of Cascade)
            // This is a guess that 'sale_items' might exist and block delete. 
            // Ideally we shouldn't need this if Cascade is set, or if we use JSONB.
            // But 'sale_items' might be zombie table.
            // await supabase.from('sale_items').delete().eq('sale_id', saleId); // Can't easily import supabase here without making it messy

            await SalesRepository.deleteById(userId, saleId);
        } catch (err) {
            throw new Error(`Database Delete Failed: ${err.message}`);
        }

        return { message: "Sale deleted successfully" };
    },

    async getSummary(userId) {
        const data = await SalesRepository.getSalesForSummary(userId);
        const totalSales = Array.isArray(data) ? data.reduce((acc, s) => acc + Number(s.total || 0), 0) : 0;
        const totalOrders = Array.isArray(data) ? data.length : 0;
        const avgOrderValue = totalOrders ? Math.round(totalSales / totalOrders) : 0;
        return { totalSales, totalOrders, avgOrderValue };
    },

    async getTrend(userId) {
        const data = await SalesRepository.fetchDateAndTotal(userId);
        const grouped = {};
        (data || []).forEach((item) => {
            const raw = item.date || item.created_at || null;
            if (!raw) return;
            const key = new Date(raw).toISOString().split("T")[0];
            grouped[key] = (grouped[key] || 0) + Number(item.total || 0);
        });

        return Object.keys(grouped)
            .sort()
            .map((k) => ({ date: k, total_sales: grouped[k] }));
    }
};
