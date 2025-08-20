// Eva Lawyer Bot - Full Manus Architecture v7.0
// Main entry point with all 13 scenarios

// Загрузка переменных окружения
require('dotenv').config();

// Импорт полной архитектуры Manus
const EvaLawyerBotManusFull = require('./eva-bot-manus-full');

// Создание и запуск бота
const bot = new EvaLawyerBotManusFull();

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
            status: 'Eva Lawyer Bot Manus Full v7.0 is running',
            timestamp: new Date().toISOString(),
            features: [
                '13 complete scenarios with full prompts',
                'Cross-links between all functions',
                'INN auto-fill via DaData API',
                'Document export DOCX/PDF ready',
                'Smart interface with loading animations',
                'Contract review → Risk table → Protocol',
                'Counterparty scoring → Deal terms',
                'Legal opinions with case law analysis'
            ],
            scenarios: [
                '🔍 Contract Review',
                '📑 Risk Table', 
                '📝 Supply Contract',
                '💳 Invoice',
                '📚 Legal Opinion',
                '📊 Case Law Analysis',
                '⚔️ Dispute Preparation',
                '🖋️ Client Letter',
                '📬 Claim Reply',
                '🏢 Counterparty Scoring',
                '🔎 INN Auto-fill'
            ],
            uptime: Date.now() - (bot.metrics?.startTime || Date.now())
        });
    }
};

// Локальный запуск (для разработки)
if (require.main === module) {
    bot.start();
}

