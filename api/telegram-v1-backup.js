/**
 * Eva Lawyer Bot - Telegram webhook handler
 * Handles incoming messages from Telegram and integrates with OpenAI Assistant
 */

// Import modules
const { EvaAssistant, PromptCategory } = require('./modules/assistant');
const { checkCounterparty } = require('./modules/counterparty');
const { processDocument } = require('./modules/document-processor');
const { analyzeImage } = require('./modules/vision-analyzer');
const { render } = require('./modules/menus');
const { handleAction } = require('./modules/action-handlers');
const { executeTicket, link } = require('./modules/action-bus');
const { VectorMemory } = require('./modules/vector-memory');
const { ReActAgent } = require('./modules/react-planner');
const { addQuickActions, handleActionResult } = require('./modules/enhanced-ui');

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const DADATA_API_KEY = process.env.DADATA_API_KEY;
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY;

// Initialize Eva Assistant
const assistant = new EvaAssistant({
  assistantId: ASSISTANT_ID,
  apiKey: OPENAI_API_KEY
});

// Initialize Vector Memory
const vectorMemory = new VectorMemory(OPENAI_API_KEY);

// Initialize ReAct Agent
const reactAgent = new ReActAgent(OPENAI_API_KEY, ASSISTANT_ID);

// User sessions storage
const userSessions = {};

/**
 * Send message to Telegram
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - Message text
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} - Success status
 */
async function sendMessage(chatId, text, options = {}) {
  try {
    // Default options
    const messageOptions = {
      parse_mode: 'Markdown',
      ...options
    };

    // Prepare request body
    const body = {
      chat_id: chatId,
      text: text,
      ...messageOptions
    };

    // Send request to Telegram API
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Send message error:', error);
    return false;
  }
}

/**
 * Edit message text
 * @param {number} chatId - Telegram chat ID
 * @param {number} messageId - Message ID to edit
 * @param {string} text - New message text
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} - Success status
 */
async function editMessage(chatId, messageId, text, options = {}) {
  try {
    const messageOptions = {
      parse_mode: 'Markdown',
      ...options
    };

    const body = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      ...messageOptions
    };

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Edit message error:', error);
    return false;
  }
}

/**
 * Send typing action to Telegram
 * @param {number} chatId - Telegram chat ID
 * @returns {Promise<boolean>} - Success status
 */
async function sendTypingAction(chatId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing'
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Send typing action error:', error);
    return false;
  }
}

/**
 * Answer callback query
 * @param {string} callbackQueryId - Callback query ID
 * @param {string} text - Answer text (optional)
 * @returns {Promise<boolean>} - Success status
 */
async function answerCallbackQuery(callbackQueryId, text = '') {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Answer callback query error:', error);
    return false;
  }
}

/**
 * Process user message with Eva Assistant
 * @param {string} text - User message text
 * @param {number} userId - User ID
 * @param {number} chatId - Chat ID
 * @returns {Promise<string>} - Assistant response
 */
async function processUserMessage(text, userId, chatId) {
  try {
    // Check for INN pattern (10-12 digits)
    const innMatch = text.match(/^\d{10,12}$/);
    if (innMatch) {
      await sendTypingAction(chatId);
      return await processInnQuery(text);
    }

    // Get user session or create new one
    const userSession = userSessions[userId] || {};
    const threadId = userSession.threadId;
    
    // Send typing indicator
    await sendTypingAction(chatId);
    
    // Process message with assistant
    const response = await assistant.askAssistant(text, threadId, userId.toString());
    
    // Save thread ID for future conversations
    if (response.success && response.threadId) {
      userSessions[userId] = {
        threadId: response.threadId,
        lastActivity: Date.now(),
        ...userSession
      };
    }
    
    return response.success ? response.message : 'Извините, произошла ошибка при обработке вашего запроса.';
  } catch (error) {
    console.error('Process message error:', error);
    return 'Произошла техническая ошибка. Пожалуйста, попробуйте позже.';
  }
}

/**
 * Process INN query with DaData
 * @param {string} inn - INN number
 * @returns {Promise<string>} - Formatted response
 */
async function processInnQuery(inn) {
  try {
    // Check if DaData credentials are available
    if (!DADATA_API_KEY || !DADATA_SECRET_KEY) {
      return 'Извините, функция проверки контрагентов временно недоступна.';
    }
    
    // Call DaData API
    const result = await checkCounterparty(inn, DADATA_API_KEY, DADATA_SECRET_KEY);
    
    if (!result.success) {
      return `Не удалось найти информацию по ИНН ${inn}. Пожалуйста, проверьте правильность ввода.`;
    }
    
    // Format response
    const data = result.data;
    let response = `📊 *Информация о компании по ИНН ${inn}*\n\n`;
    
    if (data.name) {
      response += `*Название:* ${data.name.short || data.name.full || 'Н/Д'}\n`;
    }
    
    if (data.state) {
      const status = data.state.status === 'ACTIVE' ? '✅ Действующая' : '❌ Недействующая';
      response += `*Статус:* ${status}\n`;
    }
    
    if (data.address) {
      response += `*Адрес:* ${data.address.value || 'Н/Д'}\n`;
    }
    
    if (data.management) {
      response += `*Руководитель:* ${data.management.name || 'Н/Д'}\n`;
      response += `*Должность:* ${data.management.post || 'Н/Д'}\n`;
    }
    
    return response;
  } catch (error) {
    console.error('Process INN query error:', error);
    return `Произошла ошибка при проверке ИНН ${inn}.`;
  }
}

/**
 * Handle callback query (button press)
 * @param {Object} callbackQuery - Callback query object
 * @returns {Promise<void>}
 */
async function handleCallbackQuery(callbackQuery) {
  const { id, data, message, from } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const userId = from.id;
  
  try {
    // Answer callback query immediately
    await answerCallbackQuery(id);
    
    // Handle ticket-based actions
    if (data.startsWith('a:')) {
      const token = data.split(':')[1];
      const userSession = userSessions[userId] || {};
      const context = { userSession, userId, chatId };
      
      const result = await executeTicket(token, context);
      
      if (!result.success) {
        await sendMessage(chatId, '⚠️ Ссылка устарела или недействительна. Попробуйте ещё раз.');
        return;
      }
      
      await handleActionResult(result.result, chatId, messageId, userId);
      return;
    }
    
    // Handle menu navigation
    if (data.startsWith('MENU:')) {
      const section = data.split(':')[1];
      const ui = render(section);
      
      // Add contextual quick actions based on user session
      const userSession = userSessions[userId] || {};
      const enhancedUi = await addQuickActions(ui, userSession, userId);
      
      await editMessage(chatId, messageId, enhancedUi.text, { reply_markup: enhancedUi.reply_markup });
      return;
    }
    
    // Handle legacy actions (backward compatibility)
    if (data.startsWith('ACT:')) {
      const userSession = userSessions[userId] || {};
      const actionResult = await handleAction(data, chatId, messageId, userSession);
      await handleActionResult(actionResult, chatId, messageId, userId);
      return;
    }
    
    // Unknown callback data
    await sendMessage(chatId, 'Неизвестная команда.');
  } catch (error) {
    console.error('Callback query error:', error);
    await answerCallbackQuery(id, 'Произошла ошибка');
  }
}

/**
 * Process prompt action
 * @param {Object} actionResult - Action result with prompt info
 * @param {number} userId - User ID
 * @param {number} chatId - Chat ID
 * @returns {Promise<string>} - Prompt response
 */
async function processPromptAction(actionResult, userId, chatId) {
  try {
    // Get user session
    const userSession = userSessions[userId] || {};
    const threadId = userSession.threadId;
    
    // Build prompt based on action
    let promptText = '';
    
    switch (actionResult.prompt) {
      case 'PROMPT_CONTRACT_REVIEW':
        promptText = 'Проанализируй договор и выдели основные пункты, риски и рекомендации.';
        break;
      case 'PROMPT_CONTRACT_RISKS':
        promptText = 'Создай таблицу рисков для договора с указанием пунктов, рисков и рекомендаций по редактированию.';
        break;
      case 'PROMPT_LEGAL_OPINION':
        promptText = 'Подготовь юридическое заключение по данному вопросу с анализом применимых норм права.';
        break;
      default:
        promptText = 'Обработай запрос согласно выбранному действию.';
    }
    
    // Process with assistant
    const response = await assistant.askAssistant(promptText, threadId, userId.toString());
    
    // Save thread ID
    if (response.success && response.threadId) {
      userSessions[userId] = {
        ...userSession,
        threadId: response.threadId,
        lastActivity: Date.now()
      };
    }
    
    return response.success ? response.message : 'Извините, произошла ошибка при обработке запроса.';
  } catch (error) {
    console.error('Process prompt action error:', error);
    return 'Произошла ошибка при обработке запроса.';
  }
}

/**
 * Handle command
 * @param {string} command - Command text
 * @param {number} chatId - Chat ID
 * @returns {Promise<string>} - Command response
 */
async function handleCommand(command, chatId) {
  switch (command) {
    case '/start':
      // Send main menu
      const ui = render('home');
      await sendMessage(chatId, ui.text, { reply_markup: ui.reply_markup });
      return null; // Don't send additional message
      
    case '/menu':
      // Send main menu
      const menuUi = render('home');
      await sendMessage(chatId, menuUi.text, { reply_markup: menuUi.reply_markup });
      return null;

    case '/help':
      return `*Справка по использованию Eva Lawyer Bot*

*Основные команды:*
• /start - Показать главное меню
• /menu - Показать главное меню
• /help - Показать эту справку
• /clear - Очистить историю разговора

*Как пользоваться:*
• Используйте кнопки меню для навигации
• Отправляйте документы для анализа
• Вводите ИНН для проверки контрагентов
• Задавайте юридические вопросы

*Поддерживаемые форматы:*
• PDF, DOCX, TXT (до 20 МБ)
• Изображения (JPG, PNG) для OCR`;

    case '/clear':
      // Clear user session
      const userId = chatId;
      if (userSessions[userId]) {
        delete userSessions[userId];
      }
      return '🧹 История разговора очищена. Можете начать новую беседу!';

    default:
      return null; // Not a recognized command
  }
}

/**
 * Main webhook handler
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Bot-Api-Secret-Token');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET request
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Eva Lawyer Bot API is running with menu system',
      timestamp: new Date().toISOString()
    });
  }

  // Handle POST request (webhook)
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      // Handle callback query (button press)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        return res.status(200).json({ status: 'ok' });
      }
      
      // Check if update contains a message
      if (!update.message) {
        return res.status(200).json({ status: 'ok' });
      }

      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      
      // Handle commands
      if (message.text && message.text.startsWith('/')) {
        const commandResponse = await handleCommand(message.text, chatId);
        
        if (commandResponse) {
          await sendMessage(chatId, commandResponse);
        }
        return res.status(200).json({ status: 'ok' });
      }
      
      // Handle document
      if (message.document) {
        const response = await processDocumentFile(message.document, chatId);
        await sendMessage(chatId, response);
        return res.status(200).json({ status: 'ok' });
      }
      
      // Handle photo
      if (message.photo && message.photo.length > 0) {
        const response = await processPhoto(message.photo, chatId);
        await sendMessage(chatId, response);
        return res.status(200).json({ status: 'ok' });
      }
      
      // Handle text message
      if (message.text) {
        const response = await processUserMessage(message.text, userId, chatId);
        await sendMessage(chatId, response);
        return res.status(200).json({ status: 'ok' });
      }

      // Default response for unsupported message types
      await sendMessage(chatId, 'Извините, я не могу обработать этот тип сообщения. Используйте /menu для навигации.');
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

/**
 * Process document file (moved from main code for better organization)
 */
async function processDocumentFile(file, chatId) {
  try {
    // Send typing indicator
    await sendTypingAction(chatId);
    
    // Get file info
    const fileInfo = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${file.file_id}`);
    const fileInfoJson = await fileInfo.json();
    
    if (!fileInfoJson.ok || !fileInfoJson.result.file_path) {
      return 'Не удалось получить информацию о файле.';
    }
    
    // Get file URL
    const filePath = fileInfoJson.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    // Process document
    const result = await processDocument(fileUrl, file.file_name);
    
    if (!result.success) {
      return `Не удалось обработать документ: ${result.error || 'неизвестная ошибка'}`;
    }
    
    // Send extracted text to assistant for analysis
    await sendMessage(chatId, '📄 *Документ успешно обработан!*\n\nАнализирую содержимое...');
    await sendTypingAction(chatId);
    
    // Get user session or create new one
    const userId = chatId; // Use chatId as userId for simplicity
    const userSession = userSessions[userId] || {};
    const threadId = userSession.threadId;
    
    // Save document to user session
    userSessions[userId] = {
      ...userSession,
      lastDocument: result.text,
      lastActivity: Date.now()
    };
    
    // Create prompt for document analysis
    const analysisPrompt = `Проанализируй следующий документ и предоставь краткое резюме его содержания, основные пункты и потенциальные юридические риски:\n\n${result.text}`;
    
    // Process with assistant
    const response = await assistant.askAssistant(analysisPrompt, threadId, userId.toString());
    
    // Save thread ID for future conversations
    if (response.success && response.threadId) {
      userSessions[userId] = {
        ...userSessions[userId],
        threadId: response.threadId,
        lastActivity: Date.now()
      };
    }
    
    return response.success ? response.message : 'Извините, произошла ошибка при анализе документа.';
  } catch (error) {
    console.error('Process document error:', error);
    return 'Произошла ошибка при обработке документа.';
  }
}

/**
 * Process photo with OCR (moved from main code for better organization)
 */
async function processPhoto(photo, chatId) {
  try {
    // Send typing indicator
    await sendTypingAction(chatId);
    
    // Get the largest photo
    const photoSize = photo[photo.length - 1];
    
    // Get file info
    const fileInfo = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photoSize.file_id}`);
    const fileInfoJson = await fileInfo.json();
    
    if (!fileInfoJson.ok || !fileInfoJson.result.file_path) {
      return 'Не удалось получить информацию о фото.';
    }
    
    // Get file URL
    const filePath = fileInfoJson.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    // Process image with OCR
    await sendMessage(chatId, '🔍 *Обрабатываю изображение...*\n\nИзвлекаю текст с помощью OCR.');
    await sendTypingAction(chatId);
    
    const result = await analyzeImage(fileUrl, OPENAI_API_KEY);
    
    if (!result.success) {
      return `Не удалось обработать изображение: ${result.error || 'неизвестная ошибка'}`;
    }
    
    // Send extracted text to assistant for analysis
    await sendMessage(chatId, '📷 *Изображение успешно обработано!*\n\nАнализирую извлеченный текст...');
    await sendTypingAction(chatId);
    
    // Get user session or create new one
    const userId = chatId; // Use chatId as userId for simplicity
    const userSession = userSessions[userId] || {};
    const threadId = userSession.threadId;
    
    // Create prompt for document analysis
    const analysisPrompt = `Проанализируй следующий текст, извлеченный из изображения, и предоставь краткое резюме его содержания, основные пункты и потенциальные юридические риски:\n\n${result.text}`;
    
    // Process with assistant
    const response = await assistant.askAssistant(analysisPrompt, threadId, userId.toString());
    
    // Save thread ID for future conversations
    if (response.success && response.threadId) {
      userSessions[userId] = {
        threadId: response.threadId,
        lastActivity: Date.now()
      };
    }
    
    return response.success ? response.message : 'Извините, произошла ошибка при анализе текста из изображения.';
  } catch (error) {
    console.error('Process photo error:', error);
    return 'Произошла ошибка при обработке изображения.';
  }
}

