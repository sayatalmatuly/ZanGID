"""
Загрузка истории чата из Supabase.
Если переменные окружения не заданы — функция просто возвращает [].
"""

import os
from urllib.parse import quote

import requests

from src.utils import normalize_whitespace, safe_json_parse

SUPABASE_URL              = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _supabase_get(pathname: str):
    if not is_configured():
        return None

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{pathname}",
        headers={
            "apikey":        SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Accept":        "application/json",
        },
        timeout=10,
    )

    if not resp.ok:
        raise Exception(f"Supabase {resp.status_code}: {resp.text}")

    return resp.json()


def _message_to_line(message: dict) -> str:
    role    = "assistant" if message.get("role") == "assistant" else "user"
    content = message.get("content", "")
    parsed  = safe_json_parse(content, None)

    if parsed and isinstance(parsed, dict):
        summary = normalize_whitespace(
            parsed.get("summary")
            or parsed.get("answer")
            or parsed.get("shortAnswer")
            or ""
        )
        if summary:
            return f"{role}: {summary}"

    return f"{role}: {normalize_whitespace(content)[:600]}"


def load_chat_history(chat_id: str, user_id: str) -> list:
    """
    Возвращает список строк вида «user: ...» / «assistant: ...»
    для последних 8 сообщений чата.
    """
    if not chat_id or not user_id or not is_configured():
        return []

    try:
        chats = _supabase_get(
            f"chats?select=id"
            f"&id=eq.{quote(str(chat_id))}"
            f"&user_id=eq.{quote(str(user_id))}"
            f"&limit=1"
        )
        if not isinstance(chats, list) or not chats:
            return []

        messages = _supabase_get(
            f"messages?select=role,content,created_at"
            f"&chat_id=eq.{quote(str(chat_id))}"
            f"&order=created_at.asc"
            f"&limit=12"
        )

        lines = [
            _message_to_line(m)
            for m in (messages if isinstance(messages, list) else [])
        ]
        return [line for line in lines if line][-8:]

    except Exception:
        return []
