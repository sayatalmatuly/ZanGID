"""
Общие утилиты: константы, парсинг, нормализация, форматирование.
"""

import json
import re
from urllib.parse import urlparse

# ── Константы ─────────────────────────────────────────────────────────────────

ALLOWED_DOMAINS = [
    "adilet.zan.kz",
    "egov.kz",
    "www.egov.kz",
    "enpf.kz",
    "www.enpf.kz",
    "fms.kz",
    "www.fms.kz",
    "gov.kz",
    "www.gov.kz",
]

DEFAULT_DISCLAIMER = (
    "ИИ может допускать ошибки. "
    "Важную информацию рекомендуем перепроверять по официальным источникам."
)


# ── JSON ──────────────────────────────────────────────────────────────────────

def safe_json_parse(value, fallback=None):
    try:
        return json.loads(value)
    except Exception:
        return fallback


# ── URL ───────────────────────────────────────────────────────────────────────

def is_allowed_source_url(value: str) -> bool:
    if not value:
        return False
    try:
        return urlparse(value).hostname in ALLOWED_DOMAINS
    except Exception:
        return False


# ── Текст ─────────────────────────────────────────────────────────────────────

def normalize_whitespace(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def strip_html(html: str) -> str:
    text = str(html or "")
    text = re.sub(r"<script[\s\S]*?</script>",   " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>",      " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<noscript[\s\S]*?</noscript>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (
        text.replace("&nbsp;", " ")
            .replace("&amp;",  "&")
            .replace("&quot;", '"')
            .replace("&#39;",  "'")
            .replace("&lt;",   "<")
            .replace("&gt;",   ">")
    )
    return normalize_whitespace(text)


# ── Названия чатов ────────────────────────────────────────────────────────────

def sanitize_title(value: str, fallback: str = "Новый чат") -> str:
    cleaned = str(value or "").split("\n")[0]
    cleaned = re.sub(r'^[«»\'""\u201e\u201c]+|[«»\'""\u201e\u201c]+$', "", cleaned)
    cleaned = re.sub(r"[.?!,:;]+$", "", cleaned)
    cleaned = normalize_whitespace(cleaned)
    words   = [w for w in cleaned.split(" ") if w][:4]
    return " ".join(words) if words else fallback


def derive_fallback_title(question: str) -> str:
    cleaned = re.sub(r"[?!.]+$", "", normalize_whitespace(str(question or "")))
    words   = [w for w in cleaned.split(" ") if w][:4]
    if not words:
        return "Новый чат"
    title = " ".join(words)
    return title[0].upper() + title[1:]


# ── Fallback-ответ ────────────────────────────────────────────────────────────

def fallback_chat_response(message: str = "", extra: str = "") -> dict:
    topic = normalize_whitespace(message)[:120]
    steps = (
        [
            "Уточните вопрос более конкретно: что именно нужно сделать и в какой ситуации.",
            "Проверьте профильный официальный источник по теме вопроса.",
            "Если вопрос срочный, обратитесь в госорган или к профильному юристу.",
        ]
        if topic
        else []
    )
    return {
        "summary":        "Подтвержденной информации из официальных источников сейчас недостаточно для точного ответа.",
        "steps":          steps,
        "documents":      [],
        "sources":        [],
        "important_note": extra or "Без проверенного источника лучше не полагаться на предположения.",
        "disclaimer":     DEFAULT_DISCLAIMER,
    }


# ── Нормализация ответа от OpenAI ─────────────────────────────────────────────

def normalize_structured_response(payload: dict, allowed_urls: list) -> dict:
    allowed_set  = set(u for u in (allowed_urls or []) if u)
    source_items = payload.get("sources", []) if isinstance(payload, dict) else []

    sources = []
    for item in source_items:
        if not isinstance(item, dict):
            continue
        url   = normalize_whitespace(item.get("url",   ""))
        title = normalize_whitespace(item.get("title", ""))
        if title and url and url in allowed_set and is_allowed_source_url(url):
            sources.append(
                {
                    "type":    normalize_whitespace(item.get("type", "")) or "instruction",
                    "title":   title,
                    "article": normalize_whitespace(item.get("article", "")),
                    "url":     url,
                }
            )

    return {
        "summary": normalize_whitespace((payload or {}).get("summary", "")),
        "steps": [
            normalize_whitespace(s)
            for s in (payload or {}).get("steps", [])
            if normalize_whitespace(s)
        ][:7],
        "documents": [
            normalize_whitespace(d)
            for d in (payload or {}).get("documents", [])
            if normalize_whitespace(d)
        ][:7],
        "sources": sources[:5],
        "important_note": normalize_whitespace((payload or {}).get("important_note", "")),
        "disclaimer": (
            normalize_whitespace((payload or {}).get("disclaimer", ""))
            or DEFAULT_DISCLAIMER
        ),
    }
