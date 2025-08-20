// Eva Lawyer Bot - Main Entry Point
// Основная точка входа для Vercel деплоя

// Загрузка переменных окружения
require('dotenv').config();

// Импорт улучшенной логики бота
const EvaLawyerBotEnhanced = require('./eva-bot-enhanced-logic');

// Создание и запуск бота
const bot = new EvaLawyerBotEnhanced();

// Экспорт для Vercel
module.exports = (req, res) => {
    // Для Vercel Serverless Functions
    if (req.method === 'POST') {
        // Обработка webhook от Telegram
        const update = req.body;
        
        // Обработка обновления
        if (update.message) {
            bot.handleMessage(update.message);
        } else if (update.callback_query) {
            bot.handleCallbackQuery(update.callback_query);
        }
        
        res.status(200).json({ ok: true });
    } else {
        // GET запрос - статус бота
        res.status(200).json({
            status: 'Eva Lawyer Bot Enhanced v6.1 is running',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - bot.metrics?.startTime || 0
        });
    }
};

// Локальный запуск (для разработки)
if (require.main === module) {
    bot.start();
}

