import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an expert receipt parser. Given a receipt image, extract structured data.
Return ONLY valid JSON matching this exact schema:
{
  "merchant": string,
  "currency": string (e.g. "RM", "USD"),
  "purchased_at": string (ISO datetime if found, else null),
  "total_amount": number,
  "items": [
    { "name": string, "price": number, "quantity": number,
      "category": "Food"|"Transport"|"Utilities"|"Shopping"|"Entertainment"|"Others",
      "is_essential": boolean }
  ]
}
Mark snacks, bubble tea, candy, alcohol, fast food treats, impulse buys as is_essential=false. Mark groceries, basic meals, transport, bills as essential=true. Use "RM" if Malaysian receipt.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) throw new Error("imageUrl required");

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

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: [
            { type: "text", text: "Extract this receipt." },
            { type: "image_url", image_url: { url: imageUrl } },
          ] },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_receipt",
            description: "Save parsed receipt",
            parameters: {
              type: "object",
              properties: {
                merchant: { type: "string" },
                currency: { type: "string" },
                purchased_at: { type: "string" },
                total_amount: { type: "number" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      price: { type: "number" },
                      quantity: { type: "number" },
                      category: { type: "string", enum: ["Food","Transport","Utilities","Shopping","Entertainment","Others"] },
                      is_essential: { type: "boolean" },
                    },
                    required: ["name","price","quantity","category","is_essential"],
                  },
                },
              },
              required: ["merchant","currency","total_amount","items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_receipt" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("ai error", aiResp.status, t);
      throw new Error("AI parse failed");
    }

    const aiJson = await aiResp.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("no tool call returned");
    const parsed = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ parsed, imageUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("scan-receipt error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});