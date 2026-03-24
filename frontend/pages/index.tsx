import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input })
    });

    const data = await res.json();

    setMessages([...messages, 
      { role: "user", text: input },
      { role: "ai", text: data.reply }
    ]);

    setInput("");
  };

  return (
    <div>
      <h1>AI Chat</h1>

      <div>
        {messages.map((m, i) => (
          <p key={i}>
            <b>{m.role}:</b> {m.text}
          </p>
        ))}
      </div>

      <input 
        value={input} 
        onChange={e => setInput(e.target.value)} 
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
