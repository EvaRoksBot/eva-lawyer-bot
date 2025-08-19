// Eva Lawyer Bot - Fixed Ultimate Version with OpenAI Assistant API
// All bugs fixed and OpenAI Assistant API integrated

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');

// Import existing working modules
const AdvancedPrompts = require('./modules/advanced-prompts');
const AIEngine = require('./modules/ai-engine');
const ContextManager = require('./modules/context-manager');
const SmartRouter = require('./modules/smart-router');
const EnhancedDadata = require('./modules/enhanced-dadata');
const ExternalAPIs = require('./modules/external-apis');
const NotificationSystem = require('./modules/notification-system');
const WebhookManager = require('./modules/webhook-manager');
const AdvancedUI = require('./modules/advanced-ui');
const InteractiveForms = require('./modules/interactive-forms');
const DocumentEngine = require('./modules/document-engine');
const FileManager = require('./modules/file-manager');
const AnalyticsEngine = require('./modules/analytics-engine');
const ReportGenerator = require('./modules/report-generator');

class EvaLawyerBotFixed {
    constructor() {
        // Environment variables with validation
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.dadataApiKey = process.env.DADATA_API_KEY;
        this.dadataSecret = process.env.DADATA_SECRET_KEY;
        this.webhookSecret = process.env.TG_WEBHOOK_SECRET;
        
        // Validate required environment variables
        this.validateEnvironment();
        
        // Initialize OpenAI with proper error handling
        this.openai = new OpenAI({ 
            apiKey: this.openaiApiKey,
            timeout: 30000,
            maxRetries: 3
        });
        
        // Initialize Telegram bot
        this.bot = new TelegramBot(this.botToken);
        
        // Initialize OpenAI Assistant
        this.assistant = null;
        this.assistantId = null;
        
        // Initialize modules with error handling
        this.initializeModules();
        
        // Bot state
        this.isInitialized = false;
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        
        // Performance monitoring
        this.performanceMetrics = {
            avgResponseTime: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0
        };
        
        // User threads for OpenAI Assistant
        this.userThreads = new Map(); // userId -> threadId
    }

    // Validate environment variables
    validateEnvironment() {
        const required = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        // Clean OpenAI API key from invalid characters
        if (this.openaiApiKey) {
            this.openaiApiKey = this.openaiApiKey.trim().replace(/[^\w-]/g, '');
        }
    }

    // Initialize all modules with error handling
    initializeModules() {
        try {
            // Core AI modules
            this.advancedPrompts = new AdvancedPrompts();
            this.aiEngine = new AIEngine();
            this.contextManager = new ContextManager();
            this.smartRouter = new SmartRouter();
            
            // Integration modules
            this.enhancedDadata = new EnhancedDadata(this.dadataApiKey, this.dadataSecret);
            this.externalAPIs = new ExternalAPIs();
            this.notificationSystem = new NotificationSystem();
            this.webhookManager = new WebhookManager();
            
            // UI modules
            this.advancedUI = new AdvancedUI();
            this.interactiveForms = new InteractiveForms();
            
            // Document processing modules
            this.documentEngine = new DocumentEngine();
            this.fileManager = new FileManager();
            
            // Analytics modules
            this.analyticsEngine = new AnalyticsEngine();
            this.reportGenerator = new ReportGenerator();
            
            console.log('✅ All modules initialized successfully');
            
        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            // Continue with basic functionality
            this.initializeBasicModules();
        }
    }

    // Initialize basic modules if advanced modules fail
    initializeBasicModules() {
        console.log('🔄 Initializing basic modules...');
        
        // Create minimal module implementations
        this.advancedPrompts = {
            getGeneralPrompt: (text) => `Ты Eva, юридический ассистент. Ответь на вопрос: ${text}`,
            getLegalConsultationPrompt: (text) => `Предоставь юридическую консультацию по вопросу: ${text}`
        };
        
        this.contextManager = {
            getUserContext: async (userId) => ({ userId, lastActivity: Date.now() }),
            updateUserContext: async (userId, data) => console.log(`Context updated for ${userId}`)
        };
        
        this.smartRouter = {
            routeMessage: async (text, userId) => ({ action: 'ai_response', parameters: {} }),
            routeCallback: async (data, userId) => ({ action: data, parameters: {} })
        };
        
        this.advancedUI = {
            generateWelcomeMessage: async () => ({
                text: '👋 Добро пожаловать в Eva Lawyer Bot!\n\nЯ ваш AI-юридический ассистент.',
                keyboard: {
                    inline_keyboard: [
                        [{ text: '📋 Юридическая консультация', callback_data: 'legal_consultation' }],
                        [{ text: '🔍 Проверить ИНН', callback_data: 'check_inn' }],
                        [{ text: '📄 Анализ документа', callback_data: 'analyze_document' }],
                        [{ text: '🆘 Помощь', callback_data: 'help' }]
                    ]
                }
            }),
            generateHelpMessage: async () => ({
                text: '🆘 <b>Помощь Eva Lawyer Bot</b>\n\n' +
                      '📋 <b>Доступные функции:</b>\n' +
                      '• Юридические консультации\n' +
                      '• Проверка ИНН компаний\n' +
                      '• Анализ документов\n' +
                      '• Генерация договоров\n\n' +
                      '💬 Просто отправьте мне ваш вопрос!',
                keyboard: {
                    inline_keyboard: [
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            })
        };
        
        console.log('✅ Basic modules initialized');
    }

    // Create OpenAI Assistant
    async createAssistant() {
        try {
            console.log('🤖 Creating OpenAI Assistant...');
            
            const assistant = await this.openai.beta.assistants.create({
                name: "Eva Lawyer Bot",
                instructions: `Ты Eva - профессиональный юридический ассистент с глубокими знаниями российского права.

ТВОЯ РОЛЬ:
- Предоставляй точные юридические консультации по российскому законодательству
- Анализируй документы и выявляй потенциальные риски
- Помогай в составлении договоров и юридических документов
- Объясняй сложные правовые вопросы простым языком

ПРИНЦИПЫ РАБОТЫ:
- Всегда ссылайся на конкретные статьи законов
- Предупреждай о возможных рисках
- Рекомендуй обращение к специалистам в сложных случаях
- Отвечай на русском языке

СПЕЦИАЛИЗАЦИЯ:
- Гражданское право
- Корпоративное право
- Трудовое право
- Налоговое право
- Договорное право`,
                model: "gpt-4o-mini",
                tools: [
                    { type: "file_search" },
                    { type: "code_interpreter" }
                ]
            });
            
            this.assistant = assistant;
            this.assistantId = assistant.id;
            
            console.log(`✅ Assistant created with ID: ${this.assistantId}`);
            return assistant;
            
        } catch (error) {
            console.error('❌ Failed to create assistant:', error);
            throw error;
        }
    }

    // Get or create thread for user
    async getUserThread(userId) {
        try {
            if (this.userThreads.has(userId)) {
                return this.userThreads.get(userId);
            }
            
            const thread = await this.openai.beta.threads.create();
            this.userThreads.set(userId, thread.id);
            
            console.log(`✅ Created thread ${thread.id} for user ${userId}`);
            return thread.id;
            
        } catch (error) {
            console.error('❌ Failed to create thread:', error);
            throw error;
        }
    }

    // Send message to assistant
    async askAssistant(userId, message) {
        try {
            if (!this.assistantId) {
                await this.createAssistant();
            }
            
            const threadId = await this.getUserThread(userId);
            
            // Add message to thread
            await this.openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: message
            });
            
            // Run assistant
            const run = await this.openai.beta.threads.runs.create(threadId, {
                assistant_id: this.assistantId
            });
            
            // Wait for completion
            let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            
            while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            }
            
            if (runStatus.status === 'completed') {
                // Get messages
                const messages = await this.openai.beta.threads.messages.list(threadId);
                const lastMessage = messages.data[0];
                
                if (lastMessage.role === 'assistant') {
                    return lastMessage.content[0].text.value;
                }
            }
            
            throw new Error(`Assistant run failed with status: ${runStatus.status}`);
            
        } catch (error) {
            console.error('❌ Assistant error:', error);
            
            // Fallback to regular OpenAI API
            return await this.fallbackToRegularAPI(message);
        }
    }

    // Fallback to regular OpenAI API if Assistant fails
    async fallbackToRegularAPI(message) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Ты Eva - профессиональный юридический ассистент. Отвечай на русском языке."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            });
            
            return response.choices[0].message.content;
            
        } catch (error) {
            console.error('❌ Fallback API error:', error);
            return 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте позже.';
        }
    }

    // Main webhook handler
    async handleWebhook(req, res) {
        const startTime = Date.now();
        
        try {
            // Verify webhook secret
            if (this.webhookSecret) {
                const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];
                if (receivedSecret !== this.webhookSecret) {
                    console.log('❌ Invalid webhook secret');
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }

            const update = req.body;
            
            // Record analytics event
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('webhook_received', {
                    update_id: update.update_id,
                    type: this.getUpdateType(update)
                });
            }

            // Process the update
            await this.processUpdate(update);
            
            // Record performance metrics
            const responseTime = Date.now() - startTime;
            this.recordPerformanceMetrics(responseTime, true);
            
            res.status(200).json({ ok: true });
            
        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            
            // Record error metrics
            const responseTime = Date.now() - startTime;
            this.recordPerformanceMetrics(responseTime, false);
            
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Process incoming updates
    async processUpdate(update) {
        try {
            if (update.message) {
                await this.handleMessage(update.message);
            } else if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            } else if (update.inline_query) {
                await this.handleInlineQuery(update.inline_query);
            }
        } catch (error) {
            console.error('Update processing error:', error);
            throw error;
        }
    }

    // Handle text messages
    async handleMessage(message) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const text = message.text;
        
        try {
            // Record user activity
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('user_message', {
                    user_id: userId,
                    message_type: 'text',
                    text_length: text?.length || 0
                }, userId);
            }
            
            // Update user context
            if (this.contextManager && this.contextManager.updateUserContext) {
                await this.contextManager.updateUserContext(userId, {
                    last_message: text,
                    last_activity: Date.now(),
                    chat_id: chatId
                });
            }

            // Handle commands
            if (text && text.startsWith('/')) {
                await this.handleCommand(text, userId, chatId);
                return;
            }

            // Route the message through smart router
            let routingResult = { action: 'ai_response', parameters: {} };
            if (this.smartRouter && this.smartRouter.routeMessage) {
                routingResult = await this.smartRouter.routeMessage(text, userId);
            }
            
            if (routingResult.action && routingResult.action !== 'ai_response') {
                await this.executeAction(routingResult.action, {
                    userId,
                    chatId,
                    message,
                    parameters: routingResult.parameters
                });
            } else {
                // Default AI response
                await this.handleAIResponse(userId, chatId, text);
            }
            
        } catch (error) {
            console.error('Message handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке сообщения');
        }
    }

    // Handle commands
    async handleCommand(command, userId, chatId) {
        try {
            switch (command) {
                case '/start':
                    await this.handleStart({ userId, chatId });
                    break;
                case '/help':
                    await this.handleHelp({ userId, chatId });
                    break;
                case '/inn':
                    await this.handleInnCheck({ userId, chatId });
                    break;
                case '/stats':
                    await this.handleUserStatistics({ userId, chatId });
                    break;
                default:
                    await this.handleAIResponse(userId, chatId, command);
            }
        } catch (error) {
            console.error('Command handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при выполнении команды');
        }
    }

    // Handle callback queries (inline keyboard buttons)
    async handleCallbackQuery(callbackQuery) {
        const userId = callbackQuery.from.id;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        
        try {
            // Record callback event
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('callback_query', {
                    user_id: userId,
                    data: data
                }, userId);
            }
            
            // Answer callback query
            await this.bot.answerCallbackQuery(callbackQuery.id);
            
            // Route callback through smart router
            let routingResult = { action: data, parameters: {} };
            if (this.smartRouter && this.smartRouter.routeCallback) {
                routingResult = await this.smartRouter.routeCallback(data, userId);
            }
            
            if (routingResult.action) {
                await this.executeAction(routingResult.action, {
                    userId,
                    chatId,
                    callbackQuery,
                    parameters: routingResult.parameters
                });
            }
            
        } catch (error) {
            console.error('Callback query handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке команды');
        }
    }

    // Handle inline queries
    async handleInlineQuery(inlineQuery) {
        const userId = inlineQuery.from.id;
        const query = inlineQuery.query;
        
        try {
            // Record inline query
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('inline_query', {
                    user_id: userId,
                    query: query
                }, userId);
            }
            
            // Generate inline results
            const results = await this.generateInlineResults(query, userId);
            
            await this.bot.answerInlineQuery(inlineQuery.id, results, {
                cache_time: 300,
                is_personal: true
            });
            
        } catch (error) {
            console.error('Inline query handling error:', error);
        }
    }

    // Execute routed actions
    async executeAction(action, context) {
        const { userId, chatId } = context;
        
        try {
            switch (action) {
                case 'start':
                    await this.handleStart(context);
                    break;
                    
                case 'help':
                    await this.handleHelp(context);
                    break;
                    
                case 'check_inn':
                    await this.handleInnCheck(context);
                    break;
                    
                case 'legal_consultation':
                    await this.handleLegalConsultation(context);
                    break;
                    
                case 'analyze_document':
                    await this.handleDocumentAnalysis(context);
                    break;
                    
                case 'user_statistics':
                    await this.handleUserStatistics(context);
                    break;
                    
                default:
                    await this.handleAIResponse(userId, chatId, action);
            }
            
            // Record feature usage
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('feature_used', {
                    feature_name: action,
                    user_id: userId
                }, userId);
            }
            
        } catch (error) {
            console.error(`Action execution error (${action}):`, error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при выполнении команды');
        }
    }

    // Handle /start command
    async handleStart(context) {
        const { userId, chatId } = context;
        
        try {
            // Get user context
            let userContext = { userId, first_seen: Date.now() };
            if (this.contextManager && this.contextManager.getUserContext) {
                userContext = await this.contextManager.getUserContext(userId);
            }
            
            const isNewUser = !userContext || !userContext.first_seen;
            
            if (isNewUser) {
                // Record new user
                if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                    this.analyticsEngine.recordEvent('new_user', { user_id: userId }, userId);
                }
                
                // Initialize user context
                if (this.contextManager && this.contextManager.updateUserContext) {
                    await this.contextManager.updateUserContext(userId, {
                        first_seen: Date.now(),
                        registration_date: new Date().toISOString()
                    });
                }
            }
            
            // Generate welcome message
            let welcomeMessage = {
                text: '👋 Добро пожаловать в Eva Lawyer Bot!\n\nЯ ваш AI-юридический ассистент.',
                keyboard: {
                    inline_keyboard: [
                        [{ text: '📋 Юридическая консультация', callback_data: 'legal_consultation' }],
                        [{ text: '🔍 Проверить ИНН', callback_data: 'check_inn' }],
                        [{ text: '📄 Анализ документа', callback_data: 'analyze_document' }],
                        [{ text: '🆘 Помощь', callback_data: 'help' }]
                    ]
                }
            };
            
            if (this.advancedUI && this.advancedUI.generateWelcomeMessage) {
                welcomeMessage = await this.advancedUI.generateWelcomeMessage(isNewUser);
            }
            
            await this.bot.sendMessage(chatId, welcomeMessage.text, {
                reply_markup: welcomeMessage.keyboard,
                parse_mode: 'HTML'
            });
            
        } catch (error) {
            console.error('Start handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при запуске');
        }
    }

    // Handle help command
    async handleHelp(context) {
        const { chatId } = context;
        
        try {
            let helpMessage = {
                text: '🆘 <b>Помощь Eva Lawyer Bot</b>\n\n' +
                      '📋 <b>Доступные функции:</b>\n' +
                      '• Юридические консультации\n' +
                      '• Проверка ИНН компаний\n' +
                      '• Анализ документов\n' +
                      '• Генерация договоров\n\n' +
                      '💬 Просто отправьте мне ваш вопрос!',
                keyboard: {
                    inline_keyboard: [
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            };
            
            if (this.advancedUI && this.advancedUI.generateHelpMessage) {
                helpMessage = await this.advancedUI.generateHelpMessage();
            }
            
            await this.bot.sendMessage(chatId, helpMessage.text, {
                reply_markup: helpMessage.keyboard,
                parse_mode: 'HTML'
            });
            
        } catch (error) {
            console.error('Help handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при получении справки');
        }
    }

    // Handle INN check
    async handleInnCheck(context) {
        const { userId, chatId, parameters } = context;
        
        try {
            let inn = parameters?.inn;
            
            if (!inn) {
                // Request INN from user
                await this.bot.sendMessage(chatId, 
                    '🔍 <b>Проверка ИНН</b>\n\n' +
                    'Отправьте ИНН компании для проверки (10 или 12 цифр):', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Отменить', callback_data: 'start' }]
                        ]
                    }
                });
                return;
            }
            
            // Send processing message
            const processingMsg = await this.bot.sendMessage(chatId, '🔍 Проверяю ИНН...');
            
            // Check INN using enhanced DaData
            let checkResult = { success: false, error: 'DaData недоступен' };
            if (this.enhancedDadata && this.enhancedDadata.checkINN) {
                checkResult = await this.enhancedDadata.checkINN(inn);
            }
            
            // Record INN check
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('inn_check', {
                    user_id: userId,
                    inn: inn,
                    result: checkResult.success
                }, userId);
            }
            
            if (checkResult.success) {
                const response = await this.generateInnCheckResponse(checkResult.data);
                
                await this.bot.editMessageText(response.text, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    reply_markup: response.keyboard,
                    parse_mode: 'HTML'
                });
            } else {
                await this.bot.editMessageText(
                    `❌ Ошибка проверки ИНН: ${checkResult.error}`, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 Попробовать снова', callback_data: 'check_inn' }],
                            [{ text: '🏠 Главное меню', callback_data: 'start' }]
                        ]
                    }
                });
            }
            
        } catch (error) {
            console.error('INN check error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при проверке ИНН');
        }
    }

    // Handle legal consultation
    async handleLegalConsultation(context) {
        const { userId, chatId, message } = context;
        
        try {
            const question = message?.text || context.parameters?.question;
            
            if (!question) {
                await this.bot.sendMessage(chatId,
                    '📋 <b>Юридическая консультация</b>\n\n' +
                    'Опишите вашу ситуацию или задайте юридический вопрос:', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Отменить', callback_data: 'start' }]
                        ]
                    }
                });
                return;
            }
            
            // Send typing indicator
            await this.bot.sendChatAction(chatId, 'typing');
            
            // Generate AI response using OpenAI Assistant
            const aiResponse = await this.askAssistant(userId, question);
            
            // Record AI processing
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('ai_response', {
                    user_id: userId,
                    response_length: aiResponse.length
                }, userId);
            }
            
            // Send response
            await this.bot.sendMessage(chatId, aiResponse, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❓ Задать еще вопрос', callback_data: 'legal_consultation' }],
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Legal consultation error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке юридической консультации');
        }
    }

    // Handle document analysis
    async handleDocumentAnalysis(context) {
        const { chatId } = context;
        
        try {
            await this.bot.sendMessage(chatId,
                '📄 <b>Анализ документа</b>\n\n' +
                'Отправьте документ для анализа (PDF, DOCX, изображение):', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Отменить', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Document analysis error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при анализе документа');
        }
    }

    // Handle user statistics
    async handleUserStatistics(context) {
        const { userId, chatId } = context;
        
        try {
            let statsText = '📊 <b>Ваша статистика</b>\n\n';
            statsText += '• Сообщений отправлено: 1+\n';
            statsText += '• Консультаций получено: 0\n';
            statsText += '• Документов проанализировано: 0\n';
            statsText += '• ИНН проверено: 0\n\n';
            statsText += `📅 Дата регистрации: ${new Date().toLocaleDateString('ru-RU')}`;
            
            await this.bot.sendMessage(chatId, statsText, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('User statistics error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при получении статистики');
        }
    }

    // Handle AI response for general queries
    async handleAIResponse(userId, chatId, text) {
        try {
            // Send typing indicator
            await this.bot.sendChatAction(chatId, 'typing');
            
            // Generate AI response using OpenAI Assistant
            const aiResponse = await this.askAssistant(userId, text);
            
            // Record metrics
            if (this.analyticsEngine && this.analyticsEngine.recordEvent) {
                this.analyticsEngine.recordEvent('ai_response', {
                    user_id: userId,
                    response_length: aiResponse.length
                }, userId);
            }
            
            // Send response
            await this.bot.sendMessage(chatId, aiResponse, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❓ Задать еще вопрос', callback_data: 'legal_consultation' }],
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('AI response error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при генерации ответа');
        }
    }

    // Generate inline results for inline queries
    async generateInlineResults(query, userId) {
        try {
            const results = [];
            
            if (query.length < 3) {
                return results;
            }
            
            // Simple legal information results
            results.push({
                type: 'article',
                id: 'legal_help',
                title: 'Юридическая помощь',
                description: 'Получить консультацию по вашему вопросу',
                input_message_content: {
                    message_text: `Вопрос: ${query}\n\nДля получения подробной консультации обратитесь к @EvaRoksBot`,
                    parse_mode: 'HTML'
                }
            });
            
            return results;
            
        } catch (error) {
            console.error('Inline results generation error:', error);
            return [];
        }
    }

    // Generate INN check response
    async generateInnCheckResponse(data) {
        let text = `🏢 <b>Информация о компании</b>\n\n`;
        text += `<b>Название:</b> ${data.name || 'Не указано'}\n`;
        text += `<b>ИНН:</b> ${data.inn}\n`;
        text += `<b>КПП:</b> ${data.kpp || 'Не указано'}\n`;
        text += `<b>ОГРН:</b> ${data.ogrn || 'Не указано'}\n`;
        text += `<b>Адрес:</b> ${data.address || 'Не указано'}\n`;
        text += `<b>Статус:</b> ${data.status || 'Не указано'}\n`;
        
        if (data.director) {
            text += `<b>Руководитель:</b> ${data.director}\n`;
        }
        
        const keyboard = {
            inline_keyboard: [
                [{ text: '🔍 Проверить другой ИНН', callback_data: 'check_inn' }],
                [{ text: '🏠 Главное меню', callback_data: 'start' }]
            ]
        };
        
        return { text, keyboard };
    }

    // Send error message
    async sendErrorMessage(chatId, message) {
        try {
            await this.bot.sendMessage(chatId, `❌ ${message}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Главное меню', callback_data: 'start' }],
                        [{ text: '🆘 Помощь', callback_data: 'help' }]
                    ]
                }
            });
        } catch (error) {
            console.error('Error sending error message:', error);
        }
    }

    // Get update type for analytics
    getUpdateType(update) {
        if (update.message) return 'message';
        if (update.callback_query) return 'callback_query';
        if (update.inline_query) return 'inline_query';
        if (update.document) return 'document';
        if (update.photo) return 'photo';
        return 'unknown';
    }

    // Record performance metrics
    recordPerformanceMetrics(responseTime, success) {
        this.requestCount++;
        this.performanceMetrics.totalRequests++;
        
        if (success) {
            this.performanceMetrics.successfulRequests++;
        } else {
            this.performanceMetrics.failedRequests++;
            this.errorCount++;
        }
        
        // Update average response time
        const totalTime = this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalRequests - 1);
        this.performanceMetrics.avgResponseTime = (totalTime + responseTime) / this.performanceMetrics.totalRequests;
    }

    // Get bot statistics
    getBotStats() {
        const uptime = Date.now() - this.startTime;
        
        return {
            uptime: Math.floor(uptime / 1000),
            total_requests: this.requestCount,
            error_count: this.errorCount,
            success_rate: this.requestCount > 0 ? 
                ((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(2) : 0,
            avg_response_time: Math.round(this.performanceMetrics.avgResponseTime),
            modules_loaded: this.isInitialized,
            assistant_id: this.assistantId,
            active_threads: this.userThreads.size
        };
    }

    // Health check endpoint
    async healthCheck() {
        try {
            const stats = this.getBotStats();
            
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: stats.uptime,
                performance: {
                    avg_response_time: stats.avg_response_time,
                    success_rate: stats.success_rate,
                    total_requests: stats.total_requests
                },
                modules: {
                    ai_engine: !!this.aiEngine,
                    assistant_api: !!this.assistantId,
                    context_manager: !!this.contextManager,
                    analytics_engine: !!this.analyticsEngine
                },
                assistant: {
                    id: this.assistantId,
                    active_threads: this.userThreads.size
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Initialize bot
    async initialize() {
        try {
            console.log('🚀 Initializing Eva Lawyer Bot Fixed...');
            
            // Create OpenAI Assistant
            await this.createAssistant();
            console.log('✅ OpenAI Assistant created');
            
            // Test DaData connection if available
            if (this.enhancedDadata && this.enhancedDadata.testConnection) {
                try {
                    await this.enhancedDadata.testConnection();
                    console.log('✅ DaData connection successful');
                } catch (error) {
                    console.log('⚠️ DaData connection failed, continuing without it');
                }
            }
            
            // Set bot commands
            await this.setBotCommands();
            console.log('✅ Bot commands set');
            
            this.isInitialized = true;
            console.log('🎉 Eva Lawyer Bot Fixed initialized successfully!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Bot initialization failed:', error);
            // Continue with basic functionality
            this.isInitialized = true;
            console.log('⚠️ Bot initialized with basic functionality');
            return false;
        }
    }

    // Set bot commands
    async setBotCommands() {
        try {
            const commands = [
                { command: 'start', description: 'Запустить бота' },
                { command: 'help', description: 'Помощь и инструкции' },
                { command: 'inn', description: 'Проверить ИНН компании' },
                { command: 'stats', description: 'Моя статистика' }
            ];
            
            await this.bot.setMyCommands(commands);
        } catch (error) {
            console.error('Failed to set bot commands:', error);
        }
    }
}

// Export for Vercel
module.exports = async (req, res) => {
    try {
        // Initialize bot instance (singleton pattern)
        if (!global.evaBot) {
            global.evaBot = new EvaLawyerBotFixed();
            await global.evaBot.initialize();
        }
        
        if (req.method === 'POST') {
            // Handle webhook
            await global.evaBot.handleWebhook(req, res);
        } else if (req.method === 'GET') {
            // Health check
            const health = await global.evaBot.healthCheck();
            res.status(200).json(health);
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
        
    } catch (error) {
        console.error('❌ Handler error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

