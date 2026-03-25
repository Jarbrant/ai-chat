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
         🧠 MODE + SUBJECT + CUSTOM PROMPT (🔥 NY CORE)
         ========================================================= */

      const allowedModes = ["advisor", "friend", "teacher"];
      const mode = allowedModes.includes(body.mode) ? body.mode : "advisor";

      const subject = (body.subject || "general").toLowerCase();

      // 🔥 NYTT: frontend kan skicka egen AI-personlighet
      const customPrompt = body.customPrompt || null;


      function getPrompt(mode, subject, customPrompt, input) {

        /* =====================================================
           🚀 1. CUSTOM PROMPT (HÖGSTA PRIORITET)
           ===================================================== */

        if (customPrompt) {
          return `
${customPrompt}

Conversation:
${input}
`;
        }


        /* =====================================================
           🧠 2. RÅDGIVARE
           ===================================================== */

        if (mode === "advisor") {
          return `
You are a sharp, experienced advisor.

- Be direct
- Challenge weak thinking
- Be practical

Structure:
1. Core insight
2. One advice
3. One risk
4. One question

Conversation:
${input}
`;
        }


        /* =====================================================
           🧑 3. VÄN
           ===================================================== */

        if (mode === "friend") {
          return `
You are a smart, relaxed friend.

- Talk naturally
- Keep it simple
- Be supportive

Conversation:
${input}
`;
        }


        /* =====================================================
           👨‍🏫 4. LÄRARE (MED SUBJECT FALLBACK)
           ===================================================== */

        if (mode === "teacher") {

          // 🔢 MATTE
          if (subject === "math") {
            return `
You are a math teacher.

- Explain step by step
- Show calculations clearly
- Break down problems

Conversation:
${input}
`;
          }

          // 🇸🇪 SVENSKA
          if (subject === "swedish") {
            return `
You are a Swedish teacher.

- Explain grammar
- Improve sentences
- Give examples

Conversation:
${input}
`;
          }

          // 💻 KOD
          if (subject === "coding") {
            return `
You are a programming teacher.

- Explain step by step
- Show examples
- Assume beginner

Conversation:
${input}
`;
          }

          // 🔁 fallback (t.ex fysik, ekonomi etc)
          return `
You are an expert teacher in ${subject}.

- Explain clearly
- Use simple examples
- Teach step by step

Conversation:
${input}
`;
        }


        /* =====================================================
           🔁 DEFAULT
           ===================================================== */

        return `
You are a helpful AI.

Conversation:
${input}
`;
      }

      const prompt = getPrompt(mode, subject, customPrompt, input);


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
          input: prompt,
          temperature: 0.7,
          max_output_tokens: 500
        })
      });


      /* =========================================================
         ⚠️ ERROR HANDLING
         ========================================================= */

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();

        return json({
          error: "OpenAI error",
          details: errorText
        }, 500);
      }


      /* =========================================================
         📤 RESPONSE PARSING
         ========================================================= */

      const data = await aiResponse.json();

      let reply =
        data.output_text ||
        data.output?.[0]?.content?.map(c => c.text || "").join(" ").trim();

      if (!reply) {
        return json({
          error: "No valid AI response",
          raw: data
        }, 500);
      }


      /* =========================================================
         📦 RETURN
         ========================================================= */

      return json({ reply: reply.trim() });

    } catch (err) {

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
