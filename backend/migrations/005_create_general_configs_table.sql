DROP TABLE IF EXISTS public.general_configs;

CREATE TABLE public.general_configs (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial data
INSERT INTO public.general_configs (key, value) VALUES
('site_name', 'CDNProxy'),
('logo_url', '/images/logo.png'),
('favicon_url', '/images/favicon.ico')
ON CONFLICT (key) DO NOTHING;
