import os
import io
import tempfile
import logging
from dotenv import load_dotenv

from PIL import Image
import pytesseract
from docx import Document
from pdf2image import convert_from_bytes

from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import (
    Application, MessageHandler, CallbackQueryHandler,
    ContextTypes, filters
)

from openai import OpenAI

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bot")

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = (
    "Ты юридический ассистент. Отвечай чётко и структурированно. "
    "Если не хватает данных, укажи, что требуется уточнить. Язык ответа: русский."
)


def _llm(prompt: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=800,
    )
    return resp.choices[0].message.content or ""


def _build_task_prompt(task: str, text: str) -> str:
    if task == "analyze_contract":
        return (
            "Проанализируй договор. Выдели предмет, обязанности, ответственность, "
            "штрафы, риски, способы защиты.\n\nТекст:\n" + text
        )
    if task == "risk_table":
        return (
            "Сделай таблицу рисков: Риск | Вероятность | Влияние | Митигирующие меры."\
            "\n\nТекст:\n" + text
        )
    if task == "verify_dd":
        return (
            "Сформируй чек-лист для проверки контрагента (Due Diligence) на основе текста."\
            "\n\nТекст:\n" + text
        )
    if task == "court_search":
        return (
            "Сформулируй поисковые запросы и возможные нормы/практику, связанные с текстом."\
            "\n\nТекст:\n" + text
        )
    if task == "analyze_claim":
        return (
            "Подготовь черновик ответа на претензию с опорой на текст."\
            "\n\nТекст:\n" + text
        )
    return "Суммаризируй ключевые положения:\n\n" + text


async def handle_any_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.document:
        return
    doc = update.message.document
    name = (doc.file_name or "").lower()
    mime = (doc.mime_type or "").lower()

    tg_file = await doc.get_file()
    file_bytes = await tg_file.download_as_bytearray()

    if "pdf" in mime or name.endswith(".pdf"):
        await update.message.reply_text("Распознаю PDF…")
        images = convert_from_bytes(bytes(file_bytes))
        full_text = ""
        for i, image in enumerate(images, 1):
            page_text = pytesseract.image_to_string(image, lang="rus")
            full_text += f"\nСтраница {i}:\n{page_text}\n"
        context.user_data["extracted_text"] = full_text.strip()
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
        full_text = "\n".join(filter(None, parts)).strip()
        context.user_data["extracted_text"] = full_text
    elif mime.startswith("text/") or name.endswith(".txt"):
        await update.message.reply_text("Читаю .txt…")
        try:
            full_text = bytes(file_bytes).decode("utf-8", errors="replace")
        except Exception:
            full_text = bytes(file_bytes).decode("cp1251", errors="replace")
        context.user_data["extracted_text"] = full_text.strip()
    else:
        await update.message.reply_text("Формат не поддержан. Пришлите PDF, DOCX или TXT.")
        return

    msg = f"📄 Текст получен. Символов: {len(context.user_data.get('extracted_text',''))}.\nВыберите действие:"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔍 Анализ договора", callback_data='analyze_contract')],
        [InlineKeyboardButton("⚠️ Таблица рисков", callback_data='risk_table')],
        [InlineKeyboardButton("🧾 Проверка контрагента (DD)", callback_data='verify_dd')],
        [InlineKeyboardButton("🔎 Поиск практики", callback_data='court_search')],
        [InlineKeyboardButton("✉️ Ответ на претензию", callback_data='analyze_claim')],
    ])
    await update.message.reply_text(msg, reply_markup=kb)


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
    prompt = _build_task_prompt(task, snippet)
    try:
        answer = _llm(prompt)
    except Exception as e:
        log.exception("LLM error")
        answer = f"Ошибка вызова ИИ: {e}"
    await query.edit_message_text(answer[:4000])


def build_app() -> Application:
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не задан")
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.Document.ALL, handle_any_document))
    app.add_handler(CallbackQueryHandler(on_button))
    return app


def main():
    app = build_app()
    log.info("Bot started (long polling)…")
    app.run_polling()


if __name__ == "__main__":
    main()
