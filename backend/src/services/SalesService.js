import { SalesRepository } from "../repositories/SalesRepository.js";
import { InventoryRepository } from "../repositories/InventoryRepository.js";

export const SalesService = {
    async getAllSales() {
        const data = await SalesRepository.findAllSales(100, 'date', false); // Latest 100

        // Format for frontend (Recharts mostly)
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

    async getWeeklySales() {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString(); // Now

        // Using findSalesByDateRange which sorts ascending by default usually
        const data = await SalesRepository.findSalesByDateRange(startDate, endDate);

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

    async createSale(salePayload) {
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
        } = salePayload;

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
            items, // JSONB
            subtotal,
            // Map input discount/discount_percent to DB column 'discount_percent'
            // The user validated that DB has 'discount_percent'
            discount_percent: discount_percent || discount || 0,
            tax_amount: finalTax,
            total,
            payment_method,
            payment_status,
            date: new Date().toISOString()
        };

        const sale = await SalesRepository.create(saleData);

        // 2. Update Inventory Stock (Batch Aware)
        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (!item.quantity) continue;

                if (item.batchId) {
                    // A. Batch-Specific Update
                    const { data: batch, error } = await InventoryRepository.getBatchById(item.batchId);

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

                        await InventoryRepository.updateBatch(item.batchId, updates);
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

    async updateSale(id, updateData) {
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

        const sale = await SalesRepository.update(id, updateData);
        return sale;
    },

    async deleteSale(saleId) {
        // 1. Fetch sale to get items for restocking
        let sale;
        try {
            sale = await SalesRepository.findById(saleId);
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
                    const { data: batch, error } = await InventoryRepository.getBatchById(item.batchId);
                    if (!error && batch) {
                        const newStock = batch.stock + item.quantity;
                        await InventoryRepository.updateBatch(item.batchId, {
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

        // 3. Delete Sale
        // We'll try to delete. If it fails due to FK, we catch it.
        try {
            // Attempt to manually delete linked items if they exist as a table (handling potential lack of Cascade)
            // This is a guess that 'sale_items' might exist and block delete. 
            // Ideally we shouldn't need this if Cascade is set, or if we use JSONB.
            // But 'sale_items' might be zombie table.
            // await supabase.from('sale_items').delete().eq('sale_id', saleId); // Can't easily import supabase here without making it messy

            await SalesRepository.deleteById(saleId);
        } catch (err) {
            throw new Error(`Database Delete Failed: ${err.message}`);
        }

        return { message: "Sale deleted successfully" };
    },

    async getSummary() {
        const data = await SalesRepository.getSalesForSummary();
        const totalSales = Array.isArray(data) ? data.reduce((acc, s) => acc + Number(s.total || 0), 0) : 0;
        const totalOrders = Array.isArray(data) ? data.length : 0;
        const avgOrderValue = totalOrders ? Math.round(totalSales / totalOrders) : 0;
        return { totalSales, totalOrders, avgOrderValue };
    },

    async getTrend() {
        const data = await SalesRepository.fetchDateAndTotal();
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
