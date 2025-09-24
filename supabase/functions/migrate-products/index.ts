import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductData {
  name: string;
  id: string;
  artikul: string;
  idWB: string;
  color: string;
  sizeType: string;
  dimensions: string;
  weight: string;
  photo: string[];
  videos: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting products migration...');

    // Get categories and colors from database
    const { data: categories } = await supabase.from('categories').select('*');
    const { data: colors } = await supabase.from('colors').select('*');

    if (!categories || !colors) {
      throw new Error('Failed to fetch categories or colors');
    }

    // Create category and color maps for lookup
    const categoryMap = new Map(categories.map(c => [c.name, c.id]));
    const colorMap = new Map(colors.map(c => [c.name, c.id]));

    // Sample products data - in real implementation, you would import this from your existing products.js
    const productsData: ProductData[] = [
      {
        name: 'Подарочная коробка с лентой',
        id: '059',
        artikul: '059',
        idWB: '215908492',
        color: 'Розовая',
        sizeType: 'малая',
        dimensions: '23x17x7 см', 
        weight: '195 г',
        photo: [
          "images/Малые с бантом/Розовая/Слайд1.webp",
          "images/Малые с бантом/Розовая/Слайд2.webp"
        ],
        videos: ["videos/Video 0.mp4"]
      },
      {
        name: 'Подарочная коробка с лентой',
        id: '0591',
        artikul: '0591',
        idWB: '215915227',
        color: 'Тиффани',
        sizeType: 'малая',
        dimensions: '23x17x7 см',
        weight: '195 г',
        photo: [
          "images/Малые с бантом/Тиффани/Слайд4.webp",
          "images/Малые с бантом/Тиффани/Слайд5.webp"
        ],
        videos: ["videos/Video 0.mp4"]
      },
      {
        name: 'Подарочная коробка с лентой',
        id: '0592',
        artikul: '0592',
        idWB: '215916129',
        color: 'Черная',
        sizeType: 'малая',
        dimensions: '23x17x7 см',
        weight: '195 г',
        photo: [
          "images/Малые с бантом/Черная/Слайд6.webp",
          "images/Малые с бантом/Черная/Слайд7.webp",
          "images/Малые с бантом/Черная/Слайд8.webp",
          "images/Малые с бантом/Черная/Слайд9.webp"
        ],
        videos: ["videos/Video 0.mp4"]
      }
      // Note: This is a minimal sample. In real implementation, load full products array from products.js
    ];

    let migratedCount = 0;
    let errorCount = 0;

    for (const product of productsData) {
      try {
        console.log(`Processing product: ${product.name} - ${product.color}`);

        // Find category ID
        let categoryId = null;
        if (product.sizeType === 'большая') {
          categoryId = categoryMap.get('Большие с бантом');
        } else if (product.sizeType === 'средняя') {
          categoryId = categoryMap.get('Средние с бантом');
        } else if (product.sizeType === 'малая') {
          categoryId = categoryMap.get('Малые с бантом');
        }

        // Handle "Коробка с ручками" category based on image path
        if (product.photo.some(p => p.includes('Коробка с ручками'))) {
          categoryId = categoryMap.get('Коробка с ручками');
        }

        // Find color ID
        const colorId = colorMap.get(product.color);

        // Create product record
        const { data: productRecord, error: productError } = await supabase
          .from('products')
          .insert({
            legacy_id: product.id,
            artikul: product.artikul,
            id_wb: product.idWB,
            name: product.name,
            category_id: categoryId,
            color_id: colorId,
            size_type: product.sizeType,
            dimensions: product.dimensions,
            weight: product.weight,
            is_active: true
          })
          .select()
          .single();

        if (productError) {
          console.error('Error creating product:', productError);
          errorCount++;
          continue;
        }

        console.log(`Created product: ${productRecord.id}`);

        // Process images
        for (let i = 0; i < product.photo.length; i++) {
          const photoPath = product.photo[i];
          
          try {
            // For development, we'll simulate the upload by creating a placeholder
            // In production, you would read the actual file from storage or local filesystem
            console.log(`Would upload image: ${photoPath}`);
            
            // Create a minimal placeholder file for testing
            const imageBuffer = new TextEncoder().encode(`Placeholder for ${photoPath}`);
            const fileName = photoPath.split('/').pop()!;
            const storagePath = `products/${productRecord.id}/${fileName}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-media')
              .upload(storagePath, imageBuffer, {
                contentType: 'image/webp',
                cacheControl: '3600'
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('product-media')
              .getPublicUrl(storagePath);

            // Create image record
            await supabase
              .from('product_images')
              .insert({
                product_id: productRecord.id,
                storage_path: storagePath,
                url: urlData.publicUrl,
                alt_text: `${product.name} ${product.color} - изображение ${i + 1}`,
                sort_order: i,
                is_primary: i === 0
              });

            console.log(`Uploaded image: ${storagePath}`);
          } catch (imageError) {
            console.error(`Error processing image ${photoPath}:`, imageError);
          }
        }

        // Process videos
        for (let i = 0; i < product.videos.length; i++) {
          const videoPath = product.videos[i];
          
          try {
            // For development, we'll simulate the upload by creating a placeholder
            console.log(`Would upload video: ${videoPath}`);
            
            // Create a minimal placeholder file for testing
            const videoBuffer = new TextEncoder().encode(`Placeholder for ${videoPath}`);
            const fileName = videoPath.split('/').pop()!;
            const storagePath = `products/${productRecord.id}/videos/${fileName}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-media')
              .upload(storagePath, videoBuffer, {
                contentType: 'video/mp4',
                cacheControl: '3600'
              });

            if (uploadError) {
              console.error('Video upload error:', uploadError);
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('product-media')
              .getPublicUrl(storagePath);

            // Create video record
            await supabase
              .from('product_videos')
              .insert({
                product_id: productRecord.id,
                storage_path: storagePath,
                url: urlData.publicUrl,
                title: `${product.name} ${product.color} - видео ${i + 1}`,
                sort_order: i
              });

            console.log(`Uploaded video: ${storagePath}`);
          } catch (videoError) {
            console.error(`Error processing video ${videoPath}:`, videoError);
          }
        }

        migratedCount++;
        console.log(`Successfully migrated product ${product.id}`);

      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        errorCount++;
      }
    }

    const result = {
      success: true,
      message: `Migration completed. ${migratedCount} products migrated successfully, ${errorCount} errors.`,
      migrated: migratedCount,
      errors: errorCount
    };

    console.log('Migration result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});