-- 20260626000000_create_trade_rpc.sql
-- Description: Enforces atomic transaction for Trade + TradeItems

CREATE OR REPLACE FUNCTION create_trade_atomic(
    p_trade_data jsonb,
    p_items_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trade_id uuid;
    v_result jsonb;
BEGIN
    -- 1. Insert into trade_transactions
    INSERT INTO public.trade_transactions (
        seller_id, buyer_id, amount, currency, status
    ) VALUES (
        (p_trade_data->>'seller_id')::uuid,
        (p_trade_data->>'buyer_id')::uuid,
        (p_trade_data->>'amount')::numeric,
        p_trade_data->>'currency',
        COALESCE(p_trade_data->>'status', 'pending')
    )
    RETURNING id INTO v_trade_id;

    -- 2. Insert into trade_transaction_items
    -- Assuming p_items_data is a JSON array
    INSERT INTO public.trade_transaction_items (
        transaction_id, product_id, quantity, unit_price
    )
    SELECT 
        v_trade_id,
        (item->>'productId')::uuid,
        (item->>'quantity')::numeric,
        (item->>'unitPrice')::numeric
    FROM jsonb_array_elements(p_items_data) AS item;

    -- Return the created trade ID
    v_result := jsonb_build_object('id', v_trade_id);
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Rollback is automatic in Postgres when an exception occurs in a function block
    RAISE EXCEPTION 'Failed to create trade: %', SQLERRM;
END;
$$;
