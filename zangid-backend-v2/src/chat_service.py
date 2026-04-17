"""
Логика генерации ответов чата и названий чатов.
"""

from src.openai_client import create_json_completion
from src.rag import retrieve
from src.supabase import load_chat_history
from src.utils import (
    DEFAULT_DISCLAIMER,
    derive_fallback_title,
    fallback_chat_response,
    normalize_structured_response,
    normalize_whitespace,
    sanitize_title,
)

# ── JSON-схемы для OpenAI structured outputs ──────────────────────────────────

CHAT_SCHEMA = {
    "name": "zangid_chat_response",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary":        {"type": "string"},
            "steps":          {"type": "array", "items": {"type": "string"}},
            "documents":      {"type": "array", "items": {"type": "string"}},
            "sources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "type":    {"type": "string"},
                        "title":   {"type": "string"},
                        "article": {"type": "string"},
                        "url":     {"type": "string"},
                    },
                    "required": ["type", "title", "article", "url"],
                },
            },
            "important_note": {"type": "string"},
            "disclaimer":     {"type": "string"},
        },
        "required": [
            "summary", "steps", "documents",
            "sources", "important_note", "disclaimer",
        ],
    },
}

TITLE_SCHEMA = {
    "name": "zangid_chat_title",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
        },
        "required": ["title"],
    },
}

# ── Публичные функции ─────────────────────────────────────────────────────────

def generate_chat_reply(input_data: dict) -> dict:
    """
    Принимает тело запроса фронтенда:
        { message, chat_id?, user_id? }

    Возвращает:
        {
            reply:         { summary, steps, documents, sources,
                             important_note, disclaimer },
            retrieval:     { topic, sources, allowed_domains },
            used_fallback: bool,
        }
    """
    message = normalize_whitespace(input_data.get("message", ""))
    chat_id = input_data.get("chat_id")
    user_id = input_data.get("user_id")

    # 1. История чата из Supabase (опционально)
    try:
        history = load_chat_history(chat_id, user_id)
    except Exception:
        history = []

    # 2. RAG: поиск по официальным источникам
    try:
        retrieval = retrieve(message)
    except Exception:
        retrieval = None

    # 3. Если источников нет – возвращаем fallback
    if not retrieval or not retrieval.found:
        return {
            "reply": fallback_chat_response(
                message,
                "По этому запросу не удалось найти надёжный материал на "
                "adilet.zan.kz, egov.kz, enpf.kz, fms.kz или gov.kz.",
            ),
            "retrieval": {
                "intent": retrieval.intent if retrieval else "mixed",
                "sources": retrieval.sources if retrieval else [],
                "found": retrieval.found if retrieval else False,
            },
            "used_fallback": True,
        }

    # 4. Формируем промпт
    history_block = "\n".join(history) if history else "Истории нет."
    context_block = retrieval.context if retrieval and retrieval.context else "Подтвержденный контекст не найден."

    system_prompt = " ".join([
        "Ты помогаешь сервису ZanGID и отвечаешь только на основе переданного подтвержденного контекста.",
        "Нельзя выдумывать статьи закона, нормы, ссылки, госуслуги или шаги, которых нет в контексте.",
        "Если контекста недостаточно, прямо так и скажи в summary или important_note.",
        "Пиши простым человеческим языком на русском.",
        "Сначала дай суть, потом шаги, потом документы.",
        f"Всегда возвращай disclaimer: {DEFAULT_DISCLAIMER}",
    ])

    user_prompt = "\n".join([
        f"Вопрос пользователя: {message}",
        "",
        f"Последние сообщения чата:\n{history_block}",
        "",
        f"Тип вопроса: {retrieval.intent}",
        "",
        f"Подтвержденный контекст:\n{context_block}",
        "",
        "Верни JSON строго по схеме. В sources используй только URL и заголовки из подтвержденного контекста.",
        "Если в контексте нет точной статьи, article оставь пустым.",
        "Если подтвержденных документов нет, верни пустой массив documents.",
    ])

    # 5. Запрос к OpenAI
    raw = create_json_completion(
        system=system_prompt,
        user=user_prompt,
        schema=CHAT_SCHEMA,
        temperature=0.1,
    )

    # 6. Нормализация ответа
    normalized = normalize_structured_response(
        raw,
        [s["url"] for s in retrieval.sources],
    )

    if not normalized["summary"]:
        normalized["summary"] = (
            "По найденным официальным материалам нельзя уверенно дать "
            "полный ответ без дополнительного уточнения."
        )

    if not normalized["sources"]:
        normalized["important_note"] = normalized.get("important_note") or (
            "Ответ получился осторожным, потому что в найденных материалах "
            "не хватило прямых подтверждений."
        )

    return {
        "reply": normalized,
        "retrieval": {
            "intent": retrieval.intent,
            "query_variants": retrieval.query_variants,
            "sources": retrieval.sources,
            "chunks_count": retrieval.chunks_count,
            "found": retrieval.found,
        },
        "used_fallback": False,
    }


def generate_chat_title(input_data: dict) -> dict:
    """
    Генерирует короткое название чата.

    Фронтенд передаёт:
        { question: "...", message: "...", prompt: "..." }

    Возвращает:
        { title: "...", used_fallback: bool }
    """
    # Фронтенд передаёт "question" как основной ключ (chat.js строка ~94)
    question = normalize_whitespace(
        input_data.get("question")
        or input_data.get("message")
        or ""
    )
    fallback_title = sanitize_title(derive_fallback_title(question))

    if not question:
        return {"title": "Новый чат", "used_fallback": True}

    try:
        result = create_json_completion(
            system=(
                "Ты придумываешь только короткие названия чатов для ZanGID. "
                "Верни 2-4 слова без кавычек, точек и пояснений."
            ),
            user=f"Вопрос пользователя: {question}",
            schema=TITLE_SCHEMA,
            temperature=0.2,
        )
        return {
            "title": sanitize_title(result.get("title", ""), fallback_title),
            "used_fallback": False,
        }
    except Exception:
        return {"title": fallback_title, "used_fallback": True}
