# ZanGID Backend v2

Python/Flask-бекенд для ZanGID. Полностью совместим с фронтендом ZanGid1.

---

## Как подружить фронтенд и бекенд

### Вариант A — Всё в одной папке (рекомендуется для деплоя)

Бекенд умеет раздавать файлы фронтенда напрямую.
Скопируй содержимое папки `ZanGid1` рядом с `app.py` (или укажи путь через `STATIC_DIR`).

```
zangid-backend-v2/
├── app.py
├── src/
├── requirements.txt
├── .env
│
├── index.html          ← файлы фронтенда (ZanGid1)
├── chat.html
├── dashboard.html
├── js/
└── css/
```

В `.env` укажи:
```
STATIC_DIR=.
```

Запусти бекенд — он автоматически вставит `window.ZANGID_API_BASE` во все HTML-страницы, и фронт сам найдёт API.

---

### Вариант B — Фронт и бек в разных папках (для разработки)

```
projects/
├── ZanGid1/            ← фронтенд
└── zangid-backend-v2/  ← бекенд
```

В `.env` бекенда укажи:
```
STATIC_DIR=../ZanGid1
CORS_ORIGIN=*
```

Фронт открывай через бекенд: `http://localhost:3000`
(не через `file://` — иначе CORS заблокирует запросы)

---

### Вариант C — Разные серверы (прод с CDN или Vercel)

1. Задеплой фронт отдельно (например, на Vercel/Netlify).
2. Задеплой бекенд на сервер (Render, Railway, VPS).
3. В `.env` бекенда укажи:
   ```
   CORS_ORIGIN=https://zangid.kz
   ```
4. В HTML фронтенда добавь перед `</head>`:
   ```html
   <script>window.ZANGID_API_BASE = 'https://api.zangid.kz';</script>
   ```
   Или задай это через переменную окружения сборщика.

---

## Быстрый старт

```bash
# 1. Клонируй / распакуй архив
cd zangid-backend-v2

# 2. Создай виртуальное окружение
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 3. Установи зависимости
pip install -r requirements.txt

# 4. Заполни .env
cp .env.example .env
# Открой .env и вставь свои ключи (минимум — OPENAI_API_KEY)

# 5. Запусти
python app.py
```

Сервер поднимется на **http://localhost:3000**

---

## Продакшн (Gunicorn)

```bash
gunicorn app:app \
  --bind 0.0.0.0:3000 \
  --workers 2 \
  --timeout 60 \
  --access-logfile -
```

---

## Переменные окружения (.env)

| Переменная               | Описание                                          | Обязательная |
|--------------------------|---------------------------------------------------|:------------:|
| `OPENAI_API_KEY`         | Ключ OpenAI (platform.openai.com/api-keys)        | ✅ Да        |
| `OPENAI_MODEL`           | Модель (по умолчанию `gpt-4.1`)                   | Нет          |
| `SUPABASE_URL`           | URL проекта Supabase                              | Нет*         |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role ключ Supabase                     | Нет*         |
| `PORT`                   | Порт сервера (по умолчанию `3000`)                | Нет          |
| `HOST`                   | Хост (по умолчанию `0.0.0.0`)                     | Нет          |
| `CORS_ORIGIN`            | Разрешённый origin (`*` для разработки)           | Нет          |
| `STATIC_DIR`             | Папка с файлами фронтенда                         | Нет          |
| `FLASK_DEBUG`            | `true` / `false` — режим отладки                  | Нет          |

*Без Supabase история чатов не загружается, всё остальное работает.

---

## API

### GET /api/health
Проверка работоспособности.
```json
{ "ok": true }
```

---

### POST /api/chat
Основной endpoint чата. Фронтенд читает поле `result.reply`.

**Запрос:**
```json
{
  "message":  "Как открыть ИП в Казахстане?",
  "chat_id":  "uuid",
  "user_id":  "uuid"
}
```

**Ответ:**
```json
{
  "reply": {
    "summary":        "Краткий ответ...",
    "steps":          ["Шаг 1...", "Шаг 2..."],
    "documents":      ["Удостоверение личности", "ИИН"],
    "sources": [
      {
        "type":    "instruction",
        "title":   "Регистрация ИП — egov.kz",
        "article": "",
        "url":     "https://egov.kz/..."
      }
    ],
    "important_note": "...",
    "disclaimer":     "ИИ может допускать ошибки..."
  },
  "meta": {
    "topic":         "procedure",
    "sources_found": 2,
    "used_fallback": false
  }
}
```

---

### POST /api/chat-title
Генерация короткого названия чата.

**Запрос:**
```json
{
  "question": "Как оформить алименты?",
  "message":  "Как оформить алименты?"
}
```

**Ответ:**
```json
{
  "title":        "Оформление алиментов",
  "used_fallback": false
}
```

---

## Структура проекта

```
zangid-backend-v2/
├── app.py                  — Flask-сервер, маршруты
├── requirements.txt        — зависимости Python
├── .env.example            — шаблон переменных окружения
├── .env                    — твои секреты (в git не попадает)
├── .gitignore
└── src/
    ├── __init__.py
    ├── chat_service.py     — логика /api/chat и /api/chat-title
    ├── openai_client.py    — вызовы OpenAI API
    ├── rag.py              — поиск по официальным источникам
    ├── supabase.py         — загрузка истории чата
    └── utils.py            — общие утилиты
```

---

## Совместимость с фронтендом ZanGid1

| Что                            | Фронтенд (chat.js)                         | Бекенд (app.py)                       | Статус |
|--------------------------------|--------------------------------------------|---------------------------------------|--------|
| Endpoint `/api/chat`           | `fetch(base + '/api/chat', POST)`          | `@app.route('/api/chat', POST)`       | ✅     |
| Endpoint `/api/chat-title`     | `fetch(base + '/api/chat-title', POST)`    | `@app.route('/api/chat-title', POST)` | ✅     |
| Параметр `message`             | `body: JSON.stringify({ message, ... })`   | `body.get("message")`                 | ✅     |
| Параметр `chat_id`             | `body: JSON.stringify({ chat_id, ... })`   | `body.get("chat_id")`                 | ✅     |
| Параметр `user_id`             | `body: JSON.stringify({ user_id, ... })`   | `body.get("user_id")`                 | ✅     |
| Параметр `question` (title)    | `body: JSON.stringify({ question, ... })`  | `input_data.get("question")`          | ✅     |
| Поле ответа `reply`            | `result.reply !== undefined ? result.reply : result` | `jsonify({ "reply": ... })` | ✅     |
| Поля `summary`, `steps` и т.д. | `normalizeStructuredObject(payload)`       | Возвращаются в `reply`                | ✅     |
| ZANGID_API_BASE                | `window.ZANGID_API_BASE`                   | Инжектируется в `</head>`             | ✅     |
| CORS                           | Браузер                                    | `flask-cors` с `CORS_ORIGIN`          | ✅     |
