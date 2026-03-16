import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, new_password } = await req.json();

    if (!email || !new_password) {
      throw new Error("Email et nouveau mot de passe requis");
    }

    // Find user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUsers?.users?.find((u: any) => u.email === email);

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Update password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("reset-password error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
