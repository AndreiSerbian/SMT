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

    // Получаем справочники
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name');
    
    const { data: colors } = await supabaseClient
      .from('colors')
      .select('id, name');

    if (!categories || !colors) {
      throw new Error('Failed to load categories or colors');
    }

    const categoryMap = new Map(categories.map(c => [c.name, c.id]));
    const colorMap = new Map(colors.map(c => [c.name, c.id]));

    // Маппинг категорий из JSON в базу
    const sizeTypeMapping: Record<string, string> = {
      'малая': 'Малая',
      'средняя': 'Средняя', 
      'большая': 'Большая'
    };

    let imported = 0;
    let errors = 0;

    for (const product of products as Product[]) {
      try {
        const categoryName = sizeTypeMapping[product.sizeType] || 'Малая';
        const categoryId = categoryMap.get(categoryName);
        const colorId = colorMap.get(product.color);

        if (!categoryId) {
          console.error(`Category not found: ${categoryName} for product ${product.artikul}`);
          errors++;
          continue;
        }

        if (!colorId) {
          console.error(`Color not found: ${product.color} for product ${product.artikul}`);
          errors++;
          continue;
        }

        // Определяем цену по размеру
        let price = 500; // По умолчанию для малых
        if (product.sizeType === 'средняя') price = 800;
        if (product.sizeType === 'большая') price = 1200;

        const { error } = await supabaseClient
          .from('products')
          .upsert({
            artikul: product.artikul,
            name: product.name,
            category_id: categoryId,
            color_id: colorId,
            price_rub: price,
            id_wb: product.idWB,
            dimensions: product.dimensions,
            weight: product.weight,
            photos: product.photo,
            videos: product.videos || [],
            is_active: true
          }, {
            onConflict: 'artikul'
          });

        if (error) {
          console.error(`Error importing product ${product.artikul}:`, error);
          errors++;
        } else {
          imported++;
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});