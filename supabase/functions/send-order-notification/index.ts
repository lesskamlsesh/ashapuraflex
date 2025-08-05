import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";
// @deno-types="npm:@types/pdfjs-dist"
import * as pdfjsLib from "npm:pdfjs-dist@3.11.174";

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
  company_name?: string;
  address?: string;
  notes?: string;
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

    // Get order details with catalogue information
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        catalogues (
          name,
          file_url
        )
      `)
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

    // Create simple notification email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          📋 New Catalogue Order Received
        </h2>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0ea5e9; margin-top: 0;">Quick Summary</h3>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Email:</strong> ${order.customer_email}</p>
          <p><strong>Phone:</strong> ${order.customer_phone || 'Not provided'}</p>
          ${order.company_name ? `<p><strong>Company:</strong> ${order.company_name}</p>` : ''}
          <p><strong>Catalogue:</strong> ${order.catalogues?.name || order.catalogue_name || 'Unknown'}</p>
          <p><strong>Pages:</strong> ${order.selected_pages.join(', ')} (${order.selected_pages.length} total)</p>
        </div>

        ${order.address || order.notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          ${order.address ? `<p><strong>📍 Address:</strong> ${order.address}</p>` : ''}
          ${order.notes ? `<p><strong>📝 Notes:</strong> ${order.notes}</p>` : ''}
        </div>
        ` : ''}

        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #059669;">
            <strong>Order ID:</strong> ${order.id} | <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Access your admin panel to manage this order and download the selected pages.
        </p>
      </div>
    `;

    // Send simple notification email (no attachments)
    await resend.emails.send({
      from: "Catalogue Orders <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `🆕 New Order: ${order.customer_name} - ${order.selected_pages.length} pages`,
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