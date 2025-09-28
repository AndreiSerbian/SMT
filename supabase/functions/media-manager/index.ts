import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadImageRequest {
  action: 'upload_images';
  product_id: string;
  category: string;
  color: string;
  files: Array<{
    name: string;
    data: string; // base64
    type: string;
  }>;
}

interface ListImagesRequest {
  action: 'list_images';
  product_id: string;
}

interface SetPrimaryRequest {
  action: 'set_primary';
  image_id: string;
  product_id: string;
}

interface DeleteImageRequest {
  action: 'delete_image';
  image_id: string;
  product_id: string;
}

type MediaRequest = UploadImageRequest | ListImagesRequest | SetPrimaryRequest | DeleteImageRequest;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: MediaRequest = await req.json();
    console.log('Media manager request:', requestData.action);

    switch (requestData.action) {
      case 'upload_images':
        return await uploadImages(supabaseClient, requestData);
      
      case 'list_images':
        return await listImages(supabaseClient, requestData);
      
      case 'set_primary':
        return await setPrimaryImage(supabaseClient, requestData);
      
      case 'delete_image':
        return await deleteImage(supabaseClient, requestData);
      
      default:
        throw new Error('Unknown action');
    }

  } catch (error) {
    console.error('Media manager error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function uploadImages(supabaseClient: any, request: UploadImageRequest) {
  const { product_id, category, color, files } = request;
  const uploadResults = [];

  // Проверяем, есть ли уже изображения для этого товара
  const { data: existingImages } = await supabaseClient
    .from('box_images')
    .select('id')
    .eq('product_id', product_id);

  const isFirstImage = !existingImages || existingImages.length === 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Определяем расширение файла по MIME типу
      const extension = getExtensionFromMimeType(file.type);
      const isVideo = file.type.startsWith('video/');
      
      // Генерируем имя файла
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}-${random}.${extension}`;
      
      // Формируем путь - видео в отдельную папку
      const storagePath = isVideo 
        ? `videos/${filename}` 
        : `images/${category}/${color}/${filename}`;
      
      // Конвертируем base64 в Uint8Array
      const base64Data = file.data.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Загружаем файл в storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('public-media')
        .upload(storagePath, binaryData, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Формируем публичную ссылку
      const { data: { publicUrl } } = supabaseClient.storage
        .from('public-media')
        .getPublicUrl(storagePath);

      // Создаем запись в БД
      const { data: imageRecord, error: dbError } = await supabaseClient
        .from('box_images')
        .insert({
          product_id,
          image_url: publicUrl,
          storage_path: storagePath,
          is_primary: isFirstImage && i === 0 // Первое изображение первого товара делаем главным
        })
        .select()
        .single();

      if (dbError) throw dbError;

      uploadResults.push({
        success: true,
        image: imageRecord,
        filename
      });

    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      uploadResults.push({
        success: false,
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      results: uploadResults,
      message: `Загружено ${uploadResults.filter(r => r.success).length} из ${files.length} файлов`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listImages(supabaseClient: any, request: ListImagesRequest) {
  const { product_id } = request;

  const { data: images, error } = await supabaseClient
    .from('box_images')
    .select('*')
    .eq('product_id', product_id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      images: images || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function setPrimaryImage(supabaseClient: any, request: SetPrimaryRequest) {
  const { image_id, product_id } = request;

  // Сначала убираем флаг is_primary у всех изображений товара
  const { error: resetError } = await supabaseClient
    .from('box_images')
    .update({ is_primary: false })
    .eq('product_id', product_id);

  if (resetError) throw resetError;

  // Устанавливаем флаг is_primary для выбранного изображения
  const { data: updatedImage, error: setPrimaryError } = await supabaseClient
    .from('box_images')
    .update({ is_primary: true })
    .eq('id', image_id)
    .eq('product_id', product_id)
    .select()
    .single();

  if (setPrimaryError) throw setPrimaryError;

  return new Response(
    JSON.stringify({ 
      success: true, 
      image: updatedImage,
      message: 'Главное изображение установлено'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteImage(supabaseClient: any, request: DeleteImageRequest) {
  const { image_id, product_id } = request;

  // Получаем информацию об изображении
  const { data: image, error: getError } = await supabaseClient
    .from('box_images')
    .select('*')
    .eq('id', image_id)
    .eq('product_id', product_id)
    .single();

  if (getError) throw getError;
  if (!image) throw new Error('Изображение не найдено');

  const wasMainImage = image.is_primary;

  // Удаляем файл из storage
  const { error: storageError } = await supabaseClient.storage
    .from('public-media')
    .remove([image.storage_path]);

  if (storageError) {
    console.error('Error deleting from storage:', storageError);
    // Продолжаем даже если не удалось удалить из storage
  }

  // Удаляем запись из БД
  const { error: dbError } = await supabaseClient
    .from('box_images')
    .delete()
    .eq('id', image_id);

  if (dbError) throw dbError;

  // Если удалили главное изображение, назначаем главным самое старое оставшееся
  if (wasMainImage) {
    const { data: remainingImages, error: remainingError } = await supabaseClient
      .from('box_images')
      .select('id')
      .eq('product_id', product_id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (remainingError) throw remainingError;

    if (remainingImages && remainingImages.length > 0) {
      const { error: newPrimaryError } = await supabaseClient
        .from('box_images')
        .update({ is_primary: true })
        .eq('id', remainingImages[0].id);

      if (newPrimaryError) throw newPrimaryError;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Изображение удалено'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm'
  };

  return mimeToExt[mimeType.toLowerCase()] || 'bin';
}