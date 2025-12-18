CREATE TABLE IF NOT EXISTS streaming_access_logs (
    id SERIAL PRIMARY KEY,
    streaming_proxy_id INTEGER NOT NULL,
    client_ip VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    country_code VARCHAR(10),
    country_name VARCHAR(100),
    city VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (streaming_proxy_id) REFERENCES streaming_proxies(id) ON DELETE CASCADE
);
