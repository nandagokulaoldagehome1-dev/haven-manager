// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify requester is super admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Only super admins can view admin list");
    }

    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .in("role", ["super_admin", "admin"]);

    if (rolesError) {
      throw new Error("Failed to fetch admin roles");
    }

    const admins = await Promise.all(
      (adminRoles || []).map(async (role: { id: string; user_id: string; role: string; created_at?: string }) => {
        const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
        return {
          id: role.id,
          user_id: role.user_id,
          role: role.role,
          email: userResp?.user?.email || undefined,
          created_at: role.created_at,
        };
      })
    );

    return new Response(
      JSON.stringify({ success: true, admins }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
