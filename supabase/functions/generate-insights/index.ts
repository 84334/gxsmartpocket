import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const since = new Date(); since.setDate(since.getDate() - 60);
    const [{ data: items }, { data: profile }, { data: fixed }] = await Promise.all([
      supabase.from("receipt_items").select("name,price,quantity,category,is_essential,created_at").gte("created_at", since.toISOString()),
      supabase.from("profiles").select("monthly_income").maybeSingle(),
      supabase.from("fixed_expenses").select("name,amount"),
    ]);

    const summary = {
      monthly_income: profile?.monthly_income ?? 0,
      fixed_expenses: fixed ?? [],
      items: (items ?? []).map(i => ({ ...i, total: Number(i.price) * Number(i.quantity) })),
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content:
`You are a warm, friendly money buddy for a Malaysian student/young adult. Currency is RM.
Talk like a caring friend texting them, not a finance app. Use "you", contractions, light tone.

Your job each run: hunt for hidden or sneaky spending patterns and turn them into one personal, actionable nudge each.
Look hard for things like:
- repeated small "treat" buys (boba, snacks, coffee) that quietly add up
- duplicate categories in a single day (two food deliveries, two coffees)
- weekend spikes vs weekdays
- non-essential items creeping above essentials
- same merchant appearing many times
- impulse-feeling items (entertainment, shopping) when budget is tight

Tone rules:
- title: 3–6 words, friendly (e.g. "Boba is sneaking up", "Weekends are your weak spot")
- body: 1 short sentence, max 22 words. Mention a real number from the data (RMx, X times, etc.) and ONE tiny suggestion.
- never say "Analysis shows" or "Based on data". Sound human.
- severity: warning = costing them, success = doing well, info = neutral nudge` },
          { role: "user", content: `Here's my last 60 days. Spot the hidden patterns and give me 3–5 short, personal nudges + a 0–100 health score.\n\nDATA:\n${JSON.stringify(summary).slice(0,8000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report",
            parameters: {
              type: "object",
              properties: {
                health_score: { type: "number", description: "0-100" },
                health_label: { type: "string", enum: ["Poor","Average","Good","Excellent"] },
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      body: { type: "string", description: "One sentence, max 18 words, with a concrete number/action." },
                      severity: { type: "string", enum: ["info","warning","success"] },
                    },
                    required: ["title","body","severity"],
                  },
                },
              },
              required: ["health_score","health_label","insights"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report" } },
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI failed");
    }
    const j = await aiResp.json();
    const call = j.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("no tool call");
    const out = JSON.parse(call.function.arguments);

    // Replace insights for this user
    await supabase.from("insights").delete().eq("user_id", user.id);
    if (out.insights?.length) {
      await supabase.from("insights").insert(out.insights.map((i: any) => ({ ...i, user_id: user.id })));
    }

    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-insights error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});