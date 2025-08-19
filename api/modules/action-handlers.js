/**
 * Action handlers for Eva Lawyer Bot
 * Handles all ACT:* callback queries
 */

const { forceReply } = require('./menus');

/**
 * Handle contract-related actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleContractAction(action, chatId, messageId, context) {
  switch (action) {
    case 'UPLOAD':
      return {
        type: 'force_reply',
        text: '📂 Загрузите документ или отправьте текст договора для анализа:',
        reply_markup: forceReply('Вставьте текст договора или загрузите файл...', 'contract')
      };
      
    case 'ANALYZE':
      if (!context.lastDocument) {
        return {
          type: 'message',
          text: '⚠️ Сначала загрузите документ для анализа.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_CONTRACT_REVIEW',
        data: context.lastDocument
      };
      
    case 'RISKTABLE':
      if (!context.lastDocument) {
        return {
          type: 'message',
          text: '⚠️ Сначала загрузите документ для анализа рисков.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_CONTRACT_RISKS',
        mode: 'table',
        data: context.lastDocument
      };
      
    case 'PROTOCOL':
      if (!context.lastDocument) {
        return {
          type: 'message',
          text: '⚠️ Сначала загрузите документ для создания протокола.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_PROTOCOL_DRAFT',
        data: context.lastDocument
      };
      
    default:
      return {
        type: 'message',
        text: '❌ Неизвестное действие с договором.'
      };
  }
}

/**
 * Handle KYC (counterparty) actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleKycAction(action, chatId, messageId, context) {
  switch (action) {
    case 'INPUT_INN':
      return {
        type: 'force_reply',
        text: '📝 Введите ИНН контрагента (10 или 12 цифр):',
        reply_markup: forceReply('Например: 7707083893', 'kyc:SCORING_FULL')
      };
      
    case 'SCORING':
      if (!context.lastInn) {
        return {
          type: 'message',
          text: '⚠️ Сначала введите ИНН контрагента.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_COUNTERPARTY_SCORING',
        mode: 'full',
        inn: context.lastInn
      };
      
    case 'CHECKLIST':
      if (!context.lastInn) {
        return {
          type: 'message',
          text: '⚠️ Сначала введите ИНН контрагента.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_COUNTERPARTY_SCORING',
        mode: 'checklist',
        inn: context.lastInn
      };
      
    case 'RED_FLAGS':
      if (!context.lastInn) {
        return {
          type: 'message',
          text: '⚠️ Сначала введите ИНН контрагента.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_COUNTERPARTY_SCORING',
        mode: 'flags',
        inn: context.lastInn
      };
      
    default:
      return {
        type: 'message',
        text: '❌ Неизвестное действие с контрагентом.'
      };
  }
}

/**
 * Handle letter-related actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleLetterAction(action, chatId, messageId, context) {
  switch (action) {
    case 'UPLOAD':
      return {
        type: 'force_reply',
        text: '📥 Отправьте текст письма, на которое нужно ответить:',
        reply_markup: forceReply('Вставьте текст письма...', 'letter')
      };
      
    case 'SKELETON':
      if (!context.lastLetter) {
        return {
          type: 'message',
          text: '⚠️ Сначала загрузите текст письма.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_REPLY_LETTER',
        mode: 'skeleton',
        data: context.lastLetter
      };
      
    case 'FULL':
      if (!context.lastLetter) {
        return {
          type: 'message',
          text: '⚠️ Сначала загрузите текст письма.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_REPLY_LETTER',
        mode: 'full',
        data: context.lastLetter
      };
      
    case 'LEGAL_OPINION':
      if (!context.lastLetter) {
        return {
          type: 'message',
          text: '⚠️ Сначала загрузите текст письма.'
        };
      }
      return {
        type: 'prompt',
        prompt: 'PROMPT_LEGAL_OPINION',
        data: context.lastLetter
      };
      
    default:
      return {
        type: 'message',
        text: '❌ Неизвестное действие с письмом.'
      };
  }
}

/**
 * Handle template actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleTemplateAction(action, chatId, messageId, context) {
  const templates = {
    'SUPPLY': 'supply',
    'SPEC': 'spec',
    'PROTOCOL': 'protocol',
    'INVOICE': 'invoice'
  };
  
  const templateType = templates[action];
  if (templateType) {
    return {
      type: 'prompt',
      prompt: 'PROMPT_DOC_TEMPLATE',
      templateType: templateType
    };
  }
  
  return {
    type: 'message',
    text: '❌ Неизвестный тип шаблона.'
  };
}

/**
 * Handle utility actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleUtilAction(action, chatId, messageId, context) {
  switch (action) {
    case 'RISKS_TABLE':
      return {
        type: 'prompt',
        prompt: 'PROMPT_CONTRACT_RISKS',
        mode: 'table'
      };
      
    case 'WORDING_TRIPLE':
      return {
        type: 'prompt',
        prompt: 'PROMPT_WORDING_TRIPLE'
      };
      
    case 'DISPUTE_PREP':
      return {
        type: 'prompt',
        prompt: 'PROMPT_DISPUTE_PREP'
      };
      
    case 'LEGAL_OPINION':
      return {
        type: 'prompt',
        prompt: 'PROMPT_LEGAL_OPINION'
      };
      
    default:
      return {
        type: 'message',
        text: '❌ Неизвестная утилита.'
      };
  }
}

/**
 * Handle settings actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleSettingsAction(action, chatId, messageId, context) {
  switch (action) {
    case 'LANG':
      return {
        type: 'message',
        text: '🌐 Язык: Русский (по умолчанию)\n\nВ будущих версиях будет доступен выбор языка.'
      };
      
    case 'FORMAT':
      return {
        type: 'message',
        text: '🧾 Формат вывода: Markdown (по умолчанию)\n\nВ будущих версиях будут доступны другие форматы.'
      };
      
    case 'NOTIF':
      return {
        type: 'message',
        text: '🔔 Уведомления включены.\n\nВ будущих версиях будет доступна настройка уведомлений.'
      };
      
    case 'CLEAR':
      return {
        type: 'clear_context',
        text: '🗑 Контекст разговора очищен. Можете начать новую беседу!'
      };
      
    default:
      return {
        type: 'message',
        text: '❌ Неизвестная настройка.'
      };
  }
}

/**
 * Handle FAQ actions
 * @param {string} action - Action identifier
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleFaqAction(action, chatId, messageId, context) {
  switch (action) {
    case 'COMMON':
      return {
        type: 'message',
        text: `❔ **Частые вопросы**

**Q: Как загрузить документ?**
A: Используйте кнопку "📂 Загрузить" в разделе "Договор" или просто отправьте файл боту.

**Q: Какие форматы поддерживаются?**
A: PDF, DOCX, TXT файлы до 20 МБ, а также изображения для OCR.

**Q: Как проверить контрагента?**
A: Перейдите в раздел "Контрагент" и введите ИНН (10-12 цифр).

**Q: Можно ли сохранить результат?**
A: Да, все ответы можно скопировать. В будущем добавим экспорт в файлы.`
      };
      
    case 'HOW':
      return {
        type: 'message',
        text: `⚙️ **Как работает Eva Lawyer Bot**

Бот использует искусственный интеллект GPT-4 для анализа юридических документов и предоставления консультаций.

**Основные функции:**
• Анализ договоров и выявление рисков
• Проверка контрагентов через DaData
• Создание ответов на письма
• Генерация шаблонов документов
• Юридические консультации

**Технологии:**
• OpenAI GPT-4 Assistant API
• DaData API для проверки компаний
• OCR для извлечения текста из изображений`
      };
      
    case 'PRIVACY':
      return {
        type: 'message',
        text: `🔐 **Конфиденциальность**

**Безопасность данных:**
• Все сообщения шифруются при передаче
• Документы обрабатываются временно и не сохраняются
• Персональные данные не передаются третьим лицам

**Что мы НЕ сохраняем:**
• Содержимое ваших документов
• Личную информацию
• История переписки (только текущая сессия)

**Рекомендации:**
• Не отправляйте документы с критически важной информацией
• Удаляйте конфиденциальные данные перед отправкой`
      };
      
    case 'SUPPORT':
      return {
        type: 'message',
        text: `🆘 **Поддержка**

**Техническая поддержка:**
• Telegram: @support_eva_bot
• Email: support@eva-lawyer.ru

**Сообщить об ошибке:**
• Опишите проблему подробно
• Приложите скриншот (если возможно)
• Укажите время возникновения ошибки

**Предложения:**
• Новые функции
• Улучшения интерфейса
• Дополнительные шаблоны

Мы отвечаем в течение 24 часов в рабочие дни.`
      };
      
    default:
      return {
        type: 'message',
        text: '❌ Неизвестный раздел FAQ.'
      };
  }
}

/**
 * Main action handler
 * @param {string} callbackData - Callback data from button
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Action result
 */
async function handleAction(callbackData, chatId, messageId, context = {}) {
  const parts = callbackData.split(':');
  if (parts.length < 3 || parts[0] !== 'ACT') {
    return {
      type: 'message',
      text: '❌ Неверный формат действия.'
    };
  }
  
  const category = parts[1];
  const action = parts[2];
  
  switch (category) {
    case 'CONTRACT':
      return await handleContractAction(action, chatId, messageId, context);
    case 'KYC':
      return await handleKycAction(action, chatId, messageId, context);
    case 'LETTER':
      return await handleLetterAction(action, chatId, messageId, context);
    case 'TPL':
      return await handleTemplateAction(action, chatId, messageId, context);
    case 'UTIL':
      return await handleUtilAction(action, chatId, messageId, context);
    case 'SET':
      return await handleSettingsAction(action, chatId, messageId, context);
    case 'FAQ':
      return await handleFaqAction(action, chatId, messageId, context);
    case 'CASES':
    case 'APPEAL':
      return {
        type: 'message',
        text: '🚧 Эта функция находится в разработке и будет доступна в следующих версиях.'
      };
    default:
      return {
        type: 'message',
        text: '❌ Неизвестная категория действия.'
      };
  }
}

// Export functions
module.exports = {
  handleAction
};

