const OpenAI = require('openai');
const menus = require('./modules/menus');

// Initialize OpenAI with robust error handling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000, // 45 seconds timeout
  maxRetries: 5,  // More retries for stability
});

// Telegram Bot Token with validation
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Validate token format
function validateBotToken(token) {
  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set');
    return false;
  }
  
  // Basic token format validation (should be like: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
  const tokenPattern = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;
  if (!tokenPattern.test(token)) {
    console.error('❌ Invalid TELEGRAM_BOT_TOKEN format');
    return false;
  }
  
  return true;
}

// Legal prompts for specialized responses
const LEGAL_PROMPTS = {
  'contract_analysis': {
    name: 'Анализ договоров',
    systemPrompt: `Вы - опытный юрист-эксперт по договорному праву в России. 

Ваша задача:
- Анализировать договоры и выявлять риски
- Предлагать улучшения формулировок
- Объяснять правовые последствия условий
- Ссылаться на актуальное российское законодательство

Стиль ответа:
- Структурированный анализ по пунктам
- Конкретные рекомендации
- Указание на проблемные моменты
- Профессиональный, но понятный язык

Всегда начинайте ответ с: "📄 <b>Анализ договора</b>"`
  },
  
  'corporate_law': {
    name: 'Корпоративное право',
    systemPrompt: `Вы - специалист по корпоративному праву и регистрации бизнеса в России.

Ваша экспертиза:
- Регистрация ООО, ИП, АО
- Корпоративные процедуры
- Реорганизация и ликвидация
- Корпоративные споры
- Налогообложение бизнеса

Отвечайте:
- С указанием конкретных сроков и стоимости
- Со ссылками на нормативные акты
- С пошаговыми инструкциями
- С предупреждениями о рисках

Всегда начинайте ответ с: "🏢 <b>Корпоративное право</b>"`
  },
  
  'labor_law': {
    name: 'Трудовое право',
    systemPrompt: `Вы - эксперт по трудовому праву России.

Ваши компетенции:
- Трудовые договоры и увольнения
- Заработная плата и компенсации
- Трудовые споры и конфликты
- Права работников и работодателей
- Охрана труда

Давайте ответы:
- Со ссылками на ТК РФ
- С практическими советами
- С указанием сроков обращения
- С образцами документов

Всегда начинайте ответ с: "💼 <b>Трудовое право</b>"`
  },
  
  'real_estate': {
    name: 'Недвижимость',
    systemPrompt: `Вы - юрист по недвижимости в России.

Ваша специализация:
- Купля-продажа недвижимости
- Ипотека и кредитование
- Аренда и найм
- Приватизация
- Земельное право

Консультируйте:
- С учетом региональных особенностей
- С проверкой документов
- С расчетом налогов и сборов
- С предупреждением о рисках

Всегда начинайте ответ с: "🏠 <b>Недвижимость</b>"`
  },
  
  'family_law': {
    name: 'Семейное право',
    systemPrompt: `Вы - специалист по семейному праву России.

Ваши области:
- Развод и раздел имущества
- Алименты и содержание
- Опека и попечительство
- Усыновление
- Брачные договоры

Консультируйте:
- Деликатно и профессионально
- С учетом интересов детей
- Со ссылками на СК РФ
- С практическими рекомендациями

Всегда начинайте ответ с: "👨‍👩‍👧‍👦 <b>Семейное право</b>"`
  },
  
  'general': {
    name: 'Общие вопросы',
    systemPrompt: `Вы - Eva, AI-помощник юриста, специализирующийся на российском праве.

Ваши принципы:
- Давать точные ответы по российскому законодательству
- Объяснять сложные вопросы простым языком
- Предупреждать о рисках и последствиях
- Рекомендовать обращение к специалистам при необходимости

Стиль общения:
- Профессиональный, но дружелюбный
- Структурированные ответы
- Конкретные рекомендации
- Ссылки на нормативные акты

Всегда начинайте ответ с: "⚖️ <b>Eva Lawyer Bot</b>"`
  }
};

// Enhanced error handling for API calls with exponential backoff
async function makeAPICall(apiFunction, maxRetries = 5, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      console.error(`❌ API call attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Send message to Telegram with comprehensive error handling
async function sendMessage(chatId, text, keyboard = null) {
  if (!validateBotToken(TELEGRAM_BOT_TOKEN)) {
    throw new Error('Invalid or missing Telegram Bot Token');
  }

  return makeAPICall(async () => {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: keyboard
      }),
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      // Handle specific Telegram API errors
      if (result.error_code === 401) {
        throw new Error(`Telegram API Unauthorized - Invalid bot token`);
      } else if (result.error_code === 429) {
        throw new Error(`Telegram API Rate Limited - ${result.description}`);
      } else if (result.error_code === 400) {
        throw new Error(`Telegram API Bad Request - ${result.description}`);
      }
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    return result;
  }, 3, 2000); // 3 retries with 2 second base delay
}

// Edit message with comprehensive error handling
async function editMessage(chatId, messageId, text, keyboard = null) {
  if (!validateBotToken(TELEGRAM_BOT_TOKEN)) {
    throw new Error('Invalid or missing Telegram Bot Token');
  }

  return makeAPICall(async () => {
    const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: keyboard
      }),
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      // Handle message not modified error (common and not critical)
      if (result.error_code === 400 && result.description.includes('message is not modified')) {
        console.log('⚠️ Message content is the same, skipping edit');
        return result;
      }
      
      if (result.error_code === 401) {
        throw new Error(`Telegram API Unauthorized - Invalid bot token`);
      }
      throw new Error(`Telegram edit error: ${result.description}`);
    }
    
    return result;
  }, 3, 1500);
}

// Answer callback query with error handling
async function answerCallbackQuery(callbackQueryId, text = '') {
  if (!validateBotToken(TELEGRAM_BOT_TOKEN)) {
    console.error('❌ Cannot answer callback query - invalid token');
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
      }),
    });
    
    const result = await response.json();
    if (!result.ok) {
      console.error('❌ Answer callback error:', result.description);
    }
    return result;
  } catch (error) {
    console.error('❌ Answer callback error:', error);
    return null;
  }
}

// Check if text is INN (Russian tax number)
function isINN(text) {
  const innPattern = /^\d{10}$|^\d{12}$/;
  return innPattern.test(text.trim());
}

// Get AI response with enhanced error handling and multiple fallback layers
async function getAIResponse(message, promptType = 'general') {
  try {
    const prompt = LEGAL_PROMPTS[promptType] || LEGAL_PROMPTS['general'];
    
    console.log(`🤖 Getting AI response for prompt type: ${promptType}`);
    
    const response = await makeAPICall(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: prompt.systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      });
    }, 5, 2000); // 5 retries with 2 second base delay

    return response.choices[0].message.content;
    
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    
    // Enhanced fallback responses based on prompt type
    const fallbackResponses = {
      'contract_analysis': `📄 <b>Анализ договора</b>

К сожалению, сервис анализа договоров временно недоступен.

<b>Что можно сделать:</b>
• Обратиться к юристу для детального анализа
• Проверить основные пункты самостоятельно
• Использовать типовые формы договоров

<b>Основные моменты для проверки:</b>
• Предмет договора и его цена
• Сроки исполнения обязательств
• Ответственность сторон
• Порядок разрешения споров

<i>💡 Рекомендую получить профессиональную консультацию юриста.</i>`,

      'corporate_law': `🏢 <b>Корпоративное право</b>

Сервис корпоративных консультаций временно недоступен.

<b>Для регистрации бизнеса обратитесь:</b>
• В МФЦ или налоговую инспекцию
• К специализированным юридическим фирмам
• На портал госуслуг

<b>Полезные ресурсы:</b>
• nalog.gov.ru - официальный сайт ФНС
• gosuslugi.ru - государственные услуги
• consultant.ru - правовая база

<i>💡 При сложных вопросах рекомендую консультацию специалиста.</i>`,

      'labor_law': `💼 <b>Трудовое право</b>

Консультации по трудовому праву временно недоступны.

<b>При трудовых спорах обращайтесь:</b>
• В трудовую инспекцию
• В комиссию по трудовым спорам
• К юристу по трудовому праву

<b>Полезные контакты:</b>
• Роструд: rostrud.gov.ru
• Горячая линия: 8-800-707-88-41
• Прокуратура (при нарушениях)

<i>💡 Не затягивайте с обращением - есть сроки давности.</i>`,

      'real_estate': `🏠 <b>Недвижимость</b>

Консультации по недвижимости временно недоступны.

<b>Для сделок с недвижимостью:</b>
• Обратитесь к риелтору или юристу
• Проверьте документы в Росреестре
• Получите справки об отсутствии обременений

<b>Полезные ресурсы:</b>
• rosreestr.gov.ru - Росреестр
• egrn.rosreestr.gov.ru - выписки ЕГРН
• Нотариальные палаты регионов

<i>💡 При покупке недвижимости обязательна юридическая проверка.</i>`,

      'family_law': `👨‍👩‍👧‍👦 <b>Семейное право</b>

Консультации по семейному праву временно недоступны.

<b>При семейных спорах обращайтесь:</b>
• К семейному юристу
• В органы опеки (вопросы детей)
• В ЗАГС (регистрация актов)

<b>Важные контакты:</b>
• Мировые судьи (развод, алименты)
• Органы опеки и попечительства
• Центры семейного права

<i>💡 В вопросах, касающихся детей, действуйте в их интересах.</i>`,

      'general': `⚖️ <b>Eva Lawyer Bot</b>

Извините, произошла временная ошибка в системе ИИ-консультаций.

<b>Что можно сделать:</b>
• Попробовать переформулировать вопрос
• Обратиться позже
• Получить консультацию у юриста

<b>Экстренные контакты:</b>
• Юридическая помощь: 8-800-700-18-00
• Консультант Плюс: consultant.ru
• Гарант: garant.ru

<b>При срочных правовых вопросах:</b>
• Обратитесь к практикующему юристу
• Используйте государственные услуги
• Изучите актуальное законодательство

<i>💡 Данный бот не заменяет профессиональную юридическую помощь.</i>`
    };
    
    return fallbackResponses[promptType] || fallbackResponses['general'];
  }
}

// Import DaData module with error handling
let dadata;
try {
  dadata = require('./modules/dadata');
} catch (error) {
  console.error('⚠️ DaData module not found, using fallback');
  dadata = null;
}

// Handle counterparty check by INN with enhanced error handling
async function handleCounterpartyCheck(inn) {
  try {
    console.log(`🔍 Checking counterparty with INN: ${inn}`);
    
    // Try DaData API first if available
    if (dadata) {
      try {
        const dadataResult = await dadata.checkCounterparty(inn);
        
        if (dadataResult && dadataResult.success) {
          return dadataResult.response;
        }
      } catch (dadataError) {
        console.error('❌ DaData API error:', dadataError.message);
      }
    }
    
    // Fallback to AI analysis
    console.log('📝 Using AI fallback for INN analysis');
    const aiResponse = await getAIResponse(
      `Проанализируйте ИНН ${inn}. Объясните, что это за организация, как проверить её надёжность и какие могут быть риски при работе с ней. Дайте практические рекомендации по проверке контрагента.`,
      'general'
    );
    
    return `🔍 <b>Анализ ИНН ${inn}</b>\n\n${aiResponse}\n\n<i>💡 Для получения точных данных рекомендуем проверить организацию через официальные источники: ФНС, ЕГРЮЛ/ЕГРИП, DaData.</i>`;
    
  } catch (error) {
    console.error('❌ Counterparty check error:', error);
    return `❌ <b>Ошибка проверки ИНН ${inn}</b>\n\n<b>Временно недоступна проверка контрагентов.</b>\n\n<b>Рекомендуем проверить через:</b>\n• Сайт ФНС России (nalog.gov.ru)\n• Сервис ЕГРЮЛ/ЕГРИП\n• Портал DaData\n• Консультацию с юристом\n\n<i>💡 При работе с новыми контрагентами всегда проводите комплексную проверку.</i>`;
  }
}

// Determine prompt type based on message content with enhanced detection
function determinePromptType(message) {
  const lowerMessage = message.toLowerCase();
  
  // Contract analysis keywords
  if (lowerMessage.includes('договор') || lowerMessage.includes('контракт') || 
      lowerMessage.includes('соглашение') || lowerMessage.includes('условия') ||
      lowerMessage.includes('пункт') || lowerMessage.includes('статья')) {
    return 'contract_analysis';
  }
  
  // Corporate law keywords
  if (lowerMessage.includes('ооо') || lowerMessage.includes('регистрация') || 
      lowerMessage.includes('бизнес') || lowerMessage.includes('ип') ||
      lowerMessage.includes('налог') || lowerMessage.includes('учредитель') ||
      lowerMessage.includes('устав') || lowerMessage.includes('директор')) {
    return 'corporate_law';
  }
  
  // Labor law keywords
  if (lowerMessage.includes('работа') || lowerMessage.includes('увольнение') || 
      lowerMessage.includes('зарплата') || lowerMessage.includes('трудовой') ||
      lowerMessage.includes('отпуск') || lowerMessage.includes('больничный') ||
      lowerMessage.includes('сотрудник') || lowerMessage.includes('работодатель')) {
    return 'labor_law';
  }
  
  // Real estate keywords
  if (lowerMessage.includes('квартира') || lowerMessage.includes('дом') || 
      lowerMessage.includes('недвижимость') || lowerMessage.includes('аренда') ||
      lowerMessage.includes('покупка') || lowerMessage.includes('продажа') ||
      lowerMessage.includes('ипотека') || lowerMessage.includes('земля')) {
    return 'real_estate';
  }
  
  // Family law keywords
  if (lowerMessage.includes('развод') || lowerMessage.includes('алименты') || 
      lowerMessage.includes('семья') || lowerMessage.includes('брак') ||
      lowerMessage.includes('ребенок') || lowerMessage.includes('опека') ||
      lowerMessage.includes('наследство') || lowerMessage.includes('завещание')) {
    return 'family_law';
  }
  
  return 'general';
}

// Main handler function with comprehensive error handling
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Bot-Api-Secret-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const tokenStatus = validateBotToken(TELEGRAM_BOT_TOKEN) ? 'valid' : 'invalid';
    return res.status(200).json({
      status: 'ok',
      message: 'Eva Lawyer Bot Ultimate API is running',
      timestamp: new Date().toISOString(),
      token_status: tokenStatus,
      features: [
        'Ultimate Error Handling',
        'Token Validation',
        'Exponential Backoff',
        'Multi-layer Fallbacks',
        'Enhanced Retry Logic',
        'Comprehensive Logging',
        'Interactive Menus',
        'Specialized Prompts',
        'INN Checking',
        'DaData Integration'
      ]
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate bot token before processing
    if (!validateBotToken(TELEGRAM_BOT_TOKEN)) {
      console.error('❌ Invalid bot token, cannot process webhook');
      return res.status(500).json({ 
        error: 'Bot configuration error',
        message: 'Invalid or missing Telegram Bot Token'
      });
    }

    const update = req.body;
    console.log('📨 Received update:', JSON.stringify(update, null, 2));

    // Handle callback queries (menu buttons)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data;

      console.log(`🔘 Callback query: ${data}`);

      // Answer the callback query
      await answerCallbackQuery(callbackQuery.id);

      // Handle different callback actions with error handling
      try {
        switch (data) {
          case 'contract_analysis':
            await editMessage(chatId, messageId, 
              '📄 <b>Анализ договоров</b>\n\nОтправьте мне текст договора или опишите ситуацию, и я проанализирую:\n\n• Основные риски и проблемы\n• Рекомендации по улучшению\n• Соответствие законодательству\n• Защита ваших интересов\n\n<i>💡 Для точного анализа лучше прикрепить полный текст договора.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'counterparty_check':
            await editMessage(chatId, messageId,
              '🔍 <b>Проверка контрагента</b>\n\nОтправьте ИНН организации (10 или 12 цифр), и я предоставлю:\n\n• Полную информацию об организации\n• Финансовое состояние\n• Оценку рисков сотрудничества\n• Рекомендации по работе\n\n<i>💡 Также можете описать ситуацию для получения советов по проверке.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'legal_letter':
            await editMessage(chatId, messageId,
              '📬 <b>Юридические письма</b>\n\nОпишите ситуацию, и я помогу составить:\n\n• Ответ на претензию\n• Деловое письмо\n• Юридическое заключение\n• Официальный запрос\n• Уведомление\n\n<i>💡 Укажите детали ситуации для более точного составления документа.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'templates':
            await editMessage(chatId, messageId,
              '📑 <b>Шаблоны документов</b>\n\nВыберите тип документа:',
              menus.getTemplatesMenu()
            );
            break;

          case 'more_options':
            await editMessage(chatId, messageId,
              '➕ <b>Дополнительные функции</b>\n\nВыберите область права:',
              menus.getMoreOptionsMenu()
            );
            break;

          case 'back_to_main':
            await editMessage(chatId, messageId,
              '⚖️ <b>Eva Lawyer Bot</b>\n\nВаш AI-помощник по российскому праву\n\nВыберите нужную функцию:',
              menus.getMainMenu()
            );
            break;

          // Template options
          case 'contract_template':
            await editMessage(chatId, messageId,
              '📄 <b>Шаблоны договоров</b>\n\nОпишите тип договора, который вам нужен:\n\n• Договор поставки\n• Договор услуг\n• Договор аренды\n• Трудовой договор\n• Договор подряда\n\n<i>💡 Укажите специфику вашей сферы деятельности для более точного шаблона.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'claim_template':
            await editMessage(chatId, messageId,
              '📋 <b>Шаблоны претензий</b>\n\nОпишите ситуацию для составления претензии:\n\n• Нарушение договора\n• Некачественные товары/услуги\n• Задержка платежей\n• Нарушение сроков\n\n<i>💡 Чем подробнее опишете ситуацию, тем точнее будет претензия.</i>',
              menus.getBackToMainMenu()
            );
            break;

          // Legal areas
          case 'corporate_law':
            await editMessage(chatId, messageId,
              '🏢 <b>Корпоративное право</b>\n\nЗадайте вопрос о:\n\n• Регистрации ООО, ИП, АО\n• Корпоративных процедурах\n• Налогообложении бизнеса\n• Реорганизации компаний\n• Корпоративных спорах\n\n<i>💡 Укажите форму собственности и регион для более точной консультации.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'labor_law':
            await editMessage(chatId, messageId,
              '💼 <b>Трудовое право</b>\n\nВопросы по:\n\n• Трудовым договорам\n• Увольнениям и сокращениям\n• Заработной плате\n• Отпускам и больничным\n• Трудовым спорам\n\n<i>💡 Опишите вашу ситуацию для получения конкретных рекомендаций.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'real_estate':
            await editMessage(chatId, messageId,
              '🏠 <b>Недвижимость</b>\n\nКонсультации по:\n\n• Покупке и продаже недвижимости\n• Ипотечным сделкам\n• Аренде и найму\n• Земельным вопросам\n• Приватизации\n\n<i>💡 Укажите тип недвижимости и регион для более точной консультации.</i>',
              menus.getBackToMainMenu()
            );
            break;

          case 'family_law':
            await editMessage(chatId, messageId,
              '👨‍👩‍👧‍👦 <b>Семейное право</b>\n\nВопросы по:\n\n• Разводу и разделу имущества\n• Алиментам и содержанию\n• Опеке и попечительству\n• Усыновлению\n• Брачным договорам\n\n<i>💡 Деликатные вопросы рассматриваются конфиденциально.</i>',
              menus.getBackToMainMenu()
            );
            break;

          default:
            await editMessage(chatId, messageId,
              '❓ <b>Неизвестная команда</b>\n\nВыберите действие из меню или задайте вопрос текстом.',
              menus.getMainMenu()
            );
        }
      } catch (editError) {
        console.error('❌ Error editing message:', editError);
        // Try sending a new message if editing fails
        try {
          await sendMessage(chatId, 'Произошла ошибка при обновлении сообщения. Попробуйте еще раз.', menus.getMainMenu());
        } catch (sendError) {
          console.error('❌ Error sending fallback message:', sendError);
        }
      }

      return res.status(200).json({ ok: true });
    }

    // Handle regular messages
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      const userName = message.from.first_name || 'Пользователь';

      console.log(`💬 Processing message from ${userName}: ${text}`);

      // Handle /start command
      if (text === '/start') {
        try {
          await sendMessage(chatId, 
            `👋 <b>Добро пожаловать, ${userName}!</b>\n\n⚖️ <b>Eva Lawyer Bot</b>\n\nВаш AI-помощник по российскому праву\n\n<b>Возможности:</b>\n• Анализ договоров и документов\n• Проверка контрагентов по ИНН\n• Юридические консультации\n• Составление писем и претензий\n• Шаблоны документов\n\nВыберите нужную функцию:`,
            menus.getMainMenu()
          );
        } catch (sendError) {
          console.error('❌ Error sending start message:', sendError);
          // Fallback without menu
          try {
            await sendMessage(chatId, `Добро пожаловать! Я Eva Lawyer Bot - ваш помощник по российскому праву. Задайте любой правовой вопрос, и я постараюсь помочь.`);
          } catch (fallbackError) {
            console.error('❌ Error sending fallback start message:', fallbackError);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // Check if message is INN
      if (isINN(text)) {
        try {
          const checkResult = await handleCounterpartyCheck(text);
          await sendMessage(chatId, checkResult, menus.getMainMenu());
        } catch (innError) {
          console.error('❌ Error checking INN:', innError);
          try {
            await sendMessage(chatId, `❌ <b>Ошибка проверки ИНН ${text}</b>\n\nПроизошла ошибка при проверке. Попробуйте позже или обратитесь к специалисту.\n\n<i>💡 Можете также задать вопрос о проверке контрагентов в свободной форме.</i>`);
          } catch (fallbackError) {
            console.error('❌ Error sending INN error message:', fallbackError);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // Handle regular text messages with AI
      try {
        const promptType = determinePromptType(text);
        console.log(`🎯 Determined prompt type: ${promptType}`);
        
        const aiResponse = await getAIResponse(text, promptType);
        await sendMessage(chatId, aiResponse, menus.getMainMenu());
      } catch (aiError) {
        console.error('❌ Error getting AI response:', aiError);
        try {
          await sendMessage(chatId, `❌ <b>Временная ошибка</b>\n\nИзвините, произошла ошибка при обработке вашего запроса.\n\n<b>Что можно сделать:</b>\n• Попробовать переформулировать вопрос\n• Обратиться позже\n• Использовать меню для навигации\n\n<i>💡 При срочных правовых вопросах рекомендую консультацию с юристом.</i>`);
        } catch (fallbackError) {
          console.error('❌ Error sending AI error message:', fallbackError);
        }
      }

      return res.status(200).json({ ok: true });
    }

    // Unknown update type
    console.log('❓ Unknown update type:', Object.keys(update));
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

