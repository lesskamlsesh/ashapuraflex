-- Fix search path for validate_catalogue_name function
CREATE OR REPLACE FUNCTION public.validate_catalogue_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check if catalogue_name exists in catalogues
    IF NOT EXISTS (
        SELECT 1 FROM catalogues 
        WHERE name = NEW.catalogue_name
    ) THEN
        RAISE EXCEPTION 'Invalid catalogue name: %', NEW.catalogue_name;
    END IF;
    RETURN NEW;
END;
$$;