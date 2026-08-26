import express from 'express';
import { supabase } from '../config/db.js';
import { planGuard } from '../middleware/planGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { inventorySchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('[Inventory] Fetching for User ID:', req.user?.id);
    
    if (!req.user?.id) {
      console.error('[Inventory] Critical: req.user.id is missing!');
      return res.status(401).json({ error: 'AUTHENTICATION_ERROR', message: 'User ID missing in request' });
    }

    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;

    const { data: products, error: prodError } = await supabase
      .from('inventory')
      .select('*, inventory_batches(*)')
      .eq('user_id', req.user.id)
      .order('name')
      .range(offset, offset + limit - 1);

    if (prodError) {
      console.error('[Inventory] Database Query Error:', prodError);
      throw prodError;
    }

    console.log(`[Inventory] Successfully fetched ${products?.length || 0} items.`);
    res.json(products);
  } catch (err) {
    console.error('Inventory Fetch Error [500]:', err);
    res.status(500).json({ 
      error: 'INVENTORY_FETCH_FAILED', 
      message: err.message,
      hint: 'Check your terminal for the Database Query Error log.'
    });
  }
});

// Fast server-side search (Critical for Billing Dropdown)
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    
    // Fuzzy search on name or sku
    const { data, error } = await supabase
      .from('inventory')
      .select('*, inventory_batches(*)')
      .eq('user_id', req.user.id)
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'SEARCH_FAILED', message: err.message });
  }
});

// Add new inventory item (Master + Initial Batch)
router.post('/', planGuard('products'), validateRequest(inventorySchema), async (req, res) => {
  const {
    name, description, company, sku,
    price, cost_price, wholesale_price, stock, gst_percent, units, unit
  } = req.body;

  try {
    console.log('[Inventory] Adding new item for User:', req.user.id);
    console.log('[Inventory] Payload:', req.body);

    const { data: master, error: masterError } = await supabase
      .from('inventory')
      .insert([{
        user_id: req.user.id,
        name,
        description,
        company,
        sku,
        gst_percent: Number(gst_percent || 0),
        price: Number(price || 0),
        cost_price: Number(cost_price || 0),
        wholesale_price: Number(wholesale_price || 0),
        stock: Number(stock || 0),
        units: units || unit || 'pcs'
      }])
      .select('*')
      .single();

    if (masterError) {
      console.error('[Inventory] Master Create Error Details:', masterError);
      return res.status(500).json({ 
         error: 'MASTER_CREATE_FAILED', 
         message: masterError.message,
         details: masterError.details
      });
    }

    if (!master) {
      throw new Error("No data returned from master creation");
    }

    // Create Initial Batch if pricing/stock provided
    if (stock > 0 || price > 0) {
      console.log('[Inventory] Creating initial batch for Master ID:', master.id);
      const { error: batchError } = await supabase
        .from('inventory_batches')
        .insert([{
          inventory_id: master.id,
          batch_name: 'Initial Stock',
          sku_variant: sku,
          cost_price: Number(cost_price || 0),
          selling_price: Number(price || 0),
          wholesale_price: Number(wholesale_price || 0),
          stock: Number(stock || 0)
        }]);

      if (batchError) {
        console.error('[Inventory] Batch Creation Warning:', batchError);
      }
    }

    console.log('[Inventory] Successfully added item:', master.id);
    res.status(201).json(master);
  } catch (err) {
    console.error('Error adding inventory item [500]:', err);
    res.status(500).json({ 
      error: 'ADD_INVENTORY_FAILED', 
      message: err.message,
      hint: 'Check your backend terminal for "Master Create Error"'
    });
  }
});

// Add a new batch to a product
router.post('/:id/batches', async (req, res) => {
  const { id } = req.params;
  const { batch_name, sku_variant, cost_price, selling_price, wholesale_price, stock } = req.body;

  try {
    // First, verify the user owns the parent product
    const { data: product, error: pError } = await supabase
      .from('inventory')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (pError || !product) {
      return res.status(403).json({ error: "Access denied or product not found" });
    }

    const { data: batch, error } = await supabase
      .from('inventory_batches')
      .insert([{
        inventory_id: id,
        batch_name: batch_name || 'Restock',
        sku_variant,
        cost_price,
        selling_price,
        wholesale_price,
        stock
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(batch);
  } catch (err) {
    console.error('Error creating batch:', err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// Update a batch (stock, prices)
router.put('/batches/:id', async (req, res) => {
  const { id } = req.params;
  const { cost_price, selling_price, wholesale_price, stock, batch_name } = req.body;

  try {
    // Verify the batch belongs to a product owned by the user via JOIN
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

// Update inventory item (Master)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // allow updating any field passed in body
    const { data: result, error } = await supabase
      .from('inventory')
      .update(req.body)
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

// Stock adjustment for an item
router.post('/:id/adjust', async (req, res) => {
  const { id } = req.params;
  const { adjustment_type, quantity, reason, remarks, batch_id } = req.body;

  try {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: "Adjustment quantity must be greater than 0" });
    }

    // Fetch existing product
    const { data: item, error: fetchErr } = await supabase
      .from('inventory')
      .select('*, inventory_batches(*)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !item) {
      return res.status(404).json({ error: "Product not found or access denied" });
    }

    const currentStock = Number(item.stock || 0);
    const newStock = adjustment_type === 'decrease' 
      ? Math.max(0, currentStock - qty) 
      : currentStock + qty;

    // Update master stock
    const { data: updated, error: updateErr } = await supabase
      .from('inventory')
      .update({ stock: newStock })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // If batch specified, update batch stock as well
    if (batch_id) {
      const batch = (item.inventory_batches || []).find(b => b.id === batch_id);
      if (batch) {
        const currentBatchStock = Number(batch.stock || 0);
        const newBatchStock = adjustment_type === 'decrease'
          ? Math.max(0, currentBatchStock - qty)
          : currentBatchStock + qty;
        await supabase
          .from('inventory_batches')
          .update({ stock: newBatchStock })
          .eq('id', batch_id);
      }
    }

    res.json({
      success: true,
      message: `Stock ${adjustment_type === 'decrease' ? 'decreased' : 'increased'} by ${qty} units (${reason || 'Adjustment'})`,
      item: updated,
      previous_stock: currentStock,
      new_stock: newStock
    });
  } catch (err) {
    console.error("Stock adjustment error:", err);
    res.status(500).json({ error: "Failed to adjust stock", details: err.message });
  }
});

// Bulk import products from CSV
router.post('/bulk', async (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "Products array is required" });
  }

  try {
    const formatted = products.map(p => ({
      user_id: req.user.id,
      name: String(p.name || 'Unnamed Product').trim(),
      sku: p.sku ? String(p.sku).trim() : undefined,
      description: p.description || '',
      company: p.company || p.category || '',
      price: Number(p.price || p.sellingPrice || 0),
      cost_price: Number(p.cost_price || p.costPrice || 0),
      wholesale_price: Number(p.wholesale_price || 0),
      stock: Number(p.stock || 0),
      gst_percent: Number(p.gst_percent || 0),
      units: p.units || p.unit || 'pcs'
    }));

    const { data, error } = await supabase
      .from('inventory')
      .insert(formatted)
      .select();

    if (error) throw error;

    // Create initial batches for products with stock
    const batchInserts = (data || [])
      .filter(item => item.stock > 0)
      .map(item => ({
        inventory_id: item.id,
        batch_name: 'Opening Stock',
        sku_variant: item.sku,
        cost_price: item.cost_price,
        selling_price: item.price,
        stock: item.stock
      }));

    if (batchInserts.length > 0) {
      await supabase.from('inventory_batches').insert(batchInserts).catch(e => console.warn("Batch insert warning:", e));
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${data?.length || 0} products`,
      imported_count: data?.length || 0,
      data
    });
  } catch (err) {
    console.error("Bulk inventory import error:", err);
    res.status(500).json({ error: "Failed to import products", details: err.message });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Delete all items by company
router.delete('/company/:companyName', async (req, res) => {
  const { companyName } = req.params;
  try {
    // Decode if needed, though express params usually handle it. 
    // Client should encodeURIComponent
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('user_id', req.user.id)
      .ilike('company', companyName); // Case insensitive match to be safe, or eq if strict

    if (error) throw error;
    res.json({ message: `All products for ${companyName} deleted successfully` });
  } catch (err) {
    console.error('Error deleting company products:', err);
    res.status(500).json({ error: 'Failed to delete company products' });
  }
});

export default router;