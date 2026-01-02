-- ⚠️ WARNING: Run this SCRIPT only ONCE to backfill inventory deduction for past sales.
-- This script calculates the total quantity sold for each product from the existing sales items
-- and subtracts it from the current inventory stock.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through aggregated sales quantities per product
    FOR r IN
        SELECT
            (item->>'productId')::bigint as p_id,
            SUM(COALESCE((item->>'quantity')::numeric, 0)) as total_sold
        FROM
            sales,
            jsonb_array_elements(items) as item
        WHERE
            -- OPTIONAL: Safety check to only process sales created before this fix was applied.
            -- You can comment this out if you want to process ALL sales regardless of time.
            -- created_at < '2025-12-28T02:50:00+05:30' AND 
            (item->>'productId') IS NOT NULL
        GROUP BY p_id
    LOOP
        -- Update the inventory stock
        UPDATE inventory
        SET stock = stock - r.total_sold
        WHERE id = r.p_id;
        
        RAISE NOTICE 'Updated Product ID %: Subtracted %', r.p_id, r.total_sold;
    END LOOP;
END $$;
