const OpenAI = require('openai');

// Initialize OpenAI with proper error handling
let openai;
try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    // Clean the API key from any potential whitespace or invalid characters
    const cleanApiKey = apiKey.trim();
    
    openai = new OpenAI({
        apiKey: cleanApiKey
    });
} catch (error) {
    console.error('❌ OpenAI initialization error:', error);
}

// Bot configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Telegram API base URL
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send message to Telegram
 */
async function sendMessage(chatId, text, options = {}) {
    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                ...options
            })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Send message error:', error);
        return null;
    }
}

/**
 * Answer callback query
 */
async function answerCallbackQuery(callbackQueryId, text = '') {
    try {
        const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text
            })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Answer callback query error:', error);
        return null;
    }
}

/**
 * Ask OpenAI Assistant
 */
async function askAssistant(message, userId = 'default') {
    try {
        if (!openai) {
            throw new Error('OpenAI not initialized');
        }

        // Create a thread
        const thread = await openai.beta.threads.create();
        
        // Add message to thread
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message
        });
        
        // Run the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID
        });
        
        // Wait for completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }
        
        if (runStatus.status === 'completed') {
            // Get messages
            const messages = await openai.beta.threads.messages.list(thread.id);
            const lastMessage = messages.data[0];
            return lastMessage.content[0].text.value;
        } else {
            throw new Error(`Assistant run failed with status: ${runStatus.status}`);
        }
        
    } catch (error) {
        console.error('❌ Assistant error:', error);
        return '❌ Извините, произошла ошибка при обработке вашего запроса. Попробуйте позже.';
    }
}

/**
 * Create main menu keyboard
 */
function createMainMenu() {
    return {
        inline_keyboard: [
            [
                { text: '📄 Договор', callback_data: 'menu_contract' },
                { text: '🔍 Контрагент', callback_data: 'menu_counterparty' }
            ],
            [
                { text: '📬 Письмо', callback_data: 'menu_letter' },
                { text: '📑 Шаблоны', callback_data: 'menu_templates' }
            ],
            [
                { text: '➕ Ещё', callback_data: 'menu_more' },
                { text: '❓ Помощь', callback_data: 'help' }
            ]
        ]
    };
}

/**
 * Handle /start command
 */
async function handleStartCommand(chatId, userId) {
    const welcomeText = `🤖 <b>Добро пожаловать в Eva Lawyer Bot!</b>

Я ваш персональный юридический помощник с искусственным интеллектом.

<b>Что я умею:</b>
• 📄 Анализировать договоры и документы
• 🔍 Проверять контрагентов по ИНН
• 📬 Составлять юридические письма
• 📑 Создавать документы по шаблонам
• ⚖️ Консультировать по правовым вопросам

<b>Как начать:</b>
Выберите нужный раздел в меню ниже или просто задайте мне вопрос!`;

    await sendMessage(chatId, welcomeText, {
        reply_markup: createMainMenu()
    });
}

/**
 * Handle callback queries
 */
async function handleCallbackQuery(callbackQuery) {
    const { id, data, message, from } = callbackQuery;
    const chatId = message.chat.id;
    const userId = from.id;

    try {
        await answerCallbackQuery(id);

        switch (data) {
            case 'menu_contract':
                await sendMessage(chatId, '📄 <b>Работа с договорами</b>\n\nВыберите действие:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 Анализ договора', callback_data: 'contract_analyze' }],
                            [{ text: '⚠️ Оценка рисков', callback_data: 'contract_risks' }],
                            [{ text: '📝 Протокол разногласий', callback_data: 'contract_disputes' }],
                            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                        ]
                    }
                });
                break;

            case 'menu_counterparty':
                await sendMessage(chatId, '🔍 <b>Проверка контрагентов</b>\n\nВведите ИНН или название организации для проверки:');
                break;

            case 'menu_letter':
                await sendMessage(chatId, '📬 <b>Юридические письма</b>\n\nВыберите тип письма:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📨 Ответ на претензию', callback_data: 'letter_response' }],
                            [{ text: '📋 Юридическое заключение', callback_data: 'letter_conclusion' }],
                            [{ text: '⚖️ Досудебная претензия', callback_data: 'letter_claim' }],
                            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                        ]
                    }
                });
                break;

            case 'menu_templates':
                await sendMessage(chatId, '📑 <b>Шаблоны документов</b>\n\nВыберите тип документа:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📄 Договор поставки', callback_data: 'template_supply' }],
                            [{ text: '🏢 Устав ООО', callback_data: 'template_charter' }],
                            [{ text: '📋 Доверенность', callback_data: 'template_power' }],
                            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                        ]
                    }
                });
                break;

            case 'menu_more':
                await sendMessage(chatId, '➕ <b>Дополнительные функции</b>\n\nВыберите действие:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⚖️ Судебная практика', callback_data: 'court_practice' }],
                            [{ text: '📊 Анализ рисков', callback_data: 'risk_analysis' }],
                            [{ text: '🔧 Настройки', callback_data: 'settings' }],
                            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                        ]
                    }
                });
                break;

            case 'main_menu':
                await sendMessage(chatId, '🏠 <b>Главное меню</b>\n\nВыберите нужный раздел:', {
                    reply_markup: createMainMenu()
                });
                break;

            case 'help':
                const helpText = `❓ <b>Справка по Eva Lawyer Bot</b>

<b>Основные команды:</b>
/start - Запуск бота
/menu - Главное меню
/help - Эта справка
/clear - Очистить историю

<b>Как пользоваться:</b>
1. Выберите нужный раздел в меню
2. Следуйте инструкциям
3. Задавайте вопросы в свободной форме

<b>Поддержка:</b>
Если у вас возникли проблемы, напишите администратору.`;

                await sendMessage(chatId, helpText, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                        ]
                    }
                });
                break;

            default:
                await sendMessage(chatId, '❓ Неизвестная команда. Используйте меню для навигации.', {
                    reply_markup: createMainMenu()
                });
        }

    } catch (error) {
        console.error('❌ Callback query error:', error);
        await answerCallbackQuery(id, '❌ Произошла ошибка');
        await sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.', {
            reply_markup: createMainMenu()
        });
    }
}

/**
 * Handle text messages
 */
async function handleTextMessage(message) {
    const { chat, from, text } = message;
    const chatId = chat.id;
    const userId = from.id;

    try {
        // Handle commands
        if (text.startsWith('/')) {
            switch (text) {
                case '/start':
                    await handleStartCommand(chatId, userId);
                    break;
                case '/menu':
                    await sendMessage(chatId, '🏠 <b>Главное меню</b>', {
                        reply_markup: createMainMenu()
                    });
                    break;
                case '/help':
                    await handleCallbackQuery({
                        id: 'help_command',
                        data: 'help',
                        message: { chat: { id: chatId } },
                        from: { id: userId }
                    });
                    break;
                case '/clear':
                    await sendMessage(chatId, '🗑 История очищена.');
                    break;
                default:
                    await sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для справки.');
            }
            return;
        }

        // Check if it's an INN (Russian tax number)
        const innPattern = /^\d{10}$|^\d{12}$/;
        if (innPattern.test(text.trim())) {
            await sendMessage(chatId, `🔍 Проверяю контрагента с ИНН: ${text.trim()}...`);
            
            // Here you would integrate with DaData API
            const response = await askAssistant(`Проверь контрагента с ИНН ${text.trim()}. Предоставь краткую информацию о компании.`, userId);
            await sendMessage(chatId, response);
            return;
        }

        // Regular text message - send to assistant
        await sendMessage(chatId, '🤔 Обрабатываю ваш запрос...');
        const response = await askAssistant(text, userId);
        await sendMessage(chatId, response, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                ]
            }
        });

    } catch (error) {
        console.error('❌ Text message error:', error);
        await sendMessage(chatId, '❌ Произошла ошибка при обработке сообщения.', {
            reply_markup: createMainMenu()
        });
    }
}

/**
 * Main webhook handler with proper CORS and authentication handling
 */
module.exports = async (req, res) => {
    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Bot-Api-Secret-Token');
    
    try {
        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Handle GET request (health check)
        if (req.method === 'GET') {
            return res.status(200).json({ 
                status: 'Eva Lawyer Bot API is running',
                timestamp: new Date().toISOString(),
                version: '2.0'
            });
        }

        // Only allow POST requests for webhook
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Validate content type
        if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
            return res.status(400).json({ error: 'Content-Type must be application/json' });
        }

        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const update = req.body;
        
        // Log incoming update for debugging
        console.log('📨 Received update:', JSON.stringify(update, null, 2));

        // Handle callback queries
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
        }
        // Handle text messages
        else if (update.message) {
            if (update.message.text) {
                await handleTextMessage(update.message);
            } else {
                // Handle other message types (documents, photos, etc.)
                const chatId = update.message.chat.id;
                await sendMessage(chatId, '📎 Получен файл. Функция обработки документов в разработке.', {
                    reply_markup: createMainMenu()
                });
            }
        }
        // Handle other update types
        else {
            console.log('ℹ️ Unhandled update type:', Object.keys(update));
        }

        // Always return success to Telegram
        return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        
        // Return error response but still with 200 status to prevent Telegram retries
        return res.status(200).json({ 
            ok: false, 
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

