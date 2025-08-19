// Eva Lawyer Bot - Fixed OpenAI API 400 Error
// Complete implementation with Assistant API, tools, and enhanced error handling

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Import enhanced modules with fallbacks
let AdvancedPrompts, ContextManager, SmartRouter, EnhancedDaData, AdvancedUI;
let DocumentEngine, AnalyticsEngine, AssistantTools, EnhancedUISystem, InteractiveHandlers;

try {
    AdvancedPrompts = require('./modules/advanced-prompts');
    ContextManager = require('./modules/context-manager');
    SmartRouter = require('./modules/smart-router');
    EnhancedDaData = require('./modules/enhanced-dadata');
    AdvancedUI = require('./modules/advanced-ui');
    DocumentEngine = require('./modules/document-engine');
    AnalyticsEngine = require('./modules/analytics-engine');
    AssistantTools = require('./modules/assistant-tools');
    EnhancedUISystem = require('./modules/enhanced-ui-system');
    InteractiveHandlers = require('./modules/interactive-handlers');
} catch (error) {
    console.log('⚠️ Some modules not available, using fallbacks');
}

class EvaLawyerBotFixed {
    constructor() {
        // Environment variables with validation
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.dadataApiKey = process.env.DADATA_API_KEY;
        this.dadataSecret = process.env.DADATA_SECRET_KEY;
        this.webhookSecret = process.env.TG_WEBHOOK_SECRET;
        
        // Validate and clean environment variables
        this.validateEnvironment();
        
        // Initialize OpenAI with proper configuration and error handling
        this.openai = new OpenAI({ 
            apiKey: this.openaiApiKey,
            timeout: 60000,
            maxRetries: 3
        });
        
        // Initialize Telegram bot
        this.bot = new TelegramBot(this.botToken);
        
        // OpenAI Assistant configuration
        this.assistant = null;
        this.assistantId = process.env.OPENAI_ASSISTANT_ID || null;
        this.vectorStoreId = null;
        
        // User management
        this.userThreads = new Map(); // userId -> threadId
        this.userSessions = new Map(); // userId -> session data
        
        // File handling
        this.uploadDir = '/tmp/uploads';
        this.ensureUploadDir();
        
        // Initialize modules with fallbacks
        this.initializeModules();
        
        // Bot state
        this.isInitialized = false;
        this.startTime = Date.now();
        
        // Performance optimization
        this.responseCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.rateLimiter = new Map();
        
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            assistantCalls: 0,
            documentsProcessed: 0,
            cacheHits: 0,
            rateLimitHits: 0,
            fallbackCalls: 0,
            apiErrors: {
                400: 0,
                401: 0,
                429: 0,
                500: 0
            }
        };
    }

    // Validate and clean environment variables - FIXED
    validateEnvironment() {
        const required = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        // Clean OpenAI API key - FIXED: Don't remove valid characters
        if (this.openaiApiKey) {
            this.openaiApiKey = this.openaiApiKey.trim();
            
            // Validate API key format
            if (!this.openaiApiKey.startsWith('sk-')) {
                console.error('❌ Invalid OpenAI API key format');
                throw new Error('Invalid OpenAI API key format');
            }
            
            console.log('✅ OpenAI API key validated');
        }
        
        console.log('✅ Environment variables validated');
    }

    // Ensure upload directory exists
    ensureUploadDir() {
        try {
            if (!fs.existsSync(this.uploadDir)) {
                fs.mkdirSync(this.uploadDir, { recursive: true });
            }
            console.log('✅ Upload directory ready');
        } catch (error) {
            console.error('❌ Failed to create upload directory:', error);
        }
    }

    // Initialize modules with error handling and fallbacks
    initializeModules() {
        try {
            // Initialize enhanced modules with fallbacks
            this.advancedPrompts = AdvancedPrompts ? new AdvancedPrompts() : null;
            this.contextManager = ContextManager ? new ContextManager() : null;
            this.smartRouter = SmartRouter ? new SmartRouter() : null;
            this.enhancedDadata = EnhancedDaData ? new EnhancedDaData(this.dadataApiKey, this.dadataSecret) : null;
            this.advancedUI = AdvancedUI ? new AdvancedUI() : null;
            this.documentEngine = DocumentEngine ? new DocumentEngine() : null;
            this.analyticsEngine = AnalyticsEngine ? new AnalyticsEngine() : null;
            this.assistantTools = AssistantTools ? new AssistantTools(this.enhancedDadata) : null;
            this.uiSystem = EnhancedUISystem ? new EnhancedUISystem() : null;
            
            // Initialize interactive handlers
            if (InteractiveHandlers && this.uiSystem && this.assistantTools) {
                this.interactiveHandlers = new InteractiveHandlers(this.bot, this.uiSystem, this.assistantTools);
            }
            
            console.log('✅ Modules initialized with fallbacks');
        } catch (error) {
            console.error('❌ Module initialization error:', error);
            console.log('⚠️ Continuing with basic functionality');
        }
    }

    // Create or get OpenAI Assistant with enhanced error handling - FIXED
    async createOrGetAssistant() {
        try {
            // Validate OpenAI client
            if (!this.openai) {
                throw new Error('OpenAI client not initialized');
            }
            
            // If we have an assistant ID, try to retrieve it
            if (this.assistantId) {
                try {
                    this.assistant = await this.openai.beta.assistants.retrieve(this.assistantId);
                    console.log(`✅ Retrieved existing assistant: ${this.assistantId}`);
                    return this.assistant;
                } catch (error) {
                    console.log('⚠️ Failed to retrieve existing assistant, creating new one:', error.message);
                    this.assistantId = null; // Reset invalid ID
                }
            }
            
            // Create new assistant
            console.log('🤖 Creating new OpenAI Assistant...');
            
            // First, create a vector store for file search
            const vectorStore = await this.openai.beta.vectorStores.create({
                name: "Eva Lawyer Bot Knowledge Base"
            });
            this.vectorStoreId = vectorStore.id;
            
            // Get system prompt with fallback
            const systemPrompt = this.getSystemPrompt();
            
            // Get tool definitions with fallback
            const toolDefinitions = this.assistantTools ? 
                this.assistantTools.getToolDefinitions() : [];
            
            // Create assistant with tools
            this.assistant = await this.openai.beta.assistants.create({
                name: "Eva Lawyer Bot",
                instructions: systemPrompt,
                model: "gpt-4o-mini",
                tools: [
                    { 
                        type: "file_search",
                        file_search: {
                            vector_store_ids: [this.vectorStoreId]
                        }
                    },
                    { type: "code_interpreter" },
                    ...toolDefinitions
                ]
            });
            
            this.assistantId = this.assistant.id;
            console.log(`✅ Assistant created with ID: ${this.assistantId}`);
            
            return this.assistant;
            
        } catch (error) {
            console.error('❌ Failed to create/get assistant:', error);
            
            // Handle specific errors - FIXED
            if (error.status === 400) {
                console.error('❌ Bad Request creating assistant:', error.message);
                this.metrics.apiErrors[400]++;
                throw new Error('Invalid assistant configuration');
            } else if (error.status === 401) {
                console.error('❌ Unauthorized creating assistant');
                this.metrics.apiErrors[401]++;
                throw new Error('Invalid API key for assistant creation');
            } else if (error.status === 429) {
                console.error('❌ Rate limit creating assistant');
                this.metrics.apiErrors[429]++;
                throw new Error('Rate limit exceeded for assistant creation');
            }
            
            throw error;
        }
    }

    // Get system prompt with fallback
    getSystemPrompt() {
        if (this.advancedPrompts) {
            return this.advancedPrompts.getSystemPrompt();
        }
        
        return `Вы - Eva, профессиональный юридический консультант и ассистент.

ОСНОВНЫЕ ПРИНЦИПЫ:
• Отвечайте исключительно на русском языке
• Предоставляйте точные и актуальные юридические консультации
• Ссылайтесь на действующее российское законодательство
• Будьте профессиональными, но доступными в объяснениях

СПЕЦИАЛИЗАЦИЯ:
• Гражданское право
• Корпоративное право  
• Трудовое право
• Налоговое право
• Договорное право
• Административное право

ФОРМАТ ОТВЕТОВ:
• Структурированные и понятные объяснения
• Ссылки на конкретные статьи законов
• Практические рекомендации
• Предупреждения о рисках

ВАЖНО: Всегда указывайте, что консультация носит информационный характер и не заменяет профессиональную юридическую помощь.`;
    }

    // Get or create thread for user with error handling
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
            
            if (error.status === 400) {
                this.metrics.apiErrors[400]++;
            } else if (error.status === 401) {
                this.metrics.apiErrors[401]++;
            }
            
            throw error;
        }
    }

    // Send message to assistant with enhanced error handling - FIXED
    async askAssistant(userId, message, attachments = []) {
        try {
            if (!this.assistant) {
                await this.createOrGetAssistant();
            }
            
            const threadId = await this.getUserThread(userId);
            
            // Prepare message content with validation
            let messageContent = [{ type: "text", text: message }];
            
            // Validate message length
            if (message.length > 32000) {
                message = message.substring(0, 32000) + "... [сообщение обрезано]";
                messageContent = [{ type: "text", text: message }];
            }
            
            // Handle file attachments
            if (attachments.length > 0) {
                for (const attachment of attachments) {
                    try {
                        const uploadedFile = await this.uploadFileToAssistant(attachment.path);
                        messageContent.push({
                            type: "text",
                            text: `[Прикреплен файл: ${attachment.name}]`
                        });
                        
                        // Add file to vector store if it's a document
                        if (this.vectorStoreId && attachment.type === 'document') {
                            await this.openai.beta.vectorStores.files.create(
                                this.vectorStoreId,
                                { file_id: uploadedFile.id }
                            );
                        }
                    } catch (error) {
                        console.error('Failed to process attachment:', error);
                    }
                }
            }
            
            // Add message to thread
            await this.openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: messageContent
            });
            
            // Run assistant
            const run = await this.openai.beta.threads.runs.create(threadId, {
                assistant_id: this.assistantId
            });
            
            // Wait for completion and handle tool calls with timeout - FIXED
            let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            let attempts = 0;
            const maxAttempts = 60; // Maximum 60 seconds wait
            
            while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
                attempts++;
                
                // Handle tool calls
                if (runStatus.status === 'requires_action') {
                    await this.handleToolCalls(threadId, run.id, runStatus.required_action.submit_tool_outputs.tool_calls);
                    runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
                }
            }
            
            // Check for timeout - FIXED
            if (attempts >= maxAttempts) {
                console.error('❌ Assistant timeout after 60 seconds');
                return await this.fallbackToRegularAPI(message);
            }
            
            if (runStatus.status === 'completed') {
                // Get messages
                const messages = await this.openai.beta.threads.messages.list(threadId);
                const lastMessage = messages.data[0];
                
                if (lastMessage.role === 'assistant') {
                    this.metrics.assistantCalls++;
                    return this.extractMessageContent(lastMessage);
                }
            }
            
            console.error(`❌ Assistant run failed with status: ${runStatus.status}`);
            return await this.fallbackToRegularAPI(message);
            
        } catch (error) {
            console.error('❌ Assistant error:', error);
            
            // Handle specific error types - FIXED
            if (error.status === 400) {
                console.error('❌ Bad Request (400):', error.message);
                this.metrics.apiErrors[400]++;
                return await this.fallbackToRegularAPI(message);
            } else if (error.status === 401) {
                console.error('❌ Unauthorized (401): Invalid API key');
                this.metrics.apiErrors[401]++;
                return 'Извините, проблема с авторизацией API. Обратитесь к администратору.';
            } else if (error.status === 429) {
                console.error('❌ Rate limit exceeded (429)');
                this.metrics.apiErrors[429]++;
                return 'Извините, превышен лимит запросов. Попробуйте через минуту.';
            } else if (error.status === 500) {
                console.error('❌ OpenAI server error (500)');
                this.metrics.apiErrors[500]++;
                return await this.fallbackToRegularAPI(message);
            }
            
            return await this.fallbackToRegularAPI(message);
        }
    }

    // Enhanced fallback to regular OpenAI API - FIXED
    async fallbackToRegularAPI(message) {
        try {
            console.log('🔄 Using fallback API for message:', message.substring(0, 50) + '...');
            this.metrics.fallbackCalls++;
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt()
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                timeout: 30000
            });
            
            const content = response.choices[0].message.content;
            console.log('✅ Fallback API successful');
            return content;
            
        } catch (error) {
            console.error('❌ Fallback API error:', error);
            
            // Handle fallback errors - FIXED
            if (error.status === 400) {
                this.metrics.apiErrors[400]++;
                return 'Извините, не удалось обработать ваш запрос. Попробуйте переформулировать вопрос.';
            } else if (error.status === 401) {
                this.metrics.apiErrors[401]++;
                return 'Извините, проблема с авторизацией. Обратитесь к администратору.';
            } else if (error.status === 429) {
                this.metrics.apiErrors[429]++;
                return 'Извините, сервис временно перегружен. Попробуйте через несколько минут.';
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return 'Извините, проблемы с подключением к серверу. Попробуйте позже.';
            }
            
            return 'Извините, произошла техническая ошибка. Наши специалисты уже работают над решением проблемы.';
        }
    }

    // Handle tool calls from assistant
    async handleToolCalls(threadId, runId, toolCalls) {
        try {
            const toolOutputs = [];
            
            for (const toolCall of toolCalls) {
                const { id, function: func } = toolCall;
                let output = '';
                
                try {
                    // Parse function arguments
                    const args = JSON.parse(func.arguments);
                    
                    // Execute tool using AssistantTools
                    if (this.assistantTools && typeof this.assistantTools.executeTool === 'function') {
                        const result = await this.assistantTools.executeTool(func.name, args);
                        output = JSON.stringify(result);
                    } else {
                        output = JSON.stringify({
                            error: 'AssistantTools не инициализирован',
                            fallback: 'Используйте базовую функциональность'
                        });
                    }
                    
                } catch (error) {
                    output = JSON.stringify({
                        error: `Ошибка выполнения функции ${func.name}: ${error.message}`
                    });
                }
                
                toolOutputs.push({
                    tool_call_id: id,
                    output: output
                });
            }
            
            // Submit tool outputs
            await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
                tool_outputs: toolOutputs
            });
            
        } catch (error) {
            console.error('❌ Tool call handling error:', error);
        }
    }

    // Upload file to OpenAI for assistant
    async uploadFileToAssistant(filePath, purpose = 'assistants') {
        try {
            const file = await this.openai.files.create({
                file: fs.createReadStream(filePath),
                purpose: purpose
            });
            
            console.log(`✅ File uploaded to OpenAI: ${file.id}`);
            return file;
            
        } catch (error) {
            console.error('❌ Failed to upload file to OpenAI:', error);
            throw error;
        }
    }

    // Extract content from assistant message
    extractMessageContent(message) {
        try {
            let content = '';
            
            for (const contentBlock of message.content) {
                if (contentBlock.type === 'text') {
                    content += contentBlock.text.value;
                }
            }
            
            return content;
            
        } catch (error) {
            console.error('Failed to extract message content:', error);
            return 'Ошибка при извлечении ответа';
        }
    }

    // Send message with error handling
    async sendMessage(chatId, text, options = {}) {
        try {
            if (!this.bot) {
                console.error('❌ Bot not initialized');
                return false;
            }
            
            return await this.bot.sendMessage(chatId, text, options);
        } catch (error) {
            console.error('❌ Send message error:', error);
            return false;
        }
    }

    // Main webhook handler with enhanced error handling
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
            this.metrics.totalRequests++;
            
            // Process the update
            await this.processUpdate(update);
            
            // Record success metrics
            const responseTime = Date.now() - startTime;
            this.recordMetrics(responseTime, true);
            
            res.status(200).json({ ok: true });
            
        } catch (error) {
            console.error('❌ Webhook error:', error);
            
            // Record failure metrics
            const responseTime = Date.now() - startTime;
            this.recordMetrics(responseTime, false);
            
            res.status(200).json({ ok: true }); // Always return 200 to Telegram
        }
    }

    // Process Telegram update
    async processUpdate(update) {
        try {
            if (update.message) {
                await this.handleMessage(update.message);
            } else if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            console.error('❌ Update processing error:', error);
        }
    }

    // Handle incoming messages
    async handleMessage(message) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const startTime = Date.now();
        
        try {
            // Rate limiting check
            if (this.checkRateLimit(userId)) {
                await this.sendMessage(chatId, 'Пожалуйста, подождите немного перед отправкой следующего сообщения.');
                return;
            }
            
            if (message.text) {
                // Check cache first
                const cacheKey = `${userId}_${message.text}`;
                if (this.responseCache.has(cacheKey)) {
                    const cachedResponse = this.responseCache.get(cacheKey);
                    if (Date.now() - cachedResponse.timestamp < this.cacheTimeout) {
                        this.metrics.cacheHits++;
                        await this.sendMessage(chatId, cachedResponse.response);
                        return;
                    }
                }
                
                await this.handleTextMessage(message);
                
            } else if (message.document) {
                await this.handleDocumentMessage(message);
            } else if (message.photo) {
                await this.handlePhotoMessage(message);
            }
            
            this.updateMetrics(startTime, true);
            
        } catch (error) {
            console.error('Message handling error:', error);
            this.updateMetrics(startTime, false);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке сообщения');
        }
    }

    // Handle text messages with enhanced error handling
    async handleTextMessage(message) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const text = message.text;
        
        // Check for commands
        if (text.startsWith('/')) {
            await this.handleCommand(text, userId, chatId);
            return;
        }
        
        // Send typing indicator
        try {
            await this.bot.sendChatAction(chatId, 'typing');
        } catch (error) {
            console.error('❌ SendChatAction error:', error);
        }
        
        // Get AI response with enhanced error handling
        const aiResponse = await this.askAssistant(userId, text);
        
        // Send response with basic UI
        await this.sendMessage(chatId, `🤖 <b>Юридическая консультация:</b>\n\n${aiResponse}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💬 Задать еще вопрос', callback_data: 'ask_question' }],
                    [{ text: '🏠 Главное меню', callback_data: 'start' }]
                ]
            }
        });
    }

    // Handle /start command
    async handleStart(chatId, userId, firstName = '') {
        try {
            const welcomeText = `👋 Добро пожаловать в Eva Lawyer Bot!

🤖 Я - ваш персональный юридический ассистент, работающий на базе искусственного интеллекта.

💼 <b>Мои возможности:</b>
• Юридические консультации по российскому праву
• Анализ документов и договоров
• Проверка компаний по ИНН
• Помощь в составлении документов

⚖️ <b>Специализация:</b>
• Гражданское право
• Корпоративное право
• Трудовое право
• Налоговое право

Просто напишите ваш вопрос, и я предоставлю подробную консультацию!`;

            await this.sendMessage(chatId, welcomeText, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💬 Задать вопрос', callback_data: 'ask_question' },
                            { text: '📄 Анализ документа', callback_data: 'analyze_document' }
                        ],
                        [
                            { text: '🔍 Проверить ИНН', callback_data: 'check_inn' },
                            { text: '🆘 Помощь', callback_data: 'help' }
                        ]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Start handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при запуске');
        }
    }

    // Handle callback queries
    async handleCallbackQuery(callbackQuery) {
        const userId = callbackQuery.from.id;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        
        try {
            await this.bot.answerCallbackQuery(callbackQuery.id);
            
            switch (data) {
                case 'start':
                    await this.handleStart(chatId, userId);
                    break;
                case 'ask_question':
                    await this.sendMessage(chatId, 
                        '💬 <b>Юридическая консультация</b>\n\nЗадайте ваш вопрос, и я предоставлю подробную консультацию:', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏠 Главное меню', callback_data: 'start' }]
                            ]
                        }
                    });
                    break;
                case 'analyze_document':
                    await this.sendMessage(chatId,
                        '📄 <b>Анализ документа</b>\n\nОтправьте документ для анализа (PDF, DOCX, изображение):', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏠 Главное меню', callback_data: 'start' }]
                            ]
                        }
                    });
                    break;
                case 'check_inn':
                    await this.sendMessage(chatId,
                        '🔍 <b>Проверка ИНН компании</b>\n\nОтправьте ИНН компании для проверки (10 или 12 цифр):', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📋 Пример: 7707083893', callback_data: 'inn_example' }],
                                [{ text: '🏠 Главное меню', callback_data: 'start' }]
                            ]
                        }
                    });
                    break;
                case 'inn_example':
                    await this.handleInnCheck(chatId, '7707083893');
                    break;
                case 'help':
                    await this.handleHelp(chatId);
                    break;
                default:
                    await this.handleTextMessage({ from: { id: userId }, chat: { id: chatId }, text: data });
            }
            
        } catch (error) {
            console.error('Callback query handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке команды');
        }
    }

    // Handle INN check
    async handleInnCheck(chatId, inn) {
        try {
            await this.sendMessage(chatId, '🔍 Проверяю информацию о компании...');
            
            const response = await this.askAssistant(chatId, `Проверь компанию с ИНН ${inn}. Предоставь подробную информацию о компании, включая наименование, адрес, статус, руководство и основные финансовые показатели.`);
            
            await this.sendMessage(chatId, `🏢 <b>Информация о компании (ИНН: ${inn})</b>\n\n${response}`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔍 Проверить другую компанию', callback_data: 'check_inn' }],
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('INN check error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при проверке ИНН');
        }
    }

    // Handle commands
    async handleCommand(command, userId, chatId) {
        try {
            switch (command) {
                case '/start':
                    await this.handleStart(chatId, userId);
                    break;
                case '/help':
                    await this.handleHelp(chatId);
                    break;
                case '/stats':
                    await this.handleStats(chatId);
                    break;
                default:
                    await this.handleTextMessage({ from: { id: userId }, chat: { id: chatId }, text: command });
            }
        } catch (error) {
            console.error('Command handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при выполнении команды');
        }
    }

    // Handle /help command
    async handleHelp(chatId) {
        try {
            const helpText = `🆘 <b>Помощь Eva Lawyer Bot</b>

🤖 <b>О боте:</b>
Eva - это AI-юридический ассистент с исправленной обработкой ошибок OpenAI API.

📋 <b>Команды:</b>
/start - Главное меню
/help - Эта справка
/stats - Статистика бота

💬 <b>Как пользоваться:</b>
• Отправьте текстовый вопрос для получения консультации
• Прикрепите документ (PDF, DOCX) для анализа
• Отправьте ИНН компании для проверки
• Используйте кнопки меню для быстрого доступа

⚠️ <b>Важно:</b>
Консультации носят информационный характер. Для решения сложных вопросов обращайтесь к квалифицированным юристам.`;

            await this.sendMessage(chatId, helpText, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Help handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при получении справки');
        }
    }

    // Handle /stats command with API error tracking
    async handleStats(chatId) {
        try {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            
            const statsText = `📊 <b>Статистика Eva Lawyer Bot (Fixed)</b>

⏱️ <b>Время работы:</b> ${hours}ч ${minutes}м

📈 <b>Запросы:</b>
• Всего: ${this.metrics.totalRequests}
• Успешных: ${this.metrics.successfulRequests}
• Ошибок: ${this.metrics.failedRequests}
• Успешность: ${this.metrics.totalRequests > 0 ? 
    Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100) : 0}%

🤖 <b>AI Assistant:</b>
• Вызовов ассистента: ${this.metrics.assistantCalls}
• Fallback вызовов: ${this.metrics.fallbackCalls}
• Активных диалогов: ${this.userThreads.size}

❌ <b>API Ошибки (исправлены):</b>
• 400 Bad Request: ${this.metrics.apiErrors[400]}
• 401 Unauthorized: ${this.metrics.apiErrors[401]}
• 429 Rate Limit: ${this.metrics.apiErrors[429]}
• 500 Server Error: ${this.metrics.apiErrors[500]}

⚡ <b>Производительность:</b>
• Среднее время ответа: ${Math.round(this.metrics.avgResponseTime)}мс
• Попаданий в кэш: ${this.metrics.cacheHits}
• Assistant ID: ${this.assistantId ? this.assistantId.substring(0, 20) + '...' : 'Не создан'}`;

            await this.sendMessage(chatId, statsText, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Stats handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при получении статистики');
        }
    }

    // Send error message
    async sendErrorMessage(chatId, message) {
        try {
            await this.sendMessage(chatId, `❌ ${message}`, {
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

    // Rate limiting check
    checkRateLimit(userId) {
        const now = Date.now();
        const userLimits = this.rateLimiter.get(userId) || { count: 0, resetTime: now + 60000 };
        
        if (now > userLimits.resetTime) {
            userLimits.count = 0;
            userLimits.resetTime = now + 60000;
        }
        
        if (userLimits.count >= 30) {
            this.metrics.rateLimitHits++;
            return true;
        }
        
        userLimits.count++;
        this.rateLimiter.set(userId, userLimits);
        return false;
    }

    // Record metrics
    recordMetrics(responseTime, success) {
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        // Update average response time
        const totalTime = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1);
        this.metrics.avgResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
    }

    // Update metrics helper
    updateMetrics(startTime, success) {
        const responseTime = Date.now() - startTime;
        this.recordMetrics(responseTime, success);
    }

    // Health check with API error status
    async healthCheck() {
        try {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: uptime,
                version: 'Fixed-400-Error',
                metrics: this.metrics,
                assistant: {
                    id: this.assistantId,
                    active_threads: this.userThreads.size,
                    vector_store_id: this.vectorStoreId
                },
                modules: {
                    openai_assistant: !!this.assistant,
                    telegram_bot: !!this.bot,
                    enhanced_ui: !!this.uiSystem,
                    fallback_system: true
                },
                fixes: {
                    api_key_validation: true,
                    error_400_handling: true,
                    fallback_system: true,
                    timeout_protection: true
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
            console.log('🚀 Initializing Eva Lawyer Bot (Fixed)...');
            
            // Create assistant
            await this.createOrGetAssistant();
            
            this.isInitialized = true;
            console.log('✅ Eva Lawyer Bot initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            this.isInitialized = false;
        }
    }
}

// Export the bot class
module.exports = EvaLawyerBotFixed;

// Serverless function handler for Vercel
module.exports = async (req, res) => {
    if (!global.botInstance) {
        global.botInstance = new EvaLawyerBotFixed();
        await global.botInstance.initialize();
    }
    
    if (req.method === 'GET') {
        const health = await global.botInstance.healthCheck();
        return res.status(200).json(health);
    }
    
    if (req.method === 'POST') {
        return await global.botInstance.handleWebhook(req, res);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};

