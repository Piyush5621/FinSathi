import express from 'express';
import { supabase } from '../config/db.js';
import { planGuard } from '../middleware/planGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { inventorySchema } from '../utils/schemas.js';
import { StockService } from '../modules/inventory/services/StockService.js';
import { StockController } from '../modules/inventory/controllers/StockController.js';

const router = express.Router();

// Canonical Sub-Routes mounted on /api/inventory
router.post('/restock', StockController.postRestock);
router.post('/adjust', StockController.postAdjustment);
router.post('/transfer', StockController.postTransfer);
router.get('/movements', StockController.getMovements);
router.get('/balance', StockController.getStoreBalance);

// List inventory items with optional search & pagination
router.get('/', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'AUTHENTICATION_ERROR', message: 'User ID missing in request' });
    }

    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || req.query.q || '';
    const storeId = req.headers['x-store-id'] || req.query.store_id || null;

    let query = supabase
      .from('inventory')
      .select('*, inventory_batches(*)')
      .eq('user_id', req.user.id)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    query = query.order('name').range(offset, offset + limit - 1);

    const { data: products, error: prodError } = await query;
    if (prodError) throw prodError;

    // Attach store-scoped stock if storeId is supplied
    if (storeId && products && products.length > 0) {
      const productIds = products.map(p => p.id);
      const { data: storeStockRows } = await supabase
        .from('store_inventory')
        .select('*')
        .in('product_id', productIds)
        .eq('store_id', storeId);

      if (storeStockRows && storeStockRows.length > 0) {
        const storeMap = new Map();
        for (const sr of storeStockRows) {
          if (!sr.variant_id) storeMap.set(sr.product_id, Number(sr.stock || 0));
        }
        for (const prod of products) {
          if (storeMap.has(prod.id)) {
            prod.stock = storeMap.get(prod.id);
          }
        }
      }
    }

    res.json(products);
  } catch (err) {
    console.error('Inventory Fetch Error [500]:', err);
    res.status(500).json({ 
      error: 'INVENTORY_FETCH_FAILED', 
      message: err.message
    });
  }
});

// Fast server-side search
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || req.query.search || '';
    if (!q) return res.json([]);
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*, inventory_batches(*)')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'SEARCH_FAILED', message: err.message });
  }
});

// Add new inventory item (Master + Initial Batch)
router.post('/', validateRequest(inventorySchema), async (req, res) => {

  const {
    name, description, company, sku,
    price, cost_price, wholesale_price, stock, gst_percent, units, unit
  } = req.body;

  try {
    const finalSellingPrice = Number(price || 0);
    const finalCostPrice = Number(cost_price || 0);
    const finalStock = Number(stock || 0);
    const finalUnits = units || unit || 'pcs';
    const storeId = req.headers['x-store-id'] || null;

    // Resolve user's organization_id
    let orgId = req.tenantId;
    if (!orgId) {
      const { data: u } = await supabase.from('users').select('organization_id').eq('id', req.user.id).maybeSingle();
      orgId = u?.organization_id || req.user.id;
    }

    const { data: master, error: masterError } = await supabase
      .from('inventory')
      .insert([{
        user_id: req.user.id,
        organization_id: orgId,
        store_id: storeId,
        name,
        description,
        company,
        sku,
        gst_percent: Number(gst_percent || 0),
        price: finalSellingPrice,
        selling_price: finalSellingPrice,
        cost_price: finalCostPrice,
        wholesale_price: Number(wholesale_price || 0),
        stock: finalStock,
        units: finalUnits,
        status: 'active'
      }])
      .select('*')
      .single();

    if (masterError) throw masterError;

    // Create Initial Batch and Store Stock if stock > 0
    if (finalStock > 0) {
      if (storeId) {
        await supabase.from('store_inventory').insert([{
          organization_id: orgId,
          store_id: storeId,
          product_id: master.id,
          stock: finalStock
        }]).select();
      }

      await supabase.from('inventory_batches').insert([{
        inventory_id: master.id,
        store_id: storeId,
        batch_name: 'Initial Stock',
        sku_variant: sku,
        cost_price: finalCostPrice,
        selling_price: finalSellingPrice,
        wholesale_price: Number(wholesale_price || 0),
        stock: finalStock
      }]);
    }

    res.status(201).json(master);
  } catch (err) {
    console.error('Error adding inventory item [500]:', err);
    res.status(500).json({ error: 'ADD_INVENTORY_FAILED', message: err.message });
  }
});

// Restock / Add batch to a product (Canonicalized)
router.post('/:id/batches', async (req, res) => {
  const { id } = req.params;
  const { batch_name, cost_price, selling_price, wholesale_price, stock } = req.body;

  try {
    let orgId = req.tenantId;
    if (!orgId) {
      const { data: u } = await supabase.from('users').select('organization_id').eq('id', req.user.id).maybeSingle();
      orgId = u?.organization_id || req.user.id;
    }

    const result = await StockService.restockItem({
      organizationId: orgId,
      storeId: req.headers['x-store-id'] || null,
      productId: id,
      quantity: Number(stock),
      costPrice: Number(cost_price || 0),
      sellingPrice: Number(selling_price || 0),
      wholesalePrice: Number(wholesale_price || 0),
      batchName: batch_name,
      userId: req.user.id
    });

    res.status(201).json(result.batch || result);
  } catch (err) {
    console.error('Error restocking batch:', err);
    res.status(500).json({ error: err.message || 'Failed to restock batch' });
  }
});

// Adjust product stock (item-level endpoint delegating to canonical StockController)
router.post('/:id/adjust', StockController.postAdjustment);

// Transfer product stock between stores (item-level endpoint delegating to canonical StockController)
router.post('/:id/transfer', StockController.postTransfer);

// Update a batch (stock, prices)
router.put('/batches/:id', async (req, res) => {
  const { id } = req.params;
  const { cost_price, selling_price, wholesale_price, stock, batch_name } = req.body;

  try {
    const { data: check, error: checkError } = await supabase
      .from('inventory_batches')
      .select('id, inventory:inventory(user_id)')
      .eq('id', id)
      .single();

    if (checkError || check.inventory.user_id !== req.user.id) {
       return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabase
      .from('inventory_batches')
      .update({
        cost_price,
        selling_price,
        wholesale_price,
        stock,
        batch_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating batch:', err);
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

// Update inventory item (Master) - Does not mutate stock directly (Section 6)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updates = { ...req.body };
    delete updates.stock; // Stock updates must NOT happen via direct item edit

    if (updates.price !== undefined && updates.selling_price === undefined) {
      updates.selling_price = updates.price;
    } else if (updates.selling_price !== undefined && updates.price === undefined) {
      updates.price = updates.selling_price;
    }

    const { data: result, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(result);
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Stock adjustment for an item (Canonicalized)
router.post('/:id/adjust', async (req, res) => {
  const { id } = req.params;
  const { adjustment_type, quantity, reason, remarks, batch_id } = req.body;

  try {
    let orgId = req.tenantId;
    if (!orgId) {
      const { data: u } = await supabase.from('users').select('organization_id').eq('id', req.user.id).maybeSingle();
      orgId = u?.organization_id || req.user.id;
    }

    const result = await StockService.adjustStock({
      organizationId: orgId,
      storeId: req.headers['x-store-id'] || null,
      productId: id,
      quantity: Number(quantity),
      adjustmentType: adjustment_type || 'decrease',
      reason: reason || 'Adjustment',
      remarks: remarks || '',
      batchId: batch_id || null,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: result.message,
      previous_stock: result.previousStock,
      new_stock: result.newStock
    });
  } catch (err) {
    console.error("Stock adjustment error:", err);
    res.status(400).json({ error: err.message || "Failed to adjust stock" });
  }
});

// Bulk import products from CSV (Canonicalized)
router.post('/bulk', async (req, res) => {
  const { products } = req.body;
  try {
    let orgId = req.tenantId;
    if (!orgId) {
      const { data: u } = await supabase.from('users').select('organization_id').eq('id', req.user.id).maybeSingle();
      orgId = u?.organization_id || req.user.id;
    }

    const result = await StockService.bulkImport({
      organizationId: orgId,
      storeId: req.headers['x-store-id'] || null,
      userId: req.user.id,
      products
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Bulk inventory import error:", err);
    res.status(500).json({ error: err.message || "Failed to import products" });
  }
});

// Safe non-destructive product archive (Section 7)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('inventory')
      .update({
        status: 'archived',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Product archived successfully' });
  } catch (err) {
    console.error('Error archiving inventory item:', err);
    res.status(500).json({ error: 'Failed to archive inventory item' });
  }
});

// Delete all items by company (Safe Archive)
router.delete('/company/:companyName', async (req, res) => {
  const { companyName } = req.params;
  try {
    const { error } = await supabase
      .from('inventory')
      .update({
        status: 'archived',
        deleted_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .ilike('company', companyName);

    if (error) throw error;
    res.json({ success: true, message: `All products for ${companyName} archived successfully` });
  } catch (err) {
    console.error('Error archiving company products:', err);
    res.status(500).json({ error: 'Failed to archive company products' });
  }
});

export default router;