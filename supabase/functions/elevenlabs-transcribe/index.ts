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
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model_id", "scribe_v2");
    apiFormData.append("language_code", "fra");
    apiFormData.append("diarize", "true");
    apiFormData.append("tag_audio_events", "false");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);

      // Parse ElevenLabs error to extract provider_status
      let provider_status: string | undefined;
      let detail_message = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.detail?.status) {
          provider_status = errorJson.detail.status;
        }
        if (errorJson?.detail?.message) {
          detail_message = errorJson.detail.message;
        } else if (typeof errorJson?.detail === "string") {
          detail_message = errorJson.detail;
        }
      } catch {
        // errorText is not JSON, use as-is
      }

      // Map known statuses
      if (!provider_status) {
        if (response.status === 401 || response.status === 403) {
          provider_status = "payment_issue";
        } else if (response.status === 429) {
          provider_status = "rate_limited";
        }
      }

      return new Response(
        JSON.stringify({
          error: "Transcription failed",
          details: detail_message,
          provider_status: provider_status || "unknown",
        }),
        {
          status: response.status >= 400 && response.status < 500 ? response.status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transcription = await response.json();

    return new Response(JSON.stringify({ text: transcription.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Transcribe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
