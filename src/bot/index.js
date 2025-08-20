const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

bot.on('text', (ctx) => ctx.reply('Привет! Я Eva Lawyer Bot.'));

module.exports = bot;
