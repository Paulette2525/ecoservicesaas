import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transcription, client_name, visit_date } = await req.json();
    if (!transcription) {
      return new Response(JSON.stringify({ error: "No transcription provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un assistant commercial expert. À partir de la transcription d'un échange commercial, génère un résumé clair et naturel en français.

Règles de formatage :
- N'utilise PAS de Markdown (pas de **, ##, ###, etc.)
- Utilise des tirets simples (-) pour les listes
- Sépare les sections par des lignes vides
- Écris de manière fluide et naturelle, pas robotique

Structure suggérée (inclus uniquement les sections pertinentes) :
- Commence par 2-3 phrases résumant l'essentiel de l'échange
- Si des produits ou services ont été discutés, liste-les
- Si le client a exprimé des besoins spécifiques, mentionne-les
- Si des objections ou réticences ont été formulées, note-les
- Termine par les prochaines actions concrètes à mener

Si la transcription est courte ou informelle, adapte le résumé en conséquence. Ne force pas des sections vides.`;

    const userPrompt = `Visite commerciale chez ${client_name || "un client"} le ${visit_date || "date non précisée"}.

Transcription de l'échange :
${transcription}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      return new Response(JSON.stringify({ error: "Erreur lors de la génération du résumé" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
