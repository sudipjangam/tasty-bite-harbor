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

// Helper function to create JWT for Google Service Account
async function createJWT(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  // Encode header and payload
  const headerBase64 = btoa(JSON.stringify(header)).replace(/[+/]/g, c => c === '+' ? '-' : '_').replace(/=/g, '')
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/[+/]/g, c => c === '+' ? '-' : '_').replace(/=/g, '')
  
  // Create the signature input
  const signatureInput = `${headerBase64}.${payloadBase64}`
  
  // Import the private key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n')
  
  // Convert PEM to binary
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  )
  
  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    new TextEncoder().encode(signatureInput)
  )
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[+/]/g, c => c === '+' ? '-' : '_')
    .replace(/=/g, '')
  
  return `${headerBase64}.${payloadBase64}.${signatureBase64}`
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

    // Get Google Service Account credentials from secrets
    const googleServiceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')

    if (!googleServiceAccountKey) {
      console.error('Missing Google Service Account credentials')
      return new Response(
        JSON.stringify({ error: 'Google Drive API not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse service account key
    let serviceAccount
    try {
      serviceAccount = JSON.parse(googleServiceAccountKey)
    } catch (error) {
      console.error('Invalid Google Service Account key:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid Google Service Account configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use Google Service Account to get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(serviceAccount)
      })
    })

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text()
      console.error('Failed to get access token:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Google Drive' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Convert base64 file to blob
    const fileData = Uint8Array.from(atob(file), c => c.charCodeAt(0))
    
    // Upload to Google Drive using multipart upload
    const folderId = '1y2dpQZVJhhndNpRoNbKVHDkkQ4XFplcH'
    const boundary = '-------314159265358979323846'
    const delimiter = '\r\n--' + boundary + '\r\n'
    const close_delim = '\r\n--' + boundary + '--'

    const metadata = {
      name: `${staffId}_${documentType}_${fileName}`,
      parents: [folderId],
      description: `Staff document: ${documentType} for staff ID: ${staffId}`
    }

    const multipartRequestBody = delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) + delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      file + close_delim

    const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        'Authorization': `Bearer ${accessToken}`
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
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveResponse.id}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
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