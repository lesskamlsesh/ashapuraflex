import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderData {
  order_id: string;
  catalogue_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  selected_pages: number[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { order_id }: { order_id: string } = await req.json();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Order not found');
    }

    // Get recipient email from admin settings
    const { data: settingsData } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'recipient_email')
      .single();

    const recipientEmail = settingsData?.setting_value || 'suratiyakeyursinh@gmail.com';

    const emailContent = `
      <h2>New Catalogue Order Received</h2>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Customer Details:</strong></p>
      <ul>
        <li><strong>Name:</strong> ${order.customer_name}</li>
        <li><strong>Email:</strong> ${order.customer_email}</li>
        <li><strong>Phone:</strong> ${order.customer_phone || 'Not provided'}</li>
      </ul>
      <p><strong>Catalogue:</strong> ${order.catalogue_name || 'Unknown'}</p>
      <p><strong>Selected Pages:</strong> ${order.selected_pages.join(', ')}</p>
      <p><strong>Total Items:</strong> ${order.selected_pages.length}</p>
      <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
    `;

    await resend.emails.send({
      from: "Digital Catalogue <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `New Order from ${order.customer_name}`,
      html: emailContent,
    });

    console.log(`Order notification sent for order ${order_id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);