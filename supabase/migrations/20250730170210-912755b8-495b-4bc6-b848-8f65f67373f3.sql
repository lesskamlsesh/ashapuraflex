-- Create catalogues table for PDF management
CREATE TABLE public.catalogues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default recipient email
INSERT INTO public.admin_settings (setting_key, setting_value) 
VALUES ('recipient_email', 'suratiyakeyursinh@gmail.com');

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalogue_id UUID REFERENCES public.catalogues(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  selected_pages INTEGER[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now since we're using hardcoded admin auth)
CREATE POLICY "Allow public read access to catalogues" 
ON public.catalogues FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to catalogues" 
ON public.catalogues FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to catalogues" 
ON public.catalogues FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to catalogues" 
ON public.catalogues FOR DELETE USING (true);

CREATE POLICY "Allow public read access to admin_settings" 
ON public.admin_settings FOR SELECT USING (true);

CREATE POLICY "Allow public update access to admin_settings" 
ON public.admin_settings FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to orders" 
ON public.orders FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to orders" 
ON public.orders FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_catalogues_updated_at
  BEFORE UPDATE ON public.catalogues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('catalogues', 'catalogues', true);

-- Create storage policies
CREATE POLICY "Allow public access to catalogues bucket" 
ON storage.objects FOR ALL USING (bucket_id = 'catalogues');