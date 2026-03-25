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
         🧠 INPUT NORMALIZATION
         ========================================================= */

      let input = "";

      if (Array.isArray(body.messages)) {

        // 🔥 begränsa historik (viktigt!)
        const MAX_HISTORY = 20;

        input = body.messages
          .slice(-MAX_HISTORY)
          .map(m => `${m.role}: ${m.content}`)
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
         🧠 MODE SYSTEM
         ========================================================= */

      const mode = body.mode || "advisor";

      function getPrompt(mode, input) {

        /* 🧠 RÅDGIVARE */
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

        /* 🧑‍🤝‍🧑 VÄN */
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

        /* 👨‍🏫 LÄRARE */
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

        /* 🔁 DEFAULT */
        return `
You are a helpful AI.

Conversation:
${input}
`;
      }

      const prompt = getPrompt(mode, input);


      /* =========================================================
         🤖 OPENAI REQUEST
         ========================================================= */

      const aiResponse = await fetch("https://api.openai.com/v1/responses", {
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
         ⚠️ OPENAI ERROR HANDLING
         ========================================================= */

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();

        return json({
          error: "OpenAI error",
          details: errorText
        }, 500);
      }


      /* =========================================================
         📤 RESPONSE PARSING (ROBUST)
         ========================================================= */

      const data = await aiResponse.json();

      let reply =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        data.output?.[0]?.content?.map(c => c.text).join(" ") ||
        null;

      if (!reply) {
        return json({
          error: "No valid AI response",
          raw: data
        }, 500);
      }


      /* =========================================================
         📦 RETURN
         ========================================================= */

      return json({ reply });

    } catch (err) {

      /* =========================================================
         💥 SERVER CRASH
         ========================================================= */

      return json({
        error: "Server crash",
        details: err.message
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
