import os
from datetime import date, timedelta
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, create_access_token,
                                jwt_required, get_jwt_identity)
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, Transaction
import gemini_service as ai

app = Flask(__name__)
CORS(app)

db_url = os.getenv("DATABASE_URL") or "sqlite:///pocketsmart.db"
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()


# ---------------- User Management ----------------
@app.post("/api/auth/register")
def register():
    d = request.get_json() or {}
    name, email, pw = d.get("name", "").strip(), d.get("email", "").strip().lower(), d.get("password", "")
    if not (name and email and len(pw) >= 6):
        return jsonify(error="Name, email and password (min 6 chars) required"), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already registered"), 409
    user = User(name=name, email=email, password_hash=generate_password_hash(pw))
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify(token=token, user=user.to_dict()), 201


@app.post("/api/auth/login")
def login():
    d = request.get_json() or {}
    user = User.query.filter_by(email=d.get("email", "").strip().lower()).first()
    if not user or not check_password_hash(user.password_hash, d.get("password", "")):
        return jsonify(error="Invalid email or password"), 401
    return jsonify(token=create_access_token(identity=str(user.id)), user=user.to_dict())


@app.get("/api/me")
@jwt_required()
def me():
    return jsonify(User.query.get_or_404(int(get_jwt_identity())).to_dict())


@app.put("/api/budget")
@jwt_required()
def set_budget():
    user = User.query.get_or_404(int(get_jwt_identity()))
    user.monthly_budget = float((request.get_json() or {}).get("monthly_budget", 0))
    db.session.commit()
    return jsonify(user.to_dict())


# ---------------- Expense Tracking ----------------
@app.get("/api/transactions")
@jwt_required()
def list_tx():
    uid = int(get_jwt_identity())
    rows = Transaction.query.filter_by(user_id=uid).order_by(Transaction.date.desc(), Transaction.id.desc()).all()
    return jsonify([r.to_dict() for r in rows])


@app.post("/api/transactions")
@jwt_required()
def add_tx():
    d = request.get_json() or {}
    try:
        amount = float(d.get("amount"))
        if amount <= 0 or d.get("type") not in ("income", "expense"):
            raise ValueError
        tx_date = date.fromisoformat(d["date"]) if d.get("date") else date.today()
    except (TypeError, ValueError):
        return jsonify(error="Invalid amount, type or date"), 400
    tx = Transaction(user_id=int(get_jwt_identity()), type=d["type"], amount=amount,
                     category=(d.get("category") or "Other").strip(),
                     note=(d.get("note") or "").strip(), date=tx_date)
    db.session.add(tx)
    db.session.commit()
    return jsonify(tx.to_dict()), 201


@app.delete("/api/transactions/<int:tx_id>")
@jwt_required()
def del_tx(tx_id):
    tx = Transaction.query.filter_by(id=tx_id, user_id=int(get_jwt_identity())).first_or_404()
    db.session.delete(tx)
    db.session.commit()
    return jsonify(ok=True)


# ---------------- Budget Analysis ----------------
def build_summary(uid: int) -> dict:
    user = User.query.get(uid)
    first = date.today().replace(day=1)
    rows = Transaction.query.filter(Transaction.user_id == uid, Transaction.date >= first).all()
    income = sum(r.amount for r in rows if r.type == "income")
    expense = sum(r.amount for r in rows if r.type == "expense")
    by_cat = defaultdict(float)
    for r in rows:
        if r.type == "expense":
            by_cat[r.category] += r.amount
    budget = user.monthly_budget or 0
    return {
        "month": first.strftime("%B %Y"),
        "income": round(income, 2),
        "expense": round(expense, 2),
        "savings": round(income - expense, 2),
        "monthly_budget": budget,
        "budget_used_percent": round(expense / budget * 100, 1) if budget else None,
        "expense_by_category": {k: round(v, 2) for k, v in sorted(by_cat.items(), key=lambda x: -x[1])},
    }


@app.get("/api/summary")
@jwt_required()
def summary():
    s = build_summary(int(get_jwt_identity()))
    s["tips"] = rule_based_tips(s)
    return jsonify(s)


# ---------------- Recommendation Logic (rule based) ----------------
def rule_based_tips(s: dict) -> list:
    tips = []
    if s["income"] and s["savings"] / s["income"] < 0.2:
        tips.append("Neenga income-la 20% kooda save panala. 50/30/20 rule try pannunga.")
    if s["monthly_budget"] and s["expense"] > s["monthly_budget"]:
        tips.append("Monthly budget-a cross panniteenga! Non-essential spending kammi pannunga.")
    elif s["budget_used_percent"] and s["budget_used_percent"] > 80:
        tips.append("Budget-la 80%-ku mela use aayiduchu. Careful ah irunga.")
    if s["expense_by_category"] and s["expense"]:
        top, amt = next(iter(s["expense_by_category"].items()))
        if amt / s["expense"] > 0.4:
            tips.append(f"'{top}' category-la 40%-ku mela selavu aagudhu. Athu kammi panna mudiyuma?")
    if not tips:
        tips.append("Nalla poitu irukku! Ippadiye continue pannunga.")
    return tips


# ---------------- Gemini AI Integration ----------------
@app.post("/api/ai/analyze")
@jwt_required()
def ai_analyze():
    return jsonify(reply=ai.ask_gemini(ai.analyze_prompt(build_summary(int(get_jwt_identity())))))


@app.post("/api/ai/recommend")
@jwt_required()
def ai_recommend():
    return jsonify(reply=ai.ask_gemini(ai.recommend_prompt(build_summary(int(get_jwt_identity())))))


@app.post("/api/ai/chat")
@jwt_required()
def ai_chat():
    q = ((request.get_json() or {}).get("message") or "").strip()
    if not q:
        return jsonify(error="Message required"), 400
    return jsonify(reply=ai.ask_gemini(ai.chat_prompt(q, build_summary(int(get_jwt_identity())))))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
