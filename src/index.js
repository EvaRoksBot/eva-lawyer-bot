const express = require('express');
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const { logger, getPrometheusMetrics } = require('./services/monitoring');

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

bot.on('text', (ctx) => ctx.reply('Привет! Я Eva Lawyer Bot.'));

const app = express();
app.use(express.json());

app.post('/telegram/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Эндпоинт для расширенного health check
app.get('/health', (_, res) => {
  const memoryUsage = process.memoryUsage();
  const healthData = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
    },
    version: process.env.npm_package_version || 'unknown'
  };

  res.json(healthData);
});

// Простой health check для балансировщиков
app.get('/healthz', (_, res) => res.status(200).send('ok'));

// Эндпоинт для Prometheus метрик
app.get('/metrics', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getPrometheusMetrics());
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
