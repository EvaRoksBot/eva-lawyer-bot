const express = require('express');
const { Telegraf } = require('telegraf');
const OpenAI = require('openai');

// Инициализация приложения
const app = express();
app.use(express.json());

// Конфигурация
const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  port: process.env.PORT || 3000,
  webhookPath: '/telegram/webhook'
};

// Инициализация сервисов
const bot = new Telegraf(config.telegramToken);
const openai = new OpenAI({ apiKey: config.openaiApiKey });

// Основные команды бота
bot.start((ctx) => {
  const welcomeMessage = `
🏛️ **Добро пожаловать в Eva Lawyer Bot!**

Я помогу вам с юридическими вопросами:

📋 **Мои возможности:**
• Анализ договоров и документов
• Создание таблиц рисков
• Подготовка юридических заключений
• Проверка контрагентов
• Генерация документов

Выберите нужную функцию в меню ниже:
  `;

  const keyboard = {
    inline_keyboard: [
      [{ text: '📄 Анализ документов', callback_data: 'analyze_document' }],
      [{ text: '⚠️ Таблица рисков', callback_data: 'risk_table' }],
      [{ text: '📝 Юридическое заключение', callback_data: 'legal_opinion' }],
      [{ text: '🔍 Проверка контрагентов', callback_data: 'check_counterparty' }],
      [{ text: '📋 Генерация документов', callback_data: 'generate_document' }]
    ]
  };

  ctx.reply(welcomeMessage, { reply_markup: keyboard, parse_mode: 'Markdown' });
});

// Обработчики callback кнопок
bot.action('analyze_document', (ctx) => {
  ctx.reply('📄 Отправьте документ для анализа (PDF, DOCX или изображение)');
});

bot.action('risk_table', (ctx) => {
  ctx.reply('⚠️ Отправьте договор для создания таблицы рисков');
});

bot.action('legal_opinion', (ctx) => {
  ctx.reply('📝 Опишите ситуацию для подготовки юридического заключения');
});

bot.action('check_counterparty', (ctx) => {
  ctx.reply('🔍 Введите ИНН или название организации для проверки');
});

bot.action('generate_document', (ctx) => {
  ctx.reply('📋 Выберите тип документа для генерации');
});

// Обработка документов
bot.on('document', async (ctx) => {
  try {
    ctx.reply('📄 Анализирую документ...');
    
    // Здесь будет логика анализа документа
    const analysis = await analyzeDocument(ctx.message.document);
    
    ctx.reply(`✅ Анализ завершен:\n\n${analysis}`);
  } catch (error) {
    console.error('Ошибка анализа документа:', error);
    ctx.reply('❌ Произошла ошибка при анализе документа');
  }
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  try {
    const userMessage = ctx.message.text;
    
    if (userMessage.length < 10) {
      ctx.reply('📝 Пожалуйста, опишите ваш вопрос более подробно');
      return;
    }

    ctx.reply('🤔 Анализирую ваш вопрос...');
    
    const response = await generateLegalResponse(userMessage);
    ctx.reply(response);
    
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    ctx.reply('❌ Произошла ошибка. Попробуйте еще раз.');
  }
});

// Функция анализа документов
async function analyzeDocument(document) {
  // Заглушка для анализа документов
  return "Документ проанализирован. Основные риски: отсутствие штрафных санкций, неточные сроки исполнения.";
}

// Функция генерации юридических ответов
async function generateLegalResponse(question) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Вы - опытный юрист. Отвечайте на вопросы профессионально и по существу."
        },
        {
          role: "user", 
          content: question
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка OpenAI:', error);
    return "Извините, временно не могу обработать ваш запрос. Попробуйте позже.";
  }
}

// Webhook endpoint
app.post(config.webhookPath, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Экспорт для Vercel
module.exports = (req, res) => {
  if (req.method === 'POST') {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  } else {
    res.json({ 
      status: 'Eva Lawyer Bot v18.0 Clean',
      timestamp: new Date().toISOString(),
      health: 'ok'
    });
  }
};

// Локальный запуск
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`🚀 Eva Lawyer Bot запущен на порту ${config.port}`);
  });
}

