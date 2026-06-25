import { supabase } from '../config/db.js';

export const getCatalog = async (req, res) => {
  try {
    const { businessSlug } = req.params;

    // Fetch user by business_name (slugified version handling)
    // Note: For a robust system, add a `slug` column to users table.
    // We will do a generic ILIKE match against business_name for now.
    const cleanSlug = businessSlug.replace(/-/g, ' ');
    
    // Using simple ILIKE is susceptible to collisions but fits the spec without heavy migration.
    // A proper DB migration would add unique `slug`.
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, business_name, avatar_url')
      .ilike('business_name', `%${cleanSlug}%`)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    // Fetch active products with stock > 0
    const { data: products, error: prodErr } = await supabase
      .from('inventory')
      .select('id, name, company, description, price, units, stock')
      .eq('user_id', user.id)
      .gt('stock', 0);

    if (prodErr) throw prodErr;

    // Grouping by company as per PRD
    const groupedProducts = {};
    products.forEach(p => {
        const company = p.company || 'Other';
        if (!groupedProducts[company]) groupedProducts[company] = [];
        groupedProducts[company].push(p);
    });

    res.status(200).json({
      success: true,
      business: { name: user.business_name, logo: user.avatar_url },
      catalog: groupedProducts
    });
  } catch (error) {
    console.error('Catalog fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { customerName, phone, items } = req.body;

    const cleanSlug = businessSlug.replace(/-/g, ' ');
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .ilike('business_name', `%${cleanSlug}%`)
      .single();

    if (userErr || !user) return res.status(404).json({ error: 'Business not found' });

    // 1. Check if customer exists, else create
    let customerId;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone', phone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ user_id: user.id, name: customerName, phone: phone })
        .select()
        .single();
      customerId = newCustomer.id;
    }

    // 2. Create pending invoice
    // Generate invoice_no
    const invoiceNo = `ORD-${Date.now()}`;
    
    // Calculate total
    let total = 0;
    for (const item of items) {
        total += (item.price * item.quantity);
    }

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        invoice_no: invoiceNo,
        total: total,
        payment_status: 'unpaid',
        notes: 'Catalog Order'
      })
      .select()
      .single();
      
    if (saleErr) throw saleErr;

    // 3. Create invoice items
    const saleItems = items.map(item => ({
        sale_id: sale.id,
        user_id: user.id,
        inventory_id: item.id,
        quantity: item.quantity,
        price: item.price
    }));

    await supabase.from('sale_items').insert(saleItems);

    // Note: Deducting inventory logic would go here, but usually pending orders shouldn't deduct until confirmed.

    res.status(201).json({ success: true, orderId: invoiceNo, message: 'Order submitted to business.' });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};
