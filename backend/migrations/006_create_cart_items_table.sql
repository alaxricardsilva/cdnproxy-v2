-- 006_create_cart_items_table.sql

CREATE TABLE IF NOT EXISTS public.cart_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_type VARCHAR(255) NOT NULL,
    product_identifier VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
