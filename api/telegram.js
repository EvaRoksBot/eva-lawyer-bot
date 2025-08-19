// Eva Lawyer Bot - Optimized Version with Fixes
// Addresses all identified issues from comprehensive testing

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8355504616:AAGrfPmGarrAz0YxrycZcy2hg9uT-vaYLGg';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DADATA_API_KEY = process.env.DADATA_API_KEY || 'ap6te7l4ub6sq1dwt608';
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY || '8bf724e4ee6cc03ce6b6';

// Enhanced error handling and logging
function logError(error, context) {
    console.error(`[${context}] Error:`, error);
    return {
        error: true,
        message: error.message || 'Unknown error',
        context
    };
}

// Optimized callback data helper (max 64 bytes)
function cb(route) {
    return route.slice(0, 64);
}

// Enhanced main menu with better UX
function getMainMenu() {
    return {
        inline_keyboard: [
            [
                { text: "🧾 Договоры", callback_data: cb("eva:contracts:menu") },
                { text: "📚 Пакет «Эверест»", callback_data: cb("eva:pkg:menu") }
            ],
            [
                { text: "🔎 Проверка контрагента", callback_data: cb("eva:inn:prompt") }
            ],
            [
                { text: "💳 Счёт/акты", callback_data: cb("eva:docs:billing") },
                { text: "📈 Отчёты", callback_data: cb("eva:reports:menu") }
            ],
            [
                { text: "⚙️ Настройки", callback_data: cb("eva:settings:menu") },
                { text: "🆘 Помощь", callback_data: cb("eva:help:menu") }
            ]
        ]
    };
}

// Enhanced contracts submenu
function getContractsMenu() {
    return {
        inline_keyboard: [
            [
                { text: "📄 Загрузить и проанализировать", callback_data: cb("eva:contracts:analyze") }
            ],
            [
                { text: "✏️ Вставить правки (редлайн)", callback_data: cb("eva:contracts:redline") }
            ],
            [
                { text: "📋 Протокол разногласий", callback_data: cb("eva:contracts:protocol") }
            ],
            [
                { text: "🔍 Извлечь параметры/риски", callback_data: cb("eva:contracts:extract") }
            ],
            [
                { text: "← Назад в главное меню", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Enhanced Everest package submenu
function getEverestPackageMenu() {
    return {
        inline_keyboard: [
            [
                { text: "📄 Договор поставки (шаблон)", callback_data: cb("eva:pkg:supply") }
            ],
            [
                { text: "📋 Спецификация", callback_data: cb("eva:pkg:spec") }
            ],
            [
                { text: "📝 Протокол разногласий", callback_data: cb("eva:pkg:protocol") }
            ],
            [
                { text: "🎯 Сборка комплекта (3 в 1)", callback_data: cb("eva:pkg:wizard") }
            ],
            [
                { text: "← Назад в главное меню", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Enhanced INN validation
function validateINN(inn) {
    if (!inn) return false;
    
    // Remove all non-digits
    const cleanINN = inn.replace(/\D/g, '');
    
    // Check length (10 or 12 digits)
    if (cleanINN.length !== 10 && cleanINN.length !== 12) {
        return false;
    }
    
    // Basic checksum validation for 10-digit INN
    if (cleanINN.length === 10) {
        const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanINN[i]) * coefficients[i];
        }
        const checksum = (sum % 11) % 10;
        return checksum === parseInt(cleanINN[9]);
    }
    
    return true; // For 12-digit INN, basic validation passed
}

// Enhanced DaData API integration with retry logic
async function checkINNWithDaData(inn) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${DADATA_API_KEY}`,
                    'X-Secret': DADATA_SECRET_KEY
                },
                body: JSON.stringify({ query: inn })
            });
            
            if (!response.ok) {
                throw new Error(`DaData API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.suggestions && data.suggestions.length > 0) {
                const company = data.suggestions[0];
                return {
                    success: true,
                    data: {
                        name: company.value || 'Не указано',
                        inn: company.data.inn || inn,
                        kpp: company.data.kpp || 'Не указано',
                        address: company.data.address?.value || 'Не указано',
                        status: company.data.state?.status || 'Неизвестно',
                        director: company.data.management?.name || 'Не указано',
                        okved: company.data.okved || 'Не указано'
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'Организация не найдена в базе данных'
                };
            }
        } catch (error) {
            lastError = error;
            console.log(`DaData attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    
    return {
        success: false,
        error: `Ошибка API после ${maxRetries} попыток: ${lastError?.message || 'Unknown error'}`
    };
}

// Enhanced OpenAI integration with retry logic
async function getAIResponse(prompt, context = 'general') {
    const maxRetries = 3;
    let lastError;
    
    const systemPrompts = {
        general: "Вы - профессиональный юридический консультант. Отвечайте на русском языке, предоставляя точную и полезную правовую информацию.",
        contracts: "Вы - эксперт по договорному праву. Анализируйте договоры, выявляйте риски и предлагайте улучшения.",
        inn: "Вы - специалист по корпоративному праву. Помогайте с проверкой контрагентов и оценкой рисков.",
        everest: "Вы - эксперт по документообороту компании Эверест. Помогайте с шаблонами и процедурами."
    };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompts[context] || systemPrompts.general
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0]?.message?.content || 'Извините, не удалось получить ответ.';
            
        } catch (error) {
            lastError = error;
            console.log(`OpenAI attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    
    return `Извините, временные технические проблемы. Попробуйте позже. (Ошибка: ${lastError?.message || 'Unknown'})`;
}

// Enhanced Telegram API helper with retry logic
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const payload = {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            };
            
            if (replyMarkup) {
                payload.reply_markup = replyMarkup;
            }
            
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Telegram API error: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            lastError = error;
            console.log(`Telegram attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    
    throw lastError;
}

// Enhanced callback query handler
async function answerCallbackQuery(callbackQueryId, text = null) {
    try {
        const payload = { callback_query_id: callbackQueryId };
        if (text) payload.text = text;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Failed to answer callback query:', error);
    }
}

// Main webhook handler
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'Eva Lawyer Bot - Optimized Version',
            timestamp: new Date().toISOString(),
            version: '3.0.0',
            features: [
                'Enhanced error handling',
                'Retry logic for all APIs',
                'Improved menu structure',
                'Better UX messages',
                'Optimized performance'
            ]
        });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const update = req.body;
        
        // Handle regular messages
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            if (text === '/start') {
                await sendTelegramMessage(
                    chatId,
                    `🎯 <b>Добро пожаловать в Eva Lawyer Bot!</b>

🤖 Я ваш персональный юридический ассистент, готовый помочь с:

📄 <b>Анализом договоров</b> - проверка рисков и правок
🔍 <b>Проверкой контрагентов</b> - валидация по ИНН
📚 <b>Пакетом «Эверест»</b> - готовые шаблоны
💼 <b>Юридическими консультациями</b> - экспертные ответы

Выберите нужную функцию из меню ниже:`,
                    getMainMenu()
                );
            } else if (validateINN(text)) {
                // Handle INN input
                await sendTelegramMessage(chatId, '🔍 Проверяю контрагента по ИНН...');
                
                const innResult = await checkINNWithDaData(text);
                
                if (innResult.success) {
                    const company = innResult.data;
                    const message = `📊 <b>Информация о контрагенте</b>

🏢 <b>Название:</b> ${company.name}
🆔 <b>ИНН:</b> ${company.inn}
🏛️ <b>КПП:</b> ${company.kpp}
📍 <b>Адрес:</b> ${company.address}
📈 <b>Статус:</b> ${company.status}
👤 <b>Руководитель:</b> ${company.director}
🏭 <b>ОКВЭД:</b> ${company.okved}

✅ Данные получены из официальных источников ЕГРЮЛ`;
                    
                    await sendTelegramMessage(chatId, message);
                } else {
                    await sendTelegramMessage(
                        chatId,
                        `❌ <b>Ошибка проверки ИНН</b>

${innResult.error}

💡 <b>Рекомендации:</b>
• Проверьте правильность ввода ИНН
• ИНН должен содержать 10 или 12 цифр
• Попробуйте позже, если проблема с API`
                    );
                }
            } else {
                // Handle general questions
                const aiResponse = await getAIResponse(text, 'general');
                await sendTelegramMessage(chatId, `🤖 <b>Юридическая консультация:</b>\n\n${aiResponse}`);
            }
        }
        
        // Handle callback queries
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            
            await answerCallbackQuery(callbackQuery.id);
            
            switch (data) {
                case 'eva:home':
                    await sendTelegramMessage(
                        chatId,
                        '🏠 <b>Главное меню Eva Lawyer Bot</b>\n\nВыберите нужную функцию:',
                        getMainMenu()
                    );
                    break;
                    
                case 'eva:contracts:menu':
                    await sendTelegramMessage(
                        chatId,
                        '📄 <b>Работа с договорами</b>\n\nВыберите действие:',
                        getContractsMenu()
                    );
                    break;
                    
                case 'eva:pkg:menu':
                    await sendTelegramMessage(
                        chatId,
                        '📚 <b>Пакет «Эверест»</b>\n\nГотовые шаблоны и документы:',
                        getEverestPackageMenu()
                    );
                    break;
                    
                case 'eva:inn:prompt':
                    await sendTelegramMessage(
                        chatId,
                        '🔍 <b>Проверка контрагента</b>\n\n📝 Отправьте ИНН организации (10 или 12 цифр) для получения подробной информации из ЕГРЮЛ.'
                    );
                    break;
                    
                case 'eva:contracts:analyze':
                    await sendTelegramMessage(
                        chatId,
                        '📄 <b>Анализ договора</b>\n\n📎 Загрузите файл договора (PDF, DOC, DOCX) или отправьте текст для анализа рисков и рекомендаций.'
                    );
                    break;
                    
                case 'eva:contracts:redline':
                    await sendTelegramMessage(
                        chatId,
                        '✏️ <b>Редлайн договора</b>\n\n📝 Отправьте договор для внесения правок и комментариев в формате редлайн.'
                    );
                    break;
                    
                case 'eva:pkg:supply':
                    await sendTelegramMessage(
                        chatId,
                        '📄 <b>Договор поставки «Эверест»</b>\n\n📋 Готовый шаблон договора поставки, адаптированный под требования компании.'
                    );
                    break;
                    
                case 'eva:help:menu':
                    await sendTelegramMessage(
                        chatId,
                        `🆘 <b>Справка Eva Lawyer Bot</b>

📖 <b>Основные функции:</b>
• /start - главное меню
• Отправьте ИНН для проверки контрагента
• Задайте юридический вопрос для консультации

🔧 <b>Технические возможности:</b>
• Анализ договоров с ИИ
• Проверка контрагентов через ЕГРЮЛ
• Генерация документов
• Экспертные консультации

📞 <b>Поддержка:</b> @support_eva_bot`,
                        getMainMenu()
                    );
                    break;
                    
                default:
                    await sendTelegramMessage(
                        chatId,
                        '⚠️ Функция в разработке. Возвращаемся в главное меню.',
                        getMainMenu()
                    );
            }
        }
        
        return res.status(200).json({ ok: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(200).json({ 
            ok: true, 
            error: 'Internal error handled gracefully' 
        });
    }
}

