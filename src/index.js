/**
 * Основной файл приложения
 * Настраивает Express сервер и подключает Telegram вебхук
 */

require('dotenv').config();
const express = require('express');
const { bot } = require('./telegram/bot');
const { logger } = require('./services/logger');

// Конфигурация из переменных окружения
const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN;
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 15) * 1024 * 1024;

// Инициализация Express
const app = express();
app.use(express.json({
  limit: MAX_FILE_SIZE
}));

// Маршрут проверки работоспособности
app.get('/healthz', (_, res) => {
  res.status(200).send('ok');
});

// Вебхук для Telegram
app.post('/telegram/webhook', (req, res) => {
  // Проверка secret_token (если задан)
  if (SECRET_TOKEN) {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (secretHeader !== SECRET_TOKEN) {
      logger.warn('Попытка доступа с неверным secret_token');
      return res.status(403).send('Forbidden');
    }
  }

  // Обработка вебхука Telegram
  bot.handleUpdate(req.body, res);
});

// Диагностический эндпоинт (только для preview/development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/diag', (_, res) => {
    res.json({
      env: process.env.NODE_ENV,
      telegramWebhook: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      openAI: Boolean(process.env.OPENAI_API_KEY),
      baseUrl: process.env.BASE_URL,
      daData: Boolean(process.env.DADATA_API_KEY && process.env.DADATA_SECRET)
    });
  });
}

// Запуск сервера
app.listen(PORT, () => {
  logger.info(`Сервер запущен на порту ${PORT}`);
  logger.info(`Вебхук URL: ${process.env.BASE_URL}/telegram/webhook`);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  logger.error('Необработанное исключение:', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Необработанное отклонение промиса:', reason);
});

module.exports = app;
