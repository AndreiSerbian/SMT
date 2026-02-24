import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MM_TO_PT = 72 / 25.4; // 1mm ≈ 2.835pt

// Page order per PRD: top, left, right, front, back, bottom, inside
const PAGE_ORDER = ['top', 'left', 'right', 'front', 'back', 'bottom', 'inside'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { design_id, preview_urls, product_dimensions, options } = await req.json();

    if (!design_id || !preview_urls) {
      return new Response(
        JSON.stringify({ error: 'Missing design_id or preview_urls' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dims = product_dimensions || { length: 200, width: 150, height: 100 };
    const l = parseFloat(dims.length) || 200;
    const w = parseFloat(dims.width) || 150;
    const h = parseFloat(dims.height) || 100;

    // Side dimensions in mm
    const sideDimsMap: Record<string, { width: number; height: number }> = {
      front:  { width: l, height: h },
      back:   { width: l, height: h },
      left:   { width: w, height: h },
      right:  { width: w, height: h },
      top:    { width: l, height: w },
      bottom: { width: l, height: w },
      inside: { width: l, height: w },
    };

    // Create PDF
    const pdfDoc = await PDFDocument.create();

    for (const side of PAGE_ORDER) {
      const url = preview_urls[side];
      if (!url) continue;

      const sideDims = sideDimsMap[side];
      const pageWidth = sideDims.width * MM_TO_PT;
      const pageHeight = sideDims.height * MM_TO_PT;

      // Download PNG
      const imgResponse = await fetch(url);
      if (!imgResponse.ok) {
        console.warn(`Failed to download ${side} preview: ${imgResponse.status}`);
        continue;
      }
      const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());

      // Embed image
      const pngImage = await pdfDoc.embedPng(imgBytes);

      // Add page
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pdfPath = `designs/${design_id}/production/production.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error('PDF upload failed: ' + uploadError.message);
    }

    const { data: urlData } = supabase.storage
      .from('product-media')
      .getPublicUrl(pdfPath);

    const pdfUrl = urlData.publicUrl;

    // Update design record
    await supabase
      .from('designs')
      .update({ production_pdf_url: pdfUrl })
      .eq('id', design_id);

    return new Response(
      JSON.stringify({ pdf_url: pdfUrl, design_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
