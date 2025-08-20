// Eva Lawyer Bot - Enhanced Logic v6.1
// Полная настройка логики бота с GPT API, промптами, скорингом и inline меню

// Загрузка переменных окружения
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');

// Импорт всех модулей
const UnifiedMenuSystem = require('./modules/unified-menu-system');
const UnifiedMessageHandler = require('./modules/unified-message-handler');
const UnifiedAIOrchestrator = require('./modules/unified-ai-orchestrator');
const AssistantTools = require('./modules/assistant-tools');
const EnhancedUISystem = require('./modules/enhanced-ui-system');
const PersonalizationEngine = require('./modules/personalization-engine');
const InteractiveHandlers = require('./modules/interactive-handlers');

class EvaLawyerBotUnified {
    constructor() {
        // Конфигурация
        this.config = {
            telegramToken: process.env.TELEGRAM_BOT_TOKEN,
            openaiApiKey: process.env.OPENAI_API_KEY,
            assistantId: process.env.OPENAI_ASSISTANT_ID,
            dadataApiKey: process.env.DADATA_API_KEY,
            dadataSecret: process.env.DADATA_SECRET_KEY,
            webhookSecret: process.env.TG_WEBHOOK_SECRET,
            environment: process.env.NODE_ENV || 'production'
        };
        
        // Валидация конфигурации
        this.validateConfiguration();
        
        // Инициализация основных компонентов
        this.bot = null;
        this.openai = null;
        
        // Системы
        this.menuSystem = null;
        this.messageHandler = null;
        this.aiOrchestrator = null;
        this.assistantTools = null;
        this.uiSystem = null;
        this.personalization = null;
        this.interactiveHandlers = null;
        
        // Состояние системы
        this.isInitialized = false;
        this.startTime = Date.now();
        
        // Метрики системы
        this.systemMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            uptime: 0,
            memoryUsage: 0,
            activeUsers: new Set(),
            errorLog: []
        };
        
        // Инициализация
        this.initialize();
    }

    // Валидация конфигурации
    validateConfiguration() {
        const required = ['telegramToken', 'openaiApiKey'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        // Очистка токенов (исправление проблемы с дефисами)
        this.config.telegramToken = this.config.telegramToken.trim();
        this.config.openaiApiKey = this.config.openaiApiKey.trim();
        
        console.log('✅ Configuration validated successfully');
    }

    // Инициализация системы
    async initialize() {
        try {
            console.log('🚀 Initializing Eva Lawyer Bot Unified System...');
            
            // 1. Инициализация Telegram Bot
            await this.initializeTelegramBot();
            
            // 2. Инициализация OpenAI
            await this.initializeOpenAI();
            
            // 3. Инициализация AI Orchestrator
            await this.initializeAIOrchestrator();
            
            // 4. Инициализация Assistant Tools
            await this.initializeAssistantTools();
            
            // 5. Инициализация UI System
            await this.initializeUISystem();
            
            // 6. Инициализация Personalization
            await this.initializePersonalization();
            
            // 7. Инициализация Menu System
            await this.initializeMenuSystem();
            
            // 8. Инициализация Interactive Handlers
            await this.initializeInteractiveHandlers();
            
            // 9. Инициализация Message Handler
            await this.initializeMessageHandler();
            
            // 10. Настройка обработчиков событий
            await this.setupEventHandlers();
            
            // 11. Запуск системных задач
            await this.startSystemTasks();
            
            this.isInitialized = true;
            console.log('✅ Eva Lawyer Bot Unified System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize system:', error);
            throw error;
        }
    }

    // Инициализация Telegram Bot
    async initializeTelegramBot() {
        try {
            this.bot = new TelegramBot(this.config.telegramToken, {
                webHook: this.config.environment === 'production'
            });
            
            if (this.config.environment === 'production') {
                // Настройка webhook для продакшена
                const webhookUrl = `${process.env.VERCEL_URL || 'https://your-domain.vercel.app'}/api/telegram-unified-system`;
                await this.bot.setWebHook(webhookUrl, {
                    secret_token: this.config.webhookSecret,
                    drop_pending_updates: true
                });
                console.log('✅ Telegram webhook configured');
            } else {
                // Polling для разработки
                this.bot.startPolling();
                console.log('✅ Telegram polling started');
            }
            
        } catch (error) {
            console.error('❌ Telegram Bot initialization failed:', error);
            throw error;
        }
    }

    // Инициализация OpenAI
    async initializeOpenAI() {
        try {
            this.openai = new OpenAI({
                apiKey: this.config.openaiApiKey
            });
            
            // Тест подключения
            await this.openai.models.list();
            console.log('✅ OpenAI connection established');
            
        } catch (error) {
            console.error('❌ OpenAI initialization failed:', error);
            throw error;
        }
    }

    // Инициализация AI Orchestrator
    async initializeAIOrchestrator() {
        try {
            this.aiOrchestrator = new UnifiedAIOrchestrator(
                this.config.openaiApiKey,
                this.config.assistantId
            );
            
            await this.aiOrchestrator.initialize();
            console.log('✅ AI Orchestrator initialized');
            
        } catch (error) {
            console.error('❌ AI Orchestrator initialization failed:', error);
            // Продолжаем без AI Orchestrator
            this.aiOrchestrator = null;
        }
    }

    // Инициализация Assistant Tools
    async initializeAssistantTools() {
        try {
            this.assistantTools = new AssistantTools(
                this.config.dadataApiKey,
                this.config.dadataSecret
            );
            
            console.log('✅ Assistant Tools initialized');
            
        } catch (error) {
            console.error('❌ Assistant Tools initialization failed:', error);
            this.assistantTools = null;
        }
    }

    // Инициализация UI System
    async initializeUISystem() {
        try {
            this.uiSystem = new EnhancedUISystem();
            console.log('✅ UI System initialized');
            
        } catch (error) {
            console.error('❌ UI System initialization failed:', error);
            this.uiSystem = null;
        }
    }

    // Инициализация Personalization
    async initializePersonalization() {
        try {
            this.personalization = new PersonalizationEngine();
            console.log('✅ Personalization Engine initialized');
            
        } catch (error) {
            console.error('❌ Personalization initialization failed:', error);
            this.personalization = null;
        }
    }

    // Инициализация Menu System
    async initializeMenuSystem() {
        try {
            this.menuSystem = new UnifiedMenuSystem(
                this.uiSystem,
                this.personalization
            );
            
            console.log('✅ Menu System initialized');
            
        } catch (error) {
            console.error('❌ Menu System initialization failed:', error);
            this.menuSystem = null;
        }
    }

    // Инициализация Interactive Handlers
    async initializeInteractiveHandlers() {
        try {
            this.interactiveHandlers = new InteractiveHandlers(
                this.assistantTools,
                this.aiOrchestrator
            );
            
            console.log('✅ Interactive Handlers initialized');
            
        } catch (error) {
            console.error('❌ Interactive Handlers initialization failed:', error);
            this.interactiveHandlers = null;
        }
    }

    // Инициализация Message Handler
    async initializeMessageHandler() {
        try {
            this.messageHandler = new UnifiedMessageHandler(
                this.bot,
                this.aiOrchestrator,
                this.menuSystem,
                this.assistantTools
            );
            
            console.log('✅ Message Handler initialized');
            
        } catch (error) {
            console.error('❌ Message Handler initialization failed:', error);
            throw error; // Критическая ошибка
        }
    }

    // Настройка обработчиков событий
    async setupEventHandlers() {
        try {
            // Обработчик сообщений
            this.bot.on('message', async (msg) => {
                await this.handleMessage(msg);
            });
            
            // Обработчик callback queries
            this.bot.on('callback_query', async (callbackQuery) => {
                await this.handleCallbackQuery(callbackQuery);
            });
            
            // Обработчик ошибок
            this.bot.on('error', (error) => {
                this.handleError(error);
            });
            
            // Обработчик webhook ошибок
            this.bot.on('webhook_error', (error) => {
                this.handleWebhookError(error);
            });
            
            console.log('✅ Event handlers configured');
            
        } catch (error) {
            console.error('❌ Event handlers setup failed:', error);
            throw error;
        }
    }

    // Запуск системных задач
    async startSystemTasks() {
        try {
            // Очистка кэша каждые 30 минут
            setInterval(() => {
                this.cleanupCache();
            }, 30 * 60 * 1000);
            
            // Сбор метрик каждые 5 минут
            setInterval(() => {
                this.collectMetrics();
            }, 5 * 60 * 1000);
            
            // Очистка неактивных threads каждый час
            setInterval(() => {
                if (this.aiOrchestrator) {
                    this.aiOrchestrator.cleanupThreads();
                }
            }, 60 * 60 * 1000);
            
            console.log('✅ System tasks started');
            
        } catch (error) {
            console.error('❌ System tasks startup failed:', error);
        }
    }

    // Основной обработчик сообщений
    async handleMessage(message) {
        const startTime = Date.now();
        
        try {
            // Обновляем активных пользователей
            this.systemMetrics.activeUsers.add(message.from.id);
            
            // Проверяем инициализацию
            if (!this.isInitialized) {
                await this.sendMessage(message.chat.id, '⏳ Система инициализируется, подождите...');
                return;
            }
            
            // Обрабатываем сообщение через Message Handler
            const response = await this.messageHandler.handleMessage(message);
            
            // Отправляем ответ
            if (response) {
                await this.sendResponse(message.chat.id, response);
            }
            
            // Обновляем метрики
            this.updateMetrics(startTime, true);
            
        } catch (error) {
            console.error('Error handling message:', error);
            this.updateMetrics(startTime, false);
            
            // Отправляем ошибку пользователю
            await this.sendErrorResponse(message.chat.id, error);
        }
    }

    // Обработчик callback queries
    async handleCallbackQuery(callbackQuery) {
        const startTime = Date.now();
        
        try {
            // Подтверждаем callback query
            await this.bot.answerCallbackQuery(callbackQuery.id);
            
            // Обрабатываем через Message Handler
            const response = await this.messageHandler.handleCallbackQuery(callbackQuery);
            
            // Отправляем ответ
            if (response) {
                await this.editOrSendMessage(callbackQuery.message, response);
            }
            
            // Обновляем метрики
            this.updateMetrics(startTime, true);
            
        } catch (error) {
            console.error('Error handling callback query:', error);
            this.updateMetrics(startTime, false);
            
            // Отправляем ошибку
            await this.sendErrorResponse(callbackQuery.message.chat.id, error);
        }
    }

    // Отправка ответа
    async sendResponse(chatId, response) {
        try {
            const options = {
                parse_mode: response.parse_mode || 'HTML',
                reply_markup: response.reply_markup,
                disable_web_page_preview: true
            };
            
            await this.bot.sendMessage(chatId, response.text, options);
            
        } catch (error) {
            console.error('Error sending response:', error);
            
            // Fallback - отправляем простое сообщение
            try {
                await this.bot.sendMessage(chatId, response.text || 'Ошибка отправки сообщения');
            } catch (fallbackError) {
                console.error('Fallback send also failed:', fallbackError);
            }
        }
    }

    // Редактирование или отправка сообщения
    async editOrSendMessage(originalMessage, response) {
        try {
            const options = {
                parse_mode: response.parse_mode || 'HTML',
                reply_markup: response.reply_markup,
                disable_web_page_preview: true
            };
            
            // Пытаемся отредактировать
            await this.bot.editMessageText(response.text, {
                chat_id: originalMessage.chat.id,
                message_id: originalMessage.message_id,
                ...options
            });
            
        } catch (error) {
            // Если редактирование не удалось, отправляем новое сообщение
            await this.sendResponse(originalMessage.chat.id, response);
        }
    }

    // Отправка простого сообщения
    async sendMessage(chatId, text, options = {}) {
        try {
            const defaultOptions = {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...options
            };
            
            return await this.bot.sendMessage(chatId, text, defaultOptions);
            
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Отправка ошибки пользователю
    async sendErrorResponse(chatId, error) {
        try {
            let errorMessage = '❌ Произошла ошибка при обработке запроса.';
            
            // Классифицируем ошибку
            if (error.message.includes('rate limit')) {
                errorMessage = '⏱️ Превышен лимит запросов. Подождите минуту.';
            } else if (error.message.includes('timeout')) {
                errorMessage = '⏰ Превышено время ожидания. Попробуйте еще раз.';
            } else if (error.message.includes('API')) {
                errorMessage = '🔧 Временные технические проблемы. Попробуйте позже.';
            }
            
            const response = {
                text: errorMessage,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Попробовать снова', callback_data: 'main' },
                        { text: '🆘 Помощь', callback_data: 'help_menu' }
                    ]]
                }
            };
            
            await this.sendResponse(chatId, response);
            
        } catch (sendError) {
            console.error('Error sending error response:', sendError);
        }
    }

    // Обработчик ошибок бота
    handleError(error) {
        console.error('Bot error:', error);
        
        // Логируем ошибку
        this.systemMetrics.errorLog.push({
            type: 'bot_error',
            message: error.message,
            timestamp: Date.now()
        });
        
        // Ограничиваем размер лога
        if (this.systemMetrics.errorLog.length > 100) {
            this.systemMetrics.errorLog = this.systemMetrics.errorLog.slice(-50);
        }
    }

    // Обработчик webhook ошибок
    handleWebhookError(error) {
        console.error('Webhook error:', error);
        
        // Логируем ошибку
        this.systemMetrics.errorLog.push({
            type: 'webhook_error',
            message: error.message,
            timestamp: Date.now()
        });
    }

    // Обновление метрик
    updateMetrics(startTime, success) {
        this.systemMetrics.totalRequests++;
        
        if (success) {
            this.systemMetrics.successfulRequests++;
        } else {
            this.systemMetrics.failedRequests++;
        }
        
        // Обновляем среднее время ответа
        const responseTime = Date.now() - startTime;
        const total = this.systemMetrics.totalRequests;
        this.systemMetrics.averageResponseTime = 
            (this.systemMetrics.averageResponseTime * (total - 1) + responseTime) / total;
    }

    // Сбор метрик
    collectMetrics() {
        try {
            // Uptime
            this.systemMetrics.uptime = Date.now() - this.startTime;
            
            // Memory usage
            const memUsage = process.memoryUsage();
            this.systemMetrics.memoryUsage = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
            };
            
            // Очищаем старых активных пользователей (старше 24 часов)
            // В реальной реализации нужно отслеживать время последней активности
            
        } catch (error) {
            console.error('Error collecting metrics:', error);
        }
    }

    // Очистка кэша
    cleanupCache() {
        try {
            if (this.aiOrchestrator) {
                this.aiOrchestrator.clearCache();
            }
            
            if (this.messageHandler) {
                // Очистка кэша обработчика сообщений
                const handlerStats = this.messageHandler.getHandlerStatistics();
                console.log('📊 Handler stats:', handlerStats);
            }
            
            console.log('🧹 Cache cleanup completed');
            
        } catch (error) {
            console.error('Error during cache cleanup:', error);
        }
    }

    // Получение статистики системы
    getSystemStatistics() {
        const stats = {
            system: {
                ...this.systemMetrics,
                uptime: Date.now() - this.startTime,
                isInitialized: this.isInitialized,
                activeUsersCount: this.systemMetrics.activeUsers.size
            }
        };
        
        // Добавляем статистику компонентов
        if (this.aiOrchestrator) {
            stats.ai = this.aiOrchestrator.getStatistics();
        }
        
        if (this.messageHandler) {
            stats.messageHandler = this.messageHandler.getHandlerStatistics();
        }
        
        if (this.menuSystem) {
            stats.menu = this.menuSystem.getStatistics();
        }
        
        return stats;
    }

    // Health check
    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            components: {}
        };
        
        try {
            // Проверка Telegram Bot
            health.components.telegram = this.bot ? 'healthy' : 'unhealthy';
            
            // Проверка OpenAI
            if (this.openai) {
                try {
                    await this.openai.models.list();
                    health.components.openai = 'healthy';
                } catch (error) {
                    health.components.openai = 'unhealthy';
                }
            } else {
                health.components.openai = 'not_initialized';
            }
            
            // Проверка AI Orchestrator
            health.components.aiOrchestrator = this.aiOrchestrator ? 'healthy' : 'not_initialized';
            
            // Проверка Message Handler
            health.components.messageHandler = this.messageHandler ? 'healthy' : 'unhealthy';
            
            // Общий статус
            const unhealthyComponents = Object.values(health.components)
                .filter(status => status === 'unhealthy').length;
            
            if (unhealthyComponents > 0) {
                health.status = 'degraded';
            }
            
            if (!this.isInitialized) {
                health.status = 'initializing';
            }
            
        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }
        
        return health;
    }

    // Экспорт конфигурации
    exportConfiguration() {
        return {
            config: {
                ...this.config,
                telegramToken: '***',
                openaiApiKey: '***',
                dadataApiKey: '***',
                dadataSecret: '***'
            },
            isInitialized: this.isInitialized,
            startTime: this.startTime,
            components: {
                bot: !!this.bot,
                openai: !!this.openai,
                aiOrchestrator: !!this.aiOrchestrator,
                assistantTools: !!this.assistantTools,
                uiSystem: !!this.uiSystem,
                personalization: !!this.personalization,
                menuSystem: !!this.menuSystem,
                interactiveHandlers: !!this.interactiveHandlers,
                messageHandler: !!this.messageHandler
            }
        };
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🔄 Shutting down Eva Lawyer Bot...');
        
        try {
            // Останавливаем polling если активен
            if (this.bot && this.config.environment !== 'production') {
                this.bot.stopPolling();
            }
            
            // Очищаем интервалы
            // В реальной реализации нужно сохранять ID интервалов
            
            // Сохраняем финальные метрики
            console.log('📊 Final statistics:', this.getSystemStatistics());
            
            console.log('✅ Eva Lawyer Bot shutdown completed');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        }
    }
}

// Создание глобального экземпляра
let botInstance = null;

// Функция для получения экземпляра бота
function getBotInstance() {
    if (!botInstance) {
        botInstance = new EvaLawyerBotUnified();
    }
    return botInstance;
}

// Обработчик для Vercel
async function handler(req, res) {
    try {
        const bot = getBotInstance();
        
        // Health check endpoint
        if (req.url === '/health') {
            const health = await bot.healthCheck();
            return res.status(200).json(health);
        }
        
        // Statistics endpoint
        if (req.url === '/stats') {
            const stats = bot.getSystemStatistics();
            return res.status(200).json(stats);
        }
        
        // Webhook endpoint
        if (req.method === 'POST') {
            // Проверяем secret token
            const secretToken = req.headers['x-telegram-bot-api-secret-token'];
            if (bot.config.webhookSecret && secretToken !== bot.config.webhookSecret) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            // Обрабатываем update
            const update = req.body;
            
            if (update.message) {
                await bot.handleMessage(update.message);
            } else if (update.callback_query) {
                await bot.handleCallbackQuery(update.callback_query);
            }
            
            return res.status(200).json({ ok: true });
        }
        
        // GET запрос - информация о боте
        return res.status(200).json({
            name: 'Eva Lawyer Bot Unified System',
            version: '6.0',
            status: bot.isInitialized ? 'ready' : 'initializing',
            uptime: Date.now() - bot.startTime
        });
        
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

// Экспорт для Vercel
module.exports = handler;

// Экспорт класса для тестирования
module.exports.EvaLawyerBotUnified = EvaLawyerBotUnified;
module.exports.getBotInstance = getBotInstance;

