-- Remove the existing trigger that's not working
DROP TRIGGER IF EXISTS notify_new_order_trigger ON orders;

-- Remove the notify function since we're switching to direct edge function calls
DROP FUNCTION IF EXISTS public.notify_new_order();