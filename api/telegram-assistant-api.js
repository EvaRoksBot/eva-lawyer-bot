// Eva Lawyer Bot - OpenAI Assistant API Integration
// Complete implementation with Assistant API, tools, and file handling

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Import enhanced modules
const AdvancedPrompts = require('./modules/advanced-prompts');
const ContextManager = require('./modules/context-manager');
const SmartRouter = require('./modules/smart-router');
const EnhancedDaData = require('./modules/enhanced-dadata');
const AdvancedUI = require('./modules/advanced-ui');
const DocumentEngine = require('./modules/document-engine');
const AnalyticsEngine = require('./modules/analytics-engine');
const AssistantTools = require('./modules/assistant-tools');
const EnhancedUISystem = require('./modules/enhanced-ui-system');
const InteractiveHandlers = require('./modules/interactive-handlers');

class EvaLawyerBotAssistant {
    constructor() {
        // Environment variables with validation
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.dadataApiKey = process.env.DADATA_API_KEY;
        this.dadataSecret = process.env.DADATA_SECRET_KEY;
        this.webhookSecret = process.env.TG_WEBHOOK_SECRET;
        
        // Validate and clean environment variables
        this.validateEnvironment();
        
        // Initialize OpenAI with proper configuration
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
        
        // Initialize modules
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
            rateLimitHits: 0
        };
    }

    // Validate and clean environment variables
    validateEnvironment() {
        const required = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        // Clean OpenAI API key - only trim whitespace
        if (this.openaiApiKey) {
            this.openaiApiKey = this.openaiApiKey.trim();
            
            // Validate API key format
            if (!this.openaiApiKey.startsWith('sk-')) {
                console.error('❌ Invalid OpenAI API key format');
                throw new Error('Invalid OpenAI API key format');
            }
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

    // Initialize modules with error handling
    initializeModules() {
        try {
            // Initialize enhanced modules
            this.advancedPrompts = new AdvancedPrompts();
            this.contextManager = new ContextManager();
            this.smartRouter = new SmartRouter();
            this.enhancedDaData = new EnhancedDaData();
            this.advancedUI = new AdvancedUI();
            this.documentEngine = new DocumentEngine();
            this.analyticsEngine = new AnalyticsEngine();
            this.uiSystem = new EnhancedUISystem();
            
            // Initialize assistant tools with dependencies
            this.assistantTools = new AssistantTools(this.enhancedDaData, this.documentEngine);
            
            // Initialize interactive handlers
            this.interactiveHandlers = new InteractiveHandlers(this.bot, this.uiSystem, this.assistantTools);
            
            console.log('✅ Modules initialized successfully');
        } catch (error) {
            console.error('❌ Module initialization error:', error);
            this.initializeBasicModules();
        }
    }

    // Rate limiting
    checkRateLimit(userId) {
        const now = Date.now();
        const userLimits = this.rateLimiter.get(userId) || { count: 0, resetTime: now + 60000 };
        
        if (now > userLimits.resetTime) {
            userLimits.count = 0;
            userLimits.resetTime = now + 60000;
        }
        
        if (userLimits.count >= 30) { // 30 requests per minute
            this.metrics.rateLimitHits++;
            return false;
        }
        
        userLimits.count++;
        this.rateLimiter.set(userId, userLimits);
        return true;
    }

    // Cache management
    getCachedResponse(key) {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            this.metrics.cacheHits++;
            return cached.response;
        }
        return null;
    }

    setCachedResponse(key, response) {
        this.responseCache.set(key, {
            response,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (this.responseCache.size > 1000) {
            const oldEntries = Array.from(this.responseCache.entries())
                .filter(([_, value]) => Date.now() - value.timestamp > this.cacheTimeout);
            oldEntries.forEach(([key]) => this.responseCache.delete(key));
        }
    }

    // Initialize basic modules as fallback
    initializeBasicModules() {
        console.log('🔄 Initializing basic modules...');
        
        this.advancedPrompts = {
            getSystemPrompt: () => `Ты Eva - профессиональный юридический ассистент с глубокими знаниями российского права.
            
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
- Договорное право`
        };
        
        this.contextManager = {
            getUserContext: async (userId) => ({ userId, lastActivity: Date.now() }),
            updateUserContext: async (userId, data) => console.log(`Context updated for ${userId}`)
        };
        
        this.smartRouter = {
            routeMessage: async (text, userId) => ({ action: 'ai_response', parameters: {} }),
            routeCallback: async (data, userId) => ({ action: data, parameters: {} })
        };
        
        console.log('✅ Basic modules initialized');
    }

    // Create or get OpenAI Assistant with validation
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
            const systemPrompt = this.advancedPrompts ? 
                this.advancedPrompts.getSystemPrompt() : 
                "Вы - профессиональный юридический консультант Eva. Отвечайте на русском языке, предоставляя точные и полезные юридические консультации.";
            
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
            
            // Handle specific errors
            if (error.status === 400) {
                console.error('❌ Bad Request creating assistant:', error.message);
                throw new Error('Invalid assistant configuration');
            } else if (error.status === 401) {
                console.error('❌ Unauthorized creating assistant');
                throw new Error('Invalid API key for assistant creation');
            }
            
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

    // Send message to assistant with file support
    async askAssistant(userId, message, attachments = []) {
        try {
            if (!this.assistant) {
                await this.createOrGetAssistant();
            }
            
            const threadId = await this.getUserThread(userId);
            
            // Prepare message content
            let messageContent = [{ type: "text", text: message }];
            
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
            
            // Wait for completion and handle tool calls with timeout
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
            
            // Check for timeout
            if (attempts >= maxAttempts) {
                console.error('❌ Assistant timeout after 60 seconds');
                throw new Error('Assistant response timeout');
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
            
            throw new Error(`Assistant run failed with status: ${runStatus.status}`);
            
        } catch (error) {
            console.error('❌ Assistant error:', error);
            
            // Handle specific error types
            if (error.status === 400) {
                console.error('❌ Bad Request (400):', error.message);
                return await this.fallbackToRegularAPI(message);
            } else if (error.status === 401) {
                console.error('❌ Unauthorized (401): Invalid API key');
                return 'Извините, проблема с авторизацией API. Обратитесь к администратору.';
            } else if (error.status === 429) {
                console.error('❌ Rate limit exceeded (429)');
                return 'Извините, превышен лимит запросов. Попробуйте через минуту.';
            } else if (error.status === 500) {
                console.error('❌ OpenAI server error (500)');
                return await this.fallbackToRegularAPI(message);
            }
            
            return await this.fallbackToRegularAPI(message);
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

    // Send message with error handling
    async sendMessage(chatId, text, options = {}) {
        try {
            if (!this.bot) {
                console.error('❌ Bot not initialized');
                return false;
            }
            
            return await this.sendMessage(chatId, text, options);
        } catch (error) {
            console.error('❌ Send message error:', error);
            return false;
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

    // Fallback to regular OpenAI API with improved error handling
    async fallbackToRegularAPI(message) {
        try {
            console.log('🔄 Using fallback API for message:', message.substring(0, 50) + '...');
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.advancedPrompts ? this.advancedPrompts.getSystemPrompt() : 
                                "Вы - профессиональный юридический консультант Eva. Отвечайте на русском языке, предоставляя точные и полезные юридические консультации."
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
            
            // Handle fallback errors
            if (error.status === 400) {
                return 'Извините, не удалось обработать ваш запрос. Попробуйте переформулировать вопрос.';
            } else if (error.status === 401) {
                return 'Извините, проблема с авторизацией. Обратитесь к администратору.';
            } else if (error.status === 429) {
                return 'Извините, сервис временно перегружен. Попробуйте через несколько минут.';
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return 'Извините, проблемы с подключением к серверу. Попробуйте позже.';
            }
            
            return 'Извините, произошла техническая ошибка. Наши специалисты уже работают над решением проблемы.';
        }
    }

    // Download file from Telegram
    async downloadTelegramFile(fileId, fileName) {
        try {
            const file = await this.bot.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${file.file_path}`;
            
            const response = await fetch(fileUrl);
            const buffer = await response.buffer();
            
            const filePath = path.join(this.uploadDir, fileName);
            fs.writeFileSync(filePath, buffer);
            
            return filePath;
            
        } catch (error) {
            console.error('Failed to download Telegram file:', error);
            throw error;
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
            this.metrics.totalRequests++;
            
            // Process the update
            await this.processUpdate(update);
            
            // Record success metrics
            const responseTime = Date.now() - startTime;
            this.recordMetrics(responseTime, true);
            
            res.status(200).json({ ok: true });
            
        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            
            // Record error metrics
            const responseTime = Date.now() - startTime;
            this.recordMetrics(responseTime, false);
            
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
            }
        } catch (error) {
            console.error('Update processing error:', error);
            throw error;
        }
    }

    // Handle messages (text, documents, photos)
    async handleMessage(message) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        
        const userId = message.from.id;
        const chatId = message.chat.id;
        
        try {
            // Rate limiting check
            if (!this.checkRateLimit(userId)) {
                await this.sendMessage(chatId, 
                    "⏱️ Слишком много запросов. Пожалуйста, подождите минуту перед следующим сообщением.");
                return;
            }
            
            // Handle different message types
            if (message.text) {
                // Check cache for text messages
                const messageKey = `${userId}_${message.text.substring(0, 100)}`;
                const cachedResponse = this.getCachedResponse(messageKey);
                
                if (cachedResponse && message.text.length < 200) {
                    await this.sendMessage(chatId, cachedResponse);
                    this.updateMetrics(startTime, true);
                    return;
                }
                
                await this.handleTextMessage(message);
                
                // Cache response if it's a short query
                if (message.text.length < 200) {
                    // This would need to be implemented to cache the actual response
                }
                
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

    // Handle text messages
    async handleTextMessage(message) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const text = message.text;
        
        // Check if user is in INN input mode
        if (this.interactiveHandlers && this.interactiveHandlers.isInInputMode(userId, 'inn_check')) {
            // Handle INN input
            if (/^[0-9]{10,12}$/.test(text)) {
                await this.interactiveHandlers.handleInnCheck(chatId, text);
                this.interactiveHandlers.clearInputMode(userId);
            } else {
                await this.sendMessage(chatId, '❌ Неверный формат ИНН. Введите 10 или 12 цифр:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 Пример: 7707083893', callback_data: 'inn_example' }],
                            [{ text: '🔙 Отменить', callback_data: 'check_inn_form' }]
                        ]
                    }
                });
            }
            return;
        }
        
        // Check for commands
        if (text.startsWith('/')) {
            await this.handleCommand(text, userId, chatId);
            return;
        }
        
        // Send typing indicator
        try {
            if (this.bot && typeof this.bot.sendChatAction === 'function') {
                await this.bot.sendChatAction(chatId, 'typing');
            }
        } catch (error) {
            console.error('❌ SendChatAction error:', error);
        }
        
        // Check if user has active consultation
        let consultationContext = '';
        if (this.interactiveHandlers) {
            const activeConsultation = this.interactiveHandlers.getActiveConsultation(userId);
            if (activeConsultation) {
                consultationContext = `\n\nКонтекст консультации: ${activeConsultation.title}`;
            }
        }
        
        // Get AI response with context
        const aiResponse = await this.askAssistant(userId, text + consultationContext);
        
        // Send response with enhanced UI
        const keyboard = [];
        
        // Add consultation-specific buttons
        if (this.interactiveHandlers) {
            const activeConsultation = this.interactiveHandlers.getActiveConsultation(userId);
            if (activeConsultation) {
                if (activeConsultation.type === 'urgent') {
                    keyboard.push([{ text: '📞 Связаться с юристом', callback_data: 'contact_lawyer' }]);
                }
                keyboard.push([{ text: '❓ Уточняющий вопрос', callback_data: `consult_${activeConsultation.type}` }]);
            }
        }
        
        // Add standard navigation
        keyboard.push([{ text: '💬 Новая консультация', callback_data: 'consultation_menu' }]);
        keyboard.push([{ text: '🏠 Главное меню', callback_data: 'start' }]);
        
        await this.sendMessage(chatId, aiResponse, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }

    // Handle document messages
    async handleDocumentMessage(message) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const document = message.document;
        
        try {
            // Send processing message
            const processingMsg = await this.sendMessage(chatId, '📄 Обрабатываю документ...');
            
            // Download document
            const fileName = `${Date.now()}_${document.file_name}`;
            const filePath = await this.downloadTelegramFile(document.file_id, fileName);
            
            // Process with assistant
            const attachments = [{
                path: filePath,
                name: document.file_name,
                type: 'document'
            }];
            
            const analysisPrompt = `Проанализируй прикрепленный документ "${document.file_name}". 
            Выяви потенциальные юридические риски, проверь соответствие российскому законодательству 
            и дай рекомендации по улучшению.`;
            
            const analysis = await this.askAssistant(userId, analysisPrompt, attachments);
            
            // Clean up file
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error('Failed to delete file:', error);
            }
            
            // Send analysis result
            await this.bot.editMessageText(
                `📄 <b>Анализ документа "${document.file_name}"</b>\n\n${analysis}`, {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📄 Анализировать другой документ', callback_data: 'analyze_document' }],
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Document processing error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке документа');
        }
    }

    // Handle photo messages
    async handlePhotoMessage(message) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const photos = message.photo;
        
        try {
            // Get the largest photo
            const photo = photos[photos.length - 1];
            
            // Send processing message
            const processingMsg = await this.sendMessage(chatId, '🖼️ Обрабатываю изображение...');
            
            // Download photo
            const fileName = `${Date.now()}_photo.jpg`;
            const filePath = await this.downloadTelegramFile(photo.file_id, fileName);
            
            // Process with assistant
            const attachments = [{
                path: filePath,
                name: fileName,
                type: 'image'
            }];
            
            const analysisPrompt = `Проанализируй прикрепленное изображение. Если это документ, 
            извлеки текст и проведи юридический анализ. Если это схема или диаграмма, 
            объясни её с юридической точки зрения.`;
            
            const analysis = await this.askAssistant(userId, analysisPrompt, attachments);
            
            // Clean up file
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error('Failed to delete file:', error);
            }
            
            // Send analysis result
            await this.bot.editMessageText(
                `🖼️ <b>Анализ изображения</b>\n\n${analysis}`, {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🖼️ Анализировать другое изображение', callback_data: 'analyze_image' }],
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
            
        } catch (error) {
            console.error('Photo processing error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке изображения');
        }
    }

    // Handle commands
    async handleCommand(command, userId, chatId) {
        try {
            switch (command) {
                case '/start':
                    await this.handleStart(userId, chatId);
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

    // Handle callback queries with enhanced UI
    async handleCallbackQuery(callbackQuery) {
        const userId = callbackQuery.from.id;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        
        try {
            await this.bot.answerCallbackQuery(callbackQuery.id);
            
            // Check if it's a menu navigation
            const menuData = this.uiSystem.getMenuByCallback(userId, data);
            if (menuData) {
                // Add to navigation history
                this.uiSystem.addToHistory(userId, {
                    title: this.uiSystem.getMenuTitle(data),
                    callback_data: data
                });
                
                // Edit message with new menu
                await this.bot.editMessageText(menuData.text, {
                    chat_id: chatId,
                    message_id: callbackQuery.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: menuData.reply_markup
                });
                return;
            }
            
            // Handle specific actions
            switch (data) {
                case 'start':
                    await this.handleStart(chatId, userId);
                    break;
                case 'help':
                    await this.handleHelp(chatId);
                    break;
                case 'ask_question':
                case 'consult_general':
                    await this.sendMessage(chatId, 
                        '💬 <b>Общая юридическая консультация</b>\n\nЗадайте ваш вопрос, и я предоставлю подробную консультацию:', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙 Назад к консультациям', callback_data: 'consultation_menu' }],
                                [{ text: '🏠 Главное меню', callback_data: 'start' }]
                            ]
                        }
                    });
                    break;
                case 'analyze_document':
                case 'doc_analyze_contract':
                    await this.sendMessage(chatId,
                        '📄 <b>Анализ документа</b>\n\nОтправьте документ для анализа (PDF, DOCX, изображение):', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙 Назад к документам', callback_data: 'documents_menu' }],
                                [{ text: '🏠 Главное меню', callback_data: 'start' }]
                            ]
                        }
                    });
                    break;
                case 'check_inn':
                case 'check_inn_form':
                    await this.sendMessage(chatId,
                        '🔍 <b>Проверка ИНН компании</b>\n\nОтправьте ИНН компании для проверки (10 или 12 цифр):', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📋 Пример: 7707083893', callback_data: 'inn_example' }],
                                [{ text: '🔙 Назад к проверкам', callback_data: 'checks_menu' }],
                                [{ text: '🏠 Главное меню', callback_data: 'start' }]
                            ]
                        }
                    });
                    break;
                case 'inn_example':
                    if (this.interactiveHandlers) {
                        await this.interactiveHandlers.handleInnCheck(chatId, '7707083893');
                    } else {
                        await this.handleInnCheck(chatId, '7707083893');
                    }
                    break;
                case 'stats':
                    await this.handleStats(chatId);
                    break;
                default:
                    await this.handleTextMessage({ from: { id: userId }, chat: { id: chatId }, text: data });
            }
            
        } catch (error) {
            console.error('Callback query handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке команды');
        }
    }

    // Handle /start command with enhanced UI
    async handleStart(chatId, userId, firstName = '') {
        try {
            // Update user state with personal info
            this.uiSystem.updateUserState(userId, { 
                firstName: firstName,
                lastActivity: Date.now()
            });
            
            // Get enhanced main menu
            const menuData = this.uiSystem.getMainMenu(userId);
            
            await this.sendMessage(chatId, menuData.text, {
                parse_mode: 'HTML',
                reply_markup: menuData.reply_markup
            });
            
        } catch (error) {
            console.error('Start handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при запуске');
        }
    }

    // Handle /help command
    async handleHelp(chatId) {
        try {
            const helpText = `🆘 <b>Помощь Eva Lawyer Bot</b>

🤖 <b>О боте:</b>
Eva - это AI-юридический ассистент, использующий OpenAI Assistant API для предоставления профессиональных юридических консультаций.

📋 <b>Команды:</b>
/start - Главное меню
/help - Эта справка
/stats - Статистика бота

💬 <b>Как пользоваться:</b>
• Отправьте текстовый вопрос для получения консультации
• Прикрепите документ (PDF, DOCX) для анализа
• Отправьте изображение документа для распознавания
• Используйте кнопки меню для быстрого доступа

⚖️ <b>Специализация:</b>
• Гражданское право
• Корпоративное право
• Трудовое право
• Налоговое право
• Договорное право

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

    // Handle /stats command
    async handleStats(chatId) {
        try {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            
            const statsText = `📊 <b>Статистика Eva Lawyer Bot</b>

⏱️ <b>Время работы:</b> ${hours}ч ${minutes}м

📈 <b>Запросы:</b>
• Всего: ${this.metrics.totalRequests}
• Успешных: ${this.metrics.successfulRequests}
• Ошибок: ${this.metrics.failedRequests}
• Успешность: ${this.metrics.totalRequests > 0 ? 
    Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100) : 0}%

🤖 <b>AI Assistant:</b>
• Вызовов ассистента: ${this.metrics.assistantCalls}
• Активных диалогов: ${this.userThreads.size}
• Документов обработано: ${this.metrics.documentsProcessed}

⚡ <b>Производительность:</b>
• Среднее время ответа: ${Math.round(this.metrics.avgResponseTime)}мс
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

    // Health check
    async healthCheck() {
        try {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: uptime,
                metrics: this.metrics,
                assistant: {
                    id: this.assistantId,
                    active_threads: this.userThreads.size,
                    vector_store_id: this.vectorStoreId
                },
                modules: {
                    openai_assistant: !!this.assistant,
                    telegram_bot: !!this.bot,
                    dadata: !!this.enhancedDadata
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
            console.log('🚀 Initializing Eva Lawyer Bot with Assistant API...');
            
            // Create OpenAI Assistant
            await this.createOrGetAssistant();
            console.log('✅ OpenAI Assistant ready');
            
            // Set bot commands
            await this.setBotCommands();
            console.log('✅ Bot commands set');
            
            this.isInitialized = true;
            console.log('🎉 Eva Lawyer Bot with Assistant API initialized successfully!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Bot initialization failed:', error);
            this.isInitialized = true; // Continue with basic functionality
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
                { command: 'stats', description: 'Статистика бота' }
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
        if (!global.evaAssistantBot) {
            global.evaAssistantBot = new EvaLawyerBotAssistant();
            await global.evaAssistantBot.initialize();
        }
        
        if (req.method === 'POST') {
            // Handle webhook
            await global.evaAssistantBot.handleWebhook(req, res);
        } else if (req.method === 'GET') {
            // Health check
            const health = await global.evaAssistantBot.healthCheck();
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

