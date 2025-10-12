// Eva Lawyer Bot - Smart Scenarios v6.2
// Умные сценарии с кросс-связями на базе архитектуры Manus

// Загрузка переменных окружения
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const axios = require('axios');

class EvaLawyerBotSmartScenarios {
    constructor() {
        // Конфигурация
        this.config = {
            telegramToken: process.env.TELEGRAM_BOT_TOKEN,
            openaiApiKey: process.env.OPENAI_API_KEY,
            dadataApiKey: process.env.DADATA_API_KEY,
            dadataSecret: process.env.DADATA_SECRET,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            maxTokens: 2000,
            temperature: 0.3
        };

        // Инициализация компонентов
        this.bot = new TelegramBot(this.config.telegramToken, { polling: true });
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        
        // Умные сессии с кросс-связями
        this.userSessions = new Map();
        this.crossLinkData = new Map(); // Данные для кросс-связей между функциями
        
        // Кэш для реквизитов по ИНН
        this.innCache = new Map();
        
        // Метрики умных сценариев
        this.smartMetrics = {
            crossLinkUsage: {},
            innAutoFills: 0,
            riskToProtocol: 0,
            contractorScoring: 0,
            documentChains: 0
        };

        // Инициализация
        this.initializeBot();
    }

    // Инициализация бота
    async initializeBot() {
        console.log('🚀 Initializing Eva Lawyer Bot Smart Scenarios...');
        
        this.setupHandlers();
        await this.testConnections();
        
        console.log('✅ Eva Lawyer Bot Smart Scenarios v6.2 is ready!');
    }

    // Проверка подключений
    async testConnections() {
        try {
            // Тест GPT API
            await this.openai.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 5
            });
            console.log('✅ GPT API connection successful');
        } catch (error) {
            console.log('⚠️ GPT API connection issue:', error.message);
        }

        // Тест DaData API (если настроен)
        if (this.config.dadataApiKey) {
            try {
                await this.testDaDataConnection();
                console.log('✅ DaData API connection successful');
            } catch (error) {
                console.log('⚠️ DaData API connection issue:', error.message);
            }
        }
    }

    // Тест DaData API
    async testDaDataConnection() {
        const response = await axios.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
            { query: '7707083893' },
            {
                headers: {
                    'Authorization': `Token ${this.config.dadataApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    }

    // Настройка обработчиков
    setupHandlers() {
        // Команда /start
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        
        // Обработка callback запросов
        this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));
        
        // Обработка текстовых сообщений
        this.bot.on('message', (msg) => this.handleMessage(msg));
        
        // Обработка документов
        this.bot.on('document', (msg) => this.handleDocument(msg));
    }

    // Обработка /start с умным меню
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'Пользователь';
        
        this.initializeUserSession(userId, userName);
        
        const welcomeMessage = `👋 Добро пожаловать, ${userName}!

🧠 **Eva Lawyer Bot Smart Scenarios v6.2**

Умная система с кросс-связями между функциями:

🔗 **Умные сценарии:**
• Автозаполнение реквизитов по ИНН
• Таблица рисков → Протокол разногласий
• Скоринг контрагента → Условия сделки
• Анализ договора → Ответные письма

Выберите действие:`;

        const keyboard = this.createSmartMainMenu();
        
        await this.bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
    }

    // Создание умного главного меню
    createSmartMainMenu() {
        return [
            [
                { text: '🏢 Реквизиты по ИНН', callback_data: 'smart_inn_lookup' },
                { text: '📊 Скоринг контрагента', callback_data: 'smart_contractor_score' }
            ],
            [
                { text: '📄 Анализ договора', callback_data: 'smart_contract_analysis' },
                { text: '⚖️ Таблица рисков', callback_data: 'smart_risk_table' }
            ],
            [
                { text: '🧾 Протокол разногласий', callback_data: 'smart_protocol_disputes' },
                { text: '📬 Ответ на претензию', callback_data: 'smart_claim_reply' }
            ],
            [
                { text: '⚖️ Юр. заключение', callback_data: 'smart_legal_conclusion' },
                { text: '📚 Анализ практики', callback_data: 'smart_practice_analysis' }
            ],
            [
                { text: '👤 Мой профиль', callback_data: 'user_profile' },
                { text: '🔗 Кросс-связи', callback_data: 'cross_links_status' }
            ]
        ];
    }

    // Обработка callback запросов
    async handleCallbackQuery(query) {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;
        
        await this.bot.answerCallbackQuery(query.id);
        
        // Маршрутизация умных сценариев
        switch (data) {
            case 'smart_inn_lookup':
                await this.handleINNLookup(chatId, userId);
                break;
            case 'smart_contractor_score':
                await this.handleContractorScoring(chatId, userId);
                break;
            case 'smart_contract_analysis':
                await this.handleContractAnalysis(chatId, userId);
                break;
            case 'smart_risk_table':
                await this.handleRiskTable(chatId, userId);
                break;
            case 'smart_protocol_disputes':
                await this.handleProtocolDisputes(chatId, userId);
                break;
            case 'smart_claim_reply':
                await this.handleClaimReply(chatId, userId);
                break;
            case 'smart_legal_conclusion':
                await this.handleLegalConclusion(chatId, userId);
                break;
            case 'smart_practice_analysis':
                await this.handlePracticeAnalysis(chatId, userId);
                break;
            case 'cross_links_status':
                await this.handleCrossLinksStatus(chatId, userId);
                break;
            case 'back_to_main':
                await this.handleBackToMain(chatId, userId);
                break;
            default:
                if (data.startsWith('use_inn_')) {
                    await this.handleUseINNData(chatId, userId, data);
                } else if (data.startsWith('risk_to_')) {
                    await this.handleRiskCrossLink(chatId, userId, data);
                }
        }
    }

    // A. Умный сценарий: Реквизиты по ИНН (автозаполнение)
    async handleINNLookup(chatId, userId) {
        const message = `🏢 **Автозаполнение реквизитов по ИНН**

Введите ИНН контрагента (10 или 12 цифр):

🔍 **Что получите:**
• Полное наименование организации
• ОГРН, КПП, адрес регистрации
• Руководитель и контактные данные
• ОКВЭД (виды деятельности)
• Статус в ФНС

📥 **Автозаполнение в:**
• Договор поставки
• Счет на оплату
• Протокол разногласий
• Ответ на претензию

Введите ИНН в следующем сообщении:`;

        const keyboard = [
            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
        ];
        
        await this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
        
        // Устанавливаем режим ожидания ИНН
        const session = this.userSessions.get(userId);
        if (session) {
            session.waitingFor = 'inn_input';
        }
    }

    // Обработка ввода ИНН
    async processINNInput(chatId, userId, inn) {
        const loadingMessage = await this.bot.sendMessage(chatId,
            '🔍 **Поиск по ИНН...**\n\n' +
            '⏳ Запрос к базе ФНС\n' +
            '📊 Получение реквизитов\n' +
            '🏢 Проверка статуса...',
            { parse_mode: 'Markdown' }
        );

        try {
            // Валидация ИНН
            if (!this.validateINN(inn)) {
                await this.bot.editMessageText(
                    '❌ **Неверный формат ИНН**\n\nИНН должен содержать 10 или 12 цифр.\n\nПопробуйте еще раз:',
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Поиск в кэше
            let companyData = this.innCache.get(inn);
            
            if (!companyData) {
                // Запрос к DaData API
                companyData = await this.fetchCompanyByINN(inn);
                
                if (companyData) {
                    // Кэшируем результат
                    this.innCache.set(inn, companyData);
                }
            }

            if (!companyData) {
                await this.bot.editMessageText(
                    '❌ **Организация не найдена**\n\nПроверьте правильность ИНН и попробуйте еще раз.',
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Сохраняем данные для кросс-связей
            this.setCrossLinkData(userId, 'company_requisites', companyData);

            // Показываем результат с кнопками автозаполнения
            const resultMessage = `✅ **Найдена организация:**

🏢 **${companyData.name}**

📋 **Реквизиты:**
• ИНН: ${companyData.inn}
• КПП: ${companyData.kpp || 'не указан'}
• ОГРН: ${companyData.ogrn}
• Адрес: ${companyData.address}
• Руководитель: ${companyData.director || 'не указан'}
• ОКВЭД: ${companyData.okved || 'не указан'}
• Статус: ${companyData.status || 'Активная'}

📥 **Автозаполнение:**`;

            const keyboard = [
                [
                    { text: '📄 Вставить в договор', callback_data: 'use_inn_contract' },
                    { text: '💳 Вставить в счет', callback_data: 'use_inn_invoice' }
                ],
                [
                    { text: '🧾 Протокол разногласий', callback_data: 'use_inn_protocol' },
                    { text: '📬 Ответ на претензию', callback_data: 'use_inn_claim' }
                ],
                [
                    { text: '📊 Скоринг контрагента', callback_data: 'use_inn_scoring' },
                    { text: '🔙 Главное меню', callback_data: 'back_to_main' }
                ]
            ];

            await this.bot.editMessageText(resultMessage, {
                chat_id: chatId,
                message_id: loadingMessage.message_id,
                reply_markup: { inline_keyboard: keyboard },
                parse_mode: 'Markdown'
            });

            // Обновляем метрики
            this.smartMetrics.innAutoFills++;

        } catch (error) {
            console.error('Error processing INN:', error);
            await this.bot.editMessageText(
                '❌ **Ошибка при поиске**\n\nПроизошла ошибка при обращении к базе данных. Попробуйте позже.',
                {
                    chat_id: chatId,
                    message_id: loadingMessage.message_id,
                    parse_mode: 'Markdown'
                }
            );
        }
    }

    // Валидация ИНН
    validateINN(inn) {
        // Убираем все нецифровые символы
        const cleanINN = inn.replace(/\D/g, '');
        
        // Проверяем длину (10 для юрлиц, 12 для ИП)
        if (cleanINN.length !== 10 && cleanINN.length !== 12) {
            return false;
        }
        
        // Здесь можно добавить алгоритм проверки контрольных цифр ИНН
        return true;
    }

    // Запрос к DaData API
    async fetchCompanyByINN(inn) {
        if (!this.config.dadataApiKey) {
            // Заглушка для демонстрации
            return {
                name: `ООО "ТЕСТОВАЯ КОМПАНИЯ" (ИНН: ${inn})`,
                inn: inn,
                kpp: '770701001',
                ogrn: '1027700000000',
                address: 'г. Москва, ул. Тестовая, д. 1',
                director: 'Иванов Иван Иванович',
                okved: '62.01 Разработка компьютерного программного обеспечения',
                status: 'Активная'
            };
        }

        try {
            const response = await axios.post(
                'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
                { query: inn },
                {
                    headers: {
                        'Authorization': `Token ${this.config.dadataApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.suggestions && response.data.suggestions.length > 0) {
                const company = response.data.suggestions[0];
                return {
                    name: company.value,
                    inn: company.data.inn,
                    kpp: company.data.kpp,
                    ogrn: company.data.ogrn,
                    address: company.data.address?.value,
                    director: company.data.management?.name,
                    okved: company.data.okved,
                    status: company.data.state?.status
                };
            }
            
            return null;
        } catch (error) {
            console.error('DaData API error:', error);
            return null;
        }
    }

    // B. Умный сценарий: Скоринг контрагента → Условия сделки
    async handleContractorScoring(chatId, userId) {
        const message = `📊 **Скоринг контрагента (KYC/AML)**

Введите ИНН для комплексной проверки:

🔍 **Источники проверки:**
• ФНС (статус, задолженности)
• Федресурс (банкротство)
• КАД-Арбитр (судебные дела)
• ФССП (исполнительные производства)
• Реестр недобросовестных поставщиков

📊 **Результат:**
• Оценка риска (низкий/средний/высокий)
• Рекомендуемые условия сделки
• Автоматическая вставка в договор

Введите ИНН для скоринга:`;

        const keyboard = [
            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
        ];
        
        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
        
        const session = this.userSessions.get(userId);
        if (session) {
            session.waitingFor = 'scoring_inn_input';
        }
    }

    // C. Умный сценарий: Таблица рисков → Протокол разногласий
    async handleRiskTable(chatId, userId) {
        const message = `⚖️ **Таблица рисков договора**

Загрузите договор для анализа рисков:

📄 **Поддерживаемые форматы:**
• PDF документы
• Word файлы (.doc, .docx)
• Текстовые файлы (.txt)

🔍 **Анализ включает:**
• Выявление спорных условий
• Оценка правовых рисков
• Классификация по критичности
• Рекомендации по устранению

🔗 **Умные переходы:**
• Автогенерация протокола разногласий
• Формирование ответа на претензию
• Письмо клиенту с объяснениями

Отправьте файл договора:`;

        const keyboard = [
            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
        ];
        
        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
        
        const session = this.userSessions.get(userId);
        if (session) {
            session.waitingFor = 'contract_document';
        }
    }

    // D. Умный сценарий: Протокол разногласий (из рисков)
    async handleProtocolDisputes(chatId, userId) {
        // Проверяем наличие данных таблицы рисков
        const riskData = this.getCrossLinkData(userId, 'risk_table');
        
        if (!riskData) {
            const message = `🧾 **Протокол разногласий**

Для формирования протокола разногласий нужна таблица рисков договора.

🔗 **Умная связь:** Протокол автоматически генерируется на основе выявленных рисков.

Сначала проведите анализ договора:`;

            const keyboard = [
                [{ text: '⚖️ Анализ рисков договора', callback_data: 'smart_risk_table' }],
                [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
            ];
            
            await this.bot.sendMessage(chatId, message, {
                reply_markup: { inline_keyboard: keyboard },
                parse_mode: 'Markdown'
            });
            return;
        }

        // Генерируем протокол на основе рисков
        await this.generateProtocolFromRisks(chatId, userId, riskData);
    }

    // Обработка текстовых сообщений
    async handleMessage(msg) {
        if (msg.text && !msg.text.startsWith('/')) {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const session = this.userSessions.get(userId);
            
            if (!session) {
                await this.handleStart(msg);
                return;
            }

            // Обработка в зависимости от ожидаемого ввода
            switch (session.waitingFor) {
                case 'inn_input':
                    await this.processINNInput(chatId, userId, msg.text);
                    session.waitingFor = null;
                    break;
                case 'scoring_inn_input':
                    await this.processContractorScoring(chatId, userId, msg.text);
                    session.waitingFor = null;
                    break;
                default:
                    // Обычная обработка сообщения
                    await this.processGeneralQuery(chatId, userId, msg.text);
            }
        }
    }

    // Обработка документов
    async handleDocument(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const session = this.userSessions.get(userId);
        
        if (session?.waitingFor === 'contract_document') {
            await this.processContractDocument(chatId, userId, msg.document);
            session.waitingFor = null;
        } else {
            await this.bot.sendMessage(chatId, 
                '📄 Документ получен! Выберите действие:',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⚖️ Анализ рисков', callback_data: 'smart_risk_table' }],
                            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
        }
    }

    // Кросс-связи: сохранение данных
    setCrossLinkData(userId, key, data) {
        if (!this.crossLinkData.has(userId)) {
            this.crossLinkData.set(userId, new Map());
        }
        this.crossLinkData.get(userId).set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Кросс-связи: получение данных
    getCrossLinkData(userId, key) {
        const userData = this.crossLinkData.get(userId);
        if (!userData) return null;
        
        const item = userData.get(key);
        if (!item) return null;
        
        // Проверяем актуальность (данные действительны 1 час)
        if (Date.now() - item.timestamp > 3600000) {
            userData.delete(key);
            return null;
        }
        
        return item.data;
    }

    // Инициализация сессии пользователя
    initializeUserSession(userId, userName) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, {
                userId,
                userName,
                startTime: Date.now(),
                lastActivity: Date.now(),
                waitingFor: null,
                smartScenarios: {
                    innLookups: 0,
                    contractorScores: 0,
                    riskAnalyses: 0,
                    crossLinks: 0
                }
            });
        }
    }

    // Обработка возврата в главное меню
    async handleBackToMain(chatId, userId) {
        const session = this.userSessions.get(userId);
        const userName = session?.userName || 'Пользователь';
        
        session.waitingFor = null; // Сбрасываем ожидание ввода
        
        const message = `🧠 **Eva Lawyer Bot Smart Scenarios**

Добро пожаловать обратно, ${userName}!

Выберите умный сценарий с кросс-связями:`;

        const keyboard = this.createSmartMainMenu();
        
        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
    }

    // Запуск бота
    start() {
        console.log('🚀 Eva Lawyer Bot Smart Scenarios v6.2 started successfully!');
        console.log('🔗 Cross-links enabled, INN auto-fill ready, smart scenarios active');
        
        // Периодическая очистка кэша
        setInterval(() => {
            this.cleanupCache();
        }, 3600000); // Каждый час
        
        // Логирование метрик
        setInterval(() => {
            console.log('📊 Smart Metrics:', this.smartMetrics);
        }, 300000); // Каждые 5 минут
    }

    // Очистка кэша
    cleanupCache() {
        const now = Date.now();
        
        // Очистка кэша ИНН (старше 24 часов)
        for (const [inn, data] of this.innCache.entries()) {
            if (now - data.timestamp > 86400000) {
                this.innCache.delete(inn);
            }
        }
        
        // Очистка кросс-связей (старше 1 часа)
        for (const [userId, userData] of this.crossLinkData.entries()) {
            for (const [key, item] of userData.entries()) {
                if (now - item.timestamp > 3600000) {
                    userData.delete(key);
                }
            }
            if (userData.size === 0) {
                this.crossLinkData.delete(userId);
            }
        }
    }
}

// Запуск бота
if (require.main === module) {
    const bot = new EvaLawyerBotSmartScenarios();
    bot.start();
}

module.exports = EvaLawyerBotSmartScenarios;

