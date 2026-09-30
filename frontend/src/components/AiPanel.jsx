import { useState } from "react";
import { api } from "../api";

export default function AiPanel() {
  const [out, setOut] = useState({ title: "", text: "" });
  const [busy, setBusy] = useState(false);

  const run = async (path, title) => {
    setBusy(true);
    setOut({ title, text: "" });
    try { setOut({ title, text: (await api(path, "POST")).reply }); }
    catch (e) { setOut({ title, text: e.message }); }
    setBusy(false);
  };

  return (
    <section>
      <h3>Gemini AI Insights</h3>
      <div className="row wrap">
        <button disabled={busy} onClick={() => run("/ai/analyze", "Budget Analysis")}>📊 Analyze my spending</button>
        <button disabled={busy} onClick={() => run("/ai/recommend", "Recommendations")}>💡 Get recommendations</button>
      </div>
      {busy && <p className="muted">Gemini yosikkuthu...</p>}
      {out.text && <div className="aibox"><h4>{out.title}</h4><pre>{out.text}</pre></div>}
    </section>
  );
}
