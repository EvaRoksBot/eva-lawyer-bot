import { IncomingHttpHeaders } from 'http';
import OpenAI from 'openai';

// Environment variables are injected by Vercel at runtime. See .env.example for details.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PROMPT_ID = process.env.OPENAI_PROMPT_ID;
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || '1';

// Base URL for the Telegram Bot API. Do not change unless Telegram changes their API
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Initialise the OpenAI client once per invocation. The client caches connections under the hood.
const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Send a JSON response with HTTP status 200.
 */
function ok(body: any = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Send a JSON error response with the given status code.
 */
function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Verify that the request came from Telegram by comparing the X-Telegram secret header.
 */
function verifyTelegramSignature(headers: IncomingHttpHeaders): boolean {
  if (!WEBHOOK_SECRET) return true;
  const token = headers['x-telegram-bot-api-secret-token'] as string | undefined;
  return token === WEBHOOK_SECRET;
}

/**
 * Send a message via the Telegram Bot API. See https://core.telegram.org/bots/api#sendmessage
 */
async function sendTelegramMessage(chatId: number, text: string, replyTo?: number): Promise<void> {
  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };
  if (replyTo) payload.reply_to_message_id = replyTo;
  // We avoid awaiting the fetch inside sendTelegramMessage to ensure the function returns quickly.
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Generate a response from OpenAI using either a stored prompt (Responses API) or Chat Completions API.
 */
async function generateAnswer(question: string): Promise<string> {
  // Try to use a saved prompt if a Prompt ID is provided
  if (PROMPT_ID) {
    try {
      const res = await openaiClient.responses.create({
        model: OPENAI_MODEL,
        prompt: { id: PROMPT_ID, version: PROMPT_VERSION },
        input: question,
      });
      // @ts-ignore the SDK defines output_text on the returned object
      const answer = res.output_text as string | undefined;
      if (answer) return answer;
    } catch (_) {
      // Fall back to Chat Completions API below if the Responses API fails
    }
  }
  // Fallback: use Chat Completions API with a simple system prompt suitable for a legal assistant
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content:
        'Ты — Ева Юрист, виртуальный юридический ассистент. Отвечай грамотно, структурированно и понятно: сначала дай краткий вывод, затем уточни детали. Если информации недостаточно, сформулируй, какие сведения нужны.',
    },
    { role: 'user', content: question },
  ];
  const completion = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.5,
    max_tokens: 700,
  });
  return completion.choices[0]?.message?.content || 'К сожалению, не удалось получить ответ.';
}

/**
 * The Vercel serverless function entry point.
 */
export const config = { runtime: 'edge' } as const;

export default async function handler(req: Request): Promise<Response> {
  // Accept only POST requests
  if (req.method !== 'POST') {
    return error('Method Not Allowed', 405);
  }
  // Verify the secret token
  if (!verifyTelegramSignature(Object.fromEntries(req.headers) as any)) {
    return error('Forbidden', 403);
  }
  // Parse JSON body
  let update: any;
  try {
    update = await req.json();
  } catch {
    return error('Invalid JSON');
  }
  // Extract message or callback query
  const message = update.message || update.edited_message || null;
  const callbackQuery = update.callback_query || null;
  // Determine chat ID
  const chatId: number | undefined = message?.chat?.id ?? callbackQuery?.message?.chat?.id;
  if (!chatId) {
    // If there is no chat ID, nothing to do
    return ok();
  }
  // Extract the text from message or callback data
  const text: string = message?.text?.trim() || callbackQuery?.data || '';
  // Basic command handling
  if (text === '/start') {
    // Send a reply keyboard with the main menu options
    const payload = {
      chat_id: chatId,
      text: 'Я — Ева Юрист. Выберите раздел или напишите свой вопрос.',
      reply_markup: {
        keyboard: [
          [ { text: 'Проверка договора' }, { text: 'Проверка контрагента' } ],
          [ { text: 'Документы' }, { text: 'Претензии/Ответы' } ],
          [ { text: 'Судебная практика' }, { text: 'Помощь' } ],
          [ { text: 'Настройки' } ],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        is_persistent: true,
      },
    };
    await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return ok();
  }
  // Custom commands for help and reset
  if (text === '/help' || text === 'Помощь') {
    await sendTelegramMessage(
      chatId,
      'Я могу помочь с анализом договоров, проверкой контрагентов и подготовкой черновиков документов. Выберите раздел с помощью клавиатуры или отправьте вопрос.',
      message?.message_id,
    );
    return ok();
  }
  if (text === '/reset' || text === 'Сбросить контекст') {
    // As we don’t store any context in this simple implementation, just send a confirmation
    await sendTelegramMessage(chatId, 'Контекст очищен.', message?.message_id);
    return ok();
  }
  // Handle menu buttons (send placeholder responses)
  if (['Проверка договора', 'Проверка контрагента', 'Документы', 'Претензии/Ответы', 'Судебная практика', 'Настройки'].includes(text)) {
    let reply = '';
    switch (text) {
      case 'Проверка договора':
        reply = 'Пожалуйста, пришлите текст договора или основные условия для проверки.';
        break;
      case 'Проверка контрагента':
        reply = 'Укажите ИНН или название организации. Добавьте краткую информацию о предстоящей сделке (сумма, тип, сроки).';
        break;
      case 'Документы':
        reply = 'Выберите тип документа: договор, протокол разногласий, допсоглашение и т. д. Я задам уточняющие вопросы для подготовки черновика.';
        break;
      case 'Претензии/Ответы':
        reply = 'Опишите ситуацию: кто кому, по какому поводу, сумма и факты. Я помогу составить претензию или ответ.';
        break;
      case 'Судебная практика':
        reply = 'Опишите критерии поиска (регион, предмет спора, период, сумма). Я подготовлю аналитический обзор судебной практики.';
        break;
      case 'Настройки':
        reply = 'Вы можете выбрать стиль ответов (лаконично, подробно, экспертно, дружелюбно). Введите нужный стиль текстом.';
        break;
    }
    await sendTelegramMessage(chatId, reply, message?.message_id);
    return ok();
  }
  // Handle style change commands
  const lc = text.toLowerCase();
  if (['лаконично', 'подробно', 'экспертно', 'дружелюбно'].includes(lc)) {
    // Notify user (we do not persist style in this simple implementation)
    await sendTelegramMessage(chatId, `Стиль установлен: ${lc}. Отправьте ваш вопрос.`);
    return ok();
  }
  // For any other text, treat it as a question and ask OpenAI
  try {
    const answer = await generateAnswer(text);
    await sendTelegramMessage(chatId, answer, message?.message_id);
  } catch (e) {
    await sendTelegramMessage(chatId, '⚠️ Произошла ошибка при обращении к модели. Попробуйте ещё раз.');
  }
  return ok();
}