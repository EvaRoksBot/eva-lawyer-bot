const OpenAI = require('openai');
const menus = require('./modules/menus');

// Initialize OpenAI with better error handling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 seconds timeout
  maxRetries: 3,  // Retry failed requests
});

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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
- Профессиональный, но понятный язык`
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
- С предупреждениями о рисках`
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
- С образцами документов`
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
- С предупреждением о рисках`
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
- С практическими рекомендациями`
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
- Ссылки на нормативные акты`
  }
};

// Enhanced error handling for API calls
async function makeAPICall(apiFunction, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      console.error(`❌ API call attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Send message to Telegram with retry logic
async function sendMessage(chatId, text, keyboard = null) {
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
      throw new Error(`Telegram API error: ${result.description}`);
    }
    return result;
  });
}

// Edit message with retry logic
async function editMessage(chatId, messageId, text, keyboard = null) {
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
      throw new Error(`Telegram edit error: ${result.description}`);
    }
    return result;
  });
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId, text = '') {
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
    
    return await response.json();
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

// Get AI response with enhanced error handling and fallback
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
        max_tokens: 2000,
        temperature: 0.7,
      });
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    
    // Fallback response based on prompt type
    const fallbackResponses = {
      'contract_analysis': 'Извините, временно недоступен анализ договоров. Пожалуйста, попробуйте позже или обратитесь к юристу для детального анализа вашего договора.',
      'corporate_law': 'Извините, сервис корпоративного права временно недоступен. Рекомендую обратиться к специалисту по регистрации бизнеса.',
      'labor_law': 'Извините, консультации по трудовому праву временно недоступны. При срочных вопросах обратитесь в трудовую инспекцию.',
      'real_estate': 'Извините, консультации по недвижимости временно недоступны. Рекомендую обратиться к риелтору или юристу.',
      'family_law': 'Извините, консультации по семейному праву временно недоступны. При срочных вопросах обратитесь в ЗАГС или к семейному юристу.',
      'general': 'Извините, произошла временная ошибка. Попробуйте переформулировать вопрос или обратитесь позже. При срочных правовых вопросах рекомендую консультацию с юристом.'
    };
    
    return fallbackResponses[promptType] || fallbackResponses['general'];
  }
}

// Import DaData module
const dadata = require('./modules/dadata');

// Handle counterparty check by INN with enhanced error handling
async function handleCounterpartyCheck(inn) {
  try {
    console.log(`🔍 Checking counterparty with INN: ${inn}`);
    
    // Try DaData API first
    const dadataResult = await dadata.checkCounterparty(inn);
    
    if (dadataResult && dadataResult.success) {
      return dadataResult.response;
    }
    
    // Fallback to AI analysis if DaData fails
    console.log('📝 DaData unavailable, using AI fallback');
    const aiResponse = await getAIResponse(
      `Проанализируйте ИНН ${inn}. Объясните, что это за организация и какие могут быть риски при работе с ней.`,
      'general'
    );
    
    return `🤖 <b>AI-анализ ИНН ${inn}</b>\n\n${aiResponse}\n\n<i>💡 Для получения точных данных рекомендуем проверить организацию через официальные источники: ФНС, ЕГРЮЛ/ЕГРИП.</i>`;
    
  } catch (error) {
    console.error('❌ Counterparty check error:', error);
    return `❌ <b>Ошибка проверки ИНН ${inn}</b>\n\nВременно недоступна проверка контрагентов. Рекомендуем:\n\n• Проверить через сайт ФНС России\n• Использовать сервис ЕГРЮЛ/ЕГРИП\n• Обратиться к юристу для детальной проверки`;
  }
}

// Determine prompt type based on message content
function determinePromptType(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('договор') || lowerMessage.includes('контракт') || lowerMessage.includes('соглашение')) {
    return 'contract_analysis';
  }
  if (lowerMessage.includes('ооо') || lowerMessage.includes('регистрация') || lowerMessage.includes('бизнес') || lowerMessage.includes('ип')) {
    return 'corporate_law';
  }
  if (lowerMessage.includes('работа') || lowerMessage.includes('увольнение') || lowerMessage.includes('зарплата') || lowerMessage.includes('трудовой')) {
    return 'labor_law';
  }
  if (lowerMessage.includes('квартира') || lowerMessage.includes('дом') || lowerMessage.includes('недвижимость') || lowerMessage.includes('аренда')) {
    return 'real_estate';
  }
  if (lowerMessage.includes('развод') || lowerMessage.includes('алименты') || lowerMessage.includes('семья') || lowerMessage.includes('брак')) {
    return 'family_law';
  }
  
  return 'general';
}

// Main handler function
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Bot-Api-Secret-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Eva Lawyer Bot Enhanced API v2 is running',
      timestamp: new Date().toISOString(),
      features: ['Enhanced Error Handling', 'Retry Logic', 'Fallback Responses', 'Interactive Menus', 'Specialized Prompts', 'INN Checking']
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

      // Handle different callback actions
      try {
        switch (data) {
          case 'contract_analysis':
            await editMessage(chatId, messageId, 
              '📄 <b>Анализ договоров</b>\n\nОтправьте мне текст договора или опишите ситуацию, и я проанализирую:\n\n• Основные риски и проблемы\n• Рекомендации по улучшению\n• Соответствие законодательству\n• Защита ваших интересов',
              menus.getBackToMainMenu()
            );
            break;

          case 'counterparty_check':
            await editMessage(chatId, messageId,
              '🔍 <b>Проверка контрагента</b>\n\nОтправьте ИНН организации (10 или 12 цифр), и я предоставлю:\n\n• Полную информацию об организации\n• Финансовое состояние\n• Оценку рисков сотрудничества\n• Рекомендации по работе',
              menus.getBackToMainMenu()
            );
            break;

          case 'legal_letter':
            await editMessage(chatId, messageId,
              '📬 <b>Юридические письма</b>\n\nОпишите ситуацию, и я помогу составить:\n\n• Ответ на претензию\n• Деловое письмо\n• Юридическое заключение\n• Официальный запрос',
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
              '📄 <b>Шаблоны договоров</b>\n\nОпишите тип договора, который вам нужен (поставка, услуги, аренда и т.д.), и я предоставлю подходящий шаблон с комментариями.',
              menus.getBackToMainMenu()
            );
            break;

          case 'claim_template':
            await editMessage(chatId, messageId,
              '📋 <b>Шаблоны претензий</b>\n\nОпишите ситуацию, и я помогу составить претензию с учетом всех правовых требований.',
              menus.getBackToMainMenu()
            );
            break;

          // Legal areas
          case 'corporate_law':
            await editMessage(chatId, messageId,
              '🏢 <b>Корпоративное право</b>\n\nЗадайте вопрос о регистрации бизнеса, корпоративных процедурах или налогообложении.',
              menus.getBackToMainMenu()
            );
            break;

          case 'labor_law':
            await editMessage(chatId, messageId,
              '💼 <b>Трудовое право</b>\n\nВопросы по трудовым отношениям, увольнениям, зарплате и правам работников.',
              menus.getBackToMainMenu()
            );
            break;

          case 'real_estate':
            await editMessage(chatId, messageId,
              '🏠 <b>Недвижимость</b>\n\nКонсультации по покупке, продаже, аренде недвижимости и земельным вопросам.',
              menus.getBackToMainMenu()
            );
            break;

          case 'family_law':
            await editMessage(chatId, messageId,
              '👨‍👩‍👧‍👦 <b>Семейное право</b>\n\nВопросы развода, алиментов, раздела имущества и опеки над детьми.',
              menus.getBackToMainMenu()
            );
            break;

          default:
            await editMessage(chatId, messageId,
              '❓ Неизвестная команда. Выберите действие из меню:',
              menus.getMainMenu()
            );
        }
      } catch (editError) {
        console.error('❌ Error editing message:', editError);
        // Try sending a new message if editing fails
        await sendMessage(chatId, 'Произошла ошибка при обновлении сообщения. Попробуйте еще раз.', menus.getMainMenu());
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
            `👋 Добро пожаловать, ${userName}!\n\n⚖️ <b>Eva Lawyer Bot</b>\n\nВаш AI-помощник по российскому праву\n\nВыберите нужную функцию:`,
            menus.getMainMenu()
          );
        } catch (sendError) {
          console.error('❌ Error sending start message:', sendError);
          await sendMessage(chatId, 'Добро пожаловать! Произошла ошибка при загрузке меню. Напишите ваш вопрос, и я постараюсь помочь.');
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
          await sendMessage(chatId, 'Произошла ошибка при проверке ИНН. Попробуйте позже или обратитесь к специалисту.');
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
        await sendMessage(chatId, 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте переформулировать вопрос или обратитесь позже.');
      }

      return res.status(200).json({ ok: true });
    }

    // Unknown update type
    console.log('❓ Unknown update type');
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

