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


      /* =========================================================
         🧠 AI PROMPT (RÅDGIVARE MODE)
         ========================================================= */

      const prompt = `
You are a sharp, honest advisor.

Your job is NOT to just answer.
Your job is to help the user think better.

Rules:
- Be direct and clear (no fluff)
- Challenge weak ideas
- Ask follow-up questions when useful
- Give concrete advice, not generic tips
- If something is unclear → ask instead of guessing
- If the user is making a bad decision → say it

Style:
- Sound like a smart, experienced person
- Not like an assistant
- Not overly polite
- Not robotic

Always include:
1. Your main advice
2. One risk the user might be missing
3. One follow-up question

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
