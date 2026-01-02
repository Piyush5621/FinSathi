import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// Get all inventory items with their active batches
router.get('/', async (req, res) => {
  try {
    const { data: products, error: prodError } = await supabase
      .from('inventory')
      .select('*, inventory_batches(*)')
      .order('name');

    if (prodError) throw prodError;

    res.json(products);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Add new inventory item (Master + Initial Batch)
router.post('/', async (req, res) => {
  const {
    name, description, company, sku,
    price, cost_price, wholesale_price, stock, gst_percent, units, unit
  } = req.body;

  try {
    const { data: master, error: masterError } = await supabase
      .from('inventory')
      .insert([{
        name,
        description,
        company,
        sku,
        gst_percent,
        price,
        cost_price,
        wholesale_price,
        stock,
        units: units || unit || 'pcs'
      }])
      .select()
      .single();

    if (masterError) throw masterError;

    // Create Initial Batch if pricing/stock provided
    if (stock > 0 || price > 0) {
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

      if (batchError) console.error("Batch creation warning:", batchError);
    }

    res.status(201).json(master);
  } catch (err) {
    console.error('Error adding inventory item:', err);
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
});

// Add a new batch to a product
router.post('/:id/batches', async (req, res) => {
  const { id } = req.params;
  const { batch_name, sku_variant, cost_price, selling_price, wholesale_price, stock } = req.body;

  try {
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
      .select()
      .single();
    if (error) throw error;
    res.json(result);
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
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
      .ilike('company', companyName); // Case insensitive match to be safe, or eq if strict

    if (error) throw error;
    res.json({ message: `All products for ${companyName} deleted successfully` });
  } catch (err) {
    console.error('Error deleting company products:', err);
    res.status(500).json({ error: 'Failed to delete company products' });
  }
});

export default router;