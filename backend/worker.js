export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { message } = await request.json();

    const prompt = `
You are a direct, honest AI. Avoid generic phrases.

User: ${message}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.3",
        input: prompt
      })
    });

    const data = await response.json();

    return new Response(JSON.stringify({
      reply: data.output?.[0]?.content?.[0]?.text || "No response"
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
