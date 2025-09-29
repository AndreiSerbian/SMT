import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadImageRequest {
  action: 'upload_images';
  product_id: string;
  category: string;
  color: string;
  files: Array<{
    name: string;
    content: string; // base64
    content_type: string;
  }>;
  primary_index?: number;
}

interface DeleteImageRequest {
  action: 'delete_image';
  image_id: string;
}

interface SetPrimaryRequest {
  action: 'set_primary';
  image_id: string;
}

interface GetImagesRequest {
  action: 'get_images';
  product_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('Request body:', body)

    switch (body.action) {
      case 'upload_images':
        return await uploadImages(supabaseClient, body as UploadImageRequest)
      case 'delete_image':
        return await deleteImage(supabaseClient, body as DeleteImageRequest)
      case 'set_primary':
        return await setPrimaryImage(supabaseClient, body as SetPrimaryRequest)
      case 'get_images':
        return await getImages(supabaseClient, body as GetImagesRequest)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function uploadImages(supabaseClient: any, request: UploadImageRequest) {
  const { product_id, category, color, files, primary_index = 0 } = request

  console.log(`Uploading ${files.length} images for product ${product_id}`)

  // Get existing images count for this product to continue numbering
  const { data: existingImages } = await supabaseClient
    .from('box_images')
    .select('storage_path')
    .eq('product_id', product_id)

  let slideNumber = (existingImages?.length || 0) + 1
  const uploadedImages = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileExtension = file.name.split('.').pop() || 'webp'
    const filename = `slide${slideNumber}.${fileExtension}`
    const storagePath = `images/${category}/${color}/${filename}`
    
    console.log(`Uploading to path: ${storagePath}`)

    // Convert base64 to blob
    const base64Data = file.content.replace(/^data:image\/[a-z]+;base64,/, '')
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('product-media')
      .upload(storagePath, binaryData, {
        contentType: file.content_type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload ${filename}: ${uploadError.message}`)
    }

    // Generate public URL
    const { data: urlData } = supabaseClient.storage
      .from('product-media')
      .getPublicUrl(storagePath)

    // Create database record
    const { data: imageRecord, error: dbError } = await supabaseClient
      .from('box_images')
      .insert({
        product_id,
        image_url: urlData.publicUrl,
        storage_path: storagePath,
        is_primary: i === primary_index
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabaseClient.storage.from('product-media').remove([storagePath])
      throw new Error(`Failed to create database record: ${dbError.message}`)
    }

    uploadedImages.push(imageRecord)
    slideNumber++
  }

  // If setting a primary image, unset all other primary flags for this product
  if (primary_index >= 0 && uploadedImages[primary_index]) {
    await supabaseClient
      .from('box_images')
      .update({ is_primary: false })
      .eq('product_id', product_id)
      .neq('id', uploadedImages[primary_index].id)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      uploaded_images: uploadedImages.length,
      images: uploadedImages
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function deleteImage(supabaseClient: any, request: DeleteImageRequest) {
  const { image_id } = request

  console.log(`Deleting image ${image_id}`)

  // Get image info first
  const { data: imageData, error: fetchError } = await supabaseClient
    .from('box_images')
    .select('*')
    .eq('id', image_id)
    .single()

  if (fetchError || !imageData) {
    throw new Error('Image not found')
  }

  const { product_id, storage_path, is_primary } = imageData

  // Delete from storage
  const { error: storageError } = await supabaseClient.storage
    .from('product-media')
    .remove([storage_path])

  if (storageError) {
    console.error('Storage deletion error:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabaseClient
    .from('box_images')
    .delete()
    .eq('id', image_id)

  if (dbError) {
    throw new Error(`Failed to delete from database: ${dbError.message}`)
  }

  // If deleted image was primary, set the oldest remaining image as primary
  if (is_primary) {
    const { data: remainingImages } = await supabaseClient
      .from('box_images')
      .select('id')
      .eq('product_id', product_id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (remainingImages && remainingImages.length > 0) {
      await supabaseClient
        .from('box_images')
        .update({ is_primary: true })
        .eq('id', remainingImages[0].id)
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function setPrimaryImage(supabaseClient: any, request: SetPrimaryRequest) {
  const { image_id } = request

  console.log(`Setting primary image ${image_id}`)

  // Get product_id for this image
  const { data: imageData, error: fetchError } = await supabaseClient
    .from('box_images')
    .select('product_id')
    .eq('id', image_id)
    .single()

  if (fetchError || !imageData) {
    throw new Error('Image not found')
  }

  const { product_id } = imageData

  // Unset all primary flags for this product
  await supabaseClient
    .from('box_images')
    .update({ is_primary: false })
    .eq('product_id', product_id)

  // Set new primary
  const { error: updateError } = await supabaseClient
    .from('box_images')
    .update({ is_primary: true })
    .eq('id', image_id)

  if (updateError) {
    throw new Error(`Failed to set primary: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function getImages(supabaseClient: any, request: GetImagesRequest) {
  const { product_id } = request

  console.log(`Getting images for product ${product_id}`)

  const { data: images, error } = await supabaseClient
    .from('box_images')
    .select('*')
    .eq('product_id', product_id)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch images: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, images: images || [] }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}