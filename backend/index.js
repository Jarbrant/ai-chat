export default {
  async fetch(request, env) {

    // 🟢 CORS headers (återanvänds överallt)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json"
    };

    // 🟢 Hantera preflight (viktigt för browser)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 🔴 Endast POST tillåtet
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: corsHeaders });
    }

    try {
      // 📥 Läs input
      const { prompt } = await request.json();

      if (!prompt) {
        return new Response(JSON.stringify({ error: "No prompt provided" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // 🤖 OpenAI request
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.3",
          input: prompt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: errorText }), {
          status: 500,
          headers: corsHeaders
        });
      }

      const data = await response.json();

      // 💬 Extrahera svar säkert
      const reply =
        data.output?.[0]?.content?.[0]?.text ||
        "⚠️ Kunde inte läsa svar";

      return new Response(JSON.stringify({ reply }), {
        headers: corsHeaders
      });

    } catch (err) {

      return new Response(JSON.stringify({
        error: "Server error",
        details: err.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
