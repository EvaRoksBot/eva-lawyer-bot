const express = require('express');
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

bot.on('text', (ctx) => ctx.reply('Привет! Я Eva Lawyer Bot.'));

const app = express();
app.use(express.json());

app.post('/telegram/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.info(`Server running on port ${port}`);
});
