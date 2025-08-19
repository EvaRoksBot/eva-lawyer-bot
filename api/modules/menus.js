/**
 * Eva Lawyer Bot - Menu system with inline keyboards
 * Provides structured navigation and action handling
 */

const SEGMENTS = [
  { id: "contract",  title: "Договор" },
  { id: "kyc",       title: "Контрагент" },
  { id: "letter",    title: "Письмо" },
  { id: "templates", title: "Шаблоны" },
  { id: "more",      title: "Ещё" },
];

/**
 * Generate segment buttons (top navigation)
 * @param {string} active - Currently active section
 * @returns {Array} - Array of button objects
 */
function seg(active) {
  return SEGMENTS.map(s => ({
    text: `${(s.id === active || (["cases","appeals","utils","settings","faq"].includes(active) && s.id==="more")) ? "◉" : "○"} ${s.title}`,
    callback_data: `MENU:${s.id}`,
  }));
}

/**
 * Create button rows
 * @param {number} perRow - Buttons per row
 * @param {...Object} btns - Button objects
 * @returns {Array} - Array of button rows
 */
function rows(perRow, ...btns) {
  const out = []; 
  let row = [];
  for (const b of btns) { 
    row.push(b); 
    if (row.length === perRow) { 
      out.push(row); 
      row = []; 
    } 
  }
  if (row.length) out.push(row);
  return out;
}

/**
 * Get section information text
 * @param {string} section - Section identifier
 * @returns {string} - Information text
 */
function info(section) {
  switch (section) {
    case "home": return (
`✨ Ева • Юр-ассистент
Выберите раздел. Каждая кнопка выполняет действие или запрашивает данные.

• Договор — анализ, таблица рисков, протокол
• Контрагент — скоринг по ИНН
• Письмо — каркас/полный ответ/заключение
• Шаблоны — договор, спецификация, протокол, счёт
• Ещё — практика, обращения, утилиты, настройки, FAQ`
    );
    case "contract": return (
`📄 Договор
1) Загрузите .docx/.pdf или фрагмент
2) Запустите анализ
3) Получите таблицу «пункт — риск — редакция»
4) Сформируйте протокол разногласий`
    );
    case "kyc": return (
`🔍 Проверка контрагента
Нужно: ИНН (10/12). Результат: решение по отсрочке + карточка + источники + флаги + рекомендации.`
    );
    case "letter": return (
`📬 Ответ на письмо
Каркас или полный деловой ответ с нормами; опционально — юр. заключение.`
    );
    case "templates": return (
`📑 Шаблоны документов
Поставка • Спецификация • Протокол • Счёт. Заполняем — формируем черновик.`
    );
    case "more": return `➕ Дополнительно: практика, обращения, утилиты, настройки, FAQ`;
    case "cases": return `⚖️ Судебная практика — выберите инструмент:`;
    case "appeals": return `🏛 Обращения — сформируем официальное письмо`;
    case "utils": return `🧰 Юр-утилиты — быстрые инструменты`;
    case "settings": return `⚙️ Настройки ассистента`;
    case "faq": return `❓ Частые вопросы и справка`;
  }
}

/**
 * Generate keyboard for section
 * @param {string} section - Section identifier
 * @returns {Object} - Inline keyboard object
 */
function keyboard(section) {
  const top = [seg(section)];
  switch (section) {
    case "home":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"➡️ Договор", callback_data:"MENU:contract"},
          {text:"➡️ Контрагент", callback_data:"MENU:kyc"},
          {text:"➡️ Письмо", callback_data:"MENU:letter"},
          {text:"➡️ Шаблоны", callback_data:"MENU:templates"},
          {text:"➡️ Ещё", callback_data:"MENU:more"},
        )
      ]};
    case "contract":
      return { inline_keyboard: [
        ...top,
        rows(3,
          {text:"📂 Загрузить", callback_data:"ACT:CONTRACT:UPLOAD"},
          {text:"📤 Анализ",    callback_data:"ACT:CONTRACT:ANALYZE"},
          {text:"📑 Риски",     callback_data:"ACT:CONTRACT:RISKTABLE"},
          {text:"📜 Протокол",  callback_data:"ACT:CONTRACT:PROTOCOL"},
          {text:"🏠 Домой",     callback_data:"MENU:home"},
        ),
      ]};
    case "kyc":
      return { inline_keyboard: [
        ...top,
        rows(3,
          {text:"📝 Ввести ИНН", callback_data:"ACT:KYC:INPUT_INN"},
          {text:"📈 Скоринг",    callback_data:"ACT:KYC:SCORING"},
          {text:"📊 Чек-лист",   callback_data:"ACT:KYC:CHECKLIST"},
          {text:"⚠️ Флаги",      callback_data:"ACT:KYC:RED_FLAGS"},
          {text:"🏠 Домой",      callback_data:"MENU:home"},
        ),
      ]};
    case "letter":
      return { inline_keyboard: [
        ...top,
        rows(3,
          {text:"📥 Загрузить текст", callback_data:"ACT:LETTER:UPLOAD"},
          {text:"🧱 Каркас",          callback_data:"ACT:LETTER:SKELETON"},
          {text:"📬 Полный ответ",    callback_data:"ACT:LETTER:FULL"},
          {text:"⚖️ Заключение",      callback_data:"ACT:LETTER:LEGAL_OPINION"},
          {text:"🏠 Домой",           callback_data:"MENU:home"},
        ),
      ]};
    case "templates":
      return { inline_keyboard: [
        ...top,
        rows(3,
          {text:"📄 Поставка",     callback_data:"ACT:TPL:SUPPLY"},
          {text:"📑 Спецификация", callback_data:"ACT:TPL:SPEC"},
          {text:"📜 Протокол",     callback_data:"ACT:TPL:PROTOCOL"},
          {text:"💳 Счёт",         callback_data:"ACT:TPL:INVOICE"},
          {text:"🏠 Домой",        callback_data:"MENU:home"},
        ),
      ]};
    case "more":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"⚖️ Практика",   callback_data:"MENU:cases"},
          {text:"🏛 Обращения",  callback_data:"MENU:appeals"},
          {text:"🧰 Юр-утилиты", callback_data:"MENU:utils"},
          {text:"⚙️ Настройки",  callback_data:"MENU:settings"},
          {text:"❓ FAQ",        callback_data:"MENU:faq"},
        ),
      ]};
    case "cases":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"🔍 Поиск",        callback_data:"ACT:CASES:SEARCH"},
          {text:"🧩 Противоречия", callback_data:"ACT:CASES:CONFLICTS"},
          {text:"🕘 Последние",    callback_data:"ACT:CASES:RECENT"},
          {text:"📤 Экспорт",      callback_data:"ACT:CASES:EXPORT"},
          {text:"⬅️ Назад",        callback_data:"MENU:more"},
        ),
      ]};
    case "appeals":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"✉️ Новое",         callback_data:"ACT:APPEAL:NEW"},
          {text:"📄 Черновик",      callback_data:"ACT:APPEAL:DRAFT"},
          {text:"🧾 DOCX",          callback_data:"ACT:APPEAL:EXPORT_DOCX"},
          {text:"📑 PDF",           callback_data:"ACT:APPEAL:EXPORT_PDF"},
          {text:"⬅️ Назад",         callback_data:"MENU:more"},
        ),
      ]};
    case "utils":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"🧪 Таблица рисков",    callback_data:"ACT:UTIL:RISKS_TABLE"},
          {text:"🧷 3 формулировки",    callback_data:"ACT:UTIL:WORDING_TRIPLE"},
          {text:"🧠 Подготовка к спору",callback_data:"ACT:UTIL:DISPUTE_PREP"},
          {text:"📑 Юрзаключение",      callback_data:"ACT:UTIL:LEGAL_OPINION"},
          {text:"⬅️ Назад",             callback_data:"MENU:more"},
        ),
      ]};
    case "settings":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"🌐 Язык",               callback_data:"ACT:SET:LANG"},
          {text:"🧾 Формат",             callback_data:"ACT:SET:FORMAT"},
          {text:"🔔 Уведомления",        callback_data:"ACT:SET:NOTIF"},
          {text:"🗑 Очистить контекст",  callback_data:"ACT:SET:CLEAR"},
          {text:"⬅️ Назад",              callback_data:"MENU:more"},
        ),
      ]};
    case "faq":
      return { inline_keyboard: [
        ...top,
        rows(2,
          {text:"❔ Вопросы",       callback_data:"ACT:FAQ:COMMON"},
          {text:"⚙️ Как работает",  callback_data:"ACT:FAQ:HOW"},
          {text:"🔐 Конф-сть",      callback_data:"ACT:FAQ:PRIVACY"},
          {text:"🆘 Поддержка",     callback_data:"ACT:FAQ:SUPPORT"},
          {text:"⬅️ Назад",         callback_data:"MENU:more"},
        ),
      ]};
  }
}

/**
 * Render complete menu UI
 * @param {string} section - Section identifier
 * @returns {Object} - Complete UI object with text and keyboard
 */
function render(section) {
  return { 
    text: info(section), 
    reply_markup: keyboard(section) 
  };
}

/**
 * Create force reply for input requests
 * @param {string} placeholder - Placeholder text
 * @param {string} id - Input identifier
 * @returns {Object} - Force reply object
 */
function forceReply(placeholder, id) {
  return {
    force_reply: true,
    input_field_placeholder: placeholder,
    selective: true
  };
}

// Export functions
module.exports = {
  render,
  forceReply,
  info,
  keyboard
};

