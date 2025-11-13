-- Schema adaptado para Neon/PostgreSQL
-- Removidas dependências do Supabase Auth
-- Autoincremento ajustado para GENERATED ALWAYS AS IDENTITY

CREATE TABLE public.access_logs (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  domain_id integer,
  path character varying,
  method character varying,
  status_code integer,
  client_ip character varying,
  user_agent text,
  device_type character varying,
  country character varying,
  city character varying,
  isp character varying,
  response_time integer,
  bytes_transferred integer,
  cache_status character varying,
  episode_info jsonb,
  session_id character varying,
  change_type character varying,
  episode_changed boolean,
  content_id character varying,
  accessed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT access_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.configurations (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  system_name character varying NOT NULL,
  payment_methods jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  mercadopago_public_key character varying,
  mercadopago_access_token character varying,
  user_id integer,
  domain_id integer,
  CONSTRAINT configurations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.domains (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  domain character varying NOT NULL,
  status character varying NOT NULL,
  expires_at timestamp without time zone,
  ssl_enabled boolean DEFAULT false,
  analytics_enabled boolean DEFAULT false,
  redirect_301 boolean DEFAULT false,
  target_url character varying,
  user_id integer,
  plan_id integer,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT domains_pkey PRIMARY KEY (id)
);
CREATE TABLE public.geolocation_cache (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  ip character varying NOT NULL UNIQUE,
  country character varying,
  city character varying,
  isp character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT geolocation_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.monthly_traffic (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  domain_id integer,
  traffic_in_gb numeric NOT NULL,
  month date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT monthly_traffic_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  user_id integer,
  plan_id integer,
  amount numeric NOT NULL,
  status character varying NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  gateway character varying,
  payload jsonb,
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pix_transactions (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  user_id integer,
  amount numeric NOT NULL,
  pix_key character varying NOT NULL,
  qr_code text NOT NULL,
  status character varying DEFAULT 'pending',
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  payment_id integer,
  CONSTRAINT pix_transactions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.plans (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  status boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text,
  role text DEFAULT 'ADMIN' CHECK (role IN ('SUPERADMIN', 'ADMIN')),
  status boolean DEFAULT true,
  two_factor_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.traffic_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  domain_id uuid,
  month integer NOT NULL,
  year integer NOT NULL,
  download_bytes bigint DEFAULT 0,
  upload_bytes bigint DEFAULT 0,
  requests integer DEFAULT 0,
  bandwidth bigint DEFAULT 0,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT traffic_metrics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  role character varying NOT NULL CHECK (role IN ('SUPERADMIN', 'ADMIN', 'USER')),
  name character varying,
  company character varying,
  status boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);