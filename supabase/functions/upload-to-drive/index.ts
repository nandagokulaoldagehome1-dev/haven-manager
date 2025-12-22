import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DriveConfigRow = {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  user_email: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function isExpiredSoon(tokenExpiryIso: string, skewSeconds = 120): boolean {
  const exp = new Date(tokenExpiryIso).getTime();
  return exp - Date.now() <= skewSeconds * 1000;
}

async function refreshAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ access_token: string; expires_in: number }>
{
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    console.error("Refresh token error:", { status: res.status, data });
    throw new Error(data?.error_description || data?.error || "Failed to refresh Google access token");
  }

  return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
}

async function getValidDriveAccessToken(supabaseAdmin: any): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET secrets");

  const { data, error } = await supabaseAdmin
    .from("google_drive_config")
    .select("access_token, refresh_token, token_expiry, user_email")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.access_token || !data?.refresh_token || !data?.token_expiry) {
    throw new Error("Google Drive is not connected. Please connect it in Settings first.");
  }

  const cfg = data as DriveConfigRow;

  if (!isExpiredSoon(cfg.token_expiry)) return cfg.access_token;

  console.log("Access token expired/expiring, refreshing…", {
    user: cfg.user_email,
    token_expiry: cfg.token_expiry,
    now: nowIso(),
  });

  const refreshed = await refreshAccessToken({
    clientId,
    clientSecret,
    refreshToken: cfg.refresh_token,
  });

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { error: updErr } = await supabaseAdmin
    .from("google_drive_config")
    .update({ access_token: refreshed.access_token, token_expiry: newExpiry, updated_at: nowIso() })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (updErr) console.warn("Failed to update google_drive_config with refreshed token:", updErr);

  return refreshed.access_token;
}

async function driveFetch(accessToken: string, input: string, init?: RequestInit) {
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function findFolder(accessToken: string, folderName: string, parentFolderId: string): Promise<string | null> {
  const query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await driveFetch(accessToken, url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Find folder error:", data);
    return null;
  }
  return data.files?.[0]?.id || null;
}

async function createFolder(accessToken: string, folderName: string, parentFolderId: string): Promise<string> {
  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentFolderId],
  };

  const res = await driveFetch(
    accessToken,
    "https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Create folder error:", data);
    throw new Error(data.error?.message || "Failed to create folder");
  }

  console.log(`Created folder "${folderName}" with id: ${data.id}`);
  return data.id;
}

async function getOrCreateResidentFolder(accessToken: string, residentName: string, parentFolderId: string): Promise<string> {
  const safeFolderName = residentName.replace(/[<>:"/\\|?*]/g, "_").trim();
  const existing = await findFolder(accessToken, safeFolderName, parentFolderId);
  if (existing) {
    console.log(`Found existing folder for "${safeFolderName}": ${existing}`);
    return existing;
  }
  return await createFolder(accessToken, safeFolderName, parentFolderId);
}

async function uploadToDrive(accessToken: string, fileName: string, fileContentBase64: string, mimeType: string, folderId: string) {
  const metadata = { name: fileName, mimeType, parents: [folderId] };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = [
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${mimeType}\r\n`,
    "Content-Transfer-Encoding: base64\r\n\r\n",
    fileContentBase64,
    closeDelimiter,
  ].join("");

  const res = await driveFetch(
    accessToken,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Upload error:", data);
    throw new Error(data.error?.message || "Failed to upload to Google Drive");
  }

  // Make file publicly viewable
  const permRes = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );
  if (!permRes.ok) {
    const permErr = await permRes.json().catch(() => ({}));
    console.error("Permission error:", permErr);
    throw new Error(permErr.error?.message || `Failed to set public permission (status ${permRes.status})`);
  }

  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

async function deleteFromDrive(accessToken: string, fileId: string) {
  const res = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: "DELETE",
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to delete from Google Drive");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const accessToken = await getValidDriveAccessToken(supabaseAdmin);

    const { action, fileName, fileContent, mimeType, fileId, residentName } = await req.json();
    console.log(`Processing action: ${action}`);

    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    if (!rootFolderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");

    if (action === "upload") {
      if (!fileName || !fileContent || !mimeType) {
        throw new Error("Missing required fields: fileName, fileContent, mimeType");
      }

      // Ensure root folder exists + readable
      const folderCheckRes = await driveFetch(
        accessToken,
        `https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,mimeType&supportsAllDrives=true`
      );
      const folderCheck = await folderCheckRes.json().catch(() => ({}));
      if (!folderCheckRes.ok) {
        console.error("Root folder check failed:", { rootFolderId, status: folderCheckRes.status, folderCheck });
        throw new Error("Cannot access GOOGLE_DRIVE_FOLDER_ID with the connected Google account. Ensure it exists and is accessible.");
      }
      if (folderCheck?.mimeType !== "application/vnd.google-apps.folder") {
        throw new Error("GOOGLE_DRIVE_FOLDER_ID is not a folder id (must be /folders/<id>)");
      }

      console.log(`Root folder: ${rootFolderId} (${folderCheck?.name || "unknown"})`);

      let targetFolderId = rootFolderId;
      if (residentName) {
        targetFolderId = await getOrCreateResidentFolder(accessToken, residentName, rootFolderId);
        console.log(`Using resident folder: ${targetFolderId} for "${residentName}"`);
      }

      const result = await uploadToDrive(accessToken, fileName, fileContent, mimeType, targetFolderId);
      console.log(`File uploaded successfully: ${result.id}`);

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!fileId) throw new Error("Missing required field: fileId");
      await deleteFromDrive(accessToken, fileId);
      console.log(`File deleted successfully: ${fileId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error('Invalid action. Use "upload" or "delete"');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
