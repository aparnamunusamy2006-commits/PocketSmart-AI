# PocketSmart AI - Smart Budget & Recommendation Assistant

React.js (frontend) + Python Flask (backend) + Gemini AI API + PostgreSQL (SQLite fallback)

## Run (2 terminals)

### Terminal 1 - Backend
    cd backend
    python -m venv venv
    venv\Scripts\activate          (Windows)   |   source venv/bin/activate   (Mac/Linux)
    pip install -r requirements.txt
    copy .env.example .env         (Windows)   |   cp .env.example .env       (Mac/Linux)
    # edit .env -> add GEMINI_API_KEY (get free key: https://aistudio.google.com/apikey)
    python app.py                  # runs on http://localhost:5000

### Terminal 2 - Frontend
    cd frontend
    npm install
    npm run dev                    # opens http://localhost:5173

## PostgreSQL (optional)
    CREATE DATABASE pocketsmart;
    then in backend/.env:
    DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/pocketsmart
If DATABASE_URL is empty, a local SQLite file is used automatically.

## API
POST /api/auth/register | /api/auth/login
GET/POST /api/transactions, DELETE /api/transactions/<id>
GET /api/summary, PUT /api/budget
POST /api/ai/analyze | /api/ai/recommend | /api/ai/chat

## Folder structure
backend/  app.py (routes + logic), models.py (DB), gemini_service.py (Gemini)
frontend/src/components/  Auth, Dashboard, AiPanel, Chatbot
