
-- Add cover_page field to catalogues table to store which page is used as cover
ALTER TABLE catalogues ADD COLUMN cover_page integer DEFAULT 1;

-- Add new fields to orders table for company information
ALTER TABLE orders ADD COLUMN company_name text;
ALTER TABLE orders ADD COLUMN address text;
ALTER TABLE orders ADD COLUMN notes text;

-- Make phone number mandatory by removing nullable constraint
ALTER TABLE orders ALTER COLUMN customer_phone SET NOT NULL;
ALTER TABLE orders ALTER COLUMN customer_phone SET DEFAULT '';
