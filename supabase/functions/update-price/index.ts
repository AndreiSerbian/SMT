import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, requireAdmin, createServiceClient } from '../_shared/adminAuth.ts';

interface UpdatePriceRequest {
  product_id: string;
  price: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // SAFE P0 patch: admin-only via JWT + has_role.
  // Plaintext admin_login/admin_password in the request body is no longer accepted.
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceClient();

    const { product_id, price }: UpdatePriceRequest = await req.json();

    // Validate input
    if (!product_id || price === undefined || price === null || Number.isNaN(Number(price))) {
      return new Response(JSON.stringify({
        error: 'Missing or invalid required fields: product_id, price'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Update price
    const { error: updateError } = await supabase
      .from('product_prices')
      .upsert({ 
        product_id: product_id, 
        price_rub: Number(price) 
      }, { 
        onConflict: 'product_id' 
      });

    if (updateError) {
      console.error('Price update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update price' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Price updated successfully',
      product_id,
      new_price: Number(price)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-price function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});