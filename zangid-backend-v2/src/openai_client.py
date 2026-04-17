"""
Клиент для OpenAI API.
Пробует strict json_schema; при неподдержке падает обратно на json_object.
"""

import os

import requests

from src.utils import safe_json_parse

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL   = os.environ.get("OPENAI_MODEL", "gpt-4.1")
OPENAI_TIMEOUT = 45


def is_configured() -> bool:
    return bool(OPENAI_API_KEY)


def _do_request(payload: dict) -> dict:
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        json=payload,
        timeout=OPENAI_TIMEOUT,
    )

    if not resp.ok:
        err = resp.text
        exc = Exception(f"OpenAI {resp.status_code}: {err}")
        exc.status = resp.status_code  # type: ignore[attr-defined]
        exc.body   = err               # type: ignore[attr-defined]
        raise exc

    content = (
        resp.json()
        .get("choices", [{}])[0]
        .get("message", {})
        .get("content")
    )
    if not isinstance(content, str):
        raise Exception("OpenAI returned empty content")

    parsed = safe_json_parse(content, None)
    if parsed is None:
        raise Exception("OpenAI returned invalid JSON")

    return parsed


def create_json_completion(
    system: str,
    user: str,
    schema: dict,
    temperature: float = 0.1,
) -> dict:
    """
    Отправляет запрос к OpenAI и возвращает распарсенный JSON.
    Сначала пробует strict json_schema, при неудаче — json_object.
    """
    if not is_configured():
        raise Exception("OPENAI_API_KEY не задан в .env")

    # 1) Strict json_schema (поддерживается gpt-4o и новее)
    try:
        return _do_request(
            {
                "model": OPENAI_MODEL,
                "temperature": temperature,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name":   schema["name"],
                        "strict": True,
                        "schema": schema["schema"],
                    },
                },
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
            }
        )
    except Exception as e:
        body = str(getattr(e, "body", ""))
        msg  = str(e)
        unsupported = any(
            kw in body.lower() or kw in msg.lower()
            for kw in ["unsupported", "json_schema"]
        )
        if not unsupported:
            raise

    # 2) Fallback: json_object (для старых моделей)
    return _do_request(
        {
            "model": OPENAI_MODEL,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system + "\nReturn ONLY valid JSON."},
                {"role": "user",   "content": user},
            ],
        }
    )
