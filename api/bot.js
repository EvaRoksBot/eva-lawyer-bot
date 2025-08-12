const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG = `https://api.telegram.org/bot${TOKEN}`;

function replyKeyboard() {
  return {
    keyboard: [
      [{ text: "📄 Документы" }, { text: "⚖️ Промпты юриста" }],
      [{ text: "🔎 Проверка контрагента" }, { text: "ℹ️ Помощь" }]
    ],
    resize_keyboard: true
  };
}
function inlineDocs() {
  return { inline_keyboard: [[
    { text: "Счёт", callback_data: "doc:invoice" },
    { text: "Договор поставки", callback_data: "doc:contract" },
    { text: "Спецификация", callback_data: "doc:spec" }
  ]]};
}
function inlinePrompts() {
  return { inline_keyboard: [[
    { text: "Проверка договора", callback_data: "pr:contract_check" },
    { text: "Юр. заключение", callback_data: "pr:legal_opinion" },
    { text: "Ответ на претензию", callback_data: "pr:claim_reply" }
  ]]};
}

async function send(chat_id, text, extra={}) {
  await fetch(`${TG}/sendMessage`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ chat_id, text, ...extra })
  });
}

import { renderInvoice, renderContractSupply, renderSpec } from "../src/templates/index.js";
import { legalAssist } from "../src/openai.js";
import { checkCounterparty } from "../src/dadata.js";

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const update = req.body;
  try {
    if (update.message) {
      const m = update.message;
      const chat = m.chat.id;
      const text = (m.text||"").trim();

      if (text === "/start") {
        await send(chat, "Привет! Я Ева — ваш юрист-бот. Выберите действие.", {
          reply_markup: replyKeyboard()
        });
      } else if (text === "📄 Документы") {
        await send(chat, "Какой документ сформировать?", {
          reply_markup: { inline_keyboard: inlineDocs().inline_keyboard }
        });
      } else if (text === "⚖️ Промпты юриста") {
        await send(chat, "Выберите задачу:", {
          reply_markup: { inline_keyboard: inlinePrompts().inline_keyboard }
        });
      } else if (text === "🔎 Проверка контрагента") {
        await send(chat, "Пришлите ИНН (10/12 цифр) или название компании одной строкой.");
      } else if (/^\d{10}(\d{2})?$/.test(text) || text.length > 3) {
        const r = await checkCounterparty(text);
        await send(chat, r || "Не нашли данных. Проверьте ИНН/название.");
      } else if (text === "ℹ️ Помощь") {
        await send(chat, "Команды: /start — главное меню. Для DaData: пришлите ИНН/название.");
      } else {
        const answer = await legalAssist("contract_check", text);
        await send(chat, answer);
      }
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chat = cq.message.chat.id;
      const data = cq.data;

      if (data.startsWith("doc:")) {
        if (data === "doc:invoice") {
          const out = renderInvoice({
            invoice_number:"001", invoice_date:"11.08.2025",
            supplier_name:"ООО Ромашка", supplier_inn:"7700000000", supplier_kpp:"770001001",
            buyer_name:"ООО Василёк", buyer_inn:"7800000000", buyer_kpp:"780001001",
            items:[{name:"Юр. услуги", qty:1, unit:"усл.", price:10000}]
          });
          await send(chat, out);
        }
        if (data === "doc:contract") {
          const out = renderContractSupply({ contract_number:"42", city:"Москва", date:"11.08.2025" });
          await send(chat, out);
        }
        if (data === "doc:spec") {
          const out = renderSpec({
            spec_number:"1", contract_number:"42", contract_date:"11.08.2025",
            items:[{name:"Услуга", unit:"усл.", qty:1, price:10000, vat:20}]
          });
          await send(chat, out);
        }
      }

      if (data.startsWith("pr:")) {
        if (data === "pr:contract_check") {
          await send(chat, "Пришлите фрагменты договора + чью позицию защищаем (заказчик/исполнитель). Я верну таблицу рисков и правки.");
        }
        if (data === "pr:legal_opinion") {
          await send(chat, "Опишите тему и вопросы — подготовлю структурированное заключение.");
        }
        if (data === "pr:claim_reply") {
          await send(chat, "Прикрепите текст претензии и договор — подготовлю деловой ответ.");
        }
      }

      await fetch(`${TG}/answerCallbackQuery`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ callback_query_id: cq.id })
      });
    }

    res.status(200).end("ok");
  } catch (e) {
    console.error(e);
    res.status(200).end("ok");
  }
};
