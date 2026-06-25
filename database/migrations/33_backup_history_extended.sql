-- Migration 33: Backup History & Metadata
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  status TEXT CHECK (status IN ('Success', 'Failed', 'Restored')) NOT NULL,
  schema_version TEXT NOT NULL,
  backup_type TEXT CHECK (backup_type IN ('Full Backup', 'Customers Only', 'Inventory Only', 'Sales Only', 'Expenses Only', 'Pre-Restore Backup')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.backup_history DISABLE ROW LEVEL SECURITY;
