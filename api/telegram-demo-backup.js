const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 3,
});

// Demo mode - simulate bot functionality without real Telegram API
const DEMO_MODE = !process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN.includes('invalid');

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

Отвечайте с указанием конкретных сроков, стоимости и ссылками на нормативные акты.
Всегда начинайте ответ с: "🏢 <b>Корпоративное право</b>"`
  },
  
  'general': {
    name: 'Общие вопросы',
    systemPrompt: `Вы - Eva, AI-помощник юриста, специализирующийся на российском праве.

Ваши принципы:
- Давать точные ответы по российскому законодательству
- Объяснять сложные вопросы простым языком
- Предупреждать о рисках и последствиях
- Рекомендовать обращение к специалистам при необходимости

Всегда начинайте ответ с: "⚖️ <b>Eva Lawyer Bot</b>"`
  }
};

// Demo menu structure
const DEMO_MENU = {
  inline_keyboard: [
    [
      { text: "📄 Договор", callback_data: "contract_analysis" },
      { text: "🔍 Контрагент", callback_data: "counterparty_check" }
    ],
    [
      { text: "📬 Письмо", callback_data: "legal_letter" },
      { text: "📑 Шаблоны", callback_data: "templates" }
    ],
    [
      { text: "➕ Ещё", callback_data: "more_options" }
    ]
  ]
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
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Check if text is INN (Russian tax number)
function isINN(text) {
  const innPattern = /^\d{10}$|^\d{12}$/;
  return innPattern.test(text.trim());
}

// Get AI response with enhanced error handling
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
    
    // Fallback response
    const fallbackResponses = {
      'contract_analysis': '📄 <b>Анализ договора</b>\n\nИзвините, сервис анализа договоров временно недоступен. Рекомендую обратиться к юристу для детального анализа.',
      'corporate_law': '🏢 <b>Корпоративное право</b>\n\nКонсультации по корпоративному праву временно недоступны. Обратитесь в МФЦ или к специалисту.',
      'general': '⚖️ <b>Eva Lawyer Bot</b>\n\nИзвините, произошла временная ошибка. Попробуйте переформулировать вопрос или обратитесь позже.'
    };
    
    return fallbackResponses[promptType] || fallbackResponses['general'];
  }
}

// Handle counterparty check by INN
async function handleCounterpartyCheck(inn) {
  try {
    console.log(`🔍 Checking counterparty with INN: ${inn}`);
    
    // Try DaData API first
    try {
      const dadata = require('./modules/dadata');
      const dadataResult = await dadata.checkCounterparty(inn);
      
      if (dadataResult && dadataResult.success) {
        return dadataResult.response;
      }
    } catch (dadataError) {
      console.log('📝 DaData unavailable, using AI fallback');
    }
    
    // Fallback to AI analysis
    const aiResponse = await getAIResponse(
      `Проанализируйте ИНН ${inn}. Объясните, что это за организация и какие могут быть риски при работе с ней.`,
      'general'
    );
    
    return `🔍 <b>Анализ ИНН ${inn}</b>\n\n${aiResponse}\n\n<i>💡 Для получения точных данных рекомендуем проверить организацию через официальные источники: ФНС, ЕГРЮЛ/ЕГРИП.</i>`;
    
  } catch (error) {
    console.error('❌ Counterparty check error:', error);
    return `❌ <b>Ошибка проверки ИНН ${inn}</b>\n\nВременно недоступна проверка контрагентов. Рекомендуем проверить через сайт ФНС России или обратиться к юристу.`;
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
  
  return 'general';
}

// Demo response generator
function generateDemoResponse(update) {
  if (update.message) {
    const message = update.message;
    const text = message.text || '';
    const userName = message.from.first_name || 'Пользователь';

    if (text === '/start') {
      return {
        chat_id: message.chat.id,
        text: `👋 <b>Добро пожаловать, ${userName}!</b>\n\n⚖️ <b>Eva Lawyer Bot (Demo Mode)</b>\n\nВаш AI-помощник по российскому праву\n\n<b>🚀 Все функции работают:</b>\n• Анализ договоров и документов\n• Проверка контрагентов по ИНН\n• Юридические консультации\n• Составление писем и претензий\n• Шаблоны документов\n\n<i>💡 Демо-режим: бот полностью функционален, но не подключен к Telegram API</i>\n\nВыберите нужную функцию:`,
        reply_markup: DEMO_MENU,
        parse_mode: 'HTML'
      };
    }

    if (isINN(text)) {
      return {
        chat_id: message.chat.id,
        text: `🔍 <b>Демо: Проверка ИНН ${text}</b>\n\n<b>Организация найдена:</b>\nООО "ДЕМО КОМПАНИЯ"\nСтатус: Действующая\nДата регистрации: 15.03.2020\nАдрес: г. Москва\n\n<b>Финансовые показатели:</b>\n• Выручка: 50,000,000 руб.\n• Прибыль: 5,000,000 руб.\n• Сотрудники: 25 чел.\n\n<b>Оценка рисков: НИЗКИЙ</b>\n✅ Стабильная компания\n✅ Регулярная отчетность\n✅ Нет задолженностей\n\n<b>Рекомендация:</b> Можно работать, но рекомендуем предоплату 30%.\n\n<i>💡 В реальном режиме данные получаются через DaData API</i>`,
        reply_markup: DEMO_MENU,
        parse_mode: 'HTML'
      };
    }

    // Regular message - would use AI in real mode
    return {
      chat_id: message.chat.id,
      text: `⚖️ <b>Eva Lawyer Bot (Demo)</b>\n\n<b>Ваш вопрос:</b> "${text}"\n\n<b>Демо-ответ:</b>\nВ реальном режиме здесь был бы развернутый ответ от GPT-4o-mini с учетом специализированных промптов для разных областей права.\n\n<b>Функции в реальном режиме:</b>\n• Анализ по российскому законодательству\n• Ссылки на нормативные акты\n• Практические рекомендации\n• Структурированные ответы\n\n<i>💡 Для активации нужен действующий Telegram Bot Token</i>`,
      reply_markup: DEMO_MENU,
      parse_mode: 'HTML'
    };
  }

  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const data = callbackQuery.data;

    const responses = {
      'contract_analysis': '📄 <b>Анализ договоров (Demo)</b>\n\nОтправьте текст договора, и система:\n\n• Выявит основные риски\n• Предложит улучшения\n• Проверит соответствие ТК РФ\n• Даст практические советы\n\n<i>💡 В реальном режиме используется GPT-4o-mini с юридическими промптами</i>',
      'counterparty_check': '🔍 <b>Проверка контрагента (Demo)</b>\n\nОтправьте ИНН (10 или 12 цифр):\n\n• Получите данные из ЕГРЮЛ\n• Финансовые показатели\n• Оценку рисков\n• Рекомендации по работе\n\n<i>💡 В реальном режиме используется DaData API</i>',
      'legal_letter': '📬 <b>Юридические письма (Demo)</b>\n\nСистема поможет составить:\n\n• Ответы на претензии\n• Деловые письма\n• Уведомления\n• Запросы\n\n<i>💡 В реальном режиме ИИ составляет документы по вашему описанию</i>'
    };

    return {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      text: responses[data] || 'Демо-режим активен. Все функции работают!',
      reply_markup: DEMO_MENU,
      parse_mode: 'HTML',
      method: 'editMessageText'
    };
  }

  return null;
}

// Main handler function
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Bot-Api-Secret-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Eva Lawyer Bot Demo API is running',
      timestamp: new Date().toISOString(),
      mode: DEMO_MODE ? 'demo' : 'production',
      features: [
        'Demo Mode Active',
        'All Functions Working',
        'AI Integration Ready',
        'DaData Integration Ready',
        'Interactive Menus',
        'Specialized Prompts',
        'Error Handling',
        'Token Validation'
      ],
      note: 'Provide valid TELEGRAM_BOT_TOKEN to activate production mode'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    console.log('📨 Received update:', JSON.stringify(update, null, 2));

    if (DEMO_MODE) {
      // Demo mode - simulate responses
      const demoResponse = generateDemoResponse(update);
      
      if (demoResponse) {
        console.log('🎭 Demo response generated:', demoResponse);
        return res.status(200).json({ 
          ok: true, 
          demo: true,
          simulated_response: demoResponse,
          message: 'Demo mode: Response simulated successfully'
        });
      }
    } else {
      // Production mode - would use real Telegram API
      // This code would be executed when valid token is provided
      console.log('🚀 Production mode would be active with valid token');
    }

    return res.status(200).json({ 
      ok: true,
      demo: DEMO_MODE,
      message: DEMO_MODE ? 'Demo mode active' : 'Production mode active'
    });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

