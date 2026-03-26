import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key against profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rows: Array<{
      date: string;
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens: number;
      cache_creation_tokens: number;
      model_breakdown: Record<string, number>;
      project_count: number;
      sessions: number;
      source?: string;
    }> = Array.isArray(body) ? body : [body];

    const now = new Date().toISOString();
    let upserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const source = row.source ?? "claude-code";

      // Check if existing record has a newer synced_at
      const { data: existing } = await supabase
        .from("daily_usage")
        .select("synced_at")
        .eq("user_id", profile.id)
        .eq("date", row.date)
        .eq("source", source)
        .single();

      if (existing && existing.synced_at && new Date(existing.synced_at) >= new Date(now)) {
        skipped++;
        continue;
      }

      const { error: upsertError } = await supabase
        .from("daily_usage")
        .upsert(
          {
            user_id: profile.id,
            date: row.date,
            total_tokens: row.total_tokens,
            input_tokens: row.input_tokens,
            output_tokens: row.output_tokens,
            cache_read_tokens: row.cache_read_tokens,
            cache_creation_tokens: row.cache_creation_tokens,
            model_breakdown: row.model_breakdown,
            project_count: row.project_count,
            sessions: row.sessions,
            synced_at: now,
            source,
          },
          { onConflict: "user_id,date,source" }
        );

      if (upsertError) {
        throw upsertError;
      }

      upserted++;
    }

    return new Response(
      JSON.stringify({ ok: true, upserted, skipped }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
