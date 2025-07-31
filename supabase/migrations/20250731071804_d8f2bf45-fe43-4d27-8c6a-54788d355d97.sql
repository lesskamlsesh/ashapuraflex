-- Create edge function to send order notifications
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to automatically notify on new orders
CREATE TRIGGER on_new_order
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_order();