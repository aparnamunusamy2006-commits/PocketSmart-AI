import { useState, useRef, useEffect } from "react";
import { api } from "../api";

export default function Chatbot() {
  const [msgs, setMsgs] = useState([{ role: "bot", text: "Hi! Unga finance pathi enna venaalum kelunga 😊" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const d = await api("/ai/chat", "POST", { message: q });
      setMsgs((m) => [...m, { role: "bot", text: d.reply }]);
    } catch (e) { setMsgs((m) => [...m, { role: "bot", text: e.message }]); }
    setBusy(false);
  };

  return (
    <section>
      <h3>Finance Chatbot</h3>
      <div className="chat">
        {msgs.map((m, i) => <div key={i} className={"msg " + m.role}>{m.text}</div>)}
        {busy && <div className="msg bot">...</div>}
        <div ref={end} />
      </div>
      <form className="row" onSubmit={send}>
        <input placeholder="Eg: Enaku 5000 save panna eppadi?" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={busy}>Send</button>
      </form>
    </section>
  );
}
