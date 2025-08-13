import os
import io
import logging
import tempfile
import shutil
import subprocess

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

load_dotenv()
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
log = logging.getLogger("eva-lawyer-bot")

# ---- env ------------------------------------------------------------------

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

MAX_INPUT_CHARS = 18000


def cut_telegram(text: str, limit: int = 4000) -> str:
    return text if len(text) <= limit else text[: limit - 50] + "\n…(обрезано)"


def ocr_pdf_bytes(file_bytes: bytes) -> str:
    try:
        images = convert_from_bytes(file_bytes)
    except Exception as e:
        return f"[OCR] Не удалось конвертировать PDF: {e}"
    parts = []
    for i, image in enumerate(images, 1):
        try:
            txt = pytesseract.image_to_string(image, lang="rus")
        except pytesseract.TesseractNotFoundError:
            return "[OCR] Не найден бинарник tesseract-ocr"
        except Exception as e:
            txt = f"[OCR] Ошибка на стр. {i}: {e}"
        parts.append(f"\nСтраница {i}:\n{txt}")
    return "\n".join(parts).strip()


def read_docx_bytes(file_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        docx = Document(tmp.name)
    parts = [p.text for p in docx.paragraphs if p.text]
    for t in docx.tables:
        for row in t.rows:
            cells = [c.text.strip() for c in row.cells]
            parts.append(" | ".join(cells))
    return "\n".join(filter(None, parts)).strip()


def read_txt_bytes(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8", errors="replace").strip()
    except Exception:
        return file_bytes.decode("cp1251", errors="replace").strip()


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


async def cmd_diag(update: Update, _: ContextTypes.DEFAULT_TYPE):
    bins = {
        "tesseract": shutil.which("tesseract"),
        "pdftoppm": shutil.which("pdftoppm"),
    }
    env_ok = bool(OPENAI_API_KEY and TELEGRAM_BOT_TOKEN)
    try:
        tver = subprocess.check_output(["tesseract", "--version"], text=True).splitlines()[0]
    except Exception as e:
        tver = f"err: {e}"
    msg = (
        f"✅ ENV: {env_ok}\n"
        f"🔑 AI key: {bool(OPENAI_API_KEY)} | 🤖 TG token: {bool(TELEGRAM_BOT_TOKEN)}\n"
        f"🧠 Model: {AI_MODEL}\n"
        f"📦 Binaries: {bins}\n"
        f"🖹 tesseract: {tver}\n"
    )
    await update.message.reply_text(cut_telegram(msg))


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
        extracted = ocr_pdf_bytes(bytes(file_bytes))

    # 2) DOCX нативно
    elif "wordprocessingml" in mime or name.endswith(".docx"):
        await update.message.reply_text("Читаю .docx…")
        extracted = read_docx_bytes(bytes(file_bytes))

    # 3) TXT
    elif mime.startswith("text/") or name.endswith(".txt"):
        await update.message.reply_text("Читаю .txt…")
        extracted = read_txt_bytes(bytes(file_bytes))

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
    snippet = text if len(text) <= MAX_INPUT_CHARS else text[:MAX_INPUT_CHARS]
    prompt = build_task_prompt(task, snippet)

    try:
        answer = llm_chat(prompt)
    except Exception as e:
        log.exception("LLM error")
        answer = f"Ошибка вызова ИИ: {e}"

    # Telegram ограничение ~4096 символов
    await query.edit_message_text(cut_telegram(answer) if answer else "Пустой ответ.")


# ---- app ------------------------------------------------------------------
def build_app() -> Application:
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("ping", cmd_ping))
    app.add_handler(CommandHandler("diag", cmd_diag))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_any_document))
    app.add_handler(CallbackQueryHandler(on_button))
    return app


def main():
    log.info("Bot starting (long polling)…")
    app = build_app()
    app.run_polling()


if __name__ == "__main__":
    main()
