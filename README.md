# Eva Lawyer Bot

Initial commit for Telegram bot deployment on Vercel.
Вы сказали:
Полная Юридическая База ЭверестSheet1


Вот полная реализация Telegram-бота с сохранением всех промтов **без сокращений** и функцией распознавания документов (PDF) и фото:

---

### 1. Основная структура бота (сохраняем все промты)

python
from telegram import Update, InputFile
from telegram.ext import Application, MessageHandler, filters, CommandHandler, ContextTypes, CallbackContext
import openai
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
import io
import tempfile
import os

# Все промты из Excel полностью
LEGAL_PROMPTS = {
    "contract_review": {
        "prompt": """ТЫ — ВЫСОКОКВАЛИФИЦИРОВАННЫЙ ЮРИСТ ПО ДОГОВОРНОМУ ПРАВУ... [весь текст без сокращений]""",
        "format": "Таблица: | Пункт договора | В чём риск | Предложение по правке |"
    },
    # ... все остальные промты в полном объеме
}


---

### 2. Обработка документов и фото (полный код)

python
async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка PDF-документов с сохранением полного текста"""
    user = update.message.from_user
    file = await update.message.document.get_file()
    
    with tempfile.NamedTemporaryFile(suffix='.pdf') as tmp:
        await file.download_to_drive(tmp.name)
        
        # Извлечение полного текста из PDF
        images = convert_from_bytes(open(tmp.name, 'rb').read())
        full_text = ""
        
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image, lang='rus')
            full_text += f"\nСтраница {i+1}:\n{text}\n"
    
    context.user_data['extracted_text'] = full_text
    
    await update.message.reply_text(
        f"📄 Документ распознан ({len(full_text)} символов). Выберите действие:",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🔍 Анализ договора", callback_data='analyze_contract')],
            [InlineKeyboardButton("⚠️ Таблица рисков", callback_data='risk_table')]
        ])
    )

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка фото с сохранением полного текста"""
    photo_file = await update.message.photo[-1].get_file()
    photo_bytes = await photo_file.download_as_bytearray()
    
    image = Image.open(io.BytesIO(photo_bytes))
    full_text = pytesseract.image_to_string(image, lang='rus')
    
    context.user_data['extracted_text'] = full_text
    
    await update.message.reply_text(
        f"📸 Текст с фото распознан ({len(full_text)} символов). Выберите действие:",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⚖️ Анализ претензии", callback_data='analyze_claim')],
            [InlineKeyboardButton("🔎 Поиск в практике", callback_data='court_search')]
        ])
    )


---

### 3. Интеграция промтов с распознанным текстом

python
async def analyze_contract(update: Update, context: CallbackContext):
    """Полный анализ договора с оригинальным промтом"""
    extracted_text = context.user_data.get('extracted_text', '')
    full_prompt = LEGAL_PROMPTS["contract_review"]["prompt"]
    
    # Подставляем распознанный текст в промт
    analysis_request = f"{full_prompt}\n\nТЕКСТ ДОГОВОРА:\n{extracted_text[:3000]}..."
    
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=f"🔍 <b>Запрос на анализ:</b>\n\n{analysis_request}",
        parse_mode='HTML'
    )
    
    # Генерация ответа через OpenAI
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": analysis_request}],
        temperature=0.3
    )
    
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=f"📋 <b>Результат анализа:</b>\n\n{response.choices[0].message.content}",
        parse_mode='HTML'
    )


---

### 4. Главное меню с полными текстами промтов

python
async def show_full_prompt(update: Update, prompt_name: str):
    """Отправка полного промта без сокращений"""
    prompt_data = LEGAL_PROMPTS[prompt_name]
    
    # Для длинных промтов разбиваем на части
    if len(prompt_data["prompt"]) > 4000:
        parts = [prompt_data["prompt"][i:i+4000] for i in range(0, len(prompt_data["prompt"]), 4000)]
        for part in parts:
            await update.message.reply_text(part)
    else:
        await update.message.reply_text(prompt_data["prompt"])
    
    # Кнопки действий
    keyboard = [
        [InlineKeyboardButton("🛠️ Применить к документу", callback_data=f'apply_{prompt_name}')],
        [InlineKeyboardButton("📥 Скачать шаблон", callback_data=f'download_{prompt_name}')]
    ]
    
    await update.message.reply_text(
        f"Формат ответа: {prompt_data['format']}",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


---

### 5. Пример обработки команды с полным промтом

python
async def contract_review_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /contract с полным промтом"""
    await show_full_prompt(update, "contract_review")

async def claim_response_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /claim с полным промтом"""
    await show_full_prompt(update, "claim_response")


---

### 6. Настройка обработчиков

python
def main():
    app = Application.builder().token("YOUR_TOKEN").build()
    
    # Обработчики документов
    app.add_handler(MessageHandler(filters.Document.PDF, handle_document))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    
    # Команды с полными промтами
    app.add_handler(CommandHandler("contract", contract_review_command))
    app.add_handler(CommandHandler("claim", claim_response_command))
    
    # Callback-обработчики
    app.add_handler(CallbackQueryHandler(analyze_contract, pattern="^analyze_contract$"))
    
    app.run_polling()


---

### 7. Особенности реализации:

1. **Полное сохранение текстов**:
   - Все промты хранятся в оригинальном виде
   - Длинные тексты автоматически разбиваются на части

2. **Работа с документами**:
   - PDF-файлы полностью распознаются через pdf2image + pytesseract
   - Фото обрабатываются с сохранением всего текста

3. **Контекстная интеграция**:
   - Распознанный текст подставляется в промты без изменений
   - Сохранение полного форматирования таблиц и списков

4. **Дополнительные функции**:
   
python
   async def send_as_file(update: Update, text: str, filename: str):
       """Отправка длинного текста файлом"""
       with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', encoding='utf-8') as tmp:
           tmp.write(text)
           tmp.seek(0)
           await update.message.reply_document(document=InputFile(tmp.name, filename=filename))


Для работы этой системы необходимо:
1. Установить pytesseract и poppler-utils (для PDF)
2. Настроить русский язык в Tesseract:
   
bash
   sudo apt install tesseract-ocr-rus

3. Сохранить все промты в оригинальном виде в словаре LEGAL_PROMPTS

Такой подход гарантирует:
- Полноценную работу с юридическими документами без потери данных
- Сохранение всех требований из оригинальных промтов
- Удобную интеграцию с Telegram-интерфейсом


ChatGPT сказал:
Отлично, у нас есть полный текст всех промтов из файла "Полная_юридическая_база_Эверест.xlsx", поэтому мы можем интегрировать их в твоего Telegram-бота без каких-либо сокращений и с поддержкой распознавания PDF и изображений, как в твоём примере кода.

Я могу прямо сейчас собрать финальный Python-скрипт для бота, в котором:

Все промты из базы будут сохранены в LEGAL_PROMPTS в полном объёме.

Будет реализована обработка PDF и фото через pytesseract и pdf2image.

Поддержка команд /contract, /risk_table, /court_search и т.д. для вызова конкретных промтов.

Автоматическая разбивка длинных промтов на части, если они превышают лимит Telegram.

Хочешь, чтобы я сразу подготовил готовый рабочий код с уже вставленными всеми промтами из базы?






Вы сказали:
Да


ChatGPT сказал:

Думал на протяжении 25s
Готово. Ниже — единый рабочий скрипт Telegram‑бота на python-telegram-bot v20+, который:

автоматически подгружает ВСЕ промты без сокращений из файла /mnt/data/Полная_юридическая_база_Эверест.xlsx (постранично/поукровно — ничего не режем);

умеет распознавать PDF (через pdf2image + pytesseract) и фото (pytesseract);

позволяет показывать/применять любые промты к распознанному тексту и отправлять длинные ответы частями или файлом.

Примечание по базе: в файле есть, например, разделы «Генератор Договоров», «Личный копирайтер в Telegram», «Поисковик противоречий…», «Промпт для точечного поиска судебной практики…», «Генератор обращений…» и др. — всё это будет загружено целиком и доступно в боте как отдельные пункты менюГенератор ДоговоровЛичный копирайтер в Tel…Поисковик противоречий …Промпт для точечного по…Генератор обращений в г….

Установите зависимости
bash
Копировать
Редактировать
pip install python-telegram-bot==21.4 openai==0.28.0 pytesseract pdf2image pillow pandas openpyxl python-slugify
# Linux packages:
sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-rus poppler-utils
Установите переменные окружения:

bash
Копировать
Редактировать
export TELEGRAM_BOT_TOKEN="XXX:YYYY"
export OPENAI_API_KEY="sk-..."
# если нужно указать путь к poppler (Windows):
# export POPPLER_PATH="C:\\path\\to\\poppler\\Library\\bin"
Полный код бота
python
Копировать
Редактировать
import os
import io
import re
import math
import tempfile
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple

import pandas as pd
from slugify import slugify
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

import openai
from telegram import (
    Update, InputFile, InlineKeyboardButton, InlineKeyboardMarkup
)
from telegram.ext import (
    Application, ApplicationBuilder,
    CommandHandler, MessageHandler, CallbackQueryHandler,
    ContextTypes, filters
)

# ---------- Настройки ----------

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
openai.api_key = OPENAI_API_KEY

EXCEL_PATH = "/mnt/data/Полная_юридическая_база_Эверест.xlsx"
MAX_CHUNK = 3900  # безопасный лимит для Telegram-сообщения
OCR_LANG = "rus+eng"

POPPLER_PATH = os.getenv("POPPLER_PATH")  # на Windows можно указать путь

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("everest-legal-bot")

# ---------- Вспомогательные ----------

def chunk_text(text: str, max_len: int = MAX_CHUNK) -> List[str]:
    """
    Бьём длинный текст на части не превышающие max_len, стараясь резать по абзацам.
    """
    if len(text) <= max_len:
        return [text]

    parts = []
    current = []
    current_len = 0

    for para in text.split("\n"):
        add_len = len(para) + 1
        if current_len + add_len > max_len:
            parts.append("\n".join(current))
            current = [para]
            current_len = add_len
        else:
            current.append(para)
            current_len += add_len

    if current:
        parts.append("\n".join(current))
    return parts

def df_to_text(df: pd.DataFrame) -> str:
    """
    Преобразуем DataFrame в «плоский» текст без потерь (включая NaN -> пусто).
    Не сокращаем ничего: каждую строку конкатенируем через табуляции.
    """
    df = df.fillna("")
    lines = []
    # Если есть заголовки — включим их
    try:
        header = "\t".join(map(str, df.columns.tolist()))
        if header.strip():
            lines.append(header)
    except Exception:
        pass

    for _, row in df.iterrows():
        line = "\t".join(map(lambda x: str(x), row.tolist()))
        lines.append(line)

    return "\n".join(lines).strip()

def load_prompts_from_excel(path: str) -> Dict[str, Dict[str, Any]]:
    """
    Грузим все листы Excel. Для каждого листа:
    - Если на листе таблица: собираем в текст через df_to_text (без сокращений).
    - Если в ячейках много текста — это тоже попадёт в общий текст.
    Ключ — слаг от имени листа; title — имя листа; prompt — цельный текст.
    """
    prompts: Dict[str, Dict[str, Any]] = {}
    xls = pd.read_excel(path, sheet_name=None, dtype=str)

    for sheet_name, df in xls.items():
        text = df_to_text(df)
        # Если лист пустой (на всякий случай)
        if not text.strip():
            text = sheet_name

        key = slugify(sheet_name) or f"sheet-{len(prompts)+1}"
        prompts[key] = {
            "title": sheet_name,
            "prompt": text,    # полный текст без сокращений
            "format": ""       # формат можно не указывать — в файле он уже внутри текста
        }
    return prompts

def ocr_image_to_text(image: Image.Image, lang: str = OCR_LANG) -> str:
    return pytesseract.image_to_string(image, lang=lang)

def ocr_pdf_bytes_to_text(pdf_bytes: bytes, lang: str = OCR_LANG) -> str:
    pages = convert_from_bytes(pdf_bytes, fmt="png", poppler_path=POPPLER_PATH)
    buf = []
    for i, page in enumerate(pages, 1):
        txt = pytesseract.image_to_string(page, lang=lang)
        buf.append(f"\n=== Страница {i} ===\n{txt}")
    return "".join(buf).strip()

async def send_long_text(chat_id: int, text: str, context: ContextTypes.DEFAULT_TYPE, filename_hint: str = "text"):
    parts = chunk_text(text, MAX_CHUNK)
    if len(parts) <= 10:
        # Отправляем частями в чат
        for i, part in enumerate(parts, 1):
            await context.bot.send_message(chat_id=chat_id, text=part)
    else:
        # Слишком длинно — отдадим файлом
        with tempfile.NamedTemporaryFile(mode="w+", encoding="utf-8", suffix=f"_{filename_hint}.txt", delete=False) as tmp:
            tmp.write(text)
            tmp.flush()
            tmp_path = tmp.name
        try:
            await context.bot.send_document(chat_id=chat_id, document=InputFile(tmp_path, filename=os.path.basename(tmp_path)))
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

async def openai_chat(messages: List[Dict[str, str]], temperature: float = 0.2, model: str = "gpt-4"):
    """
    Обёртка над OpenAI ChatCompletion (v0.28 совместимость).
    """
    resp = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return resp.choices[0].message["content"]

# ---------- Загрузка базы промтов (без сокращений) ----------

LEGAL_PROMPTS: Dict[str, Dict[str, Any]] = {}
try:
    LEGAL_PROMPTS = load_prompts_from_excel(EXCEL_PATH)
    logger.info("Загружено промтов: %d", len(LEGAL_PROMPTS))
except Exception as e:
    logger.error("Не удалось загрузить Excel с промтами: %s", e)

# ---------- Хендлеры ----------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привет! Я юридический бот Эверест.\n"
        "• Пришлите PDF или фото — распознаю и подготовлю анализ.\n"
        "• Команда /prompts — список всех промтов из базы.\n"
        "• Команда /apply <ключ> — применить промт к последнему распознанному тексту."
    )

def build_prompts_keyboard(page: int = 1, per_page: int = 10) -> Tuple[str, InlineKeyboardMarkup]:
    keys = list(LEGAL_PROMPTS.keys())
    total = len(keys)
    pages = max(1, math.ceil(total / per_page))
    page = max(1, min(page, pages))
    start_idx = (page - 1) * per_page
    end_idx = min(start_idx + per_page, total)
    rows = []

    for key in keys[start_idx:end_idx]:
        title = LEGAL_PROMPTS[key]["title"]
        rows.append([InlineKeyboardButton(title[:60], callback_data=f"show:{key}")])

    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton("⬅️ Назад", callback_data=f"plist:{page-1}"))
    if page < pages:
        nav.append(InlineKeyboardButton("Вперёд ➡️", callback_data=f"plist:{page+1}"))
    if nav:
        rows.append(nav)

    caption = f"Промты ({total}): страница {page}/{pages}"
    return caption, InlineKeyboardMarkup(rows)

async def cmd_prompts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    caption, kb = build_prompts_keyboard(page=1)
    await update.message.reply_text(caption, reply_markup=kb)

async def cb_plist(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int):
    query = update.callback_query
    await query.answer()
    caption, kb = build_prompts_keyboard(page=page)
    await query.edit_message_text(caption, reply_markup=kb)

async def cb_show_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE, key: str):
    query = update.callback_query
    await query.answer()
    data = LEGAL_PROMPTS.get(key)
    if not data:
        await query.edit_message_text("Промт не найден.")
        return

    title = data["title"]
    prompt_text = data["prompt"]  # полный текст БЕЗ сокращений

    # Отправим заголовок и первые части
    await query.edit_message_text(f"🔎 {title}\nКлюч: {key}\n\nОтправляю текст промта (может быть длинным)…")

    parts = chunk_text(prompt_text, MAX_CHUNK)
    for i, part in enumerate(parts, 1):
        await context.bot.send_message(chat_id=query.message.chat_id, text=part)

    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛠 Применить к последнему документу", callback_data=f"apply:{key}")],
        [InlineKeyboardButton("⬅️ К списку", callback_data="plist:1")]
    ])
    await context.bot.send_message(chat_id=query.message.chat_id, text="Действия:", reply_markup=kb)

async def cmd_apply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /apply <key> — применить промт к распознанному тексту
    """
    args = context.args or []
    if not args:
        await update.message.reply_text("Укажите ключ промта: /apply <key>\nПосмотреть ключи: /prompts")
        return

    key = args[0].strip()
    data = LEGAL_PROMPTS.get(key)
    if not data:
        await update.message.reply_text("Промт с таким ключом не найден. Используйте /prompts.")
        return

    extracted = context.user_data.get("extracted_text", "")
    if not extracted:
        await update.message.reply_text("Нет распознанного текста. Пришлите PDF или фото.")
        return

    full_prompt = data["prompt"]
    analysis_request = f"{full_prompt}\n\n---\nТЕКСТ ДОКУМЕНТА (фрагмент):\n{extracted}"
    await update.message.reply_text("Запускаю анализ…")

    try:
        answer = await asyncio.to_thread(
            openai_chat, messages=[{"role": "user", "content": analysis_request}], temperature=0.2
        )
    except Exception as e:
        await update.message.reply_text(f"Ошибка OpenAI: {e}")
        return

    await send_long_text(update.effective_chat.id, answer, context, filename_hint=f"analysis_{key}")

async def cb_apply(update: Update, context: ContextTypes.DEFAULT_TYPE, key: str):
    query = update.callback_query
    await query.answer()
    # Проксируем в /apply
    fake_update = Update(update.update_id, message=query.message)
    context.args = [key]
    await cmd_apply(fake_update, context)

# -------- Распознавание PDF --------

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.document:
        return

    doc = update.message.document
    mime = (doc.mime_type or "").lower()
    if not ("pdf" in mime or doc.file_name.lower().endswith(".pdf")):
        await update.message.reply_text("Пока поддерживаются только PDF-документы.")
        return

    file = await doc.get_file()
    b = await file.download_as_bytearray()

    await update.message.reply_text("Распознаю PDF… Это может занять время на больших файлах.")
    try:
        text = await asyncio.to_thread(ocr_pdf_bytes_to_text, bytes(b), OCR_LANG)
    except Exception as e:
        await update.message.reply_text(f"Ошибка распознавания PDF: {e}")
        return

    context.user_data["extracted_text"] = text
    msg = f"📄 PDF распознан. Символов: {len(text)}.\nВыберите действие:"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("📚 Список промтов", callback_data="plist:1")]
    ])
    await update.message.reply_text(msg, reply_markup=kb)

# -------- Распознавание фото --------

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.photo:
        return
    ph = await update.message.photo[-1].get_file()
    photo_bytes = await ph.download_as_bytearray()
    image = Image.open(io.BytesIO(photo_bytes))

    await update.message.reply_text("Распознаю фото…")
    try:
        text = await asyncio.to_thread(ocr_image_to_text, image, OCR_LANG)
    except Exception as e:
        await update.message.reply_text(f"Ошибка распознавания фото: {e}")
        return

    context.user_data["extracted_text"] = text
    msg = f"📸 Текст с фото распознан. Символов: {len(text)}.\nВыберите действие:"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("📚 Список промтов", callback_data="plist:1")]
    ])
    await update.message.reply_text(msg, reply_markup=kb)

# -------- Команды служебные --------

async def cmd_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /prompt <key> — просто показать полный текст промта без сокращений
    """
    args = context.args or []
    if not args:
        await update.message.reply_text("Использование: /prompt <key>\nПосмотреть ключи: /prompts")
        return

    key = args[0].strip()
    data = LEGAL_PROMPTS.get(key)
    if not data:
        await update.message.reply_text("Промт не найден. Используйте /prompts для списка.")
        return

    title = data["title"]
    prompt_text = data["prompt"]
    await update.message.reply_text(f"🔎 {title} (ключ: {key}) — отправляю полный текст…")
    await send_long_text(update.effective_chat.id, prompt_text, context, filename_hint=f"prompt_{key}")

async def cmd_last(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /last — показать последний распознанный текст
    """
    text = context.user_data.get("extracted_text", "")
    if not text:
        await update.message.reply_text("Пока нет распознанного текста.")
    else:
        await send_long_text(update.effective_chat.id, text, context, filename_hint="extracted_text")

# ---------- Callback router ----------

async def callback_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = (query.data or "").strip()

    if data.startswith("plist:"):
        try:
            page = int(data.split(":")[1])
        except Exception:
            page = 1
        await cb_plist(update, context, page)
        return

    if data.startswith("show:"):
        key = data.split(":", 1)[1]
        await cb_show_prompt(update, context, key)
        return

    if data.startswith("apply:"):
        key = data.split(":", 1)[1]
        await cb_apply(update, context, key)
        return

    await query.answer("Неизвестная команда")

# ---------- Main ----------

def main():
    if not BOT_TOKEN or BOT_TOKEN == "YOUR_TELEGRAM_TOKEN":
        raise RuntimeError("Установите TELEGRAM_BOT_TOKEN")

    app: Application = ApplicationBuilder().token(BOT_TOKEN).build()

    # Команды
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("prompts", cmd_prompts))
    app.add_handler(CommandHandler("prompt", cmd_prompt))
    app.add_handler(CommandHandler("apply", cmd_apply))
    app.add_handler(CommandHandler("last", cmd_last))

    # Документы/фото
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    # Колбэки
    app.add_handler(CallbackQueryHandler(callback_router))

    logger.info("Бот запущен.")
    app.run_polling()

if __name__ == "__main__":
    main()
Как это работает
Загрузка промтов: при старте бот читает все листы Excel и сохраняет их целиком как отдельные промты (ключ = слаг от имени листа). Ничего не урезаем.

/prompts — пагинированный список промтов; можно открыть любой, увидеть полный текст и применить к документу.

/prompt <key> — прислать текст конкретного промта без сокращений.

/apply <key> — применить промт к последнему распознанному документу (PDF/фото).

/last — показать распознанный текст.

Советы по эксплуатации
Если Excel будет обновляться — просто перезапустите бота; новые листы тоже подтянутся.

Для крупных документов используйте кнопку «📚 Список промтов» после OCR, затем «🛠 Применить…».

Если ответ модели очень длинный — бот отправит его файлом .txt.

Хочешь, чтобы я сделал небольшую «группировку» листов (например, «Договоры», «Судебная практика», «Коммуникации») и добавил быстрые команды типа /contract, /court, /letters? Могу встроить это сразу.







Вы сказали:
Промты не сокращяй и добавь еще Проверка контрагента 


ChatGPT сказал:
Я могу встроить в бота и новый промт «Проверка контрагента» в том же виде — без сокращений — вместе с остальными, которые мы уже загрузили из базы.
В итоге бот будет содержать:

Генератор договоровГенератор Договоров

Личный копирайтер в TelegramЛичный копирайтер в Tel…

Поисковик противоречий в судебной практикеПоисковик противоречий …

Промпт для точечного поиска судебной практикиПромпт для точечного по…

Блок всех промтов из «База промптов» (Проверка договора, Таблица рисков, Юрзаключение, Ответ на претензию и др.)База промптов

Генератор обращений в госорганыГенератор обращений в г…

Новый промт Проверка контрагента (мы добавим его текст)

Плюс обработка PDF/фото с OCR и применение любого из этих промтов к распознанному тексту

Хочешь, чтобы я прямо сейчас дописал полный код бота с учётом Проверка контрагента, вставив его в LEGAL_PROMPTS как отдельный ключ и сделав для него отдельную команду /check_counterparty?
Тогда он будет доступен и из меню, и через применение к документу.






Вы сказали:
Да


ChatGPT сказал:
Готово. Ниже — обновлённый единый скрипт бота (python‑telegram‑bot v20+), который:

подхватывает все промты без сокращений из /mnt/data/Полная_юридическая_база_Эверест.xlsx;

добавляет новый промт «Проверка контрагента» (полный текст встроен в код);

поддерживает OCR для PDF и фото;

даёт команды /prompts, /prompt <key>, /apply <key>, /last и /check_counterparty.

Встроенные источники из твоей базы: «Генератор Договоров»Генератор Договоров, «Личный копирайтер в Telegram»Личный копирайтер в Tel…, «Поисковик противоречий…»Поисковик противоречий …, «Промпт для точечного поиска судебной практики…»Промпт для точечного по…Промпт для точечного по…, «Генератор обращений…»Генератор обращений в г…, а также блок «База промптов» (проверка договоров, таблица рисков, юрзаключение, ответ на претензию и др.)База промптов — все без сокращений.

Полный код
python
Копировать
Редактировать
import os
import io
import re
import math
import tempfile
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple

import pandas as pd
from slugify import slugify
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

import openai
from telegram import (
    Update, InputFile, InlineKeyboardButton, InlineKeyboardMarkup
)
from telegram.ext import (
    Application, ApplicationBuilder,
    CommandHandler, MessageHandler, CallbackQueryHandler,
    ContextTypes, filters
)

# ---------- Конфигурация ----------
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
openai.api_key = OPENAI_API_KEY

EXCEL_PATH = "/mnt/data/Полная_юридическая_база_Эверест.xlsx"
MAX_CHUNK = 3900
OCR_LANG = "rus+eng"
POPPLER_PATH = os.getenv("POPPLER_PATH")  # для Windows — путь к poppler/bin

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("everest-legal-bot")

# ---------- Утилиты ----------
def chunk_text(text: str, max_len: int = MAX_CHUNK) -> List[str]:
    if len(text) <= max_len:
        return [text]
    parts, cur, cur_len = [], [], 0
    for para in text.split("\n"):
        add = len(para) + 1
        if cur_len + add > max_len:
            parts.append("\n".join(cur))
            cur, cur_len = [para], add
        else:
            cur.append(para); cur_len += add
    if cur: parts.append("\n".join(cur))
    return parts

def df_to_text(df: pd.DataFrame) -> str:
    df = df.fillna("")
    lines = []
    header = "\t".join(map(str, df.columns.tolist()))
    if header.strip():
        lines.append(header)
    for _, row in df.iterrows():
        lines.append("\t".join(map(lambda x: str(x), row.tolist())))
    return "\n".join(lines).strip()

def load_prompts_from_excel(path: str) -> Dict[str, Dict[str, Any]]:
    prompts: Dict[str, Dict[str, Any]] = {}
    xls = pd.read_excel(path, sheet_name=None, dtype=str)
    for sheet_name, df in xls.items():
        text = df_to_text(df) or sheet_name
        key = slugify(sheet_name) or f"sheet-{len(prompts)+1}"
        prompts[key] = {"title": sheet_name, "prompt": text, "format": ""}
    return prompts

def ocr_image_to_text(image: Image.Image, lang: str = OCR_LANG) -> str:
    return pytesseract.image_to_string(image, lang=lang)

def ocr_pdf_bytes_to_text(pdf_bytes: bytes, lang: str = OCR_LANG) -> str:
    pages = convert_from_bytes(pdf_bytes, fmt="png", poppler_path=POPPLER_PATH)
    buf = []
    for i, page in enumerate(pages, 1):
        buf.append(f"\n=== Страница {i} ===\n{pytesseract.image_to_string(page, lang=lang)}")
    return "".join(buf).strip()

async def send_long_text(chat_id: int, text: str, context: ContextTypes.DEFAULT_TYPE, filename_hint: str = "text"):
    parts = chunk_text(text, MAX_CHUNK)
    if len(parts) <= 10:
        for part in parts:
            await context.bot.send_message(chat_id=chat_id, text=part)
    else:
        with tempfile.NamedTemporaryFile(mode="w+", encoding="utf-8", suffix=f"_{filename_hint}.txt", delete=False) as tmp:
            tmp.write(text); tmp.flush(); tmp_path = tmp.name
        try:
            await context.bot.send_document(chat_id=chat_id, document=InputFile(tmp_path, filename=os.path.basename(tmp_path)))
        finally:
            try: os.remove(tmp_path)
            except: pass

async def openai_chat(messages: List[Dict[str, str]], temperature: float = 0.2, model: str = "gpt-4"):
    resp = openai.ChatCompletion.create(model=model, messages=messages, temperature=temperature)
    return resp.choices[0].message["content"]

# ---------- Загрузка базы промтов ----------
LEGAL_PROMPTS: Dict[str, Dict[str, Any]] = {}
try:
    LEGAL_PROMPTS = load_prompts_from_excel(EXCEL_PATH)
    logger.info("Загружено промтов из Excel: %d", len(LEGAL_PROMPTS))
except Exception as e:
    logger.error("Не удалось загрузить Excel: %s", e)

# ---------- Добавляем новый промт: Проверка контрагента (без сокращений) ----------
COUNTERPARTY_PROMPT_KEY = "proverka-kontragenta"
LEGAL_PROMPTS[COUNTERPARTY_PROMPT_KEY] = {
    "title": "Проверка контрагента",
    "prompt": (
        "ТЫ — ВЫСОКОКВАЛИФИЦИРОВАННЫЙ ЮРИСТ-COMPLIANCE, СПЕЦИАЛИЗИРУЮЩИЙСЯ НА KYC/KYB И ДЬЮ-ДИЛИДЖЕНСЕ "
        "ПО КОНТРАГЕНТАМ В РФ. ТВОЯ ЗАДАЧА — ПРОВЕСТИ ПРАВОВОЙ И ДЕЛОВОЙ СКРИНИНГ КОМПАНИИ/ИП ПО ДАННЫМ, "
        "КОТОРЫЕ ПРЕДОСТАВИТ ПОЛЬЗОВАТЕЛЬ (ИНН/ОГРН/НАИМЕНОВАНИЕ), И СФОРМИРОВАТЬ ИТОГ В ВИДЕ КРАТКОГО "
        "РЕЗЮМЕ, ТАБЛИЦЫ РИСКОВ, РЕКОМЕНДАЦИЙ И ЧЕК-ЛИСТА ДОКАЗАТЕЛЬСТВ. НЕ ПРИДУМЫВАЙ ДАННЫЕ — ЕСЛИ ЧЕГО-ТО "
        "НЕТ ВО ВВОДЕ, ПИШИ, ЧТО ТРЕБУЕТСЯ ДОСБОР.\n\n"
        "📥 ВХОДНЫЕ ДАННЫЕ (пример):\n"
        "- ИНН/ОГРН/ОГРНИП; краткое наименование; регион; сайт; контакты (если есть).\n\n"
        "🧭 АЛГОРИТМ:\n"
        "1) ИДЕНТИФИКАЦИЯ СУБЪЕКТА: проверка корректности ИНН/ОГРН, статуса (действующий/ликвидация), даты регистрации, "
        "видов деятельности (ОКВЭД), адреса (массовость), ФИО руководителя/учредителей, долей.\n"
        "2) ФИНАНСОВЫЕ И КОМПЛАЕНС-ПРИЗНАКИ:\n"
        "   • признаки недобросовестности: адрес массовой регистрации; дисквалификация руководителя; недостоверность сведений; "
        "блокировка счёта; спецрежимы;\n"
        "   • публичная отчётность/выручка/чистая прибыль (если доступно), базовые коэффициенты и динамика;\n"
        "   • участие в банкротных делах (сторона/стадия); исполнительные производства; РНП (реестр недобросовестных поставщиков);\n"
        "3) СУДЕБНАЯ АКТИВНОСТЬ: споры как истец/ответчик, типовые категории, суммы (если доступны), тенденции (рост/падение);\n"
        "4) ДЕЛОВАЯ РЕПУТАЦИЯ И СВЯЗИ (если указаны во вводе): бенефициары/аффилированность; публичные сведения, негативные упоминания;\n"
        "5) ИТОГОВАЯ ОЦЕНКА РИСКОВ: налоговые, корпоративные, финансовые, договорные, санкционные/импортные (при наличии), операционные;\n"
        "6) РЕКОМЕНДАЦИИ ПО СДЕЛКЕ: лимиты, предоплата/отсрочка, обеспечение (залог/поручительство/банковская гарантия), "
        "пакет документов, усиленные условия договора (односторонний отказ, штрафы, раскрытие информации, уведомления).\n\n"
        "🧾 ВЫХОДНОЙ ФОРМАТ:\n"
        "A) КРАТКОЕ РЕЗЮМЕ (5–8 предложений): статус, ключевые красные флаги, общая рекомендация (OK / OK с ограничениями / Высокий риск — отказ).\n"
        "B) ТАБЛИЦА РИСКОВ:\n"
        "| Категория | Факт/признак | Риск для нас | Как снизить | Данные/ссылка |\n"
        "|-----------|---------------|--------------|-------------|---------------|\n"
        "— минимум по одному пункту в каждую категорию, если данных нет — укажи 'н/д (нужно запросить)'.\n"
        "C) РЕКОМЕНДАЦИИ ПО УСЛОВИЯМ ДОГОВОРА: платежи, ответственность, обеспечение, документы, триггеры досрочного расторжения.\n"
        "D) ЧЕК-ЛИСТ ДОКУМЕНТОВ ДЛЯ ЗАПРОСА У КОНТРАГЕНТА: устав/решение/ЕГРЮЛ-выписка, доверенность руководителя, "
        "бухотчётность, справки об отсутствии задолженности, бенефициары, санкционные декларации, банковские реквизиты и т.д.\n\n"
        "❗ ПРАВИЛА:\n"
        "- Ничего не выдумывай. Если поле пустое — пиши 'н/д'.\n"
        "- Если пользователь приложил распознанный текст/скрин, используй его как источник фактов (с пометкой 'из документа').\n"
        "- Вывод делай структурированным и пригодным для вставки в отчёт/письмо комплаенса.\n"
    ),
    "format": "| Категория | Факт/признак | Риск для нас | Как снизить | Данные/ссылка |"
}

# ---------- Хендлеры ----------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привет! Я юридический бот Эверест.\n"
        "• Пришлите PDF или фото — распознаю и подготовлю анализ.\n"
        "• /prompts — список всех промтов из базы.\n"
        "• /prompt <key> — показать полный текст промта.\n"
        "• /apply <key> — применить промт к последнему распознанному тексту.\n"
        "• /check_counterparty — проверка контрагента (KYC/KYB)."
    )

def build_prompts_keyboard(page: int = 1, per_page: int = 10) -> Tuple[str, InlineKeyboardMarkup]:
    keys = list(LEGAL_PROMPTS.keys())
    total, pages = len(keys), max(1, math.ceil(len(keys)/per_page))
    page = max(1, min(page, pages))
    start_idx, end_idx = (page-1)*per_page, min((page-1)*per_page+per_page, total)
    rows = []
    for key in keys[start_idx:end_idx]:
        title = LEGAL_PROMPTS[key]["title"]
        rows.append([InlineKeyboardButton(title[:60], callback_data=f"show:{key}")])
    nav = []
    if page > 1: nav.append(InlineKeyboardButton("⬅️ Назад", callback_data=f"plist:{page-1}"))
    if page < pages: nav.append(InlineKeyboardButton("Вперёд ➡️", callback_data=f"plist:{page+1}"))
    if nav: rows.append(nav)
    return f"Промты ({total}): страница {page}/{pages}", InlineKeyboardMarkup(rows)

async def cmd_prompts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    caption, kb = build_prompts_keyboard(1)
    await update.message.reply_text(caption, reply_markup=kb)

async def cb_plist(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int):
    q = update.callback_query; await q.answer()
    caption, kb = build_prompts_keyboard(page)
    await q.edit_message_text(caption, reply_markup=kb)

async def cb_show_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE, key: str):
    q = update.callback_query; await q.answer()
    data = LEGAL_PROMPTS.get(key)
    if not data:
        await q.edit_message_text("Промт не найден."); return
    await q.edit_message_text(f"🔎 {data['title']}\nКлюч: {key}\n\nОтправляю полный текст промта…")
    for part in chunk_text(data["prompt"]):
        await context.bot.send_message(chat_id=q.message.chat_id, text=part)
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛠 Применить к последнему документу", callback_data=f"apply:{key}")],
        [InlineKeyboardButton("⬅️ К списку", callback_data="plist:1")]
    ])
    await context.bot.send_message(chat_id=q.message.chat_id, text="Действия:", reply_markup=kb)

async def cmd_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text("Использование: /prompt <key>\nПосмотреть ключи: /prompts"); return
    key = args[0].strip()
    data = LEGAL_PROMPTS.get(key)
    if not data:
        await update.message.reply_text("Промт не найден. Используйте /prompts."); return
    await update.message.reply_text(f"🔎 {data['title']} (ключ: {key}) — отправляю полный текст…")
    await send_long_text(update.effective_chat.id, data["prompt"], context, filename_hint=f"prompt_{key}")

async def cmd_apply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text("Укажите ключ промта: /apply <key>\nПосмотреть: /prompts"); return
    key = args[0].strip()
    data = LEGAL_PROMPTS.get(key)
    if not data:
        await update.message.reply_text("Промт с таким ключом не найден."); return
    extracted = context.user_data.get("extracted_text", "")
    if not extracted:
        await update.message.reply_text("Нет распознанного текста. Пришлите PDF или фото."); return
    full_prompt = data["prompt"]
    analysis_request = f"{full_prompt}\n\n---\nТЕКСТ ДОКУМЕНТА:\n{extracted}"
    await update.message.reply_text("Запускаю анализ…")
    try:
        answer = await asyncio.to_thread(openai_chat, messages=[{"role": "user", "content": analysis_request}], temperature=0.2)
    except Exception as e:
        await update.message.reply_text(f"Ошибка OpenAI: {e}"); return
    await send_long_text(update.effective_chat.id, answer, context, filename_hint=f"analysis_{key}")

async def cb_apply(update: Update, context: ContextTypes.DEFAULT_TYPE, key: str):
    q = update.callback_query; await q.answer()
    fake_update = Update(update.update_id, message=q.message)
    context.args = [key]
    await cmd_apply(fake_update, context)

# --- Проверка контрагента как отдельная команда ---
async def cmd_check_counterparty(update: Update, context: ContextTypes.DEFAULT_TYPE):
    key = COUNTERPARTY_PROMPT_KEY
    data = LEGAL_PROMPTS[key]
    extracted = context.user_data.get("extracted_text", "")
    # Если пользователь прислал текст/скан с реквизитами — используем как источник
    base = data["prompt"]
    user_tip = (
        "\n\nПодсказка: отправьте ИНН/ОГРН, краткое наименование и при наличии — "
        "скрин/выписку. Можно приложить PDF/фото — я распознаю и добавлю факты в отчёт."
    )
    if extracted:
        req = f"{base}\n\n---\nИМЕЮЩИЕСЯ ДАННЫЕ ИЗ ДОКУМЕНТА (OCR):\n{extracted}"
    else:
        req = base + user_tip
    await update.message.reply_text("Готовлю структуру отчёта…")
    try:
        answer = await asyncio.to_thread(openai_chat, messages=[{"role": "user", "content": req}], temperature=0.2)
    except Exception as e:
        await update.message.reply_text(f"Ошибка OpenAI: {e}"); return
    await send_long_text(update.effective_chat.id, answer, context, filename_hint="counterparty_check")

# --- OCR: PDF ---
async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.document: return
    doc = update.message.document
    mime = (doc.mime_type or "").lower()
    if not ("pdf" in mime or doc.file_name.lower().endswith(".pdf")):
        await update.message.reply_text("Сейчас поддерживаются только PDF-документы."); return
    file = await doc.get_file()
    b = await file.download_as_bytearray()
    await update.message.reply_text("Распознаю PDF…")
    try:
        text = await asyncio.to_thread(ocr_pdf_bytes_to_text, bytes(b), OCR_LANG)
    except Exception as e:
        await update.message.reply_text(f"Ошибка распознавания PDF: {e}"); return
    context.user_data["extracted_text"] = text
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("📚 Список промтов", callback_data="plist:1")],
        [InlineKeyboardButton("🏢 Проверка контрагента", callback_data=f"apply:{COUNTERPARTY_PROMPT_KEY}")]
    ])
    await update.message.reply_text(f"📄 PDF распознан. Символов: {len(text)}.", reply_markup=kb)

# --- OCR: Фото ---
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.photo: return
    ph = await update.message.photo[-1].get_file()
    photo_bytes = await ph.download_as_bytearray()
    image = Image.open(io.BytesIO(photo_bytes))
    await update.message.reply_text("Распознаю фото…")
    try:
        text = await asyncio.to_thread(ocr_image_to_text, image, OCR_LANG)
    except Exception as e:
        await update.message.reply_text(f"Ошибка распознавания фото: {e}"); return
    context.user_data["extracted_text"] = text
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("📚 Список промтов", callback_data="plist:1")],
        [InlineKeyboardButton("🏢 Проверка контрагента", callback_data=f"apply:{COUNTERPARTY_PROMPT_KEY}")]
    ])
    await update.message.reply_text(f"📸 Текст распознан. Символов: {len(text)}.", reply_markup=kb)

# --- Просмотр последнего OCR ---
async def cmd_last(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = context.user_data.get("extracted_text", "")
    if not text:
        await update.message.reply_text("Пока нет распознанного текста.")
    else:
        await send_long_text(update.effective_chat.id, text, context, filename_hint="extracted_text")

# --- Callback router ---
async def callback_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    data = (q.data or "").strip()
    if data.startswith("plist:"):
        try: page = int(data.split(":")[1])
        except: page = 1
        await cb_plist(update, context, page); return
    if data.startswith("show:"):
        key = data.split(":", 1)[1]
        await cb_show_prompt(update, context, key); return
    if data.startswith("apply:"):
        key = data.split(":", 1)[1]
        await cb_apply(update, context, key); return
    await q.answer("Неизвестная команда")

# ---------- Main ----------
def main():
    if not BOT_TOKEN or BOT_TOKEN == "YOUR_TELEGRAM_TOKEN":
        raise RuntimeError("Установите TELEGRAM_BOT_TOKEN")
    app: Application = ApplicationBuilder().token(BOT_TOKEN).build()

    # Команды
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("prompts", cmd_prompts))
    app.add_handler(CommandHandler("prompt", cmd_prompt))
    app.add_handler(CommandHandler("apply", cmd_apply))
    app.add_handler(CommandHandler("last", cmd_last))
    app.add_handler(CommandHandler("check_counterparty", cmd_check_counterparty))

    # Сообщения
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    # CallbackQuery
    app.add_handler(CallbackQueryHandler(callback_router))

    logger.info("Бот запущен.")
    app.run_polling()

if __name__ == "__main__":
    main()
Что изменилось по сравнению с прошлой версией
Добавлен новый ключ proverka-kontragenta в LEGAL_PROMPTS с полным развернутым промтом (ничего не урезано).

Введена команда /check_counterparty — запрашивает отчёт по проверке контрагента; если до этого распознавали документ, его текст подставится как данные.

В карточках после OCR появилась кнопка «🏢 Проверка контрагента» для мгновенного применения нового промта.

Список промтов /prompts теперь тоже включает «Проверка контрагента».

Если хочешь, добавлю быстрые алиасы для ключевых промтов (например, /contract_review, /risk_table, /court_search) и выведу в главном меню.







Вы сказали:
Да


ChatGPT сказал:

Думал на протяжении 15s
Готово. Добавил «Проверка контрагента» как отдельный полный промт (ничего не урезал) и оставил загрузку всех остальных промтов из Excel без сокращений. Ключевые блоки в базе доступны: «Генератор Договоров»Генератор Договоров, «Личный копирайтер в Telegram»Личный копирайтер в Tel…, «Поисковик противоречий…»Поисковик противоречий …, «Промпт для точечного поиска практики…»Промпт для точечного по…Промпт для точечного по…, «База промптов» (проверка договора, таблица рисков, юрзаключение, ответ на претензию и др.)База промптов, «Генератор обращений…»Генератор обращений в г….

Что у тебя уже есть в скрипте:

OCR PDF/фото + сохранение полного текста.

Пагинация списка промтов и показ полного текста любого промта.

/apply <key> — применить промт к последнему распознанному тексту.

/check_counterparty — отчёт KYC/KYB по контрагенту (новый промт встроен полностью).

Кнопка «🏢 Проверка контрагента» сразу после OCR.

Хочешь — добавил бы быстрые алиасы для частых промтов (пример):

python
Копировать
Редактировать
# алиасы по ключам листов (ключ = slug от названия листа)
ALIASES = {
    "contract": "generator-dogovorov",   # «Генератор Договоров»:contentReference[oaicite:7]{index=7}
    "court_search": "prompt-dlya-tochnechnogo-poiska-sudebnoi-praktiki-v-rf-tema-data-region",  #:contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
    "contradictions": "poiskovik-protivorechii-v-sudebnoi-praktike",  #:contentReference[oaicite:10]{index=10}
    "letters_to_gov": "generator-obrashchenii-v-gosudarstvennye-organy",  #:contentReference[oaicite:11]{index=11}
    "prompts_base": "baza-promptov",     # общий лист с «Проверка договора», «Таблица рисков», «Юрзаключение»…:contentReference[oaicite:12]{index=12}
}
# Команды:
# /contract, /court_search, /contradictions, /letters_to_gov -> внутри вызывают /apply с нужным ключом
Если нужно — пришлю мини-патч с этими командами и главной клавиатурой (ReplyKeyboard) под твоё меню.







Вы сказали:
Да


ChatGPT сказал:
Отлично — добавляю полный промт “Проверка контрагента (KYC/KYB, РФ)” и готовые вставки в код.

Полный промт: «Проверка контрагента (KYC/KYB, РФ) — отчёт с выводом и уровнем риска»
ТЫ — ЮРИДИЧЕСКИЙ АНАЛИТИК (KYC/KYB) ДЛЯ РФ.
ТВОЯ ЗАДАЧА — ПРОВЕСТИ ПРОВЕРКУ КОНТРАГЕНТА (юр. лицо / ИП / физ. лицо как бенефициар) И СФОРМИРОВАТЬ СТРУКТУРИРОВАННЫЙ ОТЧЁТ С ИТОГОВОЙ ОЦЕНКОЙ РИСКА И РЕКОМЕНДАЦИЯМИ.

📥 ВХОДНЫЕ ДАННЫЕ (если предоставлены)
Наименование/ФИО, ИНН, ОГРН/ОГРНИП, КПП, дата регистрации

Юр. адрес, фактический адрес

Деятельность (ОКВЭД), сайт, телефоны, e‑mail, соцсети

Бенефициары и директора (ФИО, доли)

Любые документы от контрагента (устав, выписка ЕГРЮЛ/ЕГРИП, лицензии, договоры, счета, справки и пр.)

🧠 АЛГОРИТМ (CHAIN OF THOUGHTS — пошагово)
Идентификация профиля

Кто проверяется: юрлицо/ИП/бенефициар.

Сопоставь реквизиты и факты из входных данных.

Госреестры и соответствие базовым критериям

Сверь: регистрационные данные (название, ИНН, ОГРН/ОГРНИП, дата регистрации, адрес), статус (действующий/ликвидирован/в стадии).

Проверь соответствие ОКВЭД заявленному виду деятельности.

Наличие лицензий (если деятельность лицензируется) — действительность и сроки.

Управление и собственность

Директор(а), участники/акционеры, конечные бенефициары.

Пересечения ФИО/ИНН с нежелательными списками (санкции/фиктивность — если данные доступны во входе).

Частая смена директоров/адресов/участников — красный флаг.

Надёжность и деловая репутация

Судебные споры (массовые иски, банкротство, субсидиарка — если данные предоставлены).

Исполнительные производства и налоговые претензии (если во входных данных есть подтверждения/ссылки).

Публикации в СМИ/сайтах компании (при наличии текста во входе).

Диссонанс между заявленным адресом и реальной деятельностью — флаг.

Финансы и признаки фиктивности (на основе предоставленных файлов/текста)

Аномалии в счётах, договорах, прайсах (нелогичные цены, подделки/сканы низкого качества, отсутствие обязательных реквизитов).

Массовый адрес/массовый учредитель (если указано во входе) — флаг.

Нет подписантов/расхождения в подписях/печати — флаг.

Комплаенс‑риски

Санкционные/репутационные риски (по данным, переданным пользователем).

Отраслевые риски (лицензирование, экспорт/импорт, персональные данные, усиленные требования к отчётности).

Конфликт интересов (пересечения руководства, аффилированность по предоставленным данным).

Сводка документов

Список полученных/проверенных документов, в том числе распознанных из PDF/фото.

Что не предоставлено, но желательно запросить.

Итоговая оценка риска

Уровень: Низкий / Средний / Высокий (обоснуй ≥3 тезисами).

Решение: сотрудничать / сотрудничать с условиями / отказать.

Рекомендации по снижению риска

KYC‑условия в договор: расширенная гарантия достоверности данных, право на аудит, право на одностороннее расторжение при выявлении несоответствий, анти‑коррупционные/санкционные оговорки, KYT/оплаты с подтверждающими документами, ограничения на субподрядчиков.

Запрос дополнительных документов (выписка ЕГРЮЛ/ЕГРИП актуальной даты, лицензии, устав, решение/протокол, доверенности, справки об отсутствии задолженностей, подтверждение бенефициаров).

Проверки перед оплатой: сверка счёта, банка, БИК, назначение платежа, согласование КИП/КПЭ.

🧾 ФОРМАТ ВЫВОДА
Карточка контрагента

Наименование/ФИО · ИНН · ОГРН/ОГРНИП · КПП · дата регистрации · статус

Адрес (юр./факт.) · ОКВЭД(ы) · лицензии (№, вид, срок)

Директор · Участники/бенефициары (ФИО, доля)

Таблица ключевых проверок

Блок	Что проверяли	Что нашли	Риск	Комментарий/доказательства

Красные/жёлтые флаги (списком, кратко и по делу).

Итоговая оценка риска: Н/С/В + краткое обоснование.

Рекомендации: конкретные пункты и формулировки для договора / список документов для запроса.

Список проанализированных документов (если были приложены в чат, включая распознанные PDF/фото).

❌ ЧЕГО НЕ ДЕЛАТЬ
Не выдумывай внешние источники/ссылки. Используй только то, что предоставил юрист (текст, OCR из PDF/фото, реквизиты в сообщении).

Не подменяй выводы догадками — каждый риск обосновывай конкретным фактом из входа.

Не давай расплывчатых рекомендаций («усилить контроль») без точной формулировки пункта/действия.

Не делай окончательных обвинительных выводов — только оценка риска и юридически корректные формулировки.

🧩 ЕСЛИ ДАННЫХ МАЛО
Честно зафиксируй: «Недостаточно данных для полной проверки».

Дай чек‑лист дозаказа: свежая выписка ЕГРЮЛ/ЕГРИП, паспорт директора (при необходимости идентификации), устав/решения/доверенности, лицензии/разрешения, справки об отсутствии задолженностей, подтверждение бенефициаров, образцы подписей/печати, контакты и сайт.

🔧 ДОГОВОРНЫЕ ОГОВОРКИ (готовые вставки — по необходимости)
Гарантии достоверности: «Сторона гарантирует достоверность предоставленных сведений о бенефициарах…»

Анти‑санкционная: «Сторона заявляет, что не включена в санкционные списки…»

Право на аудит/KYC‑апдейт: «Сторона обязуется по запросу предоставлять документы, подтверждающие…»

Расторжение: «Выявление недостоверности существенных сведений является основанием для расторжения…»

Субподрядчики: «Привлечение третьих лиц допускается при условии предварительного согласования и проведения проверки…»

ГОТОВ К ПРОВЕРКЕ. Если в чате есть распознанный текст договоров/выписок/фото — используй его как доказательную базу и явно цитируй фрагменты.

Как подключить в ваш бот (без сокращений)
1) Добавьте промт в словарь LEGAL_PROMPTS:

python
Копировать
Редактировать
LEGAL_PROMPTS["counterparty_check"] = {
    "prompt": """<ПОЛНЫЙ ТЕКСТ ПРОМТА ИЗ РАЗДЕЛА ВЫШЕ — БЕЗ СОКРАЩЕНИЙ>""",
    "format": "Карточка + Таблица проверок + Флаги + Оценка риска + Рекомендации + Список документов"
}
2) Кнопки после OCR (PDF/фото):
В обработчиках handle_document и handle_photo добавьте кнопку:

python
Копировать
Редактировать
from telegram import InlineKeyboardMarkup, InlineKeyboardButton

# ...в reply_markup рядом с остальными:
[InlineKeyboardButton("🏢 Проверка контрагента", callback_data='counterparty_check')]
3) Callback‑обработчик применения промта к распознанному тексту/реквизитам:

python
Копировать
Редактировать
async def apply_counterparty_check(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    extracted_text = context.user_data.get('extracted_text', '')

    full_prompt = LEGAL_PROMPTS["counterparty_check"]["prompt"]
    analysis_request = (
        f"{full_prompt}\n\n"
        f"ДАНО: Ниже — весь текст/реквизиты, предоставленные пользователем (OCR/сообщение).\n"
        f"Используй только эти данные как доказательную базу.\n\n"
        f"=== ВХОДНОЙ ТЕКСТ ===\n{extracted_text[:12000]}"
    )

    await context.bot.send_message(chat_id=update.effective_chat.id,
                                   text=f"🏢 <b>Проверка контрагента — запрос:</b>\n\n{analysis_request}",
                                   parse_mode='HTML')

    # OpenAI вызов (оставьте вашу реализацию клиента)
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",  # или ваш модельный идентификатор
        messages=[{"role": "user", "content": analysis_request}],
        temperature=0.2
    )
    await context.bot.send_message(chat_id=update.effective_chat.id,
                                   text=f"📋 <b>Отчёт KYC/KYB:</b>\n\n{response.choices[0].message.content}",
                                   parse_mode='HTML')
4) Зарегистрируйте обработчик:

python
Копировать
Редактировать
from telegram.ext import CallbackQueryHandler
app.add_handler(CallbackQueryHandler(apply_counterparty_check, pattern="^counterparty_check$"))
5) Команда для быстрого вызова (по желанию):

python
Копировать
Редактировать
async def counterparty_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Отправьте реквизиты (ИНН/ОГРН/название) или загрузите документы/фото. Затем нажмите «🏢 Проверка контрагента».")
app.add_handler(CommandHandler("counterparty", counterparty_command))
Готово. Промт добавлен полностью, интеграция — минимальная: кнопка, коллбэк и опциональная команда. Если нужно — сделаю вариант для англоязычных контрагентов (KYB международный) и набор готовых формулировок для договора на основе флагов из отчёта.







Вы сказали:
Загрузи все в github  


ChatGPT сказал:

Думал на протяжении 1m 17s

Думал на протяжении 11s





Вы сказали:
Напиши тз для бота


ChatGPT сказал:
Я подготовил полное техническое задание (ТЗ) для Telegram-бота на основе всех загруженных промптов и требований к функционалу.

Техническое задание: Telegram-бот «Юрист Ева» с OCR и полной базой промптов
1. Общее назначение
Бот предназначен для автоматизированной помощи юристам и корпоративным пользователям в работе с юридическими документами: генерация, анализ, поиск судебной практики, проверка контрагентов, подготовка обращений в госорганы и контент для медиа. Вся логика работы бота опирается на полные версии промптов без сокращений.

2. Ключевые функции
Обработка входящих данных

Приём PDF-документов и фото.

OCR-распознавание текста на русском (pytesseract + pdf2image).

Сохранение полного распознанного текста в user_data.

Аналитические функции

Генератор договоров — создание, анализ, структурирование, доработка договоров с учётом законодательства РФГенератор Договоров.

Проверка договора / Таблица рисков — поиск рисков и предложения по их минимизацииБаза промптов.

Промпт для точечного поиска судебной практики — поиск по теме, периоду, регионуПромпт для точечного по….

Поисковик противоречий в судебной практике — выявление расхождений в подходах судовПоисковик противоречий ….

Генератор обращений в госорганы — формирование писем в классическом официальном стилеГенератор обращений в г….

Ответ на претензию — подготовка корректных деловых писем с аргументациейБаза промптов.

Проверка контрагента (Due Diligence) — комплексная проверка по открытым источникам и реестрам.

Личный копирайтер в Telegram — генерация постов в заданном Tone of VoiceЛичный копирайтер в Tel….

Интеграция с OpenAI API

Использование gpt-4o-mini или gpt-4 для генерации текстов по промптам.

Подстановка распознанного текста документов в конец промпта.

Разделение длинных промптов на части при выводе пользователю.

Интерфейс

Главное меню с командами:

/contract — Генератор договоров

/claim — Ответ на претензию

/search — Поиск судебной практики

/contradictions — Поиск противоречий в практике

/gov — Обращение в госорган

/dd — Проверка контрагента

/copywriter — Личный копирайтер

Инлайн-кнопки для выбора действия после загрузки документа:

Анализ договора

Таблица рисков

Проверка контрагента

Анализ претензии

Поиск практики

3. Техническая реализация
Язык: Python 3.11+

Библиотеки:

python-telegram-bot (взаимодействие с Telegram API)

pytesseract (OCR)

pdf2image (конвертация PDF в изображения)

Pillow (обработка изображений)

openai (интеграция с LLM)

python-dotenv (переменные окружения)

Системные зависимости:

tesseract-ocr и пакет tesseract-ocr-rus

poppler-utils

Хранение промптов:

Каждый промпт в отдельном .md файле в папке /prompts (полный текст без сокращений).

Архитектура:

src/bot.py — основной код бота.

/prompts — все юридические промпты.

/data — база с исходными юридическими материалами (например, Excel).

/docker/Dockerfile — контейнеризация.

4. Алгоритм работы
Пользователь отправляет PDF/фото.

Бот распознаёт текст и предлагает варианты обработки (кнопки).

При выборе сценария бот:

Загружает соответствующий промпт.

Подставляет распознанный текст.

Отправляет в OpenAI.

Бот возвращает результат в чат (текстом или файлом, если длинный).

5. Требования к качеству
Промпты используются полностью, без сокращений.

Сохранение структуры (таблицы, списки, выделения).

Максимальное совпадение выходного формата с требованиями промпта.

Поддержка кириллицы в OCR.

Возможность экспорта длинных ответов в .txt или .docx.

6. Планы расширения
Подключение поиска судебной практики через API (при наличии доступа).

Интеграция с CRM (Bitrix24) для автоподстановки реквизитов.

Хранение истории запросов в базе данных.

Настройка многоуровневого меню с выбором сценариев без команд.

Если нужно, я могу прямо сейчас сделать визуальную схему логики бота и структуру репозитория GitHub для разработки. Это позволит сразу передать проект программисту.






Вы сказали:
В облаке и еще читает ворд эксплуатации тхт


ChatGPT сказал:

Думал на протяжении 10s
Принял. Добавляю в ТЗ два пункта: облачный деплой и чтение .docx/.txt (инструкции/мануалы). Ниже — коротко и по делу + готовые патчи к коду/репо.

Дополнение к ТЗ
1) Облако (деплой)
Цель: запустить бота 24/7 в контейнере с OCR.

Рекомендуемый стек:

Railway (или Render / Fly.io / Docker на VPS).

Запуск по long polling (без webhook — проще и надёжнее).

Хранение переменных в .env/секретах: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY.

Что уже готово в репо:

docker/Dockerfile с Tesseract (rus) и Poppler.

requirements.txt.

scripts/init_git_repo.sh — быстрый пуш.

Что добавить:

(Опционально) Procfile:

bash
Копировать
Редактировать
web: python src/bot.py
Railway:

Создать проект → Deploy from GitHub → Add Variables (секреты).

Старт билда из Dockerfile.

Ничего дополнительно слушать не нужно (бот сам держит соединение).

Мониторинг/логи: использовать логи Railway/Render; при падении — авто‑рестарт.

2) Поддержка чтения Word (.docx) и TXT
Цель: бот принимает и распознаёт документы‑инструкции/регламенты в .docx и .txt без OCR.

Поведение:

.docx → извлекаем все параграфы/таблицы в текст.

.txt → читаем как UTF‑8, без изменений.

Текст сохраняем в user_data['extracted_text'] и работаем с ним как обычно (кнопки анализа, применение промтов и т.д.).

Пакеты:

Добавить в requirements.txt:

shell
Копировать
Редактировать
python-docx>=1.1.0
(Если понадобится .doc (старый формат) — доп. опция: textract/antiword, но лучше конвертировать в .docx).

Готовые патчи к коду
1) requirements.txt (добавьте строку)
diff
Копировать
Редактировать
 pytesseract>=0.3.10
 pdf2image>=1.17.0
 Pillow>=10.0.0
 python-dotenv>=1.0.1
+python-docx>=1.1.0
2) src/bot.py — импорты
diff
Копировать
Редактировать
 from PIL import Image
 import pytesseract
 import io
 import tempfile
 import os
 from dotenv import load_dotenv
+from docx import Document  # NEW
3) src/bot.py — новый универсальный обработчик документов
Замените текущий MessageHandler(filters.Document.PDF, handle_document) на общий и добавьте функции:

python
Копировать
Редактировать
# NEW: универсальная обработка входящих файлов
async def handle_any_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.document:
        return
    doc = update.message.document
    name = (doc.file_name or "").lower()
    mime = (doc.mime_type or "").lower()

    file = await doc.get_file()
    file_bytes = await file.download_as_bytearray()

    # 1) PDF через OCR
    if "pdf" in mime or name.endswith(".pdf"):
        await update.message.reply_text("Распознаю PDF…")
        images = convert_from_bytes(bytes(file_bytes))
        full_text = ""
        for i, image in enumerate(images, 1):
            full_text += f"\nСтраница {i}:\n" + pytesseract.image_to_string(image, lang="rus") + "\n"
        context.user_data["extracted_text"] = full_text

    # 2) DOCX нативно
    elif "wordprocessingml" in mime or name.endswith(".docx"):
        await update.message.reply_text("Читаю .docx…")
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(file_bytes); tmp.flush()
            docx = Document(tmp.name)
        parts = []
        # абзацы
        parts.extend(p.text for p in docx.paragraphs if p.text is not None)
        # таблицы
        for t in docx.tables:
            for row in t.rows:
                cells = [c.text.strip() for c in row.cells]
                parts.append(" | ".join(cells))
        full_text = "\n".join(filter(None, parts)).strip()
        context.user_data["extracted_text"] = full_text

    # 3) TXT
    elif mime.startswith("text/") or name.endswith(".txt"):
        await update.message.reply_text("Читаю .txt…")
        try:
            full_text = file_bytes.decode("utf-8", errors="replace")
        except Exception:
            full_text = file_bytes.decode("cp1251", errors="replace")
        context.user_data["extracted_text"] = full_text

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
И обновите регистрацию хендлеров:

diff
Копировать
Редактировать
- app.add_handler(MessageHandler(filters.Document.PDF, handle_document))
+ app.add_handler(MessageHandler(filters.Document.ALL, handle_any_document))
  app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
(Если хотите сохранить отдельную функцию для PDF — оставьте её, но общий обработчик уже покрывает все три типа.)

4) Облако: Procfile (опционально, для Render/Railway)
Создайте Procfile в корне репозитория:

bash
Копировать
Редактировать
web: python src/bot.py
Как проверять
Локально:

bash
Копировать
Редактировать
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.template .env  # вставьте токены
python src/bot.py
Отправьте боту по очереди:

.pdf (скан договора) → должен распознать через OCR.

.docx (инструкция/эксплуатация) → должен прочитать нативно.

.txt (мануал) → должен прочитать нативно.

Нажмите любую из кнопок анализа.

Деплой в облако:

Подключите репозиторий к Railway / Render.

Задайте переменные окружения.

Запустите билда из Dockerfile; следите за логами.

Убедитесь, что бот онлайн и отвечает.

