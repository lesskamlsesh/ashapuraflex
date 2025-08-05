-- Allow updating order status
CREATE POLICY "Allow public update access to order status" 
ON public.orders 
FOR UPDATE 
USING (true);