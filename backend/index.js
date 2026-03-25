export default {
  async fetch(request, env) {

    // 🟢 CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders()
      });
    }

    try {
      const body = await request.json();

      // 🔥 Stöd både prompt och message (frontend mismatch fix)
      const userInput = body.prompt || body.message;

      if (!userInput) {
        return new Response(JSON.stringify({
          error: "No input provided"
        }), {
          status: 400,
          headers: corsHeaders()
        });
      }

      const prompt = `
You are a direct, honest AI. Avoid generic phrases.

User: ${userInput}
`;

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // ✅ FIXAD
          input: prompt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();

        return new Response(JSON.stringify({
          error: "OpenAI error",
          details: errorText
        }), {
          status: 500,
          headers: corsHeaders()
        });
      }

      const data = await response.json();

      // 🧠 Robust parsing (funkar med olika svarstyper)
      let reply =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        "⚠️ No response from AI";

      return new Response(JSON.stringify({ reply }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders()
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: "Server crash",
        details: err.message
      }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
