import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePriceRequest {
  product_id: string;
  price: number;
  admin_login: string;
  admin_password: string;
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { product_id, price, admin_login, admin_password }: UpdatePriceRequest = await req.json();

    // Validate input
    if (!product_id || price === undefined || !admin_login || !admin_password) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: product_id, price, admin_login, admin_password' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin credentials
    const { data: isAdmin, error: authError } = await supabase
      .rpc('is_admin_user', {
        login_input: admin_login,
        password_input: admin_password
      });

    if (authError) {
      console.error('Auth verification error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied: invalid admin credentials' }), {
        status: 403,
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