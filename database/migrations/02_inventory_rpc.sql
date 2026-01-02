-- RPC function to atomically decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(row_id BIGINT, quantity_to_subtract INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory
  SET stock = stock - quantity_to_subtract
  WHERE id = row_id;
END;
$$;
