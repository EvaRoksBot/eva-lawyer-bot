/* Vercel serverless handler */
import OpenAI from "openai";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const DADATA_API_KEY = process.env.DADATA_API_KEY || "";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const BTN_CONTRACT = "Проверка договора";
const BTN_PARTY    = "Проверка контрагента";
const BTN_DOCS     = "Создать документ";
const BTN_CHAT     = "Диалог с ИИ";
const BTN_FAQ      = "FAQ";

function mainKB() {
  return {
    keyboard: [
      [{ text: BTN_CONTRACT }, { text: BTN_PARTY }],
      [{ text: BTN_DOCS }, { text: BTN_CHAT }],
      [{ text: BTN_FAQ }]
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "Выберите действие или задайте вопрос…"
  };
}
function inlineDocs() {
  return {
    inline_keyboard: [[
      { text: "Счёт", callback_data: "doc:invoice" },
      { text: "Договор поставки", callback_data: "doc:contract" },
      { text: "Спецификация", callback_data: "doc:spec" }
    ]]
  };
}
async function tg(method: string, payload: any) {
  await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}
async function send(chat_id: number, text: string, extra: any = {}) {
  await tg("sendMessage", { chat_id, text, ...extra });
}

const PROMPT_CONTRACT_REVIEW = `
Ты — юрист по договорному праву. Проведи анализ текста договора
с позиции клиента: выдели рисковые пункты, объясни риск, предложи правку.
Формат таблицы: | Пункт | Риск | Предложение по правке |`;

const PROMPT_GENERATE_CONTRACT = `
Ты — юрист РФ. Спроси недостающие вводные и предложи структуру,
после подтверждения сформируй черновик договора деловым языком.`;

const PROMPT_CASE_SEARCH = `
Найди и кратко изложи релевантные судебные решения (РФ/регион/период),
с указанием номера дела, суда, даты, сути и ссылки. Без фейковых ссылок.`;

const PROMPT_GOV_LETTER = `
Составь официальное обращение в орган власти: вводная, мотивировка с нормами,
резолютивная часть с чёткими требованиями.`;

async function askOpenAI(system: string, user: string) {
  const r = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });
  return r.choices[0].message?.content?.trim() || "…";
}

async function dadataParty(query: string) {
  if (!DADATA_API_KEY) return "Добавьте DADATA_API_KEY в переменные окружения.";
  const resp = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/" +
    (/^\d{10}(\d{2})?$/.test(query) ? "findById/party" : "suggest/party"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Token ${DADATA_API_KEY}`
    },
    body: JSON.stringify({ query })
  }).then(r => r.json()).catch(() => null);

  const s = resp?.suggestions?.[0]?.data;
  if (!s) return "Не нашли данных. Проверьте ИНН/название.";
  const name = s.name?.short_with_opf || s.name?.full_with_opf || "—";
  const innkpp = `${s.inn || "—"} / ${s.kpp || "—"}`;
  const addr = s.address?.value || "—";
  const state = s.state?.status || "ACTIVE";
  return `🏢 ${name}
ИНН/КПП: ${innkpp}
Адрес: ${addr}
Статус: ${state}`;
}

function renderInvoice(args: {
  invoice_number: string; invoice_date: string;
  supplier_name: string; supplier_inn: string; supplier_kpp: string;
  buyer_name: string; buyer_inn: string; buyer_kpp: string;
  items: { name: string; qty: number; unit?: string; price: number }[];
}) {
  const rows = args.items.map((i, n) => `${n + 1}. ${i.name}  ${i.qty} ${i.unit || ""}  ${i.price}  ${i.qty * i.price}`).join("\n");
  const total = args.items.reduce((s, i) => s + i.qty * i.price, 0);
  return `Счёт № ${args.invoice_number} от ${args.invoice_date}

Поставщик: ${args.supplier_name}, ИНН ${args.supplier_inn}, КПП ${args.supplier_kpp}
Покупатель: ${args.buyer_name}, ИНН ${args.buyer_inn}, КПП ${args.buyer_kpp}

${rows}

Итого: ${total} руб.`;
}
const renderContract = (n: string, city: string, date: string) =>
  `Договор поставки № ${n}\nг. ${city} «${date}»\n\n... (\u0443\u0441\u043b\u043e\u0432\u0438\u044f, \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u044c, \u0440\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u044b \u0441\u0442\u043e\u0440\u043e\u043d) ...`;
const renderSpec = (spec: string, contract: string, cdate: string, items: any[]) =>
  `Спецификация № ${spec}\nк Договору № ${contract} от ${cdate}\n\n№ | Наименование | Ед. | Кол-во | Цена | НДС\n` +
  items.map((i, k) => `${k + 1} | ${i.name} | ${i.unit} | ${i.qty} | ${i.price} | НДС ${i.vat}%`).join("\n");

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  const upd = req.body;

  try {
    if (upd.message) {
      const m = upd.message;
      const chat = m.chat.id;
      const text: string = (m.text || "").trim();

      if (text === "/start") {
        await send(chat, "Привет! Я Ева Юрист. Выберите действие или задайте вопрос.", { reply_markup: mainKB() });
        res.status(200).json({ ok: true });
        return;
      }
      if (text === BTN_CONTRACT) {
        await send(chat, "Пришлите фрагменты договора + чью позицию защищаем ( наша/их), тип договора, ключевые условия.");
        res.status(200).json({ ok: true });
        return;
      }
      if (text === BTN_PARTY) {
        await send(chat, "Укажите ИНН (10/12 цифр) или название компании одной строкой — проверю сводку по DaData.");
        res.status(200).json({ ok: true });
        return;
      }
      if (text === BTN_DOCS) {
        await send(chat, "Какой документ сформировать?", { reply_markup: inlineDocs() });
        res.status(200).json({ ok: true });
        return;
      }
      if (text === BTN_CHAT) {
        await send(chat, "Диалог с ИИ: задайте вопрос юридически — при необходимости обращусь к практике.");
        res.status(200).json({ ok: true });
        return;
      }
      if (text === BTN_FAQ) {
        await send(chat, `FAQ:
• «Проверка договора» — пришлите текст, верну таблицу рисков и правки.
• «Проверка контрагента» — ИНН/название → краткая сводка.
• «Создать документ» — выберите шаблон, подставлю реквизиты.
• «Диалог с ИИ» — свободные вопросы по праву.`);
        res.status(200).json({ ok: true });
        return;
      }

      if (/^\d{10}(\d{2})?$/.test(text) || (text.length > 3 && text.toLowerCase().includes("ооо"))) {
        const summary = await dadataParty(text);
        await send(chat, summary);
        res.status(200).json({ ok: true });
        return;
      }

      const answer = await askOpenAI(
        `${PROMPT_CASE_SEARCH}\n\n${PROMPT_GENERATE_CONTRACT}`,
        text
      );
      await send(chat, answer);
      res.status(200).json({ ok: true });
      return;
    }

    if (upd.callback_query) {
      const cq = upd.callback_query;
      const chat = cq.message.chat.id;
      const data: string = cq.data;

      if (data.startsWith("doc:")) {
        if (data === "doc:invoice") {
          await send(chat, renderInvoice({
            invoice_number: "001", invoice_date: "11.08.2025",
            supplier_name: "ООО Ромашка", supplier_inn: "7700000000", supplier_kpp: "770001001",
            buyer_name: "ООО Василёк", buyer_inn: "7800000000", buyer_kpp: "780001001",
            items: [{ name: "Юр. услуги", qty: 1, unit: "усл.", price: 10000 }]
          }));
        }
        if (data === "doc:contract") {
          await send(chat, renderContract("42", "Москва", "11.08.2025"));
        }
        if (data === "doc:spec") {
          await send(chat, renderSpec("1", "42", "11.08.2025", [
            { name: "Услуга", unit: "усл.", qty: 1, price: 10000, vat: 20 }
          ]));
        }
      }

      await tg("answerCallbackQuery", { callback_query_id: cq.id });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  } catch (e) {
    console.error(e);
    res.status(200).json({ ok: true });
    return;
  }
}
