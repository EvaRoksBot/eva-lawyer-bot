// Eva Lawyer Bot with Everest Menu Framework
// Professional implementation with routing, validation, and deep linking

const EverestRouter = require('./modules/everest-router');
const { getMainMenu, parseDeepLink, handleDeepLink } = require('./modules/everest-menu');

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8355504616:AAGrfPmGarrAz0YxrycZcy2hg9uT-vaYLGg';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const DADATA_API_KEY = process.env.DADATA_API_KEY || 'ap6te7l4ub6sq1dwt608';
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY || '8bf724e4ee6cc03ce6b6';

// Bot API helper class
class TelegramBot {
    constructor(token) {
        this.token = token;
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }

    async sendMessage(chatId, text, options = {}) {
        const url = `${this.baseUrl}/sendMessage`;
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: options.parse_mode || 'HTML',
            reply_markup: options.reply_markup
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Telegram API error:', errorText);
                return false;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Send message error:', error);
            return false;
        }
    }

    async editMessageText(text, options = {}) {
        const url = `${this.baseUrl}/editMessageText`;
        const payload = {
            chat_id: options.chat_id,
            message_id: options.message_id,
            text: text,
            parse_mode: options.parse_mode || 'HTML',
            reply_markup: options.reply_markup
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Telegram API error:', errorText);
                return false;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Edit message error:', error);
            return false;
        }
    }

    async answerCallbackQuery(callbackQueryId, options = {}) {
        const url = `${this.baseUrl}/answerCallbackQuery`;
        const payload = {
            callback_query_id: callbackQueryId,
            text: options.text,
            show_alert: options.show_alert || false
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            return response.ok;
        } catch (error) {
            console.error('Answer callback query error:', error);
            return false;
        }
    }

    async sendDocument(chatId, document, options = {}) {
        const url = `${this.baseUrl}/sendDocument`;
        const formData = new FormData();
        
        formData.append('chat_id', chatId);
        formData.append('document', document);
        
        if (options.caption) {
            formData.append('caption', options.caption);
        }
        
        if (options.reply_markup) {
            formData.append('reply_markup', JSON.stringify(options.reply_markup));
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Telegram API error:', errorText);
                return false;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Send document error:', error);
            return false;
        }
    }
}

// Initialize bot and router
const bot = new TelegramBot(BOT_TOKEN);
const router = new EverestRouter(bot);

// OpenAI API helper
async function callOpenAI(prompt, maxTokens = 1000) {
    if (!OPENAI_API_KEY) {
        return "OpenAI API ключ не настроен. Обратитесь к администратору.";
    }

    try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Вы - профессиональный юридический консультант. Отвечайте на русском языке, кратко и по существу.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "Не удалось получить ответ от AI.";
    } catch (error) {
        console.error('OpenAI API error:', error);
        return "Произошла ошибка при обращении к AI. Попробуйте позже.";
    }
}

// DaData API helper
async function checkINN(inn) {
    try {
        const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DADATA_API_KEY}`,
                'X-Secret': DADATA_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: inn
            })
        });

        if (!response.ok) {
            throw new Error(`DaData API error: ${response.status}`);
        }

        const data = await response.json();
        return data.suggestions[0] || null;
    } catch (error) {
        console.error('DaData API error:', error);
        return null;
    }
}

// Main webhook handler
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;
        
        // Handle callback queries
        if (update.callback_query) {
            await router.handleCallback(update.callback_query);
            return res.status(200).json({ ok: true });
        }

        // Handle messages
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text;

            // Handle /start command
            if (text && text.startsWith('/start')) {
                const parts = text.split(' ');
                const startParam = parts.length > 1 ? parts[1] : null;
                
                if (startParam) {
                    // Handle deep linking
                    const payload = parseDeepLink(startParam);
                    const deepLink = handleDeepLink(payload);
                    
                    if (deepLink) {
                        switch (deepLink.action) {
                            case 'inn_check':
                                await bot.sendMessage(chatId, `🔍 Проверка ИНН: <code>${deepLink.data}</code>\n\nЗапускаю проверку контрагента...`, { parse_mode: 'HTML' });
                                // Process INN check
                                const innData = await checkINN(deepLink.data);
                                if (innData) {
                                    const company = innData.data;
                                    await bot.sendMessage(chatId, 
                                        `📊 <b>Результат проверки ИНН ${deepLink.data}:</b>\n\n` +
                                        `🏢 <b>Название:</b> ${company.name?.full_with_opf || 'Не указано'}\n` +
                                        `📍 <b>Адрес:</b> ${company.address?.unrestricted_value || 'Не указан'}\n` +
                                        `👤 <b>Руководитель:</b> ${company.management?.name || 'Не указан'}\n` +
                                        `📊 <b>Статус:</b> ${company.state?.status || 'Неизвестен'}`,
                                        {
                                            parse_mode: 'HTML',
                                            reply_markup: {
                                                inline_keyboard: [
                                                    [{ text: "🏠 Главное меню", callback_data: "eva:home" }]
                                                ]
                                            }
                                        }
                                    );
                                } else {
                                    await bot.sendMessage(chatId, `❌ Не удалось найти данные по ИНН ${deepLink.data}`, {
                                        reply_markup: {
                                            inline_keyboard: [
                                                [{ text: "🏠 Главное меню", callback_data: "eva:home" }]
                                            ]
                                        }
                                    });
                                }
                                return res.status(200).json({ ok: true });
                            case 'pkg_wizard':
                                await bot.sendMessage(chatId, "🧙‍♂️ Мастер пакета «Эверест»", {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{ text: "📚 Пакет «Эверест»", callback_data: "eva:pkg:wizard" }],
                                            [{ text: "🏠 Главное меню", callback_data: "eva:home" }]
                                        ]
                                    }
                                });
                                return res.status(200).json({ ok: true });
                        }
                    }
                }

                // Regular start command
                await bot.sendMessage(chatId, 
                    `🤖 <b>Добро пожаловать в Eva Lawyer Bot!</b>\n\n` +
                    `Я помогу вам с юридическими вопросами, проверкой контрагентов и подготовкой документов.\n\n` +
                    `Выберите нужный раздел:`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: getMainMenu()
                    }
                );
                return res.status(200).json({ ok: true });
            }

            // Handle /help command
            if (text === '/help') {
                await bot.sendMessage(chatId, 
                    `🆘 <b>Помощь</b>\n\n` +
                    `<b>Основные функции:</b>\n` +
                    `• Анализ договоров\n` +
                    `• Проверка контрагентов по ИНН\n` +
                    `• Генерация документов\n` +
                    `• Юридические консультации\n\n` +
                    `<b>Команды:</b>\n` +
                    `/start - Главное меню\n` +
                    `/help - Эта справка\n\n` +
                    `Для проверки ИНН просто отправьте 10 или 12 цифр.`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🏠 Главное меню", callback_data: "eva:home" }]
                            ]
                        }
                    }
                );
                return res.status(200).json({ ok: true });
            }

            // Handle text messages (INN, questions, etc.)
            if (text) {
                await router.handleTextMessage(message);
                return res.status(200).json({ ok: true });
            }

            // Handle document uploads
            if (message.document) {
                const userState = router.getUserState(chatId);
                if (userState && userState.state === 'awaiting_contract_file') {
                    await bot.sendMessage(chatId, 
                        `📄 <b>Документ получен!</b>\n\n` +
                        `Файл: ${message.document.file_name}\n` +
                        `Размер: ${(message.document.file_size / 1024).toFixed(1)} KB\n\n` +
                        `🔄 Обрабатываю документ...`,
                        { parse_mode: 'HTML' }
                    );

                    // TODO: Process document based on userState.action
                    setTimeout(async () => {
                        let resultText = '';
                        switch (userState.action) {
                            case 'analyze':
                                resultText = '📊 <b>Анализ договора завершён</b>\n\n(Функция в разработке)';
                                break;
                            case 'redline':
                                resultText = '✏️ <b>Правки внесены</b>\n\n(Функция в разработке)';
                                break;
                            case 'protocol':
                                resultText = '📝 <b>Протокол разногласий сформирован</b>\n\n(Функция в разработке)';
                                break;
                            case 'extract':
                                resultText = '🔍 <b>Параметры извлечены</b>\n\n(Функция в разработке)';
                                break;
                        }

                        await bot.sendMessage(chatId, resultText, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "🧾 Договоры", callback_data: "eva:contracts:menu" }],
                                    [{ text: "🏠 Главное меню", callback_data: "eva:home" }]
                                ]
                            }
                        });
                    }, 3000);

                    router.clearUserState(chatId);
                } else {
                    await bot.sendMessage(chatId, 
                        `📄 Документ получен, но не понятно, что с ним делать.\n\n` +
                        `Выберите действие в меню "Договоры".`,
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "🧾 Договоры", callback_data: "eva:contracts:menu" }],
                                    [{ text: "🏠 Главное меню", callback_data: "eva:home" }]
                                ]
                            }
                        }
                    );
                }
                return res.status(200).json({ ok: true });
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

