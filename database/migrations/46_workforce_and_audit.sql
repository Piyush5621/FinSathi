-- Migration 46: Workforce & Access Management System (Enterprise RBAC+)

-- 1. Approval Workflows (Rules engine for when actions need approval)
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- The business owner
    module VARCHAR(50) NOT NULL, -- e.g. 'billing', 'inventory'
    action_type VARCHAR(100) NOT NULL, -- e.g. 'process_refund', 'apply_discount'
    condition_field VARCHAR(100), -- e.g. 'discount_percent', 'amount'
    condition_operator VARCHAR(20), -- e.g. '>', '<', '=', '>=', '<='
    condition_value NUMERIC, -- e.g. 20
    required_role UUID REFERENCES roles(id) ON DELETE SET NULL, -- Role needed to approve
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Approval Requests (Queue of actions waiting for manager/owner approval)
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
    module VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL, -- The data trying to be saved
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Access Requests (Employees requesting a new role or specific permission)
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    requested_role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    requested_permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Activity Logs (Who did what, where, and when)
-- The table might already exist from older logging implementations, so we add columns safely.
ALTER TABLE activity_logs 
    ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS module VARCHAR(50),
    ADD COLUMN IF NOT EXISTS action_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS entity_id UUID,
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 5. Audit Logs (Enterprise Before/After tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Standard Policies
CREATE POLICY "Users manage their approval_workflows" ON approval_workflows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage their approval_requests" ON approval_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage their access_requests" ON access_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage their activity_logs" ON activity_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage their audit_logs" ON audit_logs FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_staff ON activity_logs(user_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_status ON approval_requests(user_id, status);
