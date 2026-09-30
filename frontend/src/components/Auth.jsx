import { useState } from "react";
import { api } from "../api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const d = await api(`/auth/${mode}`, "POST", f);
      localStorage.setItem("token", d.token);
      onLogin(d.user);
    } catch (e) { setErr(e.message); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="authbox">
      <h1>💰 PocketSmart AI</h1>
      <p className="muted">Smart Budget & Recommendation Assistant</p>
      <form onSubmit={submit}>
        {mode === "register" && <input placeholder="Name" value={f.name} onChange={set("name")} required />}
        <input type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
        <input type="password" placeholder="Password (min 6)" value={f.password} onChange={set("password")} required />
        {err && <p className="error">{err}</p>}
        <button type="submit">{mode === "login" ? "Login" : "Create account"}</button>
      </form>
      <p className="muted link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Account illaya? Register pannunga" : "Already account irukka? Login"}
      </p>
    </div>
  );
}
