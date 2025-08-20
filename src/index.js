const express = require('express');
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const { register } = require('./services/monitoring');
const { logger } = require('./services/logger');

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

bot.on('text', (ctx) => ctx.reply('Привет! Я Eva Lawyer Bot.'));

const app = express();
app.use(express.json());

app.post('/telegram/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error('Error generating metrics', err);
    res.status(500).end();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
