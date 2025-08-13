import os
import io
import logging
import tempfile

from dotenv import load_dotenv

from PIL import Image
import pytesseract
from docx import Document
from pdf2image import convert_from_bytes

from telegram import (
    Update,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from telegram.ext import (
    Application,
    MessageHandler,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    filters,
)

# ---- LLM (OpenAI SDK v1.x) -----------------------------------------------
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("eva-lawyer-bot")

# ---- env ------------------------------------------------------------------
load_dotenv()

# читаем как стандартные имена, так и альтернативные
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("AI_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("TELEGRAM", "")
AI_BASE_URL = os.getenv("OPENAI_BASE_URL") or os.getenv("AI_BASE_URL")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("Не найден TELEGRAM_BOT_TOKEN или TELEGRAM (токен бота).")
if not OPENAI_API_KEY:
    raise RuntimeError("Не найден OPENAI_API_KEY или AI_API_KEY (ключ ИИ).")

client = OpenAI(api_key=OPENAI_API_KEY, base_url=AI_BASE_URL) if AI_BASE_URL else OpenAI(api_key=OPENAI_API_KEY)

# ---- prompts --------------------------------------------------------------
SYSTEM_PROMPT = (
    "Ты юридический ассистент. Отвечай чётко и структурированно. "
    "Если не хватает данных, укажи, что нужно уточнить. Язык ответа: русский."
)


# ---- LLM helpers ----------------------------------------------------------
def llm_chat(prompt: str) -> str:
    resp = client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=900,
    )
    return (resp.choices[0].message.content or "").strip()


def build_task_prompt(task: str, text: str) -> str:
    if task == "analyze_contract":
        return (
            "Проанализируй договор. Краткая структурированная выжимка:\n"
            "1) Предмет\n2) Права/обязанности сторон\n3) Сроки/этапы\n"
            "4) Ответственность/штрафы\n5) Односторонний отказ/расторжение\n"
            "6) Риски и как их снизить\n7) Что спросить у клиента.\n\nТекст:\n" + text
        )
    if task == "risk_table":
        return "Сделай таблицу рисков: Риск | Вероятность | Влияние | Меры. Текст:\n" + text
    if task == "verify_dd":
        return "Сформируй чек‑лист Due Diligence контрагента с полями и источниками. Текст:\n" + text
    if task == "court_search":
        return "Предложи запросы в картотеку/ГАС Правосудие и релевантные нормы. Текст:\n" + text
    if task == "analyze_claim":
        return "Подготовь черновик ответа на претензию (позиция, аргументы, нормы). Текст:\n" + text
    return "Суммаризируй ключевые положения:\n" + text


# ---- handlers -------------------------------------------------------------
async def cmd_start(update: Update, _: ContextTypes.DEFAULT_TYPE):
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔍 Анализ договора", callback_data='analyze_contract')],
        [InlineKeyboardButton("⚠️ Таблица рисков", callback_data='risk_table')],
        [InlineKeyboardButton("🧾 Проверка контрагента (DD)", callback_data='verify_dd')],
        [InlineKeyboardButton("🔎 Поиск практики", callback_data='court_search')],
        [InlineKeyboardButton("✉️ Ответ на претензию", callback_data='analyze_claim')],
    ])
    await update.message.reply_text(
        "Пришлите PDF/DOCX/TXT (инструкция/договор). Я извлеку текст и дам варианты анализа.",
        reply_markup=kb,
    )


async def cmd_ping(update: Update, _: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("pong")


# Универсальная обработка документов: PDF (OCR) / DOCX / TXT
async def handle_any_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.document:
        return

    doc = update.message.document
    name = (doc.file_name or "").lower()
    mime = (doc.mime_type or "").lower()

    tg_file = await doc.get_file()
    file_bytes = await tg_file.download_as_bytearray()

    # 1) PDF через OCR
    if "pdf" in mime or name.endswith(".pdf"):
        await update.message.reply_text("Распознаю PDF…")
        images = convert_from_bytes(bytes(file_bytes))
        full_text = []
        for i, image in enumerate(images, 1):
            page_text = pytesseract.image_to_string(image, lang="rus")
            full_text.append(f"\nСтраница {i}:\n{page_text}")
        extracted = "\n".join(full_text).strip()

    # 2) DOCX нативно
    elif "wordprocessingml" in mime or name.endswith(".docx"):
        await update.message.reply_text("Читаю .docx…")
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            docx = Document(tmp.name)
        parts = []
        parts.extend(p.text for p in docx.paragraphs if p.text)
        for t in docx.tables:
            for row in t.rows:
                cells = [c.text.strip() for c in row.cells]
                parts.append(" | ".join(cells))
        extracted = "\n".join(filter(None, parts)).strip()

    # 3) TXT
    elif mime.startswith("text/") or name.endswith(".txt"):
        await update.message.reply_text("Читаю .txt…")
        try:
            extracted = bytes(file_bytes).decode("utf-8", errors="replace").strip()
        except Exception:
            extracted = bytes(file_bytes).decode("cp1251", errors="replace").strip()

    else:
        await update.message.reply_text("Формат не поддержан. Пришлите PDF, DOCX или TXT.")
        return

    context.user_data["extracted_text"] = extracted
    msg = f"📄 Текст получен. Символов: {len(extracted)}.\nВыберите действие:"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔍 Анализ договора", callback_data='analyze_contract')],
        [InlineKeyboardButton("⚠️ Таблица рисков", callback_data='risk_table')],
        [InlineKeyboardButton("🧾 Проверка контрагента (DD)", callback_data='verify_dd')],
        [InlineKeyboardButton("🔎 Поиск практики", callback_data='court_search')],
        [InlineKeyboardButton("✉️ Ответ на претензию", callback_data='analyze_claim')],
    ])
    await update.message.reply_text(msg, reply_markup=kb)


# Кнопки -> запрос к ИИ
async def on_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    task = query.data
    text = context.user_data.get("extracted_text") or ""
    if not text:
        await query.edit_message_text("Нет текста. Пришлите PDF/DOCX/TXT.")
        return

    await query.edit_message_text("Обрабатываю запрос ИИ…")
    snippet = text if len(text) <= 18000 else text[:18000]
    prompt = build_task_prompt(task, snippet)

    try:
        answer = llm_chat(prompt)
    except Exception as e:
        log.exception("LLM error")
        answer = f"Ошибка вызова ИИ: {e}"

    # Telegram ограничение ~4096 символов
    await query.edit_message_text(answer[:4000] if answer else "Пустой ответ.")


# ---- app ------------------------------------------------------------------
def build_app() -> Application:
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("ping", cmd_ping))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_any_document))
    app.add_handler(CallbackQueryHandler(on_button))
    return app


def main():
    log.info("Bot starting (long polling)…")
    app = build_app()
    app.run_polling()


if __name__ == "__main__":
    main()
