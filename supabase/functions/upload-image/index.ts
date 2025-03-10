
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const requestData = await req.json();
    const { base64Image, fileName, fileType } = requestData;

    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing file upload: ${fileName || 'unknown'}, type: ${fileType || 'unknown'}`);

    // For image uploads, we'll use imgbb which is more reliable
    if (fileType && fileType.startsWith('image/')) {
      // Use imgbb API for image uploads
      const formData = new FormData();
      formData.append('key', '26a89992bf0f81be47cf8d96a57b4396'); // imgbb API key
      formData.append('image', base64Image);
      
      console.log("Sending request to imgbb...");
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ImgBB API error: ${response.status}`, errorText);
        throw new Error(`ImgBB API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Successfully uploaded to imgbb");
      
      if (!data.success) {
        throw new Error("ImgBB upload failed: " + (data.error?.message || "Unknown error"));
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          image: {
            url: data.data.url,
            display_url: data.data.display_url,
            title: fileName || 'Uploaded image'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    // Handle Excel/CSV files - store as data URLs for now
    else if (fileType && (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'text/csv' ||
      fileType === 'application/pdf' ||
      fileType === 'application/vnd.ms-powerpoint' ||
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )) {
      console.log(`Creating data URL for file type: ${fileType}`);
      const fileUrl = `data:${fileType};base64,${base64Image}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          image: {
            url: fileUrl,
            display_url: fileUrl,
            title: fileName || 'Uploaded file'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // For other file types, create a simple data URL
    else {
      console.log("Creating data URL for non-supported file type");
      const fileUrl = `data:${fileType || 'application/octet-stream'};base64,${base64Image}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          image: {
            url: fileUrl,
            display_url: fileUrl,
            title: fileName || 'Uploaded file'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in upload-image function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during upload',
        success: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
