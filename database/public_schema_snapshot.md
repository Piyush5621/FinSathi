# Public Schema Snapshot
*Snapshot date: 2025-12-27*

This document serves as the source of truth for the database schema as of the date above.
Future changes should be applied via migration files in `database/migrations`.

## users
- `id`: uuid (default: `gen_random_uuid()`) — primary key
- `name`: text
- `email`: text (unique)
- `password`: text
- `business_name`: text
- `business_type`: text (nullable)
- `city`: text (nullable)
- `state`: text (nullable)
- `phone`: text
- `created_at`: timestamp without time zone (default: `now()`)

## sales
- `id`: bigint (default: `nextval('sales_id_seq')`) — primary key
- `user_id`: uuid (nullable) — FK -> `public.users.id`
- `date`: date (nullable)
- `amount`: numeric (nullable)
- `category`: text (nullable)
- `created_at`: timestamptz (default: `now()`)
- `total_amount`: numeric (default: 0)
- `customer_id`: integer (nullable) — FK -> `public.customers.id`
- `product_id`: integer (nullable) — FK -> `public.inventory.id`
- `quantity`: integer (nullable) (default: 1)
- `payment_method`: text (nullable) (default: 'Cash')
- `status`: text (nullable) (default: 'Completed')
- `gst_percent`: numeric (nullable) (default: 0)
- `total`: numeric (nullable) (default: 0)
- `discount_percent`: numeric (nullable) (default: 0)
- `payment_status`: text (nullable) (default: 'unpaid')
- `subtotal`: numeric (nullable) (default: 0)
- `items`: jsonb (nullable)
- `invoice_no`: text (nullable)

## customers
- `id`: bigint (default: `nextval('customers_id_seq')`) — primary key
- `user_id`: uuid (nullable) — FK -> `public.users.id`
- `name`: text (nullable)
- `email`: text (nullable)
- `phone`: text (nullable)
- `address`: text (nullable)
- `created_at`: timestamptz (default: `now()`)
- `city`: text (nullable)

## summary
- `id`: bigint (default: `nextval('summary_id_seq')`) — primary key
- `user_id`: uuid (nullable) — FK -> `public.users.id`
- `key`: text (nullable)
- `value`: jsonb (nullable)
- `created_at`: timestamptz (default: `now()`)

## notifications
- `id`: integer (default: `nextval('notifications_id_seq')`) — primary key
- `title`: character varying
- `type`: character varying (nullable) — check constraint: `success`, `warning`, `info`
- `created_at`: timestamp (default: `now()`)

## inventory
- `id`: integer (default: `nextval('inventory_id_seq')`) — primary key
- `sku`: text (nullable, unique)
- `name`: text
- `description`: text (nullable)
- `price`: numeric (default: 0)
- `stock`: integer (default: 0)
- `created_at`: timestamp (default: `now()`)
- `gst_percent`: numeric (nullable) (default: 0)
- `units`: text (default: 'Pcs')
- `unit`: text (nullable) (default: 'PCS')
- `company`: text (nullable)

## sale_items
- `id`: integer (default: `nextval('sale_items_id_seq')`) — primary key
- `sale_id`: integer (nullable) — FK -> `public.sales.id`
- `product_id`: integer (nullable) — FK -> `public.inventory.id`
- `quantity`: integer (default: 1)
- `price`: numeric (default: 0)

## invoices
- `id`: integer (default: `nextval('invoices_id_seq')`) — primary key
- `invoice_no`: text (nullable, unique)
- `customer_id`: integer (nullable) — FK -> `public.customers.id`
- `total_amount`: numeric (nullable) (default: 0)
- `payment_method`: text (nullable) (default: 'Cash')
- `status`: text (nullable) (default: 'Pending')
- `created_at`: timestamp (default: `now()`)
- `discount`: numeric (nullable) (default: 0)
- `gst`: numeric (nullable) (default: 0)
- `amount_due`: numeric (nullable) (default: 0)
- `payment_status`: text (nullable) (default: 'Unpaid')

## invoice_items
- `id`: integer (default: `nextval('invoice_items_id_seq')`) — primary key
- `invoice_id`: integer (nullable) — FK -> `public.invoices.id`
- `product_id`: integer (nullable) — FK -> `public.inventory.id`
- `quantity`: integer (default: 1)
- `price`: numeric (default: 0)
- `subtotal`: numeric (generated, default: `(quantity)::numeric * price`)
