const { Telegraf } = require('telegraf');

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(token);

bot.on('text', (ctx) => ctx.reply('Привет! Я Eva Lawyer Bot.'));

module.exports = { bot };
