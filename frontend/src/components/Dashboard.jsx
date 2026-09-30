import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

const CATS = ["Food", "Transport", "Shopping", "Bills", "Rent", "Entertainment", "Health", "Education", "Salary", "Other"];
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function Dashboard({ user, setUser }) {
  const [txs, setTxs] = useState([]);
  const [sum, setSum] = useState(null);
  const [form, setForm] = useState({ type: "expense", amount: "", category: "Food", note: "" });
  const [budget, setBudget] = useState(user.monthly_budget || "");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setTxs(await api("/transactions"));
    setSum(await api("/summary"));
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api("/transactions", "POST", { ...form, amount: parseFloat(form.amount) });
      setForm({ ...form, amount: "", note: "" });
      load();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => { await api("/transactions/" + id, "DELETE"); load(); };
  const saveBudget = async () => {
    setUser(await api("/budget", "PUT", { monthly_budget: parseFloat(budget) || 0 }));
    load();
  };

  const cats = sum ? Object.entries(sum.expense_by_category) : [];
  const max = cats.length ? cats[0][1] : 1;

  return (
    <>
      {sum && (
        <div className="cards">
          <div className="card green"><small>Income ({sum.month})</small><b>{inr(sum.income)}</b></div>
          <div className="card red"><small>Expense</small><b>{inr(sum.expense)}</b></div>
          <div className="card blue"><small>Savings</small><b>{inr(sum.savings)}</b></div>
        </div>
      )}

      <section>
        <h3>Monthly Budget</h3>
        <div className="row">
          <input type="number" placeholder="Enter monthly budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <button onClick={saveBudget}>Save</button>
        </div>
        {sum?.budget_used_percent != null && (
          <div className="bar"><div style={{ width: Math.min(sum.budget_used_percent, 100) + "%" }}
            className={sum.budget_used_percent > 100 ? "fill over" : "fill"} />
            <span>{sum.budget_used_percent}% used</span></div>
        )}
      </section>

      <section>
        <h3>Add Income / Expense</h3>
        <form className="row wrap" onSubmit={add}>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Expense</option><option value="income">Income</option>
          </select>
          <input type="number" step="0.01" placeholder="Amount" value={form.amount} required
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit">Add</button>
        </form>
        {err && <p className="error">{err}</p>}
      </section>

      {cats.length > 0 && (
        <section>
          <h3>Spending by Category</h3>
          {cats.map(([c, v]) => (
            <div key={c} className="catrow"><span>{c}</span>
              <div className="bar small"><div className="fill" style={{ width: (v / max) * 100 + "%" }} /></div>
              <span>{inr(v)}</span></div>
          ))}
        </section>
      )}

      {sum?.tips?.length > 0 && (
        <section><h3>Quick Tips</h3><ul>{sum.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></section>
      )}

      <section>
        <h3>Spending History</h3>
        {txs.length === 0 && <p className="muted">Innum entry illa. Mela add pannunga.</p>}
        {txs.map((t) => (
          <div key={t.id} className="tx">
            <div><b>{t.category}</b> <small className="muted">{t.date} {t.note && "· " + t.note}</small></div>
            <div className={t.type}>{t.type === "income" ? "+" : "-"}{inr(t.amount)}
              <button className="x" onClick={() => remove(t.id)}>✕</button></div>
          </div>
        ))}
      </section>
    </>
  );
}
