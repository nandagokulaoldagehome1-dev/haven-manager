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

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create client with user's token to verify they're a super admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if requesting user is a super admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Only super admins can invite new admins");
    }

    const { email, action } = await req.json();

    if (action === "invite") {
      if (!email || typeof email !== "string") {
        throw new Error("Valid email is required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      console.log(`Inviting admin: ${email}`);

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: { email?: string | null; id: string }) => u.email === email
      );

      if (existingUser) {
        // User exists, check if they already have a role
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", existingUser.id)
          .maybeSingle();

        if (existingRole) {
          throw new Error("This user is already an admin");
        }

        // Add admin role to existing user
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: existingUser.id,
            role: "admin",
          });

        if (roleInsertError) {
          console.error("Role insert error:", roleInsertError);
          throw new Error("Failed to assign admin role");
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Admin role assigned to existing user ${email}`,
            user_id: existingUser.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new user with invite - this will send an email automatically
      console.log("Creating user and sending invite email...");
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${req.headers.get("origin") || "https://e9338bf3-2986-47ab-a045-e2e89f9939a2.lovableproject.com"}/auth`,
          data: {
            invited_by: requestingUser.id,
            role: "admin",
          },
        }
      );

      if (inviteError) {
        console.error("Invite user error:", inviteError);
        throw new Error(inviteError.message || "Failed to send invitation email");
      }

      if (!inviteData?.user) {
        throw new Error("Failed to create user");
      }

      console.log(`User created with ID: ${inviteData.user.id}`);

      // Add admin role
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: inviteData.user.id,
          role: "admin",
        });

      if (roleInsertError) {
        console.error("Role insert error:", roleInsertError);
        // Try to clean up the user we just created
        await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
        throw new Error("Failed to assign admin role");
      }

      console.log(`Admin role assigned successfully`);

      console.log(`Admin role assigned successfully`);

      console.log(`Successfully invited admin: ${email} - Invitation email sent`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Invitation email sent to ${email}. They will receive an email to set up their account.`,
          user_id: inviteData.user.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove") {
      const { user_id } = await req.json();
      
      if (!user_id) {
        throw new Error("User ID is required");
      }

      // Cannot remove yourself
      if (user_id === requestingUser.id) {
        throw new Error("Cannot remove yourself");
      }

      // Cannot remove super admins
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .maybeSingle();

      if (targetRole?.role === "super_admin") {
        throw new Error("Cannot remove super admin");
      }

      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);

      if (deleteError) {
        throw new Error("Failed to remove admin role");
      }

      return new Response(
        JSON.stringify({ success: true, message: "Admin removed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
