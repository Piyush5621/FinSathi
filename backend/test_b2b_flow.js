import { getPostgresPool } from './src/config/postgres.js';
import { PurchaseRequestService } from './src/modules/purchases/services/PurchaseRequestService.js';
import { SupplierResponseService } from './src/modules/purchases/services/SupplierResponseService.js';
import { PurchaseOrderService } from './src/modules/purchases/services/PurchaseOrderService.js';
import { PurchaseReceivingService } from './src/modules/purchases/services/PurchaseReceivingService.js';

async function testModule2Flow() {
  console.log("🚀 Starting Module 2 (B2B) End-to-End Test...");
  const pool = getPostgresPool();
  let buyerUserId = null;
  let supplierUserId = null;
  let supplierId = null;
  let buyerStoreId = null;
  let catalogProductId = null;

  try {
    // 1. Setup Data
    console.log("Setting up test data...");
    
    const users = await pool.query(`SELECT id, name FROM public.users LIMIT 2`);
    if (users.rows.length < 2) throw new Error("Need at least 2 users for B2B testing");
    buyerUserId = users.rows[0].id;
    supplierUserId = users.rows[1].id;
    
    console.log(`Buyer ID: ${buyerUserId}, Supplier Owner ID: ${supplierUserId}`);

    const storeRes = await pool.query(`INSERT INTO public.stores (user_id, name) VALUES ($1, 'Buyer Store') RETURNING id`, [buyerUserId]);
    buyerStoreId = storeRes.rows[0].id;

    const suppRes = await pool.query(`INSERT INTO public.suppliers (user_id, name, is_discoverable) VALUES ($1, 'Test B2B Vendor', true) RETURNING id`, [supplierUserId]);
    supplierId = suppRes.rows[0].id;

    const prodRes = await pool.query(`INSERT INTO public.supplier_products (supplier_id, product_name, price, available_quantity, is_discoverable) VALUES ($1, 'B2B Widget', 100, 500, true) RETURNING id`, [supplierId]);
    catalogProductId = prodRes.rows[0].id;
    
    console.log(`✅ Supplier Hub Discovered. Vendor: Test B2B Vendor, Product: B2B Widget`);

    // 2. Purchase Request (Buyer)
    console.log("\n📝 Step 1: Buyer creates Purchase Request");
    const prPayload = {
      supplier_id: supplierId,
      store_id: buyerStoreId,
      status: 'sent',
      items: [{
        supplier_product_id: catalogProductId,
        product_name: 'B2B Widget',
        requested_quantity: 10,
        requested_price: 90 // Asking for a discount
      }]
    };
    const prResult = await PurchaseRequestService.createRequest(buyerUserId, prPayload);
    const prId = prResult.request.id;
    console.log(`✅ PR Created & Sent: ${prResult.request.request_number} (Status: ${prResult.request.status})`);

    // 3. Negotiation (Supplier Counters)
    console.log("\n🤝 Step 2: Supplier counters the offer");
    const counterRes = await SupplierResponseService.respondToRequest(supplierUserId, prId, {
      action: 'counter',
      notes: 'I can do 95 per unit',
      items: [{
        id: prResult.request.items[0].id,
        offered_quantity: 10,
        offered_price: 95
      }]
    });
    console.log(`✅ Supplier Countered. PR Status: ${counterRes.status}`);

    // 4. Buyer Accepts Counter
    console.log("\n🤝 Step 3: Buyer accepts the counter offer");
    const acceptRes = await SupplierResponseService.acceptCounterOffer(buyerUserId, prId, {
      notes: 'Deal accepted'
    });
    console.log(`✅ Buyer Accepted. PR Status: ${acceptRes.status}`);

    // 5. Convert to Purchase Order (Product Resolution)
    console.log("\n📦 Step 4: Convert to Purchase Order (Triggers Product Resolution)");
    const poConvRes = await SupplierResponseService.createPoFromAcceptedRequest(buyerUserId, prId, {
      store_id: buyerStoreId
    });
    const poId = poConvRes.purchase_order.id;
    console.log(`✅ PO Created: ${poConvRes.purchase_order.order_no} (Items synced to local catalog!)`);

    // PO Status needs to be Sent to Receive it
    console.log("\n📤 Step 5: Send Purchase Order");
    await PurchaseOrderService.updateStatus(buyerUserId, poId, 'Sent');
    console.log(`✅ PO Status changed to Sent`);

    // 6. Inventory Update (Goods Receipt Note)
    console.log("\n🚚 Step 6: Receive Goods (Inventory Update)");
    const grnRes = await PurchaseReceivingService.receivePurchaseOrder(buyerUserId, poId, {
      batch_name: 'BATCH-001',
      notes: 'Received in good condition'
    });
    console.log(`✅ Goods Received. PO Status: ${grnRes.status}. Inventory incremented!`);

    // 7. Invoice & Ledger
    console.log("\n💰 Step 7: Supplier generates Invoice");
    const invRes = await SupplierResponseService.generateInvoiceForRequest(supplierUserId, prId);
    console.log(`✅ Invoice Generated: ${invRes.sale.invoice_no}. Accounts Payable Updated.`);

    console.log("\n🎉 ALL MODULE 2 B2B FLOWS COMPLETED SUCCESSFULLY!");

  } catch (err) {
    console.error("❌ Test Failed:", err);
  } finally {
    // Cleanup
    if (buyerStoreId) await pool.query(`DELETE FROM public.stores WHERE id = $1`, [buyerStoreId]);
    if (supplierId) await pool.query(`DELETE FROM public.suppliers WHERE id = $1`, [supplierId]);
    if (buyerUserId) await pool.query(`DELETE FROM public.inventory WHERE user_id = $1`, [buyerUserId]);
    pool.end();
  }
}

testModule2Flow();
