import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FreeImageHostResponse {
  status_code: number;
  success?: {
    message: string;
    code: number;
  };
  image?: {
    url: string;
    display_url: string;
    thumb: {
      url: string;
    };
    medium: {
      url: string;
    };
  };
  status_txt: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Image, fileName, fileType } = await req.json()

    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
    formData.append('action', 'upload');
    formData.append('source', base64Image);
    formData.append('format', 'json');

    console.log('Uploading to freeimage.host...');

    // Make the request to freeimage.host
    const response = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: FreeImageHostResponse = await response.json();
    
    console.log('Upload response:', data);

    if (data.status_code === 200 && data.image?.url) {
      // Return the medium size URL for better display quality
      const imageUrl = data.image.medium?.url || data.image.display_url || data.image.url;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl,
          data: data
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      throw new Error(data.status_txt || 'Upload failed');
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Upload failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})