// Eva Lawyer Bot - Vercel Webhook Handler
// Proper Express setup for Telegram webhook

require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// Создаем Express приложение
const app = express();
app.use(express.json());

// Инициализация бота
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found!');
    process.exit(1);
}

const bot = new TelegramBot(token);
console.log('🤖 Telegram Bot initialized for webhook mode');

// Импорт логики бота
const EvaLawyerBotManusFull = require('./eva-bot-manus-full');
const evaBot = new EvaLawyerBotManusFull();

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        bot: 'Eva Lawyer Bot Manus Full v7.1',
        webhook: 'Ready'
    });
});

// Diagnostic endpoint
app.get('/diag', (req, res) => {
    const tokenHash = token ? `${token.substring(0, 10)}...` : 'NOT_SET';
    res.json({
        telegram_token: tokenHash,
        openai_key: process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET',
        base_url: process.env.BASE_URL || 'NOT_SET',
        node_env: process.env.NODE_ENV || 'development'
    });
});

// Telegram webhook endpoint
app.post('/telegram/webhook', async (req, res) => {
    console.log('📨 Webhook received:', JSON.stringify(req.body, null, 2));
    
    try {
        const update = req.body;
        
        // Обработка сообщений
        if (update.message) {
            console.log('💬 Processing message from user:', update.message.from.id);
            await evaBot.handleMessage(update.message);
        }
        
        // Обработка callback запросов (кнопки)
        if (update.callback_query) {
            console.log('🔘 Processing callback:', update.callback_query.data);
            await evaBot.handleCallback(update.callback_query);
        }
        
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fallback route
app.get('/', (req, res) => {
    res.json({
        message: 'Eva Lawyer Bot Webhook Server',
        version: '7.1',
        endpoints: {
            webhook: '/telegram/webhook',
            health: '/healthz',
            diagnostic: '/diag'
        }
    });
});

// Export for Vercel
module.exports = app;

// Local development
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`🚀 Eva Lawyer Bot webhook server running on port ${port}`);
        console.log(`📡 Webhook endpoint: /telegram/webhook`);
        console.log(`🏥 Health check: /healthz`);
    });
}

