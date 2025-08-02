import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      supplierEmail, 
      supplierName, 
      orderNumber, 
      items, 
      totalAmount, 
      restaurantName 
    } = await req.json()

    console.log('Sending Purchase Order Notification:', {
      supplierEmail,
      supplierName,
      orderNumber,
      items,
      totalAmount,
      restaurantName
    })

    // Create email content
    const emailContent = `Dear ${supplierName},

You have received a new purchase order from ${restaurantName}.

Order Number: ${orderNumber}
Total Amount: ₹${totalAmount}

Items:
${items.map((item: any) => `- ${item.itemName} (${item.quantity} ${item.unit}) - ₹${item.totalPrice}`).join('\n')}

Please confirm receipt and expected delivery date.

Best regards,
${restaurantName}`

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Purchase Orders <orders@resend.dev>',
      to: [supplierEmail],
      subject: `New Purchase Order - ${orderNumber}`,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Purchase Order</h2>
          <p>Dear ${supplierName},</p>
          <p>You have received a new purchase order from <strong>${restaurantName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
          </div>
          
          <h3>Items:</h3>
          <ul>
            ${items.map((item: any) => `<li>${item.itemName} (${item.quantity} ${item.unit}) - ₹${item.totalPrice}</li>`).join('')}
          </ul>
          
          <p>Please confirm receipt and expected delivery date.</p>
          
          <p>Best regards,<br>
          <strong>${restaurantName}</strong></p>
        </div>
      `
    })

    console.log('Email sent successfully:', emailResponse)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Purchase order notification sent successfully',
        emailId: emailResponse.data?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending purchase order notification:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})