import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  name: string;
  id: string;
  artikul: string;
  idWB?: string;
  color: string;
  sizeType: string;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  photo: string[];
  videos?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { products, admin_login, admin_password } = await req.json();

    // Проверяем права админа
    const { data: isAdmin } = await supabaseClient.rpc('is_admin_user', {
      login_input: admin_login,
      password_input: admin_password
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting import of ${products.length} products`);

    // Маппинг размеров из JSON в базу
    const sizeTypeMapping: Record<string, 'small' | 'medium' | 'big'> = {
      'малая': 'small',
      'средняя': 'medium', 
      'большая': 'big'
    };

    // Маппинг цветов в hex коды
    const colorMapping: Record<string, string> = {
      'Розовая': '#FFB6C1',
      'Черная': '#1a1a1a',
      'Белая': '#FFFFFF',
      'Золотая': '#FFD700',
      'Серебряная': '#C0C0C0',
      'Красная': '#FF0000',
      'Оранжевая': '#FFA500',
      'Персиковая': '#FFCBA4',
      'Голубая ледяная': '#B0E0E6',
      'Синяя бархатная': '#003366',
      'Тиффани': '#0ABAB5',
      'Ванильная': '#F3E5AB',
      'Белая алмазная': '#F8F8FF',
      'Черная муар': '#2F2F2F',
      'Лавандовая': '#E6E6FA',
      'Сиреневая': '#DDA0DD'
    };

    let imported = 0;
    let errors = 0;

    for (const product of products as Product[]) {
      try {
        const size = sizeTypeMapping[product.sizeType] || 'small';
        const colorHex = colorMapping[product.color] || '#000000';

        // Определяем цену по размеру
        let price = 500; // По умолчанию для малых
        if (product.sizeType === 'средняя') price = 800;
        if (product.sizeType === 'большая') price = 1200;

        // Проверяем, существует ли товар с таким artikul или id
        const { data: existingProduct } = await supabaseClient
          .from('products')
          .select('id, artikul')
          .or(`id.eq.${product.artikul},artikul.eq.${product.artikul}`)
          .maybeSingle();

        const productData = {
          artikul: product.artikul,
          name: product.name,
          size: size,
          color_hex: colorHex,
          price_rub: price,
          id_wb: product.idWB,
          dimensions: product.dimensions,
          weight: product.weight,
          photos: product.photo,
          videos: product.videos || [],
          is_active: true
        };

        let error;
        if (existingProduct) {
          // Обновляем существующий товар
          console.log(`Updating existing product ${product.artikul}`);
          const result = await supabaseClient
            .from('products')
            .update(productData)
            .eq('id', existingProduct.id);
          error = result.error;
        } else {
          // Создаём новый товар
          console.log(`Creating new product ${product.artikul}`);
          const result = await supabaseClient
            .from('products')
            .insert({
              ...productData,
              id: product.artikul
            });
          error = result.error;
        }

        if (error) {
          console.error(`Error importing product ${product.artikul}:`, error);
          errors++;
        } else {
          imported++;
          
          // Также добавляем/обновляем запись в product_prices
          await supabaseClient
            .from('product_prices')
            .upsert({
              product_id: product.artikul,
              price_rub: price
            }, {
              onConflict: 'product_id'
            });
        }
      } catch (err) {
        console.error(`Exception importing product ${product.artikul}:`, err);
        errors++;
      }
    }

    console.log(`Import completed: ${imported} imported, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        errors,
        message: `Импортировано ${imported} товаров, ошибок: ${errors}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});