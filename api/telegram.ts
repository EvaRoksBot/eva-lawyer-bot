import { IncomingHttpHeaders } from 'http';
import OpenAI from 'openai';

// Environment variables are injected by Vercel at runtime.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
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

// === КОНСТАНТЫ ТЕКСТОВ КНОПОК ===
const BTN_CONTRACT_REVIEW = "Проверка договора";
const BTN_COUNTERPARTY    = "Проверка контрагента";
const BTN_CREATE_DOC      = "Создать документ";
const BTN_AI_CHAT         = "Диалог с ИИ";
const BTN_FAQ             = "FAQ";

function mainKB() {
  return {
    keyboard: [
      [ { text: BTN_CONTRACT_REVIEW }, { text: BTN_COUNTERPARTY } ],
      [ { text: BTN_CREATE_DOC }, { text: BTN_AI_CHAT } ],
      [ { text: BTN_FAQ } ]
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "Выберите действие или напишите вопрос…"
  };
}

function inlineDocs() {
  return {
    inline_keyboard: [
      [
        { text: "Счёт",              callback_data: "doc:invoice"  },
        { text: "Договор поставки",  callback_data: "doc:contract" },
        { text: "Спецификация",      callback_data: "doc:spec"     }
      ]
    ]
  };
}

// === ХЕЛПЕР ОТПРАВКИ ===
async function tgSend(chat_id: number, text: string, extra: any = {}) {
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id, text, ...extra })
  });
}

// === ЗАГЛУШКИ БИЗНЕС-ЛОГИКИ ===
async function checkCounterpartySafe(_query: string): Promise<string | null> {
  // TODO: integrate real counterparty check service
  return null;
}

async function askOpenAI(text: string): Promise<string> {
  const messages = [
    { role: 'system', content: 'Ты — Ева Юрист, виртуальный юридический ассистент.' },
    { role: 'user', content: text },
  ] as const;
  const completion = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.5,
    max_tokens: 700,
  });
  return completion.choices[0]?.message?.content || 'К сожалению, не удалось получить ответ.';
}

function renderInvoice(_data: any): string {
  return 'Шаблон счёта (заглушка)';
}

function renderContractSupply(_data: any): string {
  return 'Шаблон договора поставки (заглушка)';
}

function renderSpec(_data: any): string {
  return 'Шаблон спецификации (заглушка)';
}

// === ВХОДНАЯ ТОЧКА ФУНКЦИИ ===
export const config = { runtime: 'edge' } as const;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return error('Method Not Allowed', 405);
  }
  if (!verifyTelegramSignature(Object.fromEntries(req.headers) as any)) {
    return error('Forbidden', 403);
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return error('Invalid JSON');
  }

  const msg = update.message || update.edited_message || null;
  const cb  = update.callback_query || null;

  if (msg) {
    const chat = msg.chat.id;
    const text = (msg.text || '').trim();

    if (text === '/start') {
      await tgSend(chat, 'Привет! Я Ева Юрист. Выберите действие или задайте вопрос.', {
        reply_markup: mainKB()
      });
      return ok();
    }

    if (text === BTN_CONTRACT_REVIEW) {
      await tgSend(chat,
        'Пришлите текст/фото/PDF договора или вставьте фрагмент. Укажите: чья позиция (наша/их), тип договора и ключевые параметры (срок, цена, право).',
        { reply_markup: { remove_keyboard: false } }
      );
      return ok();
    }

    if (text === BTN_COUNTERPARTY) {
      await tgSend(chat, 'Укажите ИНН (10/12 цифр) или название компании одной строкой — проверю базовые сведения.');
      return ok();
    }

    if (text === BTN_CREATE_DOC) {
      await tgSend(chat, 'Какой документ сформировать?', { reply_markup: inlineDocs() });
      return ok();
    }

    if (text === BTN_AI_CHAT) {
      await tgSend(chat, 'Диалог с ИИ включён. Напишите вопрос в одном сообщении — отвечу по делу.');
      return ok();
    }

    if (text === BTN_FAQ) {
      await tgSend(chat,
        'FAQ:\n' +
        '• Проверка договора — пришлите текст и параметры, верну риски и правки.\n' +
        '• Проверка контрагента — ИНН/название → краткая сводка.\n' +
        '• Создать документ — выберите шаблон, подставлю реквизиты.\n' +
        '• Диалог с ИИ — задавайте вопросы свободно.\n' +
        'Команды: /start — главное меню.'
      );
      return ok();
    }

    if (/^\d{10}(\d{2})?$/.test(text) || text.length > 3) {
      try {
        const summary = await checkCounterpartySafe(text);
        if (summary) await tgSend(chat, summary);
        else await tgSend(chat, 'Не найдено. Проверьте ИНН/написание названия.');
      } catch {
        await tgSend(chat, 'Не удалось выполнить проверку.');
      }
      return ok();
    }

    const answer = await askOpenAI(text);
    await tgSend(chat, answer);
    return ok();
  }

  if (cb) {
    const chat = cb.message.chat.id;
    const data = cb.data as string;

    if (data.startsWith('doc:')) {
      if (data === 'doc:invoice') {
        const out = renderInvoice({});
        await tgSend(chat, out);
      }
      if (data === 'doc:contract') {
        const out = renderContractSupply({});
        await tgSend(chat, out);
      }
      if (data === 'doc:spec') {
        const out = renderSpec({});
        await tgSend(chat, out);
      }
    }

    await fetch(`${TG_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cb.id })
    });

    return ok();
  }

  return ok();
}
