CREATE TABLE user_subscriptions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  billing_cycle       TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status              TEXT DEFAULT 'active'
                      CHECK (status IN ('active','trial','cancelled','expired','past_due')),
  trial_ends_at       TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  razorpay_sub_id     TEXT UNIQUE,
  razorpay_customer_id TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Track all invoice counts for plan enforcement
CREATE TABLE usage_tracking (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id   UUID,
  metric        TEXT NOT NULL,  -- 'invoices_per_month', 'products', 'customers', 'storage_mb'
  month_year    TEXT NOT NULL,  -- '2025-04' format
  current_count INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id, metric, month_year)
);

-- Payment history
CREATE TABLE subscription_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id),
  razorpay_payment_id TEXT UNIQUE,
  razorpay_sub_id   TEXT,
  amount_paise      INTEGER NOT NULL,  -- always store in paise
  plan              TEXT NOT NULL,
  billing_cycle     TEXT NOT NULL,
  status            TEXT NOT NULL,     -- 'captured', 'refunded', 'failed'
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
