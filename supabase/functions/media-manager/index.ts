import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, requireAdmin, createServiceClient } from "../_shared/adminAuth.ts"


interface UploadImageRequest {
  action: 'upload_images';
  product_id: string;
  files: Array<{
    name: string;
    content: string; // base64
    content_type: string;
  }>;
}

interface UploadVideoRequest {
  action: 'upload_videos';
  product_id: string;
  videos: string[];
}

interface GetMediaRequest {
  action: 'get_media';
  product_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SAFE P0 patch: admin-only. Nothing privileged happens before this check.
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabaseClient = createServiceClient()

    const body = await req.json()
    console.log('media-manager action:', body?.action, 'product:', body?.product_id)


    switch (body.action) {
      case 'upload_images':
        return await uploadImages(supabaseClient, body as UploadImageRequest)
      case 'upload_videos':
        return await uploadVideos(supabaseClient, body as UploadVideoRequest)
      case 'get_media':
        return await getMedia(supabaseClient, body as GetMediaRequest)
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
  const { product_id, files } = request

  console.log(`Uploading ${files.length} images for product ${product_id}`)

  // Get current product data
  const { data: product, error: productError } = await supabaseClient
    .from('products')
    .select('photos')
    .eq('id', product_id)
    .single()

  if (productError) {
    throw new Error(`Product not found: ${productError.message}`)
  }

  const currentPhotos = product.photos || []
  const newPhotos = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileExtension = file.name.split('.').pop() || 'webp'
    const timestamp = Date.now()
    const filename = `${product_id}_${timestamp}_${i + 1}.${fileExtension}`
    const storagePath = `images/${filename}`
    
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

    newPhotos.push(urlData.publicUrl)
  }

  // Update product with new photos
  const updatedPhotos = [...currentPhotos, ...newPhotos]
  const { error: updateError } = await supabaseClient
    .from('products')
    .update({ photos: updatedPhotos })
    .eq('id', product_id)

  if (updateError) {
    console.error('Update error:', updateError)
    // Clean up uploaded files
    for (const photo of newPhotos) {
      const path = photo.split('/').pop()
      await supabaseClient.storage.from('product-media').remove([`images/${path}`])
    }
    throw new Error(`Failed to update product: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      uploaded_images: newPhotos.length,
      photos: updatedPhotos
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function uploadVideos(supabaseClient: any, request: UploadVideoRequest) {
  const { product_id, videos } = request

  console.log(`Updating videos for product ${product_id}`)

  // Get current product data
  const { data: product, error: productError } = await supabaseClient
    .from('products')
    .select('videos')
    .eq('id', product_id)
    .single()

  if (productError) {
    throw new Error(`Product not found: ${productError.message}`)
  }

  // Update product with new videos
  const { error: updateError } = await supabaseClient
    .from('products')
    .update({ videos })
    .eq('id', product_id)

  if (updateError) {
    throw new Error(`Failed to update videos: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      videos
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function getMedia(supabaseClient: any, request: GetMediaRequest) {
  const { product_id } = request

  console.log(`Getting media for product ${product_id}`)

  const { data: product, error } = await supabaseClient
    .from('products')
    .select('photos, videos')
    .eq('id', product_id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch product media: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      photos: product.photos || [], 
      videos: product.videos || [] 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}