import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleDriveUploadResponse {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { file, fileName, mimeType, staffId, documentType, documentNumber, restaurantId } = await req.json()

    if (!file || !fileName || !staffId || !documentType || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Google Drive API credentials from secrets
    const googleApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!googleApiKey || !googleClientId || !googleClientSecret) {
      console.error('Missing Google Drive API credentials')
      return new Response(
        JSON.stringify({ error: 'Google Drive API not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get access token (using service account or OAuth flow)
    // For simplicity, we'll use the API key approach with a public folder
    const folderId = '1xqYNJ073HM_7dNEVCH8jIKP_FFPo14FQ' // Your shared folder ID

    // Convert base64 file to blob
    const fileData = Uint8Array.from(atob(file), c => c.charCodeAt(0))
    
    // Create form data for multipart upload
    const boundary = '-------314159265358979323846'
    const delimiter = '\r\n--' + boundary + '\r\n'
    const close_delim = '\r\n--' + boundary + '--'

    const metadata = {
      name: `${staffId}_${documentType}_${fileName}`,
      parents: [folderId],
      description: `Staff document: ${documentType} for staff ID: ${staffId}`
    }

    let multipartRequestBody = delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) + delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      file + close_delim

    const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text()
      console.error('Google Drive upload failed:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to upload to Google Drive' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const driveResponse: GoogleDriveUploadResponse = await uploadResponse.json()

    // Make file publicly viewable
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveResponse.id}/permissions?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    })

    // Save document info to Supabase
    const { data: documentData, error: dbError } = await supabase
      .from('staff_documents')
      .insert({
        staff_id: staffId,
        restaurant_id: restaurantId,
        document_type: documentType,
        document_number: documentNumber,
        document_name: fileName,
        google_drive_file_id: driveResponse.id,
        google_drive_url: driveResponse.webViewLink,
        file_size: fileData.length,
        mime_type: mimeType,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert failed:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save document info' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: documentData,
        driveFileId: driveResponse.id,
        driveUrl: driveResponse.webViewLink
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})