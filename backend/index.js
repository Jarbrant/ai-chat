export default {
  async fetch(request, env) {

    /* =========================================================
       🌐 CORS & REQUEST VALIDATION
       ========================================================= */

    // Hantera preflight (browser krav)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // Tillåt endast POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders()
      });
    }

    try {

      /* =========================================================
         📥 INPUT PARSING
         ========================================================= */

      const body = await request.json();
      let input;

      // 🧠 Fall 1: vi får hela konversationen (bäst)
      if (Array.isArray(body.messages)) {

        // Gör om historik → textformat
        input = body.messages
          .map(m => `${m.role}: ${m.content}`)
          .join("\n");

      }

      // 🧠 Fall 2: fallback (enstaka prompt)
      else if (body.prompt || body.message) {

        input = body.prompt || body.message;

      }

      // ❌ Fel input
      else {
        return new Response(JSON.stringify({
          error: "No input provided"
        }), {
          status: 400,
          headers: corsHeaders()
        });
      }


      const prompt = `
You are a sharp, experienced advisor.

You are not here to be nice.
You are here to help the user think clearly and make better decisions.

Behavior:
- Be direct and to the point
- Cut through vague thinking
- Challenge weak reasoning
- If the user is unclear → ask instead of guessing
- If something is a bad idea → say it plainly

Tone:
- Calm, confident, and human
- Not robotic
- Not overly polite
- Not like a self-help article

How to respond:
- Start with the core insight (1–2 sentences max)
- Then give one concrete piece of advice
- Then point out one real risk or blind spot
- End with one sharp follow-up question

Avoid:
- Generic tips
- Long explanations
- “You should consider…” style fluff

Conversation:
${input}
`;
      /* =========================================================
         🤖 OPENAI REQUEST
         ========================================================= */

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: prompt
        })
      });


      /* =========================================================
         ⚠️ ERROR HANDLING
         ========================================================= */

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


      /* =========================================================
         📤 RESPONSE PARSING
         ========================================================= */

      const data = await response.json();

      // Robust parsing (OpenAI kan returnera olika format)
      const reply =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        "⚠️ No response from AI";


      /* =========================================================
         📦 RETURN TO FRONTEND
         ========================================================= */

      return new Response(JSON.stringify({ reply }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders()
        }
      });

    } catch (err) {

      /* =========================================================
         💥 SERVER ERROR
         ========================================================= */

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


/* =========================================================
   🌐 CORS HELPERS
   ========================================================= */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
