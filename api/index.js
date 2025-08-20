// Eva Lawyer Bot - Main Entry Point
// Smart Scenarios v6.2 with Cross-Links

// Загрузка переменных окружения
require('dotenv').config();

// Импорт умных сценариев бота
const EvaLawyerBotSmartScenarios = require('./eva-bot-smart-scenarios');

// Создание и запуск бота
const bot = new EvaLawyerBotSmartScenarios();

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
            status: 'Eva Lawyer Bot Smart Scenarios v6.2 is running',
            timestamp: new Date().toISOString(),
            features: [
                'Cross-links between functions',
                'INN auto-fill with DaData API',
                'Smart contractor scoring',
                'Risk analysis → Protocol disputes',
                'Document chains and workflows'
            ],
            uptime: Date.now() - (bot.metrics?.startTime || Date.now())
        });
    }
};

// Локальный запуск (для разработки)
if (require.main === module) {
    bot.start();
}

