-- Revert Migration 54: Inventory Engine & Warehouse Stock Rollback

-- 1. Drop Policies
DROP POLICY IF EXISTS tenant_isolation_batches ON public.inventory_batches;
DROP POLICY IF EXISTS tenant_isolation_serials ON public.inventory_serial_numbers;
DROP POLICY IF EXISTS tenant_isolation_wh_stock ON public.warehouse_stock;
DROP POLICY IF EXISTS tenant_isolation_movements ON public.inventory_movements;
DROP POLICY IF EXISTS tenant_isolation_adjustments ON public.inventory_adjustments;
DROP POLICY IF EXISTS tenant_isolation_transfers ON public.inventory_transfers;
DROP POLICY IF EXISTS tenant_isolation_reservations ON public.inventory_reservations;
DROP POLICY IF EXISTS tenant_isolation_snapshots ON public.inventory_snapshots;

-- 2. Drop Tables
DROP TABLE IF EXISTS public.inventory_snapshots CASCADE;
DROP TABLE IF EXISTS public.inventory_reservations CASCADE;
DROP TABLE IF EXISTS public.inventory_transfers CASCADE;
DROP TABLE IF EXISTS public.inventory_adjustments CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.warehouse_stock CASCADE;
DROP TABLE IF EXISTS public.inventory_serial_numbers CASCADE;
DROP TABLE IF EXISTS public.inventory_batches CASCADE;
