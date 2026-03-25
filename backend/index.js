export default {
  async fetch(request, env) {

    /* =========================================================
       🌐 CORS & REQUEST VALIDATION
       ========================================================= */

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

      /* =========================================================
         📥 INPUT PARSING
         ========================================================= */

      const body = await request.json();
      let input;

      // 🧠 Case 1: full chat history
      if (Array.isArray(body.messages)) {
        input = body.messages
          .map(m => `${m.role}: ${m.content}`)
          .join("\n");
      }

      // 🧠 Case 2: single prompt fallback
      else if (body.prompt || body.message) {
        input = body.prompt || body.message;
      }

      // ❌ invalid input
      else {
        return new Response(JSON.stringify({
          error: "No input provided"
        }), {
          status: 400,
          headers: corsHeaders()
        });
      }


      /* =========================================================
         🧠 AI MODES (PERSONALITY SYSTEM)
         ========================================================= */

      function getPrompt(mode, input) {

        if (mode === "advisor") {
          return `
You are a sharp, experienced advisor.

Be direct. Challenge bad thinking. Be practical.

Structure:
- Core insight
- One concrete advice
- One risk
- One follow-up question

Conversation:
${input}
`;
        }

        if (mode === "friend") {
          return `
You are a smart, relaxed friend.

- Explain things simply
- Be clear and human
- No jargon unless needed

Conversation:
${input}
`;
        }

        if (mode === "teacher") {
          return `
You are an expert teacher.

- Explain step by step
- Assume beginner level
- Be VERY clear
- Use examples

Conversation:
${input}
`;
        }

        // fallback
        return `
You are a helpful AI.

Conversation:
${input}
`;
      }


      /* =========================================================
         🤖 BUILD PROMPT (FIXED BUG HERE)
         ========================================================= */

      const mode = body.mode || "advisor";
      const prompt = getPrompt(mode, input);


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

      let reply =
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
