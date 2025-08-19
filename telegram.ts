import OpenAI from 'openai';

// Load helper modules for document and image extraction and content generation.
const { extractText, extractTextFromImage } = require('./src/modules/extract');
const { generateContract } = require('./src/modules/contract');
const { generateCopy } = require('./src/modules/copywriter');
const { generateSkillsRoadmap } = require('./src/modules/skills');
const { generateAppeal } = require('./src/modules/appeal');
const { lookupCounterparty } = require('./src/modules/counterparty');

/**
 * Telegram bot handler for Vercel (Node runtime).
 *
 * This implementation uses standard Node.js semantics for serverless functions.
 * It responds to incoming updates from Telegram, sends messages via the Bot API,
 * integrates with OpenAI for natural language answers, and optionally queries
 * DaData for counterparty checks when an INN or organisation name is provided.
 *
 * The main menu presented to users includes five options:
 *   1. Проверка договора      – send contract text or key terms for analysis
 *   2. Проверка контрагента    – supply INN or company name to retrieve a summary
 *   3. Создать документ        – select a document template (invoice, contract, specification)
 *   4. Диалог с ИИ             – free‑form chat with the assistant
 *   5. FAQ                     – common questions and instructions
 */

// Load environment variables supplied by Vercel. These values should be
// configured in the Vercel project settings rather than committed to the repo.
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const DADATA_API_KEY = process.env.DADATA_API_KEY || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Initialise OpenAI client once. The client manages its own connection pooling.
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Labels used in the reply keyboard. Centralising them here makes it easy to
// change button text without modifying logic in multiple places.
const BTN_CONTRACT_REVIEW = 'Проверка договора';
const BTN_COUNTERPARTY = 'Проверка контрагента';
const BTN_CREATE_DOC = 'Создать документ';
const BTN_AI_CHAT = 'Диалог с ИИ';
const BTN_FAQ = 'FAQ';

/**
 * Construct the main reply keyboard shown to users when they start the bot.
 */
function buildMainKeyboard() {
  return {
    keyboard: [
      [ { text: BTN_CONTRACT_REVIEW }, { text: BTN_COUNTERPARTY } ],
      [ { text: BTN_CREATE_DOC }, { text: BTN_AI_CHAT } ],
      [ { text: BTN_FAQ } ],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: 'Выберите действие или задайте вопрос…',
  };
}

/**
 * Inline keyboard for the document creation menu. Users can choose which
 * template to generate. For a real application, these handlers would prompt
 * the user for the necessary fields and then construct a DOCX file. Here,
 * simple text placeholders are returned instead for demonstration.
 */
function buildDocInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Счёт', callback_data: 'doc:invoice' },
        { text: 'Договор поставки', callback_data: 'doc:contract' },
        { text: 'Спецификация', callback_data: 'doc:spec' },
      ],
    ],
  };
}

/**
 * Send a message via the Telegram Bot API. Additional fields like
 * reply_markup can be passed in the `extra` parameter.
 */
async function sendMessage(chatId: number, text: string, extra: Record<string, any> = {}) {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

/**
 * Query OpenAI ChatGPT for a legal assistant response. The system prompt
 * encourages concise yet structured answers. If more advanced prompting
 * behaviour is required (e.g. using saved prompts via responses API), this
 * function can be extended accordingly.
 */
async function askAssistant(question: string): Promise<string> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content:
        'Ты — Ева Юрист, виртуальный юридический ассистент. Отвечай грамотно, структурированно и понятно: сначала дай краткий вывод, затем уточни детали. Если информации недостаточно, сформулируй, какие сведения нужны.',
    },
    { role: 'user', content: question },
  ];
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
    temperature: 0.5,
    max_tokens: 700,
  });
  return completion.choices[0]?.message?.content || 'К сожалению, не удалось получить ответ.';
}

/**
 * Main handler for the Vercel Node function. Processes incoming updates
 * from Telegram and dispatches actions based on message text or callback
 * data. Always responds with a JSON object to satisfy the Telegram API.
 */
export default async function handler(req: any, res: any) {
  // Only accept POST requests. Telegram always uses POST for webhooks.
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }
  // Optionally verify the webhook secret token. If WEBHOOK_SECRET is set,
  // the incoming header x-telegram-bot-api-secret-token must match.
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }
  const update = req.body;
  const message = update.message || update.edited_message || null;
  const callbackQuery = update.callback_query || null;
  const chatId: number | undefined = message?.chat?.id ?? callbackQuery?.message?.chat?.id;
  if (!chatId) {
    // Without a chat ID there is nothing to do; acknowledge the update.
    res.status(200).json({ ok: true });
    return;
  }
  const text: string = (message?.text || '').trim() || (callbackQuery?.data || '');

  // === Attachment handling: documents (PDF/DOCX) and images ===
  if (message?.document) {
    try {
      const fileId = message.document.file_id;
      // Retrieve file path from Telegram
      const fileInfoResp = await fetch(`${TG_API}/getFile?file_id=${fileId}`).then(r => r.json());
      const filePath = fileInfoResp?.result?.file_path;
      if (!filePath) throw new Error('No file path');
      const fileUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${filePath}`;
      const fileResp = await fetch(fileUrl);
      const arrayBuffer = await fileResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = message.document.mime_type || '';
      let extracted = '';
      try {
        extracted = await extractText(buffer, mimeType);
      } catch (err) {
        extracted = '';
      }
      if (extracted) {
        // Send extracted text to assistant for analysis
        const answer = await askAssistant(extracted);
        await sendMessage(chatId, answer);
      } else {
        await sendMessage(chatId, 'Не удалось извлечь текст из файла. Поддерживаются PDF и DOCX.');
      }
    } catch {
      await sendMessage(chatId, 'Ошибка при обработке файла. Попробуйте ещё раз.');
    }
    res.status(200).json({ ok: true });
    return;
  }
  if (message?.photo) {
    try {
      // Take the highest resolution photo (last in array)
      const photos = message.photo;
      const fileId = photos[photos.length - 1].file_id;
      const fileInfoResp = await fetch(`${TG_API}/getFile?file_id=${fileId}`).then(r => r.json());
      const filePath = fileInfoResp?.result?.file_path;
      if (!filePath) throw new Error('No file path');
      const fileUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${filePath}`;
      const fileResp = await fetch(fileUrl);
      const arrayBuffer = await fileResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Use GPT‑4o vision to extract text from image
      const extracted = await extractTextFromImage(buffer, OPENAI_API_KEY);
      if (extracted) {
        const answer = await askAssistant(extracted);
        await sendMessage(chatId, answer);
      } else {
        await sendMessage(chatId, 'Не удалось извлечь текст из изображения.');
      }
    } catch {
      await sendMessage(chatId, 'Ошибка при обработке изображения.');
    }
    res.status(200).json({ ok: true });
    return;
  }
  // Handle callback queries (e.g. inline keyboard presses)
  if (callbackQuery) {
    const data = callbackQuery.data as string;
    // Document generation callbacks. Real implementation would build
    // dynamic DOCX files; here we return simple placeholders.
    if (data.startsWith('doc:')) {
      let response = '';
      if (data === 'doc:invoice') {
        response = '🧾 Черновик счёта: здесь будет таблица товаров и итоговая сумма.';
      } else if (data === 'doc:contract') {
        response = '📄 Черновик договора поставки: номер, город, дата, предмет, ответственность…';
      } else if (data === 'doc:spec') {
        response = '📑 Черновик спецификации: список позиций, ед. измерения, количества, цены и НДС.';
      }
      await sendMessage(chatId, response);
    }
    // Always answer the callback query to remove the loading spinner
    await fetch(`${TG_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQuery.id }),
    });
    res.status(200).json({ ok: true });
    return;
  }
  // Process regular text messages and commands
  if (text === '/start') {
    await sendMessage(chatId, 'Привет! Я Ева Юрист. Выберите раздел или задайте вопрос.', {
      reply_markup: buildMainKeyboard(),
    });
    res.status(200).json({ ok: true });
    return;
  }
  if (text === BTN_CONTRACT_REVIEW) {
    await sendMessage(chatId, 'Пришлите текст договора или основные условия для проверки.');
    res.status(200).json({ ok: true });
    return;
  }
  if (text === BTN_COUNTERPARTY) {
    await sendMessage(chatId, 'Укажите ИНН (10 или 12 цифр) либо название компании — я подготовлю сводку.');
    res.status(200).json({ ok: true });
    return;
  }
  if (text === BTN_CREATE_DOC) {
    await sendMessage(chatId, 'Какой документ сформировать?', {
      reply_markup: buildDocInlineKeyboard(),
    });
    res.status(200).json({ ok: true });
    return;
  }
  if (text === BTN_AI_CHAT) {
    await sendMessage(chatId, 'Режим диалога с ИИ включён. Задайте ваш вопрос, и я постараюсь помочь.');
    res.status(200).json({ ok: true });
    return;
  }
  if (text === BTN_FAQ) {
    await sendMessage(
      chatId,
      'FAQ:\n• *Проверка договора*: пришлите текст договора, я найду риски и предложу правки.\n' +
        '• *Проверка контрагента*: укажите ИНН или название — верну краткую сводку.\n' +
        '• *Создать документ*: выберите шаблон, подставлю ваши реквизиты.\n' +
        '• *Диалог с ИИ*: свободные вопросы по праву.',
      { parse_mode: 'Markdown' },
    );
    res.status(200).json({ ok: true });
    return;
  }
  // Pattern for recognising potential INN or organisation names; if matched
  // we query DaData for a summary.
  if (/^\d{10}(\d{2})?$/.test(text) || text.toLowerCase().includes('ооо')) {
    const summary = await lookupCounterparty(text, DADATA_API_KEY);
    await sendMessage(chatId, summary);
    res.status(200).json({ ok: true });
    return;
  }
  // Fallback: for any other message, call OpenAI and relay the answer
  try {
    const answer = await askAssistant(text);
    await sendMessage(chatId, answer);
  } catch {
    await sendMessage(chatId, '⚠️ Ошибка при обращении к модели. Попробуйте ещё раз.');
  }
  res.status(200).json({ ok: true });
}