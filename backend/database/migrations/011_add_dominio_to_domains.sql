ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS dominio VARCHAR(255);

UPDATE public.domains
SET dominio = name
WHERE dominio IS NULL OR dominio = '';

