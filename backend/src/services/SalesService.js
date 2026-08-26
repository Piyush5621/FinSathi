import { SalesRepository } from "../repositories/SalesRepository.js";
import { InventoryRepository } from "../repositories/InventoryRepository.js";
import { ReminderService } from "./ReminderService.js";
import { StockService } from "../modules/inventory/services/StockService.js";
import { FinancialCacheService } from "../utils/cache.js";
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
        // 0. Idempotency Check for Offline Sync & Network Retries
        const idempotencyKey = salePayload.idempotency_key || salePayload.idempotencyKey || salePayload.client_id || salePayload.offline_id;
        if (idempotencyKey) {
            try {
                // Check if a sale with this idempotency key was already created
                const { data: existingSales } = await supabase
                    .from("sales")
                    .select("*")
                    .eq("user_id", userId)
                    .order("date", { ascending: false })
                    .limit(100);

                if (existingSales && Array.isArray(existingSales)) {
                    const matched = existingSales.find(s => 
                        (s.idempotency_key && s.idempotency_key === idempotencyKey) ||
                        (s.notes && s.notes.includes(`[IDEM:${idempotencyKey}]`)) ||
                        (salePayload.invoice_no && s.invoice_no === salePayload.invoice_no)
                    );
                    if (matched) {
                        return matched;
                    }
                }
            } catch (idemErr) {
                console.warn("[SalesService] Idempotency check warning:", idemErr.message);
            }
        }

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

        // 1. Resolve Organization ID for user
        let orgId = salePayload.organization_id || salePayload.organizationId;
        if (!orgId) {
            try {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', userId)
                    .maybeSingle();
                orgId = userRecord?.organization_id || userId;
            } catch {
                orgId = userId;
            }
        }

        // 2. Resolve Active Warehouse ID
        let whId = salePayload.warehouse_id || salePayload.warehouseId;
        if (!whId) {
            try {
                const { data: wh } = await supabase
                    .from('warehouses')
                    .select('id')
                    .or(`organization_id.eq.${orgId},user_id.eq.${userId}`)
                    .eq('is_active', true)
                    .order('is_main_hub', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                whId = wh?.id;
            } catch {}

            if (!whId) {
                try {
                    const { data: newWh } = await supabase
                        .from('warehouses')
                        .insert({
                            user_id: userId,
                            organization_id: orgId,
                            name: 'Main Warehouse',
                            is_main_hub: true
                        })
                        .select('id')
                        .maybeSingle();
                    whId = newWh?.id || '00000000-0000-0000-0000-000000000001';
                } catch {
                    whId = '00000000-0000-0000-0000-000000000001';
                }
            }
        }

        // 3. Create Sale Record
        const saleData = {
            customer_id,
            store_id: salePayload.store_id || salePayload.storeId || null,
            invoice_no: salePayload.invoice_no || `INV-${Date.now()}`, // Inject unique invoice number to satisfy DB constraint
            items, // JSONB
            subtotal,
            discount_percent: discount_percent || discount || 0,
            tax_amount: finalTax,
            total,
            payment_method,
            payment_status,
            amount_paid: finalAmountPaid,
            date: salePayload.date || new Date().toISOString(),
            due_date: salePayload.due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: idempotencyKey ? `${salePayload.notes ? salePayload.notes + ' ' : ''}[IDEM:${idempotencyKey}]` : (salePayload.notes || null)
        };

        const sale = await SalesRepository.create(userId, saleData);

        // 4. Atomically Deduct Stock via Modern Stock Engine (StockService)
        // Uses SELECT FOR UPDATE row-locking on warehouse_stock, FEFO batch selection,
        // and appends immutable records to inventory_movements.
        if (items && Array.isArray(items) && items.length > 0) {
            try {
                await StockService.deductSaleStock(orgId, {
                    warehouseId: whId,
                    saleId: sale.id,
                    items
                }, userId);
            } catch (stockErr) {
                // Atomic Rollback: remove the created sale record if stock deduction fails
                try {
                    await SalesRepository.deleteById(userId, sale.id);
                } catch (delErr) {
                    console.error("Sale rollback delete error:", delErr.message);
                }
                throw stockErr;
            }
        }

        // 5. AUTO-SEND WHATSAPP (New Feature)
        try {
            const settings = await ReminderService.getSettings(userId);
            if (settings?.auto_send_on_create) {
                // Fetch customer phone number
                const { data: customer } = await supabase.from('customers').select('name, phone').eq('id', customer_id).single();
                
                if (customer?.phone) {
                    const { data: userData } = await supabase.from('users').select('business_name').eq('id', userId).single();
                    const shopName = userData?.business_name || "Karobar";
                    const msg = `Hi ${customer.name}, your bill #${sale.invoice_no} of ₹${total} has been generated.`;
                    
                    // We don't await this to keep the API response snappy
                    ReminderService.sendMessage(customer.phone, sale, shopName, msg).catch(e => console.error("Auto-send background error:", e));
                }
            }
        } catch (autoErr) {
            console.error("WhatsApp Auto-send check failed:", autoErr);
        }

        // 6. Update Customer Khata (Ledger)
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

        // 7. Invalidate Financial Intelligence Cache for affected Organization & User
        try {
            await FinancialCacheService.invalidate(orgId, userId);
        } catch (cacheErr) {
            console.warn("[SalesService] Cache invalidation warning:", cacheErr.message);
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
                // Keep provided amount_paid
            }
        }

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
                try {
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
                } catch (kErr) {
                    console.error("Khata update error on updateSale:", kErr.message);
                }
            }
        }

        try {
            let orgId = sale.organization_id || userId;
            await FinancialCacheService.invalidate(orgId, userId);
        } catch (cacheErr) {
            console.warn("[SalesService] Cache invalidation warning on update:", cacheErr.message);
        }

        return sale;
    },

    async deleteSale(userId, saleId) {
        // 1. Fetch sale to get items for restocking
        let sale;
        try {
            sale = await SalesRepository.findById(userId, saleId);
        } catch (err) {
            throw new Error(`Invalid Sale ID or Sale Not Found: ${err.message}`);
        }

        if (!sale) throw new Error("Sale not found");

        const items = sale.items;

        // 2. Restore Inventory via Stock Engine
        if (items && Array.isArray(items) && items.length > 0) {
            try {
                const orgId = sale.organization_id || userId;
                const returnItems = items
                    .filter(i => (i.quantity || 0) > 0 && (i.productId || i.product_id))
                    .map(i => ({
                        productId: i.productId || i.product_id,
                        quantity: Number(i.quantity),
                        batchId: i.batchId || null
                    }));

                if (returnItems.length > 0) {
                    await StockService.processSalesReturn(orgId, {
                        warehouseId: sale.warehouse_id || "00000000-0000-0000-0000-000000000001",
                        saleId: sale.id || saleId,
                        items: returnItems
                    }, userId);
                }
            } catch (stockErr) {
                console.warn(`[SalesService] StockService return on delete fallback: ${stockErr.message}`);
                // Best Effort fallback for legacy items
                for (const item of items) {
                    if (!item.quantity || !item.batchId) continue;
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
                    }
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
        try {
            await SalesRepository.deleteById(userId, saleId);
        } catch (err) {
            throw new Error(`Database Delete Failed: ${err.message}`);
        }

        try {
            let orgId = sale.organization_id || userId;
            await FinancialCacheService.invalidate(orgId, userId);
        } catch (cacheErr) {
            console.warn("[SalesService] Cache invalidation warning on delete:", cacheErr.message);
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
    },

    async returnSale(userId, saleId, returnPayload) {
        // 1. Fetch original sale
        const sale = await SalesRepository.findById(userId, saleId);
        if (!sale) {
            const err = new Error("Sale not found.");
            err.statusCode = 404;
            throw err;
        }

        const { items: payloadItems, returnItems, reason, refund_payment_mode, idempotency_key } = returnPayload || {};
        const itemsToProcess = payloadItems || returnItems;

        if (!itemsToProcess || !Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
            const err = new Error("Return items list is required.");
            err.statusCode = 400;
            throw err;
        }

        // 2. Inspect existing returns on sale
        const previousReturns = Array.isArray(sale.returns) ? sale.returns : [];

        // Check idempotency
        if (idempotency_key) {
            const existingReturn = previousReturns.find(r => r.idempotency_key === idempotency_key);
            if (existingReturn) {
                const err = new Error("This return request has already been processed.");
                err.statusCode = 409;
                err.returnRecord = existingReturn;
                throw err;
            }
        }

        // Compute already returned quantity per product/variant
        const alreadyReturnedMap = {};
        for (const ret of previousReturns) {
            for (const item of ret.items || []) {
                const key = `${item.productId || item.product_id || item.inventory_id || item.id}:${item.variantId || item.variant_id || 'null'}`;
                alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + Number(item.quantity || 0);
            }
        }

        // 3. Validate every return item against original sale lines
        const saleItems = Array.isArray(sale.items) ? sale.items : [];
        const validatedItemsToRestore = [];
        let totalRefundAmount = 0;

        for (const rItem of itemsToProcess) {
            const retQty = Number(rItem.quantity || 0);
            if (retQty <= 0) {
                const err = new Error("Return quantity must be greater than zero.");
                err.statusCode = 400;
                throw err;
            }

            const targetProdId = rItem.productId || rItem.product_id || rItem.inventory_id || rItem.id;
            const targetVariantId = rItem.variantId || rItem.variant_id || null;

            // Find matching line in original sale
            const originalLine = saleItems.find(item => {
                const pId = item.productId || item.product_id || item.inventory_id || item.id;
                const vId = item.variantId || item.variant_id || null;
                return String(pId) === String(targetProdId) && String(vId) === String(targetVariantId);
            });

            if (!originalLine) {
                const err = new Error(`Item '${rItem.name || targetProdId}' does not belong to this sale.`);
                err.statusCode = 400;
                throw err;
            }

            const soldQty = Number(originalLine.quantity || 0);
            const key = `${targetProdId}:${targetVariantId || 'null'}`;
            const alreadyReturned = alreadyReturnedMap[key] || 0;
            const availableToReturn = soldQty - alreadyReturned;

            if (retQty > availableToReturn) {
                const err = new Error(`Cannot return ${retQty} units of '${originalLine.name || 'product'}'. Only ${availableToReturn} remaining.`);
                err.statusCode = 400;
                throw err;
            }

            // Update in-memory map for intra-request duplicates
            alreadyReturnedMap[key] = alreadyReturned + retQty;

            const unitPrice = Number(originalLine.price || originalLine.selling_price || 0);
            const unitCost = Number(originalLine.cost_price || originalLine.costPrice || 0);
            const batchId = originalLine.batchId || originalLine.batch_id || rItem.batchId || rItem.batch_id || null;
            const lineRefund = unitPrice * retQty;
            totalRefundAmount += lineRefund;

            validatedItemsToRestore.push({
                productId: targetProdId,
                variantId: targetVariantId,
                batchId: batchId,
                quantity: retQty,
                unitPrice: unitPrice,
                costPrice: unitCost,
                refundAmount: lineRefund,
                name: originalLine.name || originalLine.product_name || "Product"
            });
        }

        // 4. Resolve Organization and Warehouse
        let orgId = sale.organization_id || sale.organizationId;
        if (!orgId) {
            try {
                const { data: userRecord } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', userId)
                    .maybeSingle();
                orgId = userRecord?.organization_id || userId;
            } catch {
                orgId = userId;
            }
        }

        let whId = sale.warehouse_id || sale.warehouseId;
        if (!whId) {
            try {
                const { data: wh } = await supabase
                    .from('warehouses')
                    .select('id')
                    .or(`organization_id.eq.${orgId},user_id.eq.${userId}`)
                    .eq('is_active', true)
                    .order('is_main_hub', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                whId = wh?.id;
            } catch {}

            if (!whId) {
                whId = '00000000-0000-0000-0000-000000000001';
            }
        }

        const returnId = `RET-${Date.now().toString().slice(-6)}`;

        // 5. Restore stock through modern Stock Engine
        await StockService.returnSaleStock(orgId, {
            warehouseId: whId,
            saleId: sale.id,
            returnId,
            items: validatedItemsToRestore
        }, userId);

        // 6. Build Return Record
        const newReturnRecord = {
            return_id: returnId,
            created_at: new Date().toISOString(),
            items: validatedItemsToRestore,
            total_refund_amount: totalRefundAmount,
            reason: reason || "Customer Return",
            refund_payment_mode: refund_payment_mode || "cash",
            idempotency_key: idempotency_key || null,
            created_by: userId
        };

        const updatedReturns = [...previousReturns, newReturnRecord];

        // Determine if sale is fully returned or partially returned
        let totalSoldUnits = 0;
        for (const item of saleItems) totalSoldUnits += Number(item.quantity || 0);

        let totalReturnedUnits = 0;
        for (const r of updatedReturns) {
            for (const it of r.items || []) totalReturnedUnits += Number(it.quantity || 0);
        }

        const returnStatus = totalReturnedUnits >= totalSoldUnits ? "fully_returned" : "partially_returned";

        // 7. Update Sale record in database
        const updatedSale = await SalesRepository.update(userId, saleId, {
            returns: updatedReturns,
            return_status: returnStatus,
            updated_at: new Date().toISOString()
        });

        // 8. If credit sale and refund is credited back to Khata
        if (sale.customer_id && refund_payment_mode === "credit") {
            try {
                const { data: customer } = await supabase
                    .from("customers")
                    .select("outstanding_balance")
                    .eq("id", sale.customer_id)
                    .single();

                if (customer) {
                    const currentBal = Number(customer.outstanding_balance || 0);
                    const newBal = Math.max(0, currentBal - totalRefundAmount);
                    await supabase
                        .from("customers")
                        .update({ outstanding_balance: newBal, updated_at: new Date().toISOString() })
                        .eq("id", sale.customer_id);
                }
            } catch (kErr) {
                console.error("Khata adjustment warning on return:", kErr.message);
            }
        }

        // 9. Invalidate Financial Intelligence Cache
        try {
            await FinancialCacheService.invalidate(orgId, userId);
        } catch (cacheErr) {
            console.warn("[SalesService] Cache invalidation warning on return:", cacheErr.message);
        }

        return {
            success: true,
            message: "Sales return processed successfully.",
            returnRecord: newReturnRecord,
            sale: updatedSale
        };
    },

    async processSalesReturn(userId, saleIdOrPayload, returnPayload = {}) {
        if (typeof saleIdOrPayload === "object" && saleIdOrPayload !== null) {
            const { saleId, ...rest } = saleIdOrPayload;
            return this.returnSale(userId, saleId, rest);
        }
        return this.returnSale(userId, saleIdOrPayload, returnPayload);
    }
};
