"""Gemini AI Integration layer."""
import os
from google import genai

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = None


def _get_client():
    global _client
    key = os.getenv("GEMINI_API_KEY")
    if not key or key.startswith("your_"):
        return None
    if _client is None:
        _client = genai.Client(api_key=key)
    return _client


def ask_gemini(prompt: str) -> str:
    client = _get_client()
    if client is None:
        return "Gemini API key set panala. backend/.env file-la GEMINI_API_KEY add pannunga."
    try:
        resp = client.models.generate_content(model=MODEL, contents=prompt)
        return resp.text or "No response."
    except Exception as e:  # network / quota / key errors
        return f"Gemini error: {e}"


SYSTEM = ("You are PocketSmart AI, a friendly personal finance assistant. "
          "Give short, practical, easy-to-follow advice. Use simple language. "
          "Currency is INR (Rs) unless told otherwise.")


def analyze_prompt(summary: dict) -> str:
    return (f"{SYSTEM}\n\nHere is the user's monthly data:\n{summary}\n\n"
            "Analyze their spending. Give: 1) 3 key insights 2) biggest problem area "
            "3) a suggested budget split. Keep it under 200 words.")


def recommend_prompt(summary: dict) -> str:
    return (f"{SYSTEM}\n\nUser data:\n{summary}\n\n"
            "Give 5 personalized recommendations: saving tips and beginner-friendly "
            "investment options (SIP, RD, FD, emergency fund etc.) based on their numbers. "
            "Use a numbered list.")


def chat_prompt(question: str, summary: dict) -> str:
    return (f"{SYSTEM}\n\nUser's financial snapshot:\n{summary}\n\n"
            f"User question: {question}\n\nAnswer helpfully and briefly.")
