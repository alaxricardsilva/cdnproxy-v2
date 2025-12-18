
CREATE TABLE IF NOT EXISTS "public"."users" (
    id bigint NOT NULL,
    email character varying DEFAULT ''::character varying NOT NULL,
    encrypted_password character varying DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying,
    reset_password_sent_at timestamp without time zone,
    remember_created_at timestamp without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    role integer DEFAULT 0 NOT NULL,
    name character varying,
    active boolean DEFAULT true,
    password_digest character varying,
    supabase_auth_id character varying
);

CREATE SEQUENCE IF NOT EXISTS users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE users_id_seq OWNED BY "public"."users".id;

ALTER TABLE ONLY "public"."users" ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_email ON public.users USING btree (email);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_reset_password_token ON public.users USING btree (reset_password_token);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_supabase_auth_id ON public.users USING btree (supabase_auth_id);
