"""
ZanGID Backend v2
Flask-приложение: обслуживает API и отдаёт статику фронтенда.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_file
from flask_cors import CORS

load_dotenv()

from src.chat_service import generate_chat_reply, generate_chat_title
from src.utils import fallback_chat_response

app = Flask(__name__)

cors_origins_raw = os.environ.get(
    "CORS_ORIGINS",
    "http://127.0.0.1:5500,http://localhost:5500,https://zangid.vercel.app",
)

cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

CORS(
    app,
    resources={r"/api/*": {"origins": cors_origins}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Папка со статикой фронтенда (можно переопределить через STATIC_DIR)
ROOT_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).parent)).resolve()

# ── Snippet, который инжектируется в HTML ─────────────────────────────────────

_INJECT_SNIPPET = (
    "<script>"
    "window.ZANGID_API_BASE = window.ZANGID_API_BASE || window.location.origin;"
    "</script>"
)


def _inject_api_base(html: str) -> str:
    """Вставляем ZANGID_API_BASE перед </head>, если его ещё нет."""
    if "window.ZANGID_API_BASE" in html:
        return html
    return html.replace("</head>", f"{_INJECT_SNIPPET}\n</head>", 1)


# ── API ───────────────────────────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    """Проверка работоспособности сервера."""
    return jsonify({"ok": True})


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Основной endpoint чата.

    Ожидает от фронтенда:
        {
            "message":  "...",   // обязательный
            "chat_id":  "uuid",  // опциональный – для загрузки истории
            "user_id":  "uuid"   // опциональный – для загрузки истории
        }

    Возвращает:
        {
            "reply": {
                "summary":        "...",
                "steps":          [...],
                "documents":      [...],
                "sources":        [...],
                "important_note": "...",
                "disclaimer":     "..."
            },
            "meta": {
                "topic":         "...",
                "sources_found": 0,
                "used_fallback": false
            }
        }

    Фронтенд читает поле result.reply (chat.js, строка ~814):
        assistantReply = result.reply !== undefined ? result.reply : result
    """
    try:
        body = request.get_json(silent=True) or {}
        message = str(body.get("message") or "").strip()

        if not message:
            return jsonify({"error": "message is required"}), 400

        result = generate_chat_reply(body)

        return jsonify(
            {
                # ← фронтенд читает именно это поле
                "reply": result.get("reply") or {},
                "meta": {
                    "topic": result.get("retrieval", {}).get("topic"),
                    "sources_found": len(
                        result.get("retrieval", {}).get("sources", [])
                    ),
                    "used_fallback": result.get("used_fallback", False),
                },
            }
        )

    except Exception as e:
        fb = fallback_chat_response("", "Сервис временно не смог обработать запрос.")
        return jsonify(
            {
                "reply": fb,
                "error": str(e),
                "meta": {"used_fallback": True},
            }
        )


@app.route("/api/chat-title", methods=["POST"])
def chat_title():
    """
    Генерация названия чата.

    Ожидает от фронтенда:
        {
            "question": "...",  // основной ключ (chat.js строка ~94)
            "message":  "...",  // запасной ключ
            "prompt":   "..."   // опциональный промпт для генерации
        }

    Возвращает:
        { "title": "...", "used_fallback": false }
    """
    try:
        body = request.get_json(silent=True) or {}
        result = generate_chat_title(body)
        return jsonify(result)
    except Exception:
        return jsonify({"title": "Новый чат", "used_fallback": True})


# ── Статика фронтенда ─────────────────────────────────────────────────────────


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def static_files(path):
    """Отдаём фронтенд-файлы и инжектируем ZANGID_API_BASE в HTML."""
    if not path:
        path = "index.html"

    target = (ROOT_DIR / path).resolve()

    # Защита от path traversal
    if not str(target).startswith(str(ROOT_DIR)):
        abort(404)

    if not target.exists() or not target.is_file():
        abort(404)

    if target.suffix.lower() in (".html", ".htm"):
        html = target.read_text(encoding="utf-8")
        return (
            _inject_api_base(html),
            200,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    return send_file(target)


# ── Точка входа ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"✅ ZanGID backend v2 запущен → http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
