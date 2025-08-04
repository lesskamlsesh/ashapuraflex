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

    // Create detailed email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          New Catalogue Order Received
        </h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Order Information</h3>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Customer Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;"><strong>Name:</strong> ${order.customer_name}</li>
            <li style="margin: 8px 0;"><strong>Email:</strong> ${order.customer_email}</li>
            <li style="margin: 8px 0;"><strong>Phone:</strong> ${order.customer_phone || 'Not provided'}</li>
            ${order.company_name ? `<li style="margin: 8px 0;"><strong>Company:</strong> ${order.company_name}</li>` : ''}
            ${order.address ? `<li style="margin: 8px 0;"><strong>Address:</strong> ${order.address}</li>` : ''}
            ${order.notes ? `<li style="margin: 8px 0;"><strong>Notes:</strong> ${order.notes}</li>` : ''}
          </ul>
        </div>

        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Order Details</h3>
          <p><strong>Catalogue:</strong> ${order.catalogues?.name || order.catalogue_name || 'Unknown'}</p>
          <p><strong>Selected Pages:</strong> ${order.selected_pages.join(', ')}</p>
          <p><strong>Total Pages:</strong> ${order.selected_pages.length}</p>
        </div>

        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #dc2626;">
            <strong>Note:</strong> Please process this order and prepare the selected pages for the customer.
          </p>
        </div>
      </div>
    `;

    // Create PDF attachment with selected pages (simplified approach)
    let pdfAttachment = null;
    try {
      if (order.catalogues?.file_url) {
        // Create a summary document instead of actual PDF pages
        const summaryContent = `
Order Summary - ${order.customer_name}
=====================================

Order ID: ${order.id}
Date: ${new Date(order.created_at).toLocaleString()}

Customer Information:
- Name: ${order.customer_name}
- Email: ${order.customer_email}
- Phone: ${order.customer_phone || 'Not provided'}
${order.company_name ? `- Company: ${order.company_name}` : ''}
${order.address ? `- Address: ${order.address}` : ''}
${order.notes ? `- Notes: ${order.notes}` : ''}

Order Details:
- Catalogue: ${order.catalogues.name || order.catalogue_name}
- Selected Pages: ${order.selected_pages.join(', ')}
- Total Pages: ${order.selected_pages.length}

Please prepare the following pages from the catalogue:
${order.selected_pages.map(page => `- Page ${page}`).join('\n')}
        `;

        const encodedContent = btoa(summaryContent);
        pdfAttachment = {
          filename: `order-${order.id}-summary.txt`,
          content: encodedContent,
          type: 'text/plain'
        };
      }
    } catch (error) {
      console.error('Error creating PDF attachment:', error);
      // Continue without attachment if there's an error
    }

    const emailData: any = {
      from: "Digital Catalogue <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `New Order from ${order.customer_name} - ${order.selected_pages.length} pages`,
      html: emailContent,
    };

    if (pdfAttachment) {
      emailData.attachments = [pdfAttachment];
    }

    await resend.emails.send(emailData);

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