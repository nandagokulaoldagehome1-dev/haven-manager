import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(generateHtmlResponse('error', `Authorization failed: ${error}`), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code) {
      return new Response(generateHtmlResponse('error', 'No authorization code received'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-drive-callback`;

    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      throw new Error(tokens.error_description || 'Failed to exchange authorization code');
    }

    console.log('Successfully obtained tokens');

    // Get user email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();
    console.log('Got user info for:', userInfo.email);

    // Calculate token expiry
    const expiresIn = tokens.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save to database using service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing config and insert new one
    await supabase.from('google_drive_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: insertError } = await supabase.from('google_drive_config').insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokenExpiry,
      user_email: userInfo.email,
    });

    if (insertError) {
      console.error('Error saving tokens:', insertError);
      throw new Error('Failed to save tokens to database');
    }

    console.log('Successfully saved Google Drive config for:', userInfo.email);

    return new Response(generateHtmlResponse('success', `Successfully connected Google Drive for ${userInfo.email}`), {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: unknown) {
    console.error('Callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(generateHtmlResponse('error', message), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

function generateHtmlResponse(status: 'success' | 'error', message: string): string {
  const bgColor = status === 'success' ? '#10b981' : '#ef4444';
  const icon = status === 'success' ? '✓' : '✕';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Drive ${status === 'success' ? 'Connected' : 'Error'}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: #1a1a2e;
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          max-width: 400px;
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          margin: 0 auto 1.5rem;
        }
        h1 { margin-bottom: 0.5rem; }
        p { color: #a0aec0; margin-bottom: 1.5rem; }
        .btn {
          background: ${bgColor};
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${status === 'success' ? 'Connected!' : 'Error'}</h1>
        <p>${message}</p>
        <button class="btn" onclick="window.close()">Close Window</button>
      </div>
      <script>
        setTimeout(() => window.close(), 3000);
      </script>
    </body>
    </html>
  `;
}
