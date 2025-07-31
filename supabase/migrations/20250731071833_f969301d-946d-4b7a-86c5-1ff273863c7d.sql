-- Fix search path security for all functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Use Postgres NOTIFY to trigger the Edge Function
    PERFORM pg_notify(
        'new_order', 
        json_build_object(
            'order_id', NEW.id,
            'catalogue_name', NEW.catalogue_name,
            'selected_pages', NEW.selected_pages
        )::text
    );
    RETURN NEW;
END;
$$;