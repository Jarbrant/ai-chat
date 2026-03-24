import { getMemory, saveMemory } from "./memory.js";
import { getWeather } from "./weather.js";

export default {
  async fetch(request, env) {
    const { message } = await request.json();

    // 🧠 Hämta minne
    const memory = await getMemory();

    // 🌦️ Enkel väder-check
    let externalData = "";
    if (message.toLowerCase().includes("väder")) {
      const weather = await getWeather();
      externalData = `Weather: ${weather}`;
    }

    // 🧠 Bygg prompt
    const prompt = `
You are a direct, honest AI. Avoid generic phrases.

User preferences:
${JSON.stringify(memory)}

${externalData}

User: ${message}
`;

    // 🤖 OpenAI call
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

    const data = await response.json();

    return new Response(JSON.stringify({
      reply: data.output[0].content[0].text
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
