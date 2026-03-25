export default {
  async fetch(request, env) {

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

      let input;

      // ✅ NYTT: stöd för messages (minne)
      if (Array.isArray(body.messages)) {

        // gör om chat history → text
        input = body.messages
          .map(m => `${m.role}: ${m.content}`)
          .join("\n");

      } else if (body.prompt || body.message) {

        input = body.prompt || body.message;

      } else {
        return new Response(JSON.stringify({
          error: "No input provided"
        }), {
          status: 400,
          headers: corsHeaders()
        });
      }

      const prompt = `
You are a smart, direct AI that speaks like a real person.

Rules:
- No generic answers
- Be concrete and useful
- If unsure, say it
- Keep answers short unless asked for more
- Sound like a knowledgeable friend, not a robot

Conversation:
${input}
`;

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

      const reply =
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
