export default {
  async fetch(request, env) {

    /* =========================================================
       🌐 CORS & REQUEST VALIDATION
       ========================================================= */

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {

      /* =========================================================
         📥 SAFE JSON PARSING
         ========================================================= */

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }


      /* =========================================================
         🧠 INPUT NORMALIZATION (MER ROBUST)
         ========================================================= */

      let input = "";

      if (Array.isArray(body.messages)) {

        const MAX_HISTORY = 20;

        input = body.messages
          .slice(-MAX_HISTORY)
          .map(m => {
            const role = m.role || "user";
            const content = (m.content || "").trim();
            return `${role}: ${content}`;
          })
          .join("\n");

      } else if (body.prompt || body.message) {

        input = (body.prompt || body.message).trim();

      } else {
        return json({ error: "No input provided" }, 400);
      }

      if (!input) {
        return json({ error: "Empty input" }, 400);
      }


      /* =========================================================
         🧠 MODE SYSTEM (SÄKRARE + FLEXIBEL)
         ========================================================= */

      const allowedModes = ["advisor", "friend", "teacher"];
      const mode = allowedModes.includes(body.mode) ? body.mode : "advisor";


      function getPrompt(mode, input) {

        if (mode === "advisor") {
          return `
You are a sharp, experienced advisor.

Rules:
- Be direct
- Challenge weak thinking
- Be practical and concrete

Structure:
1. Core insight
2. One clear advice
3. One risk
4. One follow-up question

Conversation:
${input}
`;
        }

        if (mode === "friend") {
          return `
You are a smart, relaxed friend.

- Be clear and human
- Explain simply
- Keep it natural

Conversation:
${input}
`;
        }

        if (mode === "teacher") {
          return `
You are an expert teacher.

- Explain step by step
- Assume beginner
- Use examples
- Be very clear

Conversation:
${input}
`;
        }

        return `
You are a helpful AI.

Conversation:
${input}
`;
      }

      const prompt = getPrompt(mode, input);


      /* =========================================================
         🤖 OPENAI REQUEST (OPTIMERAD)
         ========================================================= */

      const aiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: prompt,

          // 🔥 NYTT: bättre svarskvalitet
          temperature: 0.7,

          // 🔥 NYTT: begränsa längd (undvik spam)
          max_output_tokens: 500
        })
      });


      /* =========================================================
         ⚠️ OPENAI ERROR HANDLING (FÖRBÄTTRAD)
         ========================================================= */

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();

        return json({
          error: "OpenAI error",
          details: errorText
        }, 500);
      }


      /* =========================================================
         📤 RESPONSE PARSING (ROBUST+)
         ========================================================= */

      const data = await aiResponse.json();

      let reply = null;

      // 🔥 fallback-chain (olika API-format)
      if (data.output_text) {
        reply = data.output_text;
      } else if (data.output?.[0]?.content) {
        reply = data.output[0].content
          .map(c => c.text || "")
          .join(" ")
          .trim();
      }

      if (!reply) {
        return json({
          error: "No valid AI response",
          raw: data
        }, 500);
      }


      /* =========================================================
         ✨ CLEANUP (snyggare output)
         ========================================================= */

      reply = reply.trim();


      /* =========================================================
         📦 RETURN
         ========================================================= */

      return json({ reply });

    } catch (err) {

      /* =========================================================
         💥 SERVER CRASH (SÄKRARE)
         ========================================================= */

      return json({
        error: "Server crash",
        details: err.message || "Unknown error"
      }, 500);
    }
  }
};


/* =========================================================
   🧰 HELPERS
   ========================================================= */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
