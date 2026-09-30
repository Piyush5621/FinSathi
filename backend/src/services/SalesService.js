import { SalesRepository } from "../repositories/SalesRepository.js";
import { InventoryRepository } from "../repositories/InventoryRepository.js";
import { ReminderService } from "./ReminderService.js";
import { StockService } from "../modules/inventory/services/StockService.js";
import { FinancialCacheService } from "../utils/cache.js";
import { supabase } from "../config/db.js";
import { adminSupabase } from "../admin/adminSupabase.js";
import { adjustCustomerKhataBalance } from "../utils/khataBalanceHelper.js";
import { incrementPlanUsage } from "../middleware/planGuard.js";
import { getPostgresPool } from "../config/postgres.js";
import { refreshDashboardView } from "../utils/refreshView.js";
import { GstService } from "./GstService.js";

// In-flight request mutex for concurrent idempotency safety
const inFlightSales = new Map();

/**
 * Generates a collision-resistant sequential invoice number scoped to the current year and user
 */
async function generateNextInvoiceNo(userId) {
  const year = new Date().getFullYear();
  try {
    const { data: latestSales } = await adminSupabase
      .from("sales")
      .select("invoice_no")
      .eq("user_id", userId)
      .ilike("invoice_no", `INV-${year}-%`)
      .order("created_at", { ascending: false })
      .limit(15);

    let maxSeq = 0;
    if (latestSales && Array.isArray(latestSales)) {
      for (const s of latestSales) {
        if (!s.invoice_no) continue;
        const match = s.invoice_no.match(/INV-\d{4}-(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    return `INV-${year}-${String(nextSeq).padStart(4, "0")}`;
  } catch (err) {
    console.warn("[SalesService] Sequential invoice generation fallback:", err.message);
    return `INV-${year}-${Date.now().toString().slice(-6)}`;
  }
}

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

    async getSalesList(userId, options = {}) {
        if (options && (options.page || options.limit || options.search || options.status || options.customer_id || options.paginated)) {
            return await SalesRepository.findSalesWithPagination(userId, options);
        }
        return await SalesRepository.findAllSales(userId, options?.limit || 100);
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
        if (!userId) {
            throw new Error("Authentication error: User ID is required to create a sale.");
        }

        // 0. Concurrency-Safe Idempotency Handling
        const idempotencyKey = salePayload.idempotency_key || salePayload.idempotencyKey || salePayload.client_id || salePayload.offline_id;
        const lockKey = idempotencyKey ? `${userId}:${idempotencyKey}` : null;

        // If identical request is currently in-flight, await its completion
        if (lockKey && inFlightSales.has(lockKey)) {
            console.log(`[SalesService] Awaiting in-flight sale promise for key ${idempotencyKey}`);
            return await inFlightSales.get(lockKey);
        }

        const saleExecution = (async () => {
            // Check if sale with this idempotency key was already committed
            if (idempotencyKey) {
                try {
                    const { data: existingSales } = await adminSupabase
                        .from("sales")
                        .select("*, customers(name)")
                        .eq("user_id", userId)
                        .ilike("notes", `%[IDEM:${idempotencyKey}]%`)
                        .limit(1);

                    if (existingSales && existingSales.length > 0) {
                        console.log(`[SalesService] Duplicate request intercepted via DB idempotency key: ${idempotencyKey}`);
                        return existingSales[0];
                    }
                } catch (idemErr) {
                    console.warn("[SalesService] Idempotency DB check warning:", idemErr.message);
                }
            }

            // Check if provided invoice_no already exists (e.g. synced offline bill)
            if (salePayload.invoice_no) {
                try {
                    const { data: existingByNo } = await adminSupabase
                        .from("sales")
                        .select("*, customers(name)")
                        .eq("user_id", userId)
                        .eq("invoice_no", salePayload.invoice_no)
                        .limit(1);

                    if (existingByNo && existingByNo.length > 0) {
                        console.log(`[SalesService] Existing invoice intercepted by invoice_no: ${salePayload.invoice_no}`);
                        return existingByNo[0];
                    }
                } catch (err) {
                    console.warn("[SalesService] Invoice number duplicate check warning:", err.message);
                }
            }

            const {
                customer_id,
                items,
                subtotal,
                gst_percent,
                discount_percent,
                discount,
                tax_amount,
                total,
                payment_method = "cash",
                payment_status = "paid",
                amount_paid
            } = salePayload;

            if (!items || !Array.isArray(items) || items.length === 0) {
                throw new Error("Cannot create a sale without items.");
            }

            // 1. BUSINESS & CUSTOMER INTEGRITY CHECKS
            if (customer_id) {
                const { data: customer, error: custErr } = await adminSupabase
                    .from("customers")
                    .select("id, name, outstanding_balance, user_id")
                    .eq("id", customer_id)
                    .eq("user_id", userId)
                    .maybeSingle();

                if (custErr || !customer) {
                    throw new Error(`Customer '${customer_id}' does not belong to your business or was not found.`);
                }
            }

            // Verify Store ownership if provided
            let storeId = salePayload.store_id || salePayload.storeId || null;
            if (storeId) {
                const { data: storeCheck } = await adminSupabase
                    .from("stores")
                    .select("id")
                    .eq("id", storeId)
                    .eq("user_id", userId)
                    .maybeSingle();

                if (!storeCheck) {
                    storeId = null;
                }
            }

            // 2. PRODUCT OWNERSHIP & SANITY CHECK
            for (const item of items) {
                const pId = item.productId || item.product_id;
                const qty = Number(item.quantity || 0);

                if (!pId) throw new Error("Product ID is required for each sale line.");
                if (qty <= 0) throw new Error(`Invalid quantity (${qty}) for product '${item.product_name || pId}'.`);

                const { data: prodCheck, error: prodErr } = await adminSupabase
                    .from("inventory")
                    .select("id, name, user_id, price")
                    .eq("id", pId)
                    .eq("user_id", userId)
                    .maybeSingle();

                if (prodErr || !prodCheck) {
                    throw new Error(`Product '${item.product_name || pId}' does not belong to your business or was not found.`);
                }
            }

            // 3. FINANCIAL TOTALS & PAYMENT RECONCILIATION
            const computedSubtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
            const computedGst = items.reduce((sum, item) => {
                const lineAmt = Number(item.price || 0) * Number(item.quantity || 1);
                return sum + (lineAmt * (Number(item.gst_percent || 0) / 100));
            }, 0);

            let computedDiscount = 0;
            if (discount_percent) {
                computedDiscount = (computedSubtotal * Number(discount_percent || 0)) / 100;
            } else if (discount || salePayload.discount_amount) {
                computedDiscount = Math.min(computedSubtotal, Number(discount || salePayload.discount_amount || 0));
            }

            const expectedGrandTotal = Math.max(0, Math.round(computedSubtotal + computedGst - computedDiscount));
            const finalTotal = total !== undefined ? Number(total) : expectedGrandTotal;

            // Logic for auto-setting amount_paid based on status
            let finalAmountPaid = Number(amount_paid || 0);
            if (payment_status === 'paid') {
                finalAmountPaid = finalTotal;
            } else if (payment_status === 'unpaid') {
                finalAmountPaid = 0;
            } else if (payment_status === 'partial') {
                finalAmountPaid = Math.min(finalTotal, Math.max(0, Number(amount_paid || 0)));
            }

            // Verify split payments allocation if applicable
            if (payment_method === 'split' && salePayload.split_details) {
                const { cash = 0, upi = 0, card = 0 } = salePayload.split_details;
                const splitSum = Math.round((Number(cash) + Number(upi) + Number(card)) * 100) / 100;
                if (Math.abs(splitSum - finalAmountPaid) > 0.05 && Math.abs(splitSum - finalTotal) > 0.05) {
                    throw new Error(`Split payment sum (₹${splitSum}) does not match sale total (₹${finalTotal}).`);
                }
            }

            let finalTax = Number(tax_amount);
            if (isNaN(finalTax)) {
                finalTax = computedGst;
            }

            // Check customer credit limit pre-condition if credit is extended
            const expectedCreditPre = Math.max(0, finalTotal - finalAmountPaid);
            if (customer_id && expectedCreditPre > 0) {
                const { data: custPre } = await adminSupabase
                    .from("customers")
                    .select("credit_limit, outstanding_balance")
                    .eq("id", customer_id)
                    .eq("user_id", userId)
                    .maybeSingle();

                const limit = Number(custPre?.credit_limit || 0);
                const currentBalance = Number(custPre?.outstanding_balance || 0);
                if (limit > 0 && (currentBalance + expectedCreditPre > limit)) {
                    throw new Error(`Credit sale exceeds customer credit limit of ₹${limit.toLocaleString('en-IN')}. Current outstanding: ₹${currentBalance.toLocaleString('en-IN')}, Requested credit: ₹${expectedCreditPre.toLocaleString('en-IN')}.`);
                }
            }

            // 4. Resolve Organization ID for user
            let orgId = salePayload.organization_id || salePayload.organizationId;
            if (!orgId) {
                try {
                    const { data: userRecord } = await adminSupabase
                        .from('users')
                        .select('organization_id')
                        .eq('id', userId)
                        .maybeSingle();
                    orgId = userRecord?.organization_id || userId;
                } catch {
                    orgId = userId;
                }
            }

            // 5. Resolve Active Warehouse ID
            let whId = salePayload.warehouse_id || salePayload.warehouseId;
            if (!whId) {
                try {
                    const { data: wh } = await adminSupabase
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

            // 6. EXECUTE ATOMIC POSTGRESQL TRANSACTION (OR FALLBACK)
            let sale = null;
            const pgPool = getPostgresPool();

            if (pgPool) {
                const client = await pgPool.connect();
                try {
                    await client.query("BEGIN");

                    // Step A: Idempotency Check inside transaction
                    if (idempotencyKey) {
                        const idemCheck = await client.query(
                            `SELECT s.*, c.name as customer_name 
                             FROM public.sales s 
                             LEFT JOIN public.customers c ON s.customer_id = c.id 
                             WHERE s.user_id = $1 AND s.notes LIKE ('%' || '[IDEM:' || $2 || ']' || '%') 
                             LIMIT 1`,
                            [userId, idempotencyKey]
                        );
                        if (idemCheck.rows.length > 0) {
                            await client.query("COMMIT");
                            const row = idemCheck.rows[0];
                            return {
                                ...row,
                                customers: row.customer_name ? { name: row.customer_name } : null
                            };
                        }
                    }

                    // Step B: Duplicate Invoice Number check
                    if (salePayload.invoice_no) {
                        const invCheck = await client.query(
                            `SELECT s.*, c.name as customer_name 
                             FROM public.sales s 
                             LEFT JOIN public.customers c ON s.customer_id = c.id 
                             WHERE s.user_id = $1 AND s.invoice_no = $2 
                             LIMIT 1`,
                            [userId, salePayload.invoice_no]
                        );
                        if (invCheck.rows.length > 0) {
                            await client.query("COMMIT");
                            const row = invCheck.rows[0];
                            return {
                                ...row,
                                customers: row.customer_name ? { name: row.customer_name } : null
                            };
                        }
                    }

                    // Step C: Customer ownership validation & Credit Limit Check
                    let customerName = null;
                    let custRowGstin = null;
                    let custRowState = null;
                    if (customer_id) {
                        const custRes = await client.query(
                            `SELECT id, name, outstanding_balance, credit_limit, gstin, state 
                             FROM public.customers 
                             WHERE id = $1 AND user_id = $2
                             FOR UPDATE`,
                            [customer_id, userId]
                        );
                        if (custRes.rows.length === 0) {
                            throw new Error(`Customer '${customer_id}' does not belong to your business or was not found.`);
                        }
                        const custRow = custRes.rows[0];
                        customerName = custRow.name;
                        custRowGstin = custRow.gstin || null;
                        custRowState = custRow.state || null;
                        const creditLimit = Number(custRow.credit_limit || 0);
                        const currentOutstanding = Number(custRow.outstanding_balance || 0);
                        const creditAmount = Math.max(0, finalTotal - finalAmountPaid);

                        if (creditAmount > 0 && creditLimit > 0 && (currentOutstanding + creditAmount > creditLimit)) {
                            throw new Error(`Credit sale exceeds customer credit limit of ₹${creditLimit.toLocaleString('en-IN')}. Current outstanding: ₹${currentOutstanding.toLocaleString('en-IN')}, Requested credit: ₹${creditAmount.toLocaleString('en-IN')}.`);
                        }
                    }

                    // Step D: Store ownership validation
                    let validStoreId = null;
                    let storeState = null;
                    const effectiveStoreId = salePayload.store_id || salePayload.storeId || null;
                    if (effectiveStoreId) {
                        const storeRes = await client.query(
                            `SELECT id, state FROM public.stores WHERE id = $1 AND user_id = $2`,
                            [effectiveStoreId, userId]
                        );
                        if (storeRes.rows.length > 0) {
                            validStoreId = effectiveStoreId;
                            storeState = storeRes.rows[0].state || null;
                        }
                    }

                    // Step E: Row-level lock on inventory (FOR UPDATE) & stock verification
                    const productIds = Array.from(new Set(items.map(it => it.productId || it.product_id).filter(Boolean)));
                    const prodRowsRes = await client.query(
                        `SELECT id, name, stock, price 
                         FROM public.inventory 
                         WHERE id = ANY($1::uuid[]) AND user_id = $2 
                         FOR UPDATE`,
                        [productIds, userId]
                    );
                    const prodMap = new Map(prodRowsRes.rows.map(r => [r.id, r]));

                    for (const item of items) {
                        const pId = item.productId || item.product_id;
                        const qty = Number(item.quantity || 0);
                        if (!pId) throw new Error("Product ID is required for each sale line.");
                        if (qty <= 0) throw new Error(`Invalid quantity (${qty}) for product '${item.product_name || pId}'.`);

                        const prod = prodMap.get(pId);
                        if (!prod) {
                            throw new Error(`Product '${item.product_name || pId}' does not belong to your business or was not found.`);
                        }
                        if (Number(prod.stock || 0) < qty) {
                            throw new Error(`Insufficient stock for '${prod.name}'. Available: ${prod.stock}, Requested: ${qty}`);
                        }
                        prod.stock = Number(prod.stock) - qty;
                    }

                    // Step F: Deduct master stock, variant stock, store stock, and batch stock
                    const movementIds = [];
                    for (const item of items) {
                        const pId = item.productId || item.product_id;
                        const vId = item.variantId || item.variant_id || null;
                        const bId = item.batchId || item.batch_id || null;
                        const qty = Number(item.quantity || 0);

                        // 1. Deduct master inventory
                        await client.query(
                            `UPDATE public.inventory 
                             SET stock = stock - $1, updated_at = NOW() 
                             WHERE id = $2 AND user_id = $3`,
                            [qty, pId, userId]
                        );

                        // 2. Deduct variant stock if variant item
                        if (vId) {
                            await client.query(
                                `UPDATE public.product_variants 
                                 SET stock = GREATEST(0, stock - $1), updated_at = NOW() 
                                 WHERE id = $2`,
                                [qty, vId]
                            );
                        }

                        // 3. Deduct store_inventory stock
                        let currentStoreBal = 0;
                        if (validStoreId) {
                            let sRes;
                            if (vId) {
                                sRes = await client.query(
                                    `UPDATE public.store_inventory 
                                     SET stock = GREATEST(0, stock - $1), updated_at = NOW() 
                                     WHERE store_id = $2 AND product_id = $3 AND variant_id = $4
                                     RETURNING stock`,
                                    [qty, validStoreId, pId, vId]
                                );
                            } else {
                                sRes = await client.query(
                                    `UPDATE public.store_inventory 
                                     SET stock = GREATEST(0, stock - $1), updated_at = NOW() 
                                     WHERE store_id = $2 AND product_id = $3 AND variant_id IS NULL
                                     RETURNING stock`,
                                    [qty, validStoreId, pId]
                                );
                            }
                            currentStoreBal = sRes.rows[0]?.stock ? Number(sRes.rows[0].stock) : 0;
                        }

                        // 4. Deduct batch stock if specified
                        if (bId) {
                            await client.query(
                                `UPDATE public.inventory_batches 
                                 SET stock = GREATEST(0, stock - $1), updated_at = NOW() 
                                 WHERE id = $2 AND inventory_id = $3`,
                                [qty, bId, pId]
                            );
                        }

                        // 5. Record immutable stock movement
                        const smRes = await client.query(
                            `INSERT INTO public.stock_movements (
                               organization_id, store_id, product_id, variant_id, batch_id, 
                               quantity_change, balance_after, movement_type, reason, reference_type, user_id
                             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                             RETURNING id`,
                            [orgId, validStoreId, pId, vId, bId, -qty, currentStoreBal, 'SALE', 'POS Sale Checkout', 'sales', userId]
                        );
                        if (smRes.rows[0]?.id) movementIds.push(smRes.rows[0].id);
                    }

                    // Step G: Generate Sequential Invoice Number inside transaction
                    let finalInvoiceNo = salePayload.invoice_no;
                    if (!finalInvoiceNo) {
                        const year = new Date().getFullYear().toString();
                        const seqRes = await client.query(
                            `SELECT COALESCE(MAX(
                               CASE 
                                 WHEN invoice_no ~ ('^INV-' || $1 || '-[0-9]+$') 
                                 THEN substring(invoice_no from '^INV-[0-9]{4}-([0-9]+)$')::INT 
                                 ELSE 0 
                               END
                             ), 0) AS max_seq
                             FROM public.sales
                             WHERE user_id = $2 AND invoice_no LIKE ('INV-' || $1 || '-%')`,
                            [year, userId]
                        );
                        const nextSeq = Number(seqRes.rows[0]?.max_seq || 0) + 1;
                        finalInvoiceNo = `INV-${year}-${String(nextSeq).padStart(4, "0")}`;
                    }

                    const notesWithIdem = idempotencyKey 
                        ? `${salePayload.notes ? salePayload.notes + ' ' : ''}[IDEM:${idempotencyKey}]` 
                        : (salePayload.notes || null);

                    // Step G.1: Authoritative GST Breakdown Calculation
                    let merchantState = storeState || null;
                    if (!merchantState) {
                        try {
                            const orgRes = await client.query(`SELECT state FROM public.organizations WHERE id = $1 LIMIT 1`, [orgId]);
                            merchantState = orgRes.rows[0]?.state || '07';
                        } catch {
                            merchantState = '07';
                        }
                    }

                    const effectiveCustGstin = salePayload.customer_gstin || salePayload.customerGstin || custRowGstin || null;
                    const effectiveCustState = salePayload.place_of_supply || salePayload.customer_state || custRowState || (effectiveCustGstin ? GstService.resolveStateFromGstin(effectiveCustGstin)?.stateCode : null);

                    const gstBreakdown = GstService.calculateGst({
                        items,
                        customerState: effectiveCustState,
                        customerGstin: effectiveCustGstin,
                        merchantState,
                        discountAmount: computedDiscount
                    });

                    const authoritativeTax = (tax_amount !== undefined && !isNaN(Number(tax_amount)))
                        ? Number(tax_amount)
                        : gstBreakdown.totalTax;
                    const authoritativeTotal = total !== undefined
                        ? Number(total)
                        : Math.max(0, Math.round(computedSubtotal + authoritativeTax - computedDiscount));

                    // Step H: Insert Sale Record
                    const saleInsertRes = await client.query(
                        `INSERT INTO public.sales (
                            user_id, customer_id, store_id, invoice_no, items, subtotal, 
                            discount_percent, tax_amount, total, payment_method, payment_status, 
                            amount_paid, date, due_date, notes,
                            organization_id, taxable_amount, cgst_amount, sgst_amount, igst_amount,
                            is_inter_state, customer_gstin, place_of_supply, gst_rate
                         ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                            $16, $17, $18, $19, $20, $21, $22, $23, $24
                         ) RETURNING *`,
                        [
                            userId,
                            customer_id || null,
                            validStoreId,
                            finalInvoiceNo,
                            JSON.stringify(items),
                            subtotal !== undefined ? subtotal : computedSubtotal,
                            discount_percent || discount || 0,
                            authoritativeTax,
                            authoritativeTotal,
                            payment_method,
                            payment_status,
                            finalAmountPaid,
                            salePayload.date || new Date().toISOString(),
                            salePayload.due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            notesWithIdem,
                            orgId,
                            gstBreakdown.taxableAmount,
                            gstBreakdown.cgstAmount,
                            gstBreakdown.sgstAmount,
                            gstBreakdown.igstAmount,
                            gstBreakdown.isInterState,
                            gstBreakdown.customerGstin,
                            gstBreakdown.placeOfSupply,
                            gstBreakdown.effectiveRate
                        ]
                    );
                    sale = saleInsertRes.rows[0];
                    if (movementIds.length > 0) {
                        await client.query(
                            `UPDATE public.stock_movements SET reference_id = $1 WHERE id = ANY($2::uuid[])`,
                            [sale.id, movementIds]
                        );
                    }

                    // Step I: Atomic Khata update if credit extended
                    const creditAmount = Math.max(0, Number(sale.total) - Number(sale.amount_paid));
                    if (customer_id && creditAmount > 0) {
                        await client.query(
                            `UPDATE public.customers 
                             SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1 
                             WHERE id = $2 AND user_id = $3`,
                            [creditAmount, customer_id, userId]
                        );
                    }

                    await client.query("COMMIT");

                    if (customerName) {
                        sale.customers = { name: customerName };
                    }
                } catch (txErr) {
                    try {
                        await client.query("ROLLBACK");
                    } catch (rbErr) {
                        console.error("[SalesService] Transaction ROLLBACK warning:", rbErr.message);
                    }
                    throw txErr;
                } finally {
                    client.release();
                }
            } else {
                // Fallback: If DATABASE_URL is not yet configured, execute via hardened service flow
                const finalInvoiceNo = salePayload.invoice_no || await generateNextInvoiceNo(userId);
                const notesWithIdem = idempotencyKey 
                    ? `${salePayload.notes ? salePayload.notes + ' ' : ''}[IDEM:${idempotencyKey}]` 
                    : (salePayload.notes || null);

                // Step A: Deduct stock from inventory
                await StockService.deductSaleStock(orgId, {
                    warehouseId: whId,
                    saleId: null,
                    items
                }, userId);

                // Step B: Insert Sale Record
                const fallbackGstBreakdown = GstService.calculateGst({
                    items,
                    customerState: salePayload.place_of_supply || salePayload.customer_state,
                    customerGstin: salePayload.customer_gstin || salePayload.customerGstin,
                    merchantState: '07',
                    discountAmount: computedDiscount
                });

                const saleData = {
                    customer_id,
                    store_id: storeId,
                    organization_id: orgId,
                    invoice_no: finalInvoiceNo,
                    items, // JSONB
                    subtotal: subtotal !== undefined ? subtotal : computedSubtotal,
                    discount_percent: discount_percent || discount || 0,
                    tax_amount: (tax_amount !== undefined && !isNaN(Number(tax_amount))) ? Number(tax_amount) : fallbackGstBreakdown.totalTax,
                    total: finalTotal,
                    payment_method,
                    payment_status,
                    amount_paid: finalAmountPaid,
                    date: salePayload.date || new Date().toISOString(),
                    due_date: salePayload.due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    notes: notesWithIdem,
                    taxable_amount: fallbackGstBreakdown.taxableAmount,
                    cgst_amount: fallbackGstBreakdown.cgstAmount,
                    sgst_amount: fallbackGstBreakdown.sgstAmount,
                    igst_amount: fallbackGstBreakdown.igstAmount,
                    is_inter_state: fallbackGstBreakdown.isInterState,
                    customer_gstin: fallbackGstBreakdown.customerGstin,
                    place_of_supply: fallbackGstBreakdown.placeOfSupply,
                    gst_rate: fallbackGstBreakdown.effectiveRate
                };

                try {
                    sale = await SalesRepository.create(userId, saleData);
                } catch (saleErr) {
                    console.error("[SalesService] Sale creation failed. Compensating stock deduction:", saleErr.message);
                    await StockService.returnSaleStock(orgId, { warehouseId: whId, items }, userId)
                        .catch(cErr => console.error("[SalesService] Stock compensation failed:", cErr.message));
                    throw saleErr;
                }

                // Step C: Update Customer Khata Ledger via OCC (Concurrency-Safe)
                const creditAmount = Math.max(0, Number(sale.total) - Number(sale.amount_paid));
                if (customer_id && creditAmount > 0) {
                    try {
                        await adjustCustomerKhataBalance(userId, customer_id, creditAmount);
                    } catch (khataErr) {
                        console.error("[SalesService] Khata balance update failed. Compensating sale and stock:", khataErr.message);
                        await SalesRepository.deleteById(userId, sale.id)
                            .catch(cErr => console.error("[SalesService] Sale deletion rollback failed:", cErr.message));
                        await StockService.returnSaleStock(orgId, { warehouseId: whId, items }, userId)
                            .catch(cErr => console.error("[SalesService] Stock compensation failed:", cErr.message));
                        throw khataErr;
                    }
                }
            }

            // Step D: Auto-Send WhatsApp (non-blocking)
            try {
                const settings = await ReminderService.getSettings(userId);
                if (settings?.auto_send_on_create && customer_id) {
                    const { data: customer } = await adminSupabase.from('customers').select('name, phone').eq('id', customer_id).maybeSingle();
                    if (customer?.phone) {
                        const { data: userData } = await adminSupabase.from('users').select('business_name').eq('id', userId).maybeSingle();
                        const shopName = userData?.business_name || "Karobar";
                        const msg = `Hi ${customer.name}, your bill #${sale.invoice_no} of ₹${sale.total} has been generated.`;
                        ReminderService.sendMessage(customer.phone, sale, shopName, msg).catch(e => console.error("Auto-send background error:", e));
                    }
                }
            } catch (autoErr) {
                console.error("WhatsApp Auto-send check failed:", autoErr);
            }

            // Step E: Invalidate Financial Cache
            try {
                await FinancialCacheService.invalidate(orgId, userId);
            } catch (cacheErr) {
                console.warn("[SalesService] Cache invalidation warning:", cacheErr.message);
            }

            // Step F: Increment Usage Tracking for Plan Guard
            incrementPlanUsage(userId, "invoices_per_month", 1);

            return sale;
        })();

        if (lockKey) {
            inFlightSales.set(lockKey, saleExecution);
            saleExecution.finally(() => {
                inFlightSales.delete(lockKey);
            });
        }

        return await saleExecution;
    },

    async updateSale(userId, id, updateData) {
        if (!userId) throw new Error("User ID is required.");
        if (!id) throw new Error("Sale ID is required.");

        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Fetch & lock original sale row
            const saleRes = await client.query(
                `SELECT * FROM public.sales WHERE id = $1 AND user_id = $2 FOR UPDATE`,
                [id, userId]
            );
            if (saleRes.rows.length === 0) {
                throw new Error("Sale not found or does not belong to your business.");
            }
            const originalSale = saleRes.rows[0];

            if (originalSale.payment_status === 'cancelled') {
                throw new Error("Cannot edit a cancelled/voided invoice.");
            }

            // 2. Parse original items
            let oldItems = [];
            if (Array.isArray(originalSale.items)) {
                oldItems = originalSale.items;
            } else if (typeof originalSale.items === 'string') {
                try { oldItems = JSON.parse(originalSale.items); } catch(e) {}
            }

            const oldQtyMap = new Map();
            for (const it of oldItems) {
                const pId = it.productId || it.product_id || it.id;
                if (pId) {
                    oldQtyMap.set(pId, (oldQtyMap.get(pId) || 0) + Number(it.quantity || 0));
                }
            }

            // 3. Parse new items
            const newItems = Array.isArray(updateData.items) ? updateData.items : oldItems;
            if (!newItems || newItems.length === 0) {
                throw new Error("An invoice must contain at least one item.");
            }

            const newQtyMap = new Map();
            for (const it of newItems) {
                const pId = it.productId || it.product_id || it.id;
                const q = Number(it.quantity || 0);
                if (!pId) throw new Error("Product ID is required for each item line.");
                if (q <= 0) throw new Error(`Invalid quantity (${q}) for item '${it.name || it.product_name || pId}'.`);
                newQtyMap.set(pId, (newQtyMap.get(pId) || 0) + q);
            }

            // 4. Validate stock changes across all involved products
            const allProdIds = Array.from(new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]));
            const prodRes = await client.query(
                `SELECT id, name, stock FROM public.inventory WHERE id = ANY($1::uuid[]) AND user_id = $2 FOR UPDATE`,
                [allProdIds, userId]
            );
            const prodMap = new Map(prodRes.rows.map(r => [r.id, r]));

            for (const pId of allProdIds) {
                const prod = prodMap.get(pId);
                const oldQ = oldQtyMap.get(pId) || 0;
                const newQ = newQtyMap.get(pId) || 0;
                const delta = newQ - oldQ; // >0: deduct additional, <0: restore difference

                if (newQ > 0 && !prod) {
                    throw new Error(`Product '${pId}' does not belong to your business or was not found.`);
                }

                if (delta > 0 && prod) {
                    const currentStock = Number(prod.stock || 0);
                    if (currentStock < delta) {
                        throw new Error(`Insufficient stock for '${prod.name}'. Current stock: ${currentStock}, requested increase: ${delta}`);
                    }
                }
            }

            // 5. Apply inventory stock updates
            for (const pId of allProdIds) {
                const oldQ = oldQtyMap.get(pId) || 0;
                const newQ = newQtyMap.get(pId) || 0;
                const delta = newQ - oldQ;

                if (delta !== 0 && prodMap.has(pId)) {
                    await client.query(
                        `UPDATE public.inventory 
                         SET stock = stock - $1, updated_at = NOW() 
                         WHERE id = $2 AND user_id = $3`,
                        [delta, pId, userId]
                    );
                }
            }

            // 6. Financial calculations
            const computedSubtotal = newItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
            const taxAmount = updateData.tax_amount !== undefined ? Number(updateData.tax_amount) : Number(originalSale.tax_amount || 0);
            const discountPercent = updateData.discount_percent !== undefined ? Number(updateData.discount_percent) : Number(originalSale.discount_percent || 0);
            const discountAmount = (computedSubtotal * discountPercent) / 100;
            const computedTotal = Math.max(0, Math.round(computedSubtotal + taxAmount - discountAmount));
            const total = updateData.total !== undefined ? Number(updateData.total) : computedTotal;

            const paymentMethod = updateData.payment_method || originalSale.payment_method || 'cash';
            let paymentStatus = updateData.payment_status || originalSale.payment_status || 'paid';
            let amountPaid = updateData.amount_paid !== undefined ? Number(updateData.amount_paid) : Number(originalSale.amount_paid || 0);

            if (paymentStatus === 'paid') {
                amountPaid = total;
            } else if (paymentStatus === 'unpaid') {
                amountPaid = 0;
            } else if (paymentStatus === 'partial') {
                amountPaid = Math.min(total, Math.max(0, amountPaid));
            }

            // 7. Customer Khata adjustments
            const oldCustomerId = originalSale.customer_id;
            const newCustomerId = updateData.customer_id !== undefined ? updateData.customer_id : oldCustomerId;

            if (newCustomerId && newCustomerId !== oldCustomerId) {
                const custCheck = await client.query(
                    `SELECT id, name FROM public.customers WHERE id = $1 AND user_id = $2`,
                    [newCustomerId, userId]
                );
                if (custCheck.rows.length === 0) {
                    throw new Error(`Customer '${newCustomerId}' not found or unauthorized.`);
                }
            }

            const oldCredit = (originalSale.payment_status === 'paid') ? 0 : Math.max(0, Number(originalSale.total) - Number(originalSale.amount_paid || 0));
            const newCredit = (paymentStatus === 'paid') ? 0 : Math.max(0, total - amountPaid);

            if (oldCustomerId === newCustomerId) {
                const netCreditDiff = newCredit - oldCredit;
                if (netCreditDiff !== 0 && oldCustomerId) {
                    await client.query(
                        `UPDATE public.customers 
                         SET outstanding_balance = GREATEST(0, outstanding_balance + $1) 
                         WHERE id = $2 AND user_id = $3`,
                        [netCreditDiff, oldCustomerId, userId]
                    );
                }
            } else {
                if (oldCustomerId && oldCredit > 0) {
                    await client.query(
                        `UPDATE public.customers 
                         SET outstanding_balance = GREATEST(0, outstanding_balance - $1) 
                         WHERE id = $2 AND user_id = $3`,
                        [oldCredit, oldCustomerId, userId]
                    );
                }
                if (newCustomerId && newCredit > 0) {
                    await client.query(
                        `UPDATE public.customers 
                         SET outstanding_balance = outstanding_balance + $1 
                         WHERE id = $2 AND user_id = $3`,
                        [newCredit, newCustomerId, userId]
                    );
                }
            }

            // 8. Update Sale Record
            const updateRes = await client.query(
                `UPDATE public.sales 
                 SET items = $1, subtotal = $2, tax_amount = $3, discount_percent = $4, 
                     total = $5, payment_method = $6, payment_status = $7, amount_paid = $8, 
                     customer_id = $9, date = COALESCE($10, date), notes = COALESCE($11, notes),
                     updated_at = NOW()
                 WHERE id = $12 AND user_id = $13 
                 RETURNING *`,
                [
                    JSON.stringify(newItems),
                    computedSubtotal,
                    taxAmount,
                    discountPercent,
                    total,
                    paymentMethod,
                    paymentStatus,
                    amountPaid,
                    newCustomerId || null,
                    updateData.date || null,
                    updateData.notes !== undefined ? updateData.notes : originalSale.notes,
                    id,
                    userId
                ]
            );

            await client.query("COMMIT");

            const updatedSale = updateRes.rows[0];

            refreshDashboardView().catch(e => console.error("refreshDashboardView background error:", e));
            try {
                let orgId = updatedSale.organization_id || userId;
                FinancialCacheService.invalidate(orgId, userId).catch(() => {});
            } catch {}

            return updatedSale;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    async cancelSale(userId, saleId, { reason } = {}) {
        if (!userId) throw new Error("User ID is required.");
        if (!saleId) throw new Error("Sale ID is required.");

        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Lock sale row
            const saleRes = await client.query(
                `SELECT * FROM public.sales WHERE id = $1 AND user_id = $2 FOR UPDATE`,
                [saleId, userId]
            );
            if (saleRes.rows.length === 0) {
                throw new Error("Sale not found or unauthorized.");
            }
            const sale = saleRes.rows[0];

            if (sale.payment_status === 'cancelled') {
                await client.query("COMMIT");
                return { success: true, message: "Sale is already cancelled.", sale };
            }

            // 2. Parse items and compute net units to restore (sold minus already returned)
            let items = [];
            if (Array.isArray(sale.items)) {
                items = sale.items;
            } else if (typeof sale.items === 'string') {
                try { items = JSON.parse(sale.items); } catch(e) {}
            }

            const previousReturns = Array.isArray(sale.returns) ? sale.returns : [];
            const alreadyReturnedMap = new Map();
            for (const ret of previousReturns) {
                for (const it of (ret.items || [])) {
                    const pId = it.productId || it.product_id || it.id;
                    if (pId) {
                        alreadyReturnedMap.set(pId, (alreadyReturnedMap.get(pId) || 0) + Number(it.quantity || 0));
                    }
                }
            }

            const itemQtyMap = new Map();
            for (const it of items) {
                const pId = it.productId || it.product_id || it.id;
                const q = Number(it.quantity || 0);
                if (pId && q > 0) {
                    const alreadyRet = alreadyReturnedMap.get(pId) || 0;
                    const netToRestore = Math.max(0, q - alreadyRet);
                    itemQtyMap.set(pId, (itemQtyMap.get(pId) || 0) + netToRestore);
                }
            }

            // 3. Restore inventory stock (master and store_inventory)
            const saleStoreId = sale.store_id || null;
            const saleOrgId = sale.organization_id || userId;
            for (const [pId, qtyToRestore] of itemQtyMap.entries()) {
                if (qtyToRestore > 0) {
                    await client.query(
                        `UPDATE public.inventory 
                         SET stock = stock + $1, updated_at = NOW() 
                         WHERE id = $2 AND user_id = $3`,
                        [qtyToRestore, pId, userId]
                    );

                    let currentStoreBal = 0;
                    if (saleStoreId) {
                        const sRes = await client.query(
                            `UPDATE public.store_inventory 
                             SET stock = stock + $1, updated_at = NOW() 
                             WHERE store_id = $2 AND product_id = $3 AND variant_id IS NULL
                             RETURNING stock`,
                            [qtyToRestore, saleStoreId, pId]
                        );
                        currentStoreBal = sRes.rows[0]?.stock ? Number(sRes.rows[0].stock) : 0;
                    }

                    await client.query(
                        `INSERT INTO public.stock_movements (
                           organization_id, store_id, product_id, quantity_change, balance_after, 
                           movement_type, reason, reference_type, reference_id, user_id
                         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                        [saleOrgId, saleStoreId, pId, qtyToRestore, currentStoreBal, 'VOID', 'Sale Void/Cancellation', 'sales', String(saleId), userId]
                    );
                }
            }

            // 4. Reverse Khata debt if sale had outstanding credit (net of prior returns)
            if (sale.customer_id && sale.payment_status !== 'paid') {
                const alreadyRefundedCredit = previousReturns
                    .filter(r => r.refund_payment_mode === 'credit' || sale.payment_status === 'unpaid' || sale.payment_status === 'partial')
                    .reduce((sum, r) => sum + Number(r.total_refund_amount || 0), 0);

                const grossCredit = Math.max(0, Number(sale.total) - Number(sale.amount_paid || 0));
                const netCreditToReverse = Math.max(0, grossCredit - alreadyRefundedCredit);

                if (netCreditToReverse > 0) {
                    await client.query(
                        `UPDATE public.customers 
                         SET outstanding_balance = GREATEST(0, outstanding_balance - $1) 
                         WHERE id = $2 AND user_id = $3`,
                        [netCreditToReverse, sale.customer_id, userId]
                    );
                }
            }

            // 5. Update sale to cancelled status with audit metadata
            const cancellationMeta = {
                cancelled_at: new Date().toISOString(),
                cancelled_by: userId,
                reason: reason || "Voided by merchant"
            };

            const notesWithCancel = `${sale.notes ? sale.notes + ' ' : ''}[CANCELLED: ${cancellationMeta.reason}]`.trim();

            const updateRes = await client.query(
                `UPDATE public.sales 
                 SET payment_status = 'cancelled', 
                     cancellation = $1, 
                     notes = $2, 
                     updated_at = NOW() 
                 WHERE id = $3 AND user_id = $4 
                 RETURNING *`,
                [JSON.stringify(cancellationMeta), notesWithCancel, saleId, userId]
            );

            await client.query("COMMIT");

            const cancelledSale = updateRes.rows[0];

            refreshDashboardView().catch(e => console.error("refreshDashboardView background error:", e));
            try {
                let orgId = cancelledSale.organization_id || userId;
                FinancialCacheService.invalidate(orgId, userId).catch(() => {});
            } catch {}

            return {
                success: true,
                message: "Invoice cancelled and inventory restored.",
                sale: cancelledSale
            };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    async deleteSale(userId, saleId, reason = "Deleted via sales management") {
        // Controlled Cancel/Void replaces physical destruction
        return await this.cancelSale(userId, saleId, { reason });
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
        if (!userId) throw new Error("User ID is required.");
        if (!saleId) throw new Error("Sale ID is required.");

        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Fetch & lock original sale
            const saleRes = await client.query(
                `SELECT * FROM public.sales WHERE id = $1 AND user_id = $2 FOR UPDATE`,
                [saleId, userId]
            );
            if (saleRes.rows.length === 0) {
                const err = new Error("Sale not found or unauthorized.");
                err.statusCode = 404;
                throw err;
            }
            const sale = saleRes.rows[0];

            if (sale.payment_status === 'cancelled') {
                const err = new Error("Cannot process a return on a cancelled/voided invoice.");
                err.statusCode = 400;
                throw err;
            }

            const { items: payloadItems, returnItems, reason, refund_payment_mode = 'cash', idempotency_key } = returnPayload || {};
            const itemsToProcess = payloadItems || returnItems;

            if (!itemsToProcess || !Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
                const err = new Error("Return items list is required.");
                err.statusCode = 400;
                throw err;
            }

            const previousReturns = Array.isArray(sale.returns) ? sale.returns : [];

            // Check Idempotency inside transaction
            if (idempotency_key) {
                const existingReturn = previousReturns.find(r => r.idempotency_key === idempotency_key);
                if (existingReturn) {
                    await client.query("COMMIT");
                    return {
                        success: true,
                        message: "Return request already processed (idempotent).",
                        returnRecord: existingReturn,
                        sale
                    };
                }
            }

            // Map already returned quantities
            const alreadyReturnedMap = new Map();
            const returnKey = (it) => {
                const pid = it.productId || it.product_id || it.id;
                const vid = it.variantId || it.variant_id;
                return vid ? `${pid}:${vid}` : `${pid}`;
            };

            for (const ret of previousReturns) {
                for (const it of (ret.items || [])) {
                    const k = returnKey(it);
                    if (k) {
                        alreadyReturnedMap.set(k, (alreadyReturnedMap.get(k) || 0) + Number(it.quantity || 0));
                    }
                }
            }

            // Parse original sale items
            let originalItems = [];
            if (Array.isArray(sale.items)) {
                originalItems = sale.items;
            } else if (typeof sale.items === 'string') {
                try { originalItems = JSON.parse(sale.items); } catch(e) {}
            }

            const validatedItemsToRestore = [];
            let totalRefundAmount = 0;

            for (const rItem of itemsToProcess) {
                const pId = rItem.productId || rItem.product_id || rItem.id;
                const vId = rItem.variantId || rItem.variant_id || null;
                const retQty = Number(rItem.quantity || 0);

                if (retQty <= 0) {
                    const err = new Error("Return quantity must be greater than zero.");
                    err.statusCode = 400;
                    throw err;
                }

                const itemKey = vId ? `${pId}:${vId}` : `${pId}`;
                const originalLine = originalItems.find(it => {
                    const itPid = it.productId || it.product_id || it.id;
                    const itVid = it.variantId || it.variant_id || null;
                    if (vId) return itPid === pId && itVid === vId;
                    return itPid === pId && !itVid;
                }) || originalItems.find(it => (it.productId || it.product_id || it.id) === pId);

                if (!originalLine) {
                    const err = new Error(`Item '${rItem.name || pId}' does not belong to this sale.`);
                    err.statusCode = 400;
                    throw err;
                }

                const soldQty = Number(originalLine.quantity || 0);
                const alreadyReturned = alreadyReturnedMap.get(itemKey) || 0;
                const availableToReturn = soldQty - alreadyReturned;

                if (retQty > availableToReturn) {
                    const err = new Error(`Cannot return ${retQty} units of '${originalLine.name || originalLine.product_name || 'product'}'. Only ${availableToReturn} remaining.`);
                    err.statusCode = 400;
                    throw err;
                }

                alreadyReturnedMap.set(itemKey, alreadyReturned + retQty);

                const unitPrice = Number(originalLine.price || 0);
                const lineRefund = unitPrice * retQty;
                totalRefundAmount += lineRefund;

                const effectiveVariantId = vId || originalLine.variantId || originalLine.variant_id || null;

                validatedItemsToRestore.push({
                    productId: pId,
                    variantId: effectiveVariantId,
                    name: originalLine.name || originalLine.product_name || "Product",
                    quantity: retQty,
                    unitPrice: unitPrice,
                    refundAmount: lineRefund,
                    gst_percent: Number(originalLine.gst_percent !== undefined ? originalLine.gst_percent : (sale.gst_rate || 0))
                });
            }

            // Restore stock in master inventory, store_inventory, and product_variants
            const returnStoreId = sale.store_id || null;
            const returnOrgId = sale.organization_id || userId;
            for (const rItem of validatedItemsToRestore) {
                await client.query(
                    `UPDATE public.inventory 
                     SET stock = stock + $1, updated_at = NOW() 
                     WHERE id = $2 AND user_id = $3`,
                    [rItem.quantity, rItem.productId, userId]
                );

                const vId = rItem.variantId || rItem.variant_id || null;
                if (vId) {
                    await client.query(
                        `UPDATE public.product_variants 
                         SET stock = stock + $1, updated_at = NOW() 
                         WHERE id = $2`,
                        [rItem.quantity, vId]
                    );
                }

                let currentStoreBal = 0;
                if (returnStoreId) {
                    let sRes;
                    if (vId) {
                        sRes = await client.query(
                            `UPDATE public.store_inventory 
                             SET stock = stock + $1, updated_at = NOW() 
                             WHERE store_id = $2 AND product_id = $3 AND variant_id = $4
                             RETURNING stock`,
                            [rItem.quantity, returnStoreId, rItem.productId, vId]
                        );
                    } else {
                        sRes = await client.query(
                            `UPDATE public.store_inventory 
                             SET stock = stock + $1, updated_at = NOW() 
                             WHERE store_id = $2 AND product_id = $3 AND variant_id IS NULL
                             RETURNING stock`,
                            [rItem.quantity, returnStoreId, rItem.productId]
                        );
                    }
                    currentStoreBal = sRes.rows[0]?.stock ? Number(sRes.rows[0].stock) : 0;
                }

                await client.query(
                    `INSERT INTO public.stock_movements (
                       organization_id, store_id, product_id, variant_id, quantity_change, balance_after, 
                       movement_type, reason, reference_type, reference_id, user_id
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [returnOrgId, returnStoreId, rItem.productId, vId, rItem.quantity, currentStoreBal, 'RETURN', reason || 'Customer Return', 'sales', String(saleId), userId]
                );
            }

            // If refund mode is 'credit' or sale was credit-based, reduce customer's Khata balance
            if (sale.customer_id && (refund_payment_mode === 'credit' || sale.payment_status === 'unpaid' || sale.payment_status === 'partial') && totalRefundAmount > 0) {
                await client.query(
                    `UPDATE public.customers 
                     SET outstanding_balance = GREATEST(0, outstanding_balance - $1) 
                     WHERE id = $2 AND user_id = $3`,
                    [totalRefundAmount, sale.customer_id, userId]
                );
            }

            const returnId = `RET-${Date.now().toString().slice(-6)}`;
            const newReturnRecord = {
                return_id: returnId,
                created_at: new Date().toISOString(),
                items: validatedItemsToRestore,
                total_refund_amount: totalRefundAmount,
                reason: reason || "Customer Return",
                refund_payment_mode: refund_payment_mode,
                idempotency_key: idempotency_key || null,
                created_by: userId
            };

            const updatedReturns = [...previousReturns, newReturnRecord];

            // Check if fully returned
            let totalSoldUnits = 0;
            for (const item of originalItems) totalSoldUnits += Number(item.quantity || 0);
            let totalReturnedUnits = 0;
            for (const r of updatedReturns) {
                for (const it of (r.items || [])) totalReturnedUnits += Number(it.quantity || 0);
            }
            const isFullyReturned = totalReturnedUnits >= totalSoldUnits;

            const returnNotes = `${sale.notes ? sale.notes + ' ' : ''}[RETURN:${returnId}:items=${validatedItemsToRestore.length}:refund=₹${totalRefundAmount}]`.trim();

            const updateRes = await client.query(
                `UPDATE public.sales 
                 SET returns = $1, 
                     notes = $2, 
                     payment_status = CASE WHEN $3 = true AND payment_status != 'paid' THEN 'returned' ELSE payment_status END,
                     updated_at = NOW() 
                 WHERE id = $4 AND user_id = $5 
                 RETURNING *`,
                [JSON.stringify(updatedReturns), returnNotes, isFullyReturned, saleId, userId]
            );

            await client.query("COMMIT");

            const updatedSale = updateRes.rows[0];

            refreshDashboardView().catch(e => console.error("refreshDashboardView background error:", e));
            try {
                let orgId = updatedSale.organization_id || userId;
                FinancialCacheService.invalidate(orgId, userId).catch(() => {});
            } catch {}

            return {
                success: true,
                message: "Sales return processed successfully.",
                returnRecord: newReturnRecord,
                sale: updatedSale
            };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    async processSalesReturn(userId, saleIdOrPayload, returnPayload = {}) {
        if (typeof saleIdOrPayload === "object" && saleIdOrPayload !== null) {
            const { saleId, ...rest } = saleIdOrPayload;
            return this.returnSale(userId, saleId, rest);
        }
        return this.returnSale(userId, saleIdOrPayload, returnPayload);
    }
};
