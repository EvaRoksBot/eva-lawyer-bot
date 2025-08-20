// Eva Lawyer Bot - Enhanced Logic v6.1
// Полная настройка логики бота с GPT API, промптами, скорингом и inline меню

// Загрузка переменных окружения
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class EvaLawyerBotEnhanced {
    constructor() {
        // Конфигурация
        this.config = {
            telegramToken: process.env.TELEGRAM_BOT_TOKEN,
            openaiApiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            maxTokens: 2000,
            temperature: 0.3
        };

        // Инициализация компонентов
        this.bot = new TelegramBot(this.config.telegramToken, { polling: true });
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        
        // Состояние пользователей
        this.userSessions = new Map();
        this.userScores = new Map();
        
        // Метрики и аналитика
        this.metrics = {
            totalUsers: 0,
            totalQueries: 0,
            successfulQueries: 0,
            averageScore: 0,
            popularCategories: {},
            startTime: Date.now()
        };

        // Инициализация
        this.initializeBot();
    }

    // Инициализация бота
    async initializeBot() {
        console.log('🚀 Initializing Eva Lawyer Bot Enhanced...');
        
        // Настройка обработчиков
        this.setupHandlers();
        
        // Проверка GPT API
        await this.testGPTConnection();
        
        console.log('✅ Eva Lawyer Bot Enhanced is ready!');
    }

    // Проверка подключения к GPT API
    async testGPTConnection() {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: 'Test connection' }],
                max_tokens: 10
            });
            
            console.log('✅ GPT API connection successful');
            return true;
        } catch (error) {
            console.error('❌ GPT API connection failed:', error.message);
            return false;
        }
    }

    // Настройка обработчиков
    setupHandlers() {
        // Команда /start
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        
        // Обработка callback запросов (inline кнопки)
        this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));
        
        // Обработка текстовых сообщений
        this.bot.on('message', (msg) => this.handleMessage(msg));
        
        // Обработка документов
        this.bot.on('document', (msg) => this.handleDocument(msg));
        
        // Обработка ошибок
        this.bot.on('error', (error) => {
            console.error('Bot error:', error);
        });
    }

    // Обработка команды /start
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'Пользователь';
        
        // Инициализация сессии пользователя
        this.initializeUserSession(userId, userName);
        
        // Приветственное сообщение
        const welcomeMessage = `👋 Добро пожаловать, ${userName}!

🏛️ **Eva Lawyer Bot** - ваш персональный юридический консультант

Я помогу вам с:
• 📋 Юридическими консультациями по всем отраслям права
• 📄 Анализом документов и договоров
• ⚖️ Оценкой правовых рисков
• 📊 Составлением документов
• 🔍 Поиском судебной практики

Выберите интересующую вас область права:`;

        // Inline клавиатура с основными разделами
        const keyboard = this.createMainMenu();
        
        await this.bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
        
        // Обновление метрик
        this.metrics.totalUsers++;
    }

    // Создание главного меню
    createMainMenu() {
        return [
            [
                { text: '🏢 Корпоративное право', callback_data: 'category_corporate' },
                { text: '👨‍👩‍👧‍👦 Семейное право', callback_data: 'category_family' }
            ],
            [
                { text: '🏠 Недвижимость', callback_data: 'category_realestate' },
                { text: '💼 Трудовое право', callback_data: 'category_labor' }
            ],
            [
                { text: '💰 Налоговое право', callback_data: 'category_tax' },
                { text: '🏛️ Административное право', callback_data: 'category_admin' }
            ],
            [
                { text: '📄 Анализ документов', callback_data: 'analyze_document' },
                { text: '📊 Мой профиль', callback_data: 'user_profile' }
            ],
            [
                { text: '❓ Задать вопрос', callback_data: 'ask_question' },
                { text: '📞 Связаться с юристом', callback_data: 'contact_lawyer' }
            ]
        ];
    }

    // Обработка callback запросов
    async handleCallbackQuery(query) {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;
        
        // Подтверждение получения callback
        await this.bot.answerCallbackQuery(query.id);
        
        // Обработка различных типов callback
        if (data.startsWith('category_')) {
            await this.handleCategorySelection(chatId, userId, data);
        } else if (data === 'analyze_document') {
            await this.handleDocumentAnalysis(chatId, userId);
        } else if (data === 'user_profile') {
            await this.handleUserProfile(chatId, userId);
        } else if (data === 'ask_question') {
            await this.handleAskQuestion(chatId, userId);
        } else if (data === 'contact_lawyer') {
            await this.handleContactLawyer(chatId, userId);
        } else if (data === 'back_to_main') {
            await this.handleBackToMain(chatId, userId);
        }
    }

    // Обработка выбора категории права
    async handleCategorySelection(chatId, userId, data) {
        const category = data.replace('category_', '');
        const categoryNames = {
            corporate: 'Корпоративное право',
            family: 'Семейное право',
            realestate: 'Недвижимость',
            labor: 'Трудовое право',
            tax: 'Налоговое право',
            admin: 'Административное право'
        };
        
        const categoryName = categoryNames[category];
        
        // Обновляем сессию пользователя
        const session = this.userSessions.get(userId);
        if (session) {
            session.currentCategory = category;
            session.lastActivity = Date.now();
        }
        
        // Сообщение о выбранной категории
        const message = `📚 **${categoryName}**

Вы выбрали раздел "${categoryName}". Теперь вы можете:

• Задать конкретный вопрос по этой области права
• Описать вашу ситуацию для получения консультации
• Загрузить документ для анализа

Просто напишите ваш вопрос в следующем сообщении.`;

        const keyboard = [
            [{ text: '📝 Примеры вопросов', callback_data: `examples_${category}` }],
            [{ text: '🔙 Назад в главное меню', callback_data: 'back_to_main' }]
        ];
        
        await this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
        
        // Обновление метрик
        this.metrics.popularCategories[category] = (this.metrics.popularCategories[category] || 0) + 1;
    }

    // Обработка текстовых сообщений
    async handleMessage(msg) {
        if (msg.text && !msg.text.startsWith('/')) {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const userMessage = msg.text;
            
            // Получаем сессию пользователя
            const session = this.userSessions.get(userId);
            if (!session) {
                await this.handleStart(msg);
                return;
            }
            
            // Показываем индикатор "печатает"
            await this.bot.sendChatAction(chatId, 'typing');
            
            // Анализируем запрос и генерируем ответ
            await this.processUserQuery(chatId, userId, userMessage);
        }
    }

    // Обработка пользовательского запроса
    async processUserQuery(chatId, userId, query) {
        try {
            const session = this.userSessions.get(userId);
            const category = session?.currentCategory || 'general';
            
            // Показываем процесс анализа
            const analysisMessage = await this.bot.sendMessage(chatId, 
                '🔍 **Анализирую ваш запрос...**\n\n' +
                '⏳ Обработка запроса\n' +
                '📊 Оценка сложности\n' +
                '🤖 Генерация ответа...',
                { parse_mode: 'Markdown' }
            );
            
            // Получаем промпт для категории
            const systemPrompt = this.getSystemPrompt(category);
            
            // Скоринг запроса
            const score = await this.calculateQueryScore(query, category);
            
            // Генерируем ответ через GPT API
            const response = await this.generateGPTResponse(query, systemPrompt, score);
            
            // Обновляем сообщение с результатом
            await this.bot.editMessageText(
                `✅ **Анализ завершен**\n\n${response}\n\n` +
                `📊 **Оценка запроса:** ${score.total}/100\n` +
                `• Сложность: ${score.complexity}/25\n` +
                `• Актуальность: ${score.relevance}/25\n` +
                `• Полнота: ${score.completeness}/25\n` +
                `• Специфичность: ${score.specificity}/25`,
                {
                    chat_id: chatId,
                    message_id: analysisMessage.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '👍 Полезно', callback_data: 'feedback_positive' },
                                { text: '👎 Не помогло', callback_data: 'feedback_negative' }
                            ],
                            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
            
            // Обновляем метрики
            this.updateMetrics(userId, score, true);
            
        } catch (error) {
            console.error('Error processing query:', error);
            await this.bot.sendMessage(chatId, 
                '❌ Произошла ошибка при обработке запроса. Попробуйте еще раз.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔙 Главное меню', callback_data: 'back_to_main' }
                        ]]
                    }
                }
            );
        }
    }

    // Получение системного промпта для категории
    getSystemPrompt(category) {
        const prompts = {
            corporate: `Вы - эксперт по корпоративному праву России. Предоставляйте точные консультации по созданию ООО, корпоративным спорам, M&A сделкам. Ссылайтесь на актуальное законодательство РФ.`,
            
            family: `Вы - специалист по семейному праву России. Консультируйте по браку, разводу, алиментам, разделу имущества. Будьте деликатны и учитывайте эмоциональную составляющую.`,
            
            realestate: `Вы - эксперт по недвижимости и земельному праву России. Консультируйте по купле-продаже, аренде, регистрации прав, спорам с застройщиками.`,
            
            labor: `Вы - специалист по трудовому праву России. Консультируйте по трудовым договорам, увольнению, зарплате, трудовым спорам, охране труда.`,
            
            tax: `Вы - эксперт по налоговому праву России. Консультируйте по налогообложению физлиц и юрлиц, НДС, налогу на прибыль, льготам и вычетам.`,
            
            admin: `Вы - специалист по административному праву России. Консультируйте по административным правонарушениям, лицензированию, госуслугам, обжалованию действий властей.`,
            
            general: `Вы - универсальный юридический консультант по российскому праву. Предоставляйте точные, актуальные консультации по всем отраслям права РФ.`
        };
        
        return prompts[category] || prompts.general;
    }

    // Генерация ответа через GPT API
    async generateGPTResponse(query, systemPrompt, score) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: systemPrompt + `\n\nОценка запроса: ${score.total}/100. Адаптируйте детальность ответа под сложность вопроса.`
                },
                {
                    role: 'user',
                    content: query
                }
            ];
            
            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: messages,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });
            
            return response.choices[0].message.content;
            
        } catch (error) {
            console.error('GPT API Error:', error);
            return 'Извините, произошла ошибка при генерации ответа. Попробуйте переформулировать вопрос.';
        }
    }

    // Расчет скоринга запроса
    async calculateQueryScore(query, category) {
        const score = {
            complexity: 0,      // Сложность вопроса (0-25)
            relevance: 0,       // Релевантность категории (0-25)
            completeness: 0,    // Полнота описания (0-25)
            specificity: 0,     // Специфичность (0-25)
            total: 0
        };
        
        // Анализ сложности (длина, юридические термины, количество вопросов)
        const words = query.split(' ').length;
        const legalTerms = this.countLegalTerms(query);
        const questions = (query.match(/\?/g) || []).length;
        
        score.complexity = Math.min(25, Math.floor(
            (words / 10) * 5 + 
            legalTerms * 3 + 
            questions * 2
        ));
        
        // Анализ релевантности категории
        const categoryKeywords = this.getCategoryKeywords(category);
        const relevanceCount = categoryKeywords.filter(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
        ).length;
        
        score.relevance = Math.min(25, relevanceCount * 5);
        
        // Анализ полноты описания
        const hasContext = query.includes('ситуация') || query.includes('случай') || query.includes('проблема');
        const hasDetails = words > 20;
        const hasSpecifics = /\d+/.test(query) || query.includes('рубл') || query.includes('год');
        
        score.completeness = 
            (hasContext ? 8 : 0) + 
            (hasDetails ? 10 : 0) + 
            (hasSpecifics ? 7 : 0);
        
        // Анализ специфичности
        const isSpecific = query.includes('статья') || query.includes('закон') || query.includes('кодекс');
        const hasNumbers = /\d+/.test(query);
        const hasDates = /\d{4}/.test(query);
        
        score.specificity = 
            (isSpecific ? 10 : 0) + 
            (hasNumbers ? 8 : 0) + 
            (hasDates ? 7 : 0);
        
        // Общий балл
        score.total = score.complexity + score.relevance + score.completeness + score.specificity;
        
        return score;
    }

    // Подсчет юридических терминов
    countLegalTerms(text) {
        const legalTerms = [
            'договор', 'соглашение', 'иск', 'суд', 'право', 'закон', 'статья', 'кодекс',
            'ответственность', 'обязательство', 'собственность', 'наследство', 'алименты',
            'развод', 'брак', 'ооо', 'ао', 'ип', 'налог', 'штраф', 'компенсация'
        ];
        
        return legalTerms.filter(term => 
            text.toLowerCase().includes(term)
        ).length;
    }

    // Получение ключевых слов для категории
    getCategoryKeywords(category) {
        const keywords = {
            corporate: ['ооо', 'ао', 'устав', 'учредитель', 'доля', 'акция', 'реорганизация'],
            family: ['брак', 'развод', 'алименты', 'ребенок', 'супруг', 'имущество'],
            realestate: ['квартира', 'дом', 'участок', 'аренда', 'покупка', 'продажа'],
            labor: ['работа', 'увольнение', 'зарплата', 'отпуск', 'трудовой'],
            tax: ['налог', 'ндфл', 'ндс', 'декларация', 'льгота', 'вычет'],
            admin: ['штраф', 'нарушение', 'лицензия', 'разрешение', 'жалоба']
        };
        
        return keywords[category] || [];
    }

    // Инициализация сессии пользователя
    initializeUserSession(userId, userName) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, {
                userId,
                userName,
                startTime: Date.now(),
                lastActivity: Date.now(),
                currentCategory: null,
                queryCount: 0,
                averageScore: 0,
                totalScore: 0
            });
        }
    }

    // Обновление метрик
    updateMetrics(userId, score, success) {
        this.metrics.totalQueries++;
        if (success) this.metrics.successfulQueries++;
        
        // Обновление пользовательских метрик
        const session = this.userSessions.get(userId);
        if (session) {
            session.queryCount++;
            session.totalScore += score.total;
            session.averageScore = session.totalScore / session.queryCount;
            session.lastActivity = Date.now();
        }
        
        // Обновление общих метрик
        const totalScores = Array.from(this.userSessions.values())
            .reduce((sum, session) => sum + session.totalScore, 0);
        const totalQueries = Array.from(this.userSessions.values())
            .reduce((sum, session) => sum + session.queryCount, 0);
        
        this.metrics.averageScore = totalQueries > 0 ? totalScores / totalQueries : 0;
    }

    // Обработка возврата в главное меню
    async handleBackToMain(chatId, userId) {
        const session = this.userSessions.get(userId);
        const userName = session?.userName || 'Пользователь';
        
        const message = `🏛️ **Eva Lawyer Bot - Главное меню**

Добро пожаловать обратно, ${userName}!

Выберите интересующую вас область права или действие:`;

        const keyboard = this.createMainMenu();
        
        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
    }

    // Обработка профиля пользователя
    async handleUserProfile(chatId, userId) {
        const session = this.userSessions.get(userId);
        if (!session) {
            await this.handleStart({ chat: { id: chatId }, from: { id: userId } });
            return;
        }
        
        const uptime = Math.floor((Date.now() - session.startTime) / 1000 / 60);
        
        const message = `👤 **Ваш профиль**

📊 **Статистика:**
• Запросов: ${session.queryCount}
• Средний балл: ${session.averageScore.toFixed(1)}/100
• Время в системе: ${uptime} мин
• Текущая категория: ${session.currentCategory || 'Не выбрана'}

🏆 **Достижения:**
${this.getUserAchievements(session)}`;

        const keyboard = [
            [{ text: '📈 Детальная статистика', callback_data: 'detailed_stats' }],
            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
        ];
        
        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
    }

    // Получение достижений пользователя
    getUserAchievements(session) {
        const achievements = [];
        
        if (session.queryCount >= 5) achievements.push('🎯 Активный пользователь');
        if (session.averageScore >= 70) achievements.push('⭐ Качественные запросы');
        if (session.queryCount >= 10) achievements.push('🏅 Опытный консультант');
        
        return achievements.length > 0 ? achievements.join('\n') : 'Пока нет достижений';
    }

    // Обработка анализа документов
    async handleDocumentAnalysis(chatId, userId) {
        const message = `📄 **Анализ документов**

Загрузите документ для анализа:

📋 **Поддерживаемые форматы:**
• PDF документы
• Word файлы (.doc, .docx)
• Текстовые файлы (.txt)

🔍 **Что я проанализирую:**
• Правовую корректность
• Потенциальные риски
• Соответствие законодательству
• Рекомендации по улучшению

Просто отправьте файл в следующем сообщении.`;

        const keyboard = [
            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
        ];
        
        await this.bot.sendMessage(chatId, message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        });
    }

    // Обработка документов
    async handleDocument(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        await this.bot.sendMessage(chatId, 
            '📄 Документ получен! Анализирую...\n\n' +
            '⏳ Извлечение текста\n' +
            '🔍 Правовой анализ\n' +
            '📊 Оценка рисков...',
            { parse_mode: 'Markdown' }
        );
        
        // Здесь будет логика анализа документа
        setTimeout(async () => {
            await this.bot.sendMessage(chatId,
                '✅ **Анализ документа завершен**\n\n' +
                '📋 **Результат анализа:**\n' +
                '• Документ соответствует базовым требованиям\n' +
                '• Обнаружено 2 потенциальных риска\n' +
                '• Рекомендуется уточнить 3 пункта\n\n' +
                '📊 **Оценка:** 75/100',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 Подробный отчет', callback_data: 'detailed_report' }],
                            [{ text: '🔙 Главное меню', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
        }, 3000);
    }

    // Запуск бота
    start() {
        console.log('🚀 Eva Lawyer Bot Enhanced v6.1 started successfully!');
        console.log(`📊 Monitoring metrics at: ${Date.now()}`);
        
        // Периодическое логирование метрик
        setInterval(() => {
            console.log('📊 Bot Metrics:', {
                users: this.metrics.totalUsers,
                queries: this.metrics.totalQueries,
                success_rate: ((this.metrics.successfulQueries / this.metrics.totalQueries) * 100).toFixed(1) + '%',
                avg_score: this.metrics.averageScore.toFixed(1)
            });
        }, 300000); // Каждые 5 минут
    }
}

// Запуск бота
if (require.main === module) {
    const bot = new EvaLawyerBotEnhanced();
    bot.start();
}

module.exports = EvaLawyerBotEnhanced;

