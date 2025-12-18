-- 013_update_payments_table.sql

-- Ensure payments table exists (safety check)
CREATE TABLE IF NOT EXISTS public.payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50),
    payment_method VARCHAR(50),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make plan_id nullable because a payment might be for a mix of items or renewals
ALTER TABLE public.payments ALTER COLUMN plan_id DROP NOT NULL;

-- Add metadata column to store cart items snapshot
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata JSONB;
