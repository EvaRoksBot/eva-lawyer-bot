// Smart Router for Eva Lawyer Bot
// Advanced routing system with intelligent command processing and callback handling

const ContextManager = require('./context-manager');
const AIEngine = require('./ai-engine');
const CounterpartyService = require('./counterparty-service');

class SmartRouter {
    constructor() {
        this.contextManager = new ContextManager();
        this.aiEngine = new AIEngine();
        this.routes = new Map();
        this.middlewares = [];
        this.commandHandlers = new Map();
        this.callbackHandlers = new Map();
        this.counterpartyService = new CounterpartyService({ logger: console });
        
        this.initializeRoutes();
        this.initializeMiddlewares();
    }

    // Инициализация маршрутов
    initializeRoutes() {
        // Основные команды
        this.addCommand('/start', this.handleStart.bind(this));
        this.addCommand('/help', this.handleHelp.bind(this));
        this.addCommand('/settings', this.handleSettings.bind(this));
        this.addCommand('/stats', this.handleStats.bind(this));
        this.addCommand('/export', this.handleExport.bind(this));
        this.addCommand('/clear', this.handleClear.bind(this));

        // Callback маршруты для меню
        this.addCallback('eva:main', this.handleMainMenu.bind(this));
        this.addCallback('eva:contracts:menu', this.handleContractsMenu.bind(this));
        this.addCallback('eva:contracts:upload', this.handleContractUpload.bind(this));
        this.addCallback('eva:contracts:analyze', this.handleContractAnalyze.bind(this));
        this.addCallback('eva:contracts:risks', this.handleContractRisks.bind(this));
        this.addCallback('eva:contracts:redline', this.handleContractRedline.bind(this));
        
        this.addCallback('eva:pkg:menu', this.handleEverestMenu.bind(this));
        this.addCallback('eva:pkg:contract', this.handleEverestContract.bind(this));
        this.addCallback('eva:pkg:spec', this.handleEverestSpec.bind(this));
        this.addCallback('eva:pkg:protocol', this.handleEverestProtocol.bind(this));
        this.addCallback('eva:pkg:bundle', this.handleEverestBundle.bind(this));
        
        this.addCallback('eva:inn:prompt', this.handleInnPrompt.bind(this));
        this.addCallback('eva:inn:check', this.handleInnCheck.bind(this));
        
        this.addCallback('eva:docs:billing', this.handleBillingDocs.bind(this));
        this.addCallback('eva:docs:invoice', this.handleInvoice.bind(this));
        this.addCallback('eva:docs:act', this.handleAct.bind(this));
        
        this.addCallback('eva:reports:menu', this.handleReportsMenu.bind(this));
        this.addCallback('eva:reports:usage', this.handleUsageReport.bind(this));
        this.addCallback('eva:reports:contracts', this.handleContractsReport.bind(this));
        
        this.addCallback('eva:settings:menu', this.handleSettingsMenu.bind(this));
        this.addCallback('eva:settings:lang', this.handleLanguageSettings.bind(this));
        this.addCallback('eva:settings:format', this.handleFormatSettings.bind(this));
        this.addCallback('eva:settings:notifications', this.handleNotificationSettings.bind(this));
        
        this.addCallback('eva:help:menu', this.handleHelpMenu.bind(this));
        this.addCallback('eva:help:guide', this.handleGuide.bind(this));
        this.addCallback('eva:help:contact', this.handleContact.bind(this));
        
        // Навигационные callback
        this.addCallback('eva:back', this.handleBack.bind(this));
        this.addCallback('eva:cancel', this.handleCancel.bind(this));
        this.addCallback('eva:home', this.handleHome.bind(this));
    }

    // Инициализация middleware
    initializeMiddlewares() {
        this.addMiddleware(this.logRequest.bind(this));
        this.addMiddleware(this.updateUserActivity.bind(this));
        this.addMiddleware(this.checkUserPermissions.bind(this));
    }

    // Добавление команды
    addCommand(command, handler) {
        this.commandHandlers.set(command, handler);
    }

    // Добавление callback обработчика
    addCallback(pattern, handler) {
        this.callbackHandlers.set(pattern, handler);
    }

    // Добавление middleware
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }

    // Основной метод обработки запросов
    async route(update) {
        try {
            // Применяем middleware
            for (const middleware of this.middlewares) {
                const result = await middleware(update);
                if (result === false) {
                    return; // Middleware прервал обработку
                }
            }

            // Определяем тип обновления и маршрутизируем
            if (update.message) {
                return await this.handleMessage(update);
            } else if (update.callback_query) {
                return await this.handleCallback(update);
            } else if (update.document || update.photo) {
                return await this.handleDocument(update);
            }

        } catch (error) {
            console.error('Router error:', error);
            return await this.handleError(update, error);
        }
    }

    // Обработка текстовых сообщений
    async handleMessage(update) {
        const message = update.message;
        const userId = message.from.id;
        const text = message.text;

        // Проверяем команды
        if (text && text.startsWith('/')) {
            const command = text.split(' ')[0];
            const handler = this.commandHandlers.get(command);
            
            if (handler) {
                return await handler(update);
            }
        }

        // Проверяем ИНН
        if (text && this.isValidINN(text)) {
            return await this.handleInnCheck(update, text);
        }

        // Проверяем контекст пользователя
        const context = this.contextManager.getUserContext(userId);
        
        if (context.currentSession.currentFlow) {
            return await this.handleFlowMessage(update, context);
        }

        // Обычный AI запрос
        return await this.handleAIQuery(update);
    }

    // Обработка callback запросов
    async handleCallback(update) {
        const callbackQuery = update.callback_query;
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id;

        // Добавляем в историю меню
        this.contextManager.addToMenuHistory(userId, data);

        // Ищем подходящий обработчик
        for (const [pattern, handler] of this.callbackHandlers.entries()) {
            if (data.startsWith(pattern)) {
                return await handler(update);
            }
        }

        // Если обработчик не найден
        return await this.handleUnknownCallback(update);
    }

    // Обработка документов
    async handleDocument(update) {
        const userId = update.message?.from?.id || update.from?.id;
        const context = this.contextManager.getUserContext(userId);

        // Сохраняем документ во временные данные
        const document = update.message?.document || update.message?.photo?.[0];
        this.contextManager.setTemporaryData(userId, 'current_document', document);

        // Если пользователь в потоке загрузки документа
        if (context.currentSession.currentFlow === 'contract_upload') {
            return await this.processDocumentUpload(update, context);
        }

        // Предлагаем варианты обработки документа
        return await this.suggestDocumentActions(update);
    }

    // Middleware: логирование запросов
    async logRequest(update) {
        const timestamp = new Date().toISOString();
        const userId = update.message?.from?.id || update.callback_query?.from?.id;
        const type = update.message ? 'message' : 'callback';
        
        console.log(`[${timestamp}] ${type} from user ${userId}`);
        return true;
    }

    // Middleware: обновление активности пользователя
    async updateUserActivity(update) {
        const userId = update.message?.from?.id || update.callback_query?.from?.id;
        if (userId) {
            this.contextManager.refreshSession(userId);
        }
        return true;
    }

    // Middleware: проверка прав пользователя
    async checkUserPermissions(update) {
        // Здесь можно добавить проверку прав доступа
        return true;
    }

    // Обработчик команды /start
    async handleStart(update) {
        const userId = update.message.from.id;
        const userName = update.message.from.first_name || 'Пользователь';
        
        // Инициализируем контекст пользователя
        this.contextManager.initializeUserContext(userId);
        
        const welcomeMessage = `👋 Добро пожаловать, ${userName}!

Я Eva - ваш персональный юридический ассистент. Помогу с:

⚖️ **Анализом договоров** и выявлением рисков
🔍 **Проверкой контрагентов** по ИНН
📄 **Составлением документов** и заключений
📊 **Подготовкой отчетов** и аналитики

Выберите нужную функцию в меню ниже:`;

        return {
            method: 'sendMessage',
            chat_id: userId,
            text: welcomeMessage,
            reply_markup: this.getMainMenuKeyboard(),
            parse_mode: 'Markdown'
        };
    }

    // Обработчик главного меню
    async handleMainMenu(update) {
        const userId = update.callback_query.from.id;
        
        return {
            method: 'editMessageText',
            chat_id: userId,
            message_id: update.callback_query.message.message_id,
            text: `🏠 **Главное меню Eva Lawyer Bot**

Выберите нужную функцию:`,
            reply_markup: this.getMainMenuKeyboard(),
            parse_mode: 'Markdown'
        };
    }

    // Обработчик меню договоров
    async handleContractsMenu(update) {
        const userId = update.callback_query.from.id;
        
        return {
            method: 'editMessageText',
            chat_id: userId,
            message_id: update.callback_query.message.message_id,
            text: `📄 **Работа с договорами**

Что вы хотите сделать?`,
            reply_markup: this.getContractsMenuKeyboard(),
            parse_mode: 'Markdown'
        };
    }

    // Обработчик загрузки договора
    async handleContractUpload(update) {
        const userId = update.callback_query.from.id;
        
        // Начинаем поток загрузки договора
        this.contextManager.startFlow(userId, 'contract_upload');
        
        return {
            method: 'editMessageText',
            chat_id: userId,
            message_id: update.callback_query.message.message_id,
            text: `📤 **Загрузка договора**

Пожалуйста, отправьте файл договора в одном из форматов:
• PDF
• DOCX
• DOC
• TXT

Или отправьте текст договора сообщением.`,
            reply_markup: this.getBackKeyboard(),
            parse_mode: 'Markdown'
        };
    }

    // Обработчик проверки ИНН
    async handleInnPrompt(update) {
        const userId = update.callback_query.from.id;
        
        // Начинаем поток проверки ИНН
        this.contextManager.startFlow(userId, 'inn_check');
        
        return {
            method: 'editMessageText',
            chat_id: userId,
            message_id: update.callback_query.message.message_id,
            text: `🔍 **Проверка контрагента**

Отправьте ИНН организации для проверки.

Формат ИНН:
• 10 цифр для юридических лиц
• 12 цифр для индивидуальных предпринимателей

Пример: 7707083893`,
            reply_markup: this.getBackKeyboard(),
            parse_mode: 'Markdown'
        };
    }

    // Обработчик проверки ИНН с данными
    async handleInnCheck(update, inn = null) {
        const userId = update.message?.from?.id || update.callback_query?.from?.id;
        const innToCheck = inn || update.message?.text;
        
        if (!this.isValidINN(innToCheck)) {
            return {
                method: 'sendMessage',
                chat_id: userId,
                text: '❌ Неверный формат ИНН. Пожалуйста, введите корректный ИНН (10 или 12 цифр).'
            };
        }

        // Показываем индикатор загрузки
        await this.sendTypingAction(userId);

        try {
            // Здесь будет интеграция с DaData API
            const innData = await this.checkInnWithDaData(innToCheck);

            // AI анализ данных контрагента
            const aiAnalysis = await this.aiEngine.analyzeCounterparty(userId, innData);
            
            // Сохраняем в историю
            this.contextManager.addToHistory(userId, 'inn_check', {
                inn: innToCheck,
                data: innData,
                analysis: aiAnalysis.content
            });
            
            // Завершаем поток
            this.contextManager.completeFlow(userId, { inn: innToCheck, result: innData });
            
            return {
                method: 'sendMessage',
                chat_id: userId,
                text: this.formatInnCheckResult(innData, aiAnalysis.content),
                reply_markup: this.getMainMenuKeyboard(),
                parse_mode: 'Markdown'
            };
            
        } catch (error) {
            console.error('INN check error:', error);
            return {
                method: 'sendMessage',
                chat_id: userId,
                text: '❌ Ошибка при проверке ИНН. Попробуйте позже.',
                reply_markup: this.getMainMenuKeyboard()
            };
        }
    }

    // Обработчик AI запросов
    async handleAIQuery(update) {
        const userId = update.message.from.id;
        const query = update.message.text;
        
        // Показываем индикатор печати
        await this.sendTypingAction(userId);
        
        try {
            // Обрабатываем запрос через AI Engine
            const response = await this.aiEngine.processQuery(userId, query);
            
            // Сохраняем в историю
            this.contextManager.addToHistory(userId, 'query', {
                query,
                response: response.content
            });
            
            return {
                method: 'sendMessage',
                chat_id: userId,
                text: response.content,
                reply_markup: this.getMainMenuKeyboard(),
                parse_mode: 'Markdown'
            };
            
        } catch (error) {
            console.error('AI query error:', error);
            return {
                method: 'sendMessage',
                chat_id: userId,
                text: '❌ Произошла ошибка при обработке запроса. Попробуйте еще раз.',
                reply_markup: this.getMainMenuKeyboard()
            };
        }
    }

    // Обработчик кнопки "Назад"
    async handleBack(update) {
        const userId = update.callback_query.from.id;
        const previousAction = this.contextManager.getPreviousMenuAction(userId);
        
        // Создаем новый update для предыдущего действия
        const backUpdate = {
            callback_query: {
                ...update.callback_query,
                data: previousAction
            }
        };
        
        return await this.handleCallback(backUpdate);
    }

    // Обработчик отмены
    async handleCancel(update) {
        const userId = update.callback_query.from.id;
        
        // Завершаем текущий поток
        this.contextManager.completeFlow(userId);
        
        return await this.handleMainMenu(update);
    }

    // Получение главного меню
    getMainMenuKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: "📄 Договоры", callback_data: "eva:contracts:menu" },
                    { text: "📚 Пакет «Эверест»", callback_data: "eva:pkg:menu" }
                ],
                [
                    { text: "🔍 Проверка контрагента", callback_data: "eva:inn:prompt" }
                ],
                [
                    { text: "💳 Счёт/акты", callback_data: "eva:docs:billing" },
                    { text: "📈 Отчёты", callback_data: "eva:reports:menu" }
                ],
                [
                    { text: "⚙️ Настройки", callback_data: "eva:settings:menu" },
                    { text: "🆘 Помощь", callback_data: "eva:help:menu" }
                ]
            ]
        };
    }

    // Получение меню договоров
    getContractsMenuKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: "📤 Загрузить договор", callback_data: "eva:contracts:upload" }
                ],
                [
                    { text: "🔍 Анализ рисков", callback_data: "eva:contracts:risks" },
                    { text: "✏️ Редлайн", callback_data: "eva:contracts:redline" }
                ],
                [
                    { text: "🔙 Назад", callback_data: "eva:back" },
                    { text: "🏠 Главное меню", callback_data: "eva:main" }
                ]
            ]
        };
    }

    // Получение клавиатуры "Назад"
    getBackKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: "🔙 Назад", callback_data: "eva:back" },
                    { text: "❌ Отмена", callback_data: "eva:cancel" }
                ]
            ]
        };
    }

    // Валидация ИНН
    isValidINN(inn) {
        if (!inn || typeof inn !== 'string') return false;
        
        const cleanInn = inn.replace(/\D/g, '');
        return cleanInn.length === 10 || cleanInn.length === 12;
    }

    // Отправка действия "печатает"
    async sendTypingAction(chatId) {
        try {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    action: 'typing'
                })
            });
        } catch (error) {
            console.error('Error sending typing action:', error);
        }
    }

    // Заглушки для других обработчиков (будут реализованы в следующих фазах)
    async handleEverestMenu(update) { /* TODO */ }
    async handleBillingDocs(update) { /* TODO */ }
    async handleReportsMenu(update) { /* TODO */ }
    async handleSettingsMenu(update) { /* TODO */ }
    async handleHelpMenu(update) { /* TODO */ }
    async handleHelp(update) { /* TODO */ }
    async handleSettings(update) { /* TODO */ }
    async handleStats(update) { /* TODO */ }
    async handleExport(update) { /* TODO */ }
    async handleClear(update) { /* TODO */ }
    async handleError(update, error) { /* TODO */ }
    async handleUnknownCallback(update) { /* TODO */ }
    async checkInnWithDaData(inn) {
        return this.counterpartyService.lookupByInn(inn);
    }

    async formatInnCheckResult(data, analysis) {
        return this.counterpartyService.formatReport(data, analysis);
    }
}

module.exports = SmartRouter;

