import { useState, useEffect } from "react";
import { api, getToken } from "./api";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AiPanel from "./components/AiPanel.jsx";
import Chatbot from "./components/Chatbot.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api("/me").then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
  }, []);

  const logout = () => { localStorage.removeItem("token"); setUser(null); };

  if (loading) return <p className="center">Loading...</p>;
  if (!user) return <Auth onLogin={setUser} />;

  return (
    <div className="app">
      <header>
        <h1>💰 PocketSmart AI</h1>
        <div><span>Hi, {user.name}</span> <button className="ghost" onClick={logout}>Logout</button></div>
      </header>
      <nav>
        {[["dashboard", "Dashboard"], ["insights", "AI Insights"], ["chat", "Chatbot"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <main>
        {tab === "dashboard" && <Dashboard user={user} setUser={setUser} />}
        {tab === "insights" && <AiPanel />}
        {tab === "chat" && <Chatbot />}
      </main>
    </div>
  );
}
