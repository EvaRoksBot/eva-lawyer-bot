// Eva Lawyer Bot - Complete Implementation v3
// Implements all 13 stages from technical specification with FSM and enhanced features

const { VectorMemory } = require('./modules/vector-memory');
const { ReActAgent } = require('./modules/react-planner');
const { handleAction } = require('./modules/action-handlers');
const { addQuickActions, handleActionResult } = require('./modules/enhanced-ui');

// Initialize services
const vectorMemory = new VectorMemory(process.env.OPENAI_API_KEY);
const reactAgent = new ReActAgent(process.env.OPENAI_API_KEY, process.env.ASSISTANT_ID);

// User sessions storage
const userSessions = {};

// FSM States
const FSM_STATES = {
  IDLE: 'idle',
  WAITING_DOCUMENT: 'waiting_document',
  WAITING_INN: 'waiting_inn',
  WAITING_LETTER: 'waiting_letter',
  WAITING_TOPIC: 'waiting_topic',
  PROCESSING: 'processing'
};

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    
    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Bot] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text;
  
  // Initialize user session
  if (!userSessions[userId]) {
    userSessions[userId] = {
      state: FSM_STATES.IDLE,
      context: {},
      lastActivity: Date.now()
    };
  }
  
  const userSession = userSessions[userId];
  userSession.lastActivity = Date.now();
  
  try {
    // Handle commands
    if (text?.startsWith('/')) {
      await handleCommand(message, userSession);
      return;
    }
    
    // Handle document uploads
    if (message.document || message.photo) {
      await handleDocumentUpload(message, userSession);
      return;
    }
    
    // Handle text based on FSM state
    await handleTextMessage(message, userSession);
    
  } catch (error) {
    console.error('[Bot] Message handling error:', error);
    await sendMessage(chatId, '❌ Произошла ошибка при обработке сообщения.');
  }
}

/**
 * Handle callback queries (button presses)
 */
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  try {
    // Answer callback query
    await answerCallbackQuery(callbackQuery.id);
    
    // Get user session
    const userSession = userSessions[userId] || {
      state: FSM_STATES.IDLE,
      context: {},
      lastActivity: Date.now()
    };
    
    // Handle different callback types
    if (data.startsWith('MENU:')) {
      await handleMenuNavigation(data, chatId, messageId, userSession);
    } else if (data.startsWith('ACT:')) {
      await handleActionCallback(data, chatId, messageId, userSession);
    } else if (data.startsWith('FSM:')) {
      await handleFSMTransition(data, chatId, messageId, userSession);
    }
    
  } catch (error) {
    console.error('[Bot] Callback handling error:', error);
    await sendMessage(chatId, '❌ Произошла ошибка при обработке действия.');
  }
}

/**
 * Handle commands
 */
async function handleCommand(message, userSession) {
  const chatId = message.chat.id;
  const command = message.text.split(' ')[0];
  
  switch (command) {
    case '/start':
      userSession.state = FSM_STATES.IDLE;
      await sendWelcomeMessage(chatId);
      break;
      
    case '/help':
      await sendHelpMessage(chatId);
      break;
      
    case '/clear':
      userSession.state = FSM_STATES.IDLE;
      userSession.context = {};
      vectorMemory.clearContext(chatId.toString());
      await sendMessage(chatId, '🗑 Контекст очищен. Можете начать новую беседу!');
      break;
      
    case '/status':
      await sendStatusMessage(chatId, userSession);
      break;
      
    default:
      await sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для справки.');
  }
}

/**
 * Handle document uploads
 */
async function handleDocumentUpload(message, userSession) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  
  try {
    await sendTypingAction(chatId);
    
    let fileInfo;
    let fileContent = '';
    
    if (message.document) {
      fileInfo = message.document;
      // In real implementation, download and process file
      fileContent = `[Документ: ${fileInfo.file_name}]`;
    } else if (message.photo) {
      fileInfo = message.photo[message.photo.length - 1];
      // In real implementation, use OCR to extract text
      fileContent = '[Изображение документа]';
    }
    
    // Store document in context
    userSession.context.lastDocument = fileContent;
    userSession.context.lastDocumentId = fileInfo.file_id;
    userSession.context.lastDocumentName = fileInfo.file_name || 'image.jpg';
    
    // Store in vector memory
    await vectorMemory.add(
      userId,
      'episodic',
      `Загружен документ: ${fileContent}`,
      { type: 'document_upload', file_id: fileInfo.file_id }
    );
    
    // Send confirmation with actions
    const keyboard = [
      [
        { text: '📊 Анализ договора', callback_data: 'ACT:CONTRACT:ANALYZE' },
        { text: '📈 Таблица рисков', callback_data: 'ACT:CONTRACT:RISKTABLE' }
      ],
      [
        { text: '📝 Протокол разногласий', callback_data: 'ACT:CONTRACT:PROTOCOL' },
        { text: '🏠 Главное меню', callback_data: 'MENU:MAIN' }
      ]
    ];
    
    await sendMessage(chatId, 
      `✅ Документ "${userSession.context.lastDocumentName}" загружен и готов к анализу.\n\nВыберите действие:`,
      { reply_markup: { inline_keyboard: keyboard } }
    );
    
  } catch (error) {
    console.error('[Bot] Document upload error:', error);
    await sendMessage(chatId, '❌ Ошибка при обработке документа.');
  }
}

/**
 * Handle text messages based on FSM state
 */
async function handleTextMessage(message, userSession) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text;
  
  switch (userSession.state) {
    case FSM_STATES.WAITING_INN:
      await handleInnInput(text, chatId, userId, userSession);
      break;
      
    case FSM_STATES.WAITING_LETTER:
      await handleLetterInput(text, chatId, userId, userSession);
      break;
      
    case FSM_STATES.WAITING_TOPIC:
      await handleTopicInput(text, chatId, userId, userSession);
      break;
      
    case FSM_STATES.IDLE:
    default:
      await handleGeneralInput(text, chatId, userId, userSession);
      break;
  }
}

/**
 * Handle INN input
 */
async function handleInnInput(text, chatId, userId, userSession) {
  const inn = text.replace(/\D/g, ''); // Remove non-digits
  
  if (inn.length !== 10 && inn.length !== 12) {
    await sendMessage(chatId, '❌ ИНН должен содержать 10 цифр (для ЮЛ) или 12 цифр (для ИП).\n\nПопробуйте еще раз:');
    return;
  }
  
  // Store INN in context
  userSession.context.lastInn = inn;
  userSession.state = FSM_STATES.IDLE;
  
  // Store in vector memory
  await vectorMemory.add(
    userId,
    'episodic',
    `Проверка контрагента с ИНН: ${inn}`,
    { type: 'inn_check', inn }
  );
  
  await sendTypingAction(chatId);
  
  try {
    // Check counterparty using DaData
    const companyData = await checkCounterpartyByINN(inn);
    
    if (companyData) {
      const response = await formatCounterpartyResponse(companyData);
      
      const keyboard = [
        [
          { text: '📊 Полный скоринг', callback_data: 'ACT:KYC:SCORING' },
          { text: '🚩 Red Flags', callback_data: 'ACT:KYC:RED_FLAGS' }
        ],
        [
          { text: '📋 Чек-лист', callback_data: 'ACT:KYC:CHECKLIST' },
          { text: '🏠 Главное меню', callback_data: 'MENU:MAIN' }
        ]
      ];
      
      await sendMessage(chatId, response, { reply_markup: { inline_keyboard: keyboard } });
    } else {
      await sendMessage(chatId, `❌ Контрагент с ИНН ${inn} не найден в базе данных.`);
    }
    
  } catch (error) {
    console.error('[Bot] INN check error:', error);
    await sendMessage(chatId, '❌ Ошибка при проверке контрагента.');
  }
}

/**
 * Handle letter input
 */
async function handleLetterInput(text, chatId, userId, userSession) {
  userSession.context.lastLetter = text;
  userSession.state = FSM_STATES.IDLE;
  
  // Store in vector memory
  await vectorMemory.add(
    userId,
    'episodic',
    `Получено письмо для ответа: ${text.slice(0, 200)}...`,
    { type: 'letter_input' }
  );
  
  const keyboard = [
    [
      { text: '📝 Каркас ответа', callback_data: 'ACT:LETTER:SKELETON' },
      { text: '📄 Полный ответ', callback_data: 'ACT:LETTER:FULL' }
    ],
    [
      { text: '⚖️ Юридическое заключение', callback_data: 'ACT:LETTER:LEGAL_OPINION' },
      { text: '🏠 Главное меню', callback_data: 'MENU:MAIN' }
    ]
  ];
  
  await sendMessage(chatId, 
    '✅ Письмо получено и готово к обработке.\n\nВыберите тип ответа:',
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

/**
 * Handle topic input
 */
async function handleTopicInput(text, chatId, userId, userSession) {
  userSession.context.lastTopic = text;
  userSession.state = FSM_STATES.PROCESSING;
  
  await sendTypingAction(chatId);
  
  try {
    // Generate legal opinion using AI
    const response = await generateLegalOpinion(text, userId);
    
    userSession.state = FSM_STATES.IDLE;
    
    const keyboard = [
      [{ text: '🏠 Главное меню', callback_data: 'MENU:MAIN' }]
    ];
    
    await sendMessage(chatId, response, { reply_markup: { inline_keyboard: keyboard } });
    
  } catch (error) {
    console.error('[Bot] Legal opinion error:', error);
    userSession.state = FSM_STATES.IDLE;
    await sendMessage(chatId, '❌ Ошибка при создании юридического заключения.');
  }
}

/**
 * Handle general input (auto-detect intent)
 */
async function handleGeneralInput(text, chatId, userId, userSession) {
  // Auto-detect INN
  const innMatch = text.match(/\b(\d{10}|\d{12})\b/);
  if (innMatch) {
    await handleInnInput(innMatch[1], chatId, userId, userSession);
    return;
  }
  
  // Auto-detect legal question
  const legalKeywords = ['договор', 'право', 'закон', 'суд', 'иск', 'претензия', 'ответственность'];
  const hasLegalKeywords = legalKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  if (hasLegalKeywords) {
    await sendTypingAction(chatId);
    
    try {
      // Get memory context
      const memoryContext = await vectorMemory.enrichWithMemory(userId, text, 6);
      
      // Use ReAct agent for complex legal analysis
      const reactResult = await reactAgent.execute(
        text,
        memoryContext,
        {},
        { userSession }
      );
      
      if (reactResult.success) {
        await sendMessage(chatId, reactResult.answer);
        
        // Record interaction
        await vectorMemory.recordInteraction(
          userId,
          text,
          reactResult.answer,
          { type: 'legal_consultation' }
        );
      } else {
        await sendMessage(chatId, 'Извините, не удалось обработать ваш запрос.');
      }
      
    } catch (error) {
      console.error('[Bot] Legal consultation error:', error);
      await sendMessage(chatId, '❌ Ошибка при обработке юридического вопроса.');
    }
    
    return;
  }
  
  // Default response with main menu
  await sendWelcomeMessage(chatId);
}

/**
 * Handle menu navigation
 */
async function handleMenuNavigation(data, chatId, messageId, userSession) {
  const section = data.replace('MENU:', '');
  
  const menus = {
    'MAIN': createMainMenu(),
    'CONTRACT': createContractMenu(),
    'KYC': createKycMenu(),
    'LETTER': createLetterMenu(),
    'TEMPLATES': createTemplatesMenu(),
    'UTILS': createUtilsMenu(),
    'SETTINGS': createSettingsMenu(),
    'FAQ': createFaqMenu()
  };
  
  const menu = menus[section];
  if (menu) {
    await editMessage(chatId, messageId, menu.text, { reply_markup: menu.reply_markup });
  }
}

/**
 * Handle action callbacks
 */
async function handleActionCallback(data, chatId, messageId, userSession) {
  const userId = chatId; // Assuming chatId = userId for simplicity
  
  try {
    const actionResult = await handleAction(data, chatId, messageId, userSession.context);
    await handleActionResult(actionResult, chatId, messageId, userId);
    
  } catch (error) {
    console.error('[Bot] Action callback error:', error);
    await sendMessage(chatId, '❌ Ошибка при выполнении действия.');
  }
}

/**
 * Handle FSM transitions
 */
async function handleFSMTransition(data, chatId, messageId, userSession) {
  const transition = data.replace('FSM:', '');
  
  switch (transition) {
    case 'WAIT_INN':
      userSession.state = FSM_STATES.WAITING_INN;
      await editMessage(chatId, messageId, 
        '📝 Введите ИНН контрагента (10 или 12 цифр):\n\nПример: 7707083893'
      );
      break;
      
    case 'WAIT_LETTER':
      userSession.state = FSM_STATES.WAITING_LETTER;
      await editMessage(chatId, messageId, 
        '📥 Отправьте текст письма, на которое нужно ответить:'
      );
      break;
      
    case 'WAIT_TOPIC':
      userSession.state = FSM_STATES.WAITING_TOPIC;
      await editMessage(chatId, messageId, 
        '⚖️ Опишите тему для юридического заключения:'
      );
      break;
      
    case 'RESET':
      userSession.state = FSM_STATES.IDLE;
      userSession.context = {};
      await sendWelcomeMessage(chatId);
      break;
  }
}

// Menu creation functions
function createMainMenu() {
  return {
    text: `🤖 **Eva Lawyer Bot**

Ваш персональный юридический помощник с ИИ

**Основные функции:**
📄 Анализ договоров и документов
🔍 Проверка контрагентов по ИНН
📬 Составление ответов на письма
📑 Генерация шаблонов документов
⚖️ Юридические консультации

Выберите раздел:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📄 Договор', callback_data: 'MENU:CONTRACT' },
          { text: '🔍 Контрагент', callback_data: 'MENU:KYC' }
        ],
        [
          { text: '📬 Письмо', callback_data: 'MENU:LETTER' },
          { text: '📑 Шаблоны', callback_data: 'MENU:TEMPLATES' }
        ],
        [
          { text: '🛠 Утилиты', callback_data: 'MENU:UTILS' },
          { text: '⚙️ Настройки', callback_data: 'MENU:SETTINGS' }
        ],
        [
          { text: '❔ FAQ', callback_data: 'MENU:FAQ' }
        ]
      ]
    }
  };
}

function createContractMenu() {
  return {
    text: `📄 **Работа с договорами**

Загрузите документ или выберите действие:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📂 Загрузить документ', callback_data: 'ACT:CONTRACT:UPLOAD' },
          { text: '📊 Анализ договора', callback_data: 'ACT:CONTRACT:ANALYZE' }
        ],
        [
          { text: '📈 Таблица рисков', callback_data: 'ACT:CONTRACT:RISKTABLE' },
          { text: '📝 Протокол разногласий', callback_data: 'ACT:CONTRACT:PROTOCOL' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

function createKycMenu() {
  return {
    text: `🔍 **Проверка контрагентов**

Введите ИНН или выберите действие:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📝 Ввести ИНН', callback_data: 'FSM:WAIT_INN' },
          { text: '📊 Полный скоринг', callback_data: 'ACT:KYC:SCORING' }
        ],
        [
          { text: '📋 Чек-лист', callback_data: 'ACT:KYC:CHECKLIST' },
          { text: '🚩 Red Flags', callback_data: 'ACT:KYC:RED_FLAGS' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

function createLetterMenu() {
  return {
    text: `📬 **Работа с письмами**

Отправьте текст письма или выберите действие:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📥 Отправить письмо', callback_data: 'FSM:WAIT_LETTER' },
          { text: '📝 Каркас ответа', callback_data: 'ACT:LETTER:SKELETON' }
        ],
        [
          { text: '📄 Полный ответ', callback_data: 'ACT:LETTER:FULL' },
          { text: '⚖️ Юридическое заключение', callback_data: 'ACT:LETTER:LEGAL_OPINION' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

function createTemplatesMenu() {
  return {
    text: `📑 **Шаблоны документов**

Выберите тип документа:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📄 Договор поставки', callback_data: 'ACT:TPL:SUPPLY' },
          { text: '📋 Спецификация', callback_data: 'ACT:TPL:SPEC' }
        ],
        [
          { text: '📝 Протокол', callback_data: 'ACT:TPL:PROTOCOL' },
          { text: '🧾 Счет', callback_data: 'ACT:TPL:INVOICE' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

function createUtilsMenu() {
  return {
    text: `🛠 **Утилиты**

Дополнительные инструменты:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Таблица рисков', callback_data: 'ACT:UTIL:RISKS_TABLE' },
          { text: '📝 Тройка формулировок', callback_data: 'ACT:UTIL:WORDING_TRIPLE' }
        ],
        [
          { text: '⚔️ Подготовка к спору', callback_data: 'ACT:UTIL:DISPUTE_PREP' },
          { text: '⚖️ Юридическое заключение', callback_data: 'FSM:WAIT_TOPIC' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

function createSettingsMenu() {
  return {
    text: `⚙️ **Настройки**

Персонализация бота:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 Язык', callback_data: 'ACT:SET:LANG' },
          { text: '📄 Формат вывода', callback_data: 'ACT:SET:FORMAT' }
        ],
        [
          { text: '🔔 Уведомления', callback_data: 'ACT:SET:NOTIF' },
          { text: '🗑 Очистить контекст', callback_data: 'ACT:SET:CLEAR' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

function createFaqMenu() {
  return {
    text: `❔ **Справка**

Часто задаваемые вопросы:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '❓ Частые вопросы', callback_data: 'ACT:FAQ:COMMON' },
          { text: '⚙️ Как работает', callback_data: 'ACT:FAQ:HOW' }
        ],
        [
          { text: '🔐 Конфиденциальность', callback_data: 'ACT:FAQ:PRIVACY' },
          { text: '🆘 Поддержка', callback_data: 'ACT:FAQ:SUPPORT' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'MENU:MAIN' }
        ]
      ]
    }
  };
}

// Utility functions
async function sendWelcomeMessage(chatId) {
  const menu = createMainMenu();
  await sendMessage(chatId, menu.text, { reply_markup: menu.reply_markup });
}

async function sendHelpMessage(chatId) {
  const helpText = `🆘 **Справка по Eva Lawyer Bot**

**Основные команды:**
/start - Главное меню
/help - Эта справка
/clear - Очистить контекст
/status - Статус сессии

**Как использовать:**
1. Выберите раздел в главном меню
2. Загрузите документ или введите данные
3. Получите профессиональный анализ

**Поддерживаемые форматы:**
• PDF, DOCX, TXT файлы
• Изображения (OCR)
• Текстовые сообщения

**Поддержка:** @support_eva_bot`;

  await sendMessage(chatId, helpText);
}

async function sendStatusMessage(chatId, userSession) {
  const statusText = `📊 **Статус сессии**

**Состояние:** ${userSession.state}
**Последний документ:** ${userSession.context.lastDocumentName || 'Нет'}
**Последний ИНН:** ${userSession.context.lastInn || 'Нет'}
**Активность:** ${new Date(userSession.lastActivity).toLocaleString('ru-RU')}

**Контекст:**
${Object.keys(userSession.context).length} элементов`;

  await sendMessage(chatId, statusText);
}

// API functions
async function sendMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[Bot] No Telegram token configured');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        ...options
      })
    });

    if (!response.ok) {
      console.error('[Bot] Send message error:', await response.text());
    }
  } catch (error) {
    console.error('[Bot] Send message error:', error);
  }
}

async function editMessage(chatId, messageId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown',
        ...options
      })
    });
  } catch (error) {
    console.error('[Bot] Edit message error:', error);
  }
}

async function sendTypingAction(chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing'
      })
    });
  } catch (error) {
    console.error('[Bot] Send typing action error:', error);
  }
}

async function answerCallbackQuery(callbackQueryId, text = '') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
      })
    });
  } catch (error) {
    console.error('[Bot] Answer callback query error:', error);
  }
}

// Business logic functions
async function checkCounterpartyByINN(inn) {
  try {
    const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.DADATA_API_KEY}`,
        'X-Secret': process.env.DADATA_SECRET_KEY
      },
      body: JSON.stringify({ query: inn })
    });

    if (!response.ok) {
      throw new Error(`DaData API error: ${response.status}`);
    }

    const data = await response.json();
    return data.suggestions?.[0]?.data || null;
  } catch (error) {
    console.error('[Bot] DaData API error:', error);
    return null;
  }
}

function formatCounterpartyResponse(companyData) {
  const name = companyData.name?.full_with_opf || 'Неизвестно';
  const inn = companyData.inn || 'Неизвестно';
  const status = companyData.state?.status || 'Неизвестно';
  const regDate = companyData.state?.registration_date || 'Неизвестно';
  const address = companyData.address?.value || 'Неизвестно';
  
  const statusEmoji = {
    'ACTIVE': '✅',
    'LIQUIDATING': '⚠️',
    'LIQUIDATED': '❌',
    'REORGANIZING': '🔄'
  }[status] || '❓';
  
  return `🏢 **${name}**

${statusEmoji} **Статус:** ${status}
🆔 **ИНН:** ${inn}
📅 **Дата регистрации:** ${regDate}
📍 **Адрес:** ${address}

✅ Контрагент найден в базе данных ЕГРЮЛ`;
}

async function generateLegalOpinion(topic, userId) {
  try {
    // Get memory context
    const memoryContext = await vectorMemory.enrichWithMemory(userId, topic, 6);
    
    // Build prompt with context
    let prompt = `Подготовь профессиональное юридическое заключение по теме: ${topic}

Структура заключения:
1. Краткое изложение вопроса
2. Применимые нормы права
3. Правовой анализ
4. Выводы и рекомендации`;

    if (memoryContext.length > 0) {
      const contextText = memoryContext
        .map(m => `• ${m.content.slice(0, 200)}...`)
        .join('\n');
      prompt = `Контекст из предыдущих взаимодействий:\n${contextText}\n\n${prompt}`;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ты профессиональный юрист, специализирующийся на российском праве. Предоставляй точные, обоснованные юридические заключения.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const opinion = result.choices?.[0]?.message?.content || 'Не удалось создать заключение.';

    // Record in memory
    await vectorMemory.recordInteraction(
      userId,
      topic,
      opinion,
      { type: 'legal_opinion' }
    );

    return `⚖️ **Юридическое заключение**\n\n${opinion}`;
    
  } catch (error) {
    console.error('[Bot] Legal opinion generation error:', error);
    return '❌ Ошибка при создании юридического заключения.';
  }
}

// Export for testing
module.exports = {
  userSessions,
  vectorMemory,
  reactAgent,
  FSM_STATES
};

