// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: serviceAccount.token_uri,
    exp: expiry,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${payloadB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('Token error:', { status: tokenResponse.status, body: tokenData });
    throw new Error(tokenData.error_description || tokenData.error || `Failed to get access token (status ${tokenResponse.status})`);
  }
  return tokenData.access_token as string;
}

// Find a folder by name inside a parent folder
async function findFolder(
  accessToken: string,
  folderName: string,
  parentFolderId: string
): Promise<string | null> {
  const query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Find folder error:', data);
    return null;
  }
  
  return data.files?.[0]?.id || null;
}

// Create a folder inside a parent folder
async function createFolder(
  accessToken: string,
  folderName: string,
  parentFolderId: string
): Promise<string> {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Create folder error:', data);
    throw new Error(data.error?.message || 'Failed to create folder');
  }

  console.log(`Created folder "${folderName}" with id: ${data.id}`);
  return data.id;
}

// Get or create a resident folder
async function getOrCreateResidentFolder(
  accessToken: string,
  residentName: string,
  parentFolderId: string
): Promise<string> {
  // Sanitize folder name (remove special chars that might cause issues)
  const safeFolderName = residentName.replace(/[<>:"/\\|?*]/g, '_').trim();
  
  // Try to find existing folder
  const existingFolderId = await findFolder(accessToken, safeFolderName, parentFolderId);
  if (existingFolderId) {
    console.log(`Found existing folder for "${safeFolderName}": ${existingFolderId}`);
    return existingFolderId;
  }
  
  // Create new folder
  return await createFolder(accessToken, safeFolderName, parentFolderId);
}

async function uploadToDrive(
  accessToken: string,
  fileName: string,
  fileContent: string,
  mimeType: string,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataStr = JSON.stringify(metadata);

  const bodyParts = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataStr,
    delimiter,
    `Content-Type: ${mimeType}\r\n`,
    'Content-Transfer-Encoding: base64\r\n\r\n',
    fileContent,
    closeDelimiter,
  ];

  const body = bodyParts.join('');

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Upload error:', data);
    throw new Error(data.error?.message || 'Failed to upload to Google Drive');
  }

  // Make file publicly viewable
  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );
  if (!permRes.ok) {
    const permErr = await permRes.json().catch(() => ({}));
    console.error('Permission error:', permErr);
    throw new Error(permErr.error?.message || `Failed to set public permission (status ${permRes.status})`);
  }

  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

async function deleteFromDrive(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to delete from Google Drive');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('Google service account not configured');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    const { action, fileName, fileContent, mimeType, fileId, residentName } = await req.json();

    console.log(`Processing action: ${action}`);

    if (action === 'upload') {
      if (!fileName || !fileContent || !mimeType) {
        throw new Error('Missing required fields: fileName, fileContent, mimeType');
      }

      const rootFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
      if (!rootFolderId) {
        throw new Error(
          'Missing GOOGLE_DRIVE_FOLDER_ID. Create a Drive folder in your account, share it with the service account (client_email), then set GOOGLE_DRIVE_FOLDER_ID to that folder id.'
        );
      }

      // Validate root folder access
      const folderCheckRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,mimeType&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const folderCheck = await folderCheckRes.json().catch(() => ({}));
      if (!folderCheckRes.ok) {
        console.error('Folder access check failed:', {
          rootFolderId,
          status: folderCheckRes.status,
          body: folderCheck,
        });
        throw new Error(
          'Cannot access GOOGLE_DRIVE_FOLDER_ID. Ensure the folder is shared with the service account email (Editor) and the folder id is correct.'
        );
      }
      if (folderCheck?.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID is not a folder id. Copy it from a Drive URL containing /folders/<id>.');
      }

      console.log(`Root folder: ${rootFolderId} (${folderCheck?.name || 'unknown'})`);

      // Get or create resident-specific folder
      let targetFolderId = rootFolderId;
      if (residentName) {
        targetFolderId = await getOrCreateResidentFolder(accessToken, residentName, rootFolderId);
        console.log(`Using resident folder: ${targetFolderId} for "${residentName}"`);
      }

      const result = await uploadToDrive(accessToken, fileName, fileContent, mimeType, targetFolderId);
      console.log(`File uploaded successfully: ${result.id}`);

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      if (!fileId) {
        throw new Error('Missing required field: fileId');
      }

      await deleteFromDrive(accessToken, fileId);
      console.log(`File deleted successfully: ${fileId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "upload" or "delete"');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
