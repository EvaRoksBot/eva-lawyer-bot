// Eva Lawyer Bot - Ultimate Version 5.0
// Complete integration of all advanced modules and features

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');

// Import all advanced modules
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

class EvaLawyerBotUltimate {
    constructor() {
        // Environment variables
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.dadataApiKey = process.env.DADATA_API_KEY;
        this.dadataSecret = process.env.DADATA_SECRET_KEY;
        this.webhookSecret = process.env.TG_WEBHOOK_SECRET;
        
        // Initialize bot and OpenAI
        this.bot = new TelegramBot(this.botToken);
        this.openai = new OpenAI({ apiKey: this.openaiApiKey });
        
        // Initialize all modules
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
    }

    // Initialize all advanced modules
    initializeModules() {
        try {
            // Core AI modules
            this.advancedPrompts = new AdvancedPrompts();
            this.aiEngine = new AIEngine(this.openai);
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
            
            // Record analytics event
            this.analyticsEngine.recordEvent('webhook_received', {
                update_id: update.update_id,
                type: this.getUpdateType(update)
            });

            // Process the update
            await this.processUpdate(update);
            
            // Record performance metrics
            const responseTime = Date.now() - startTime;
            this.recordPerformanceMetrics(responseTime, true);
            
            // Record analytics
            this.analyticsEngine.recordMetric('response_time', responseTime);
            this.analyticsEngine.recordEvent('response_time', { time: responseTime });
            
            res.status(200).json({ ok: true });
            
        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            
            // Record error metrics
            const responseTime = Date.now() - startTime;
            this.recordPerformanceMetrics(responseTime, false);
            this.analyticsEngine.recordEvent('error', { 
                error_type: 'webhook_processing',
                message: error.message 
            });
            
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
            } else if (update.document || update.photo) {
                await this.handleDocument(update);
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
            this.analyticsEngine.recordEvent('user_message', {
                user_id: userId,
                message_type: 'text',
                text_length: text?.length || 0
            }, userId);
            
            // Update user context
            await this.contextManager.updateUserContext(userId, {
                last_message: text,
                last_activity: Date.now(),
                chat_id: chatId
            });

            // Route the message through smart router
            const routingResult = await this.smartRouter.routeMessage(text, userId);
            
            if (routingResult.action) {
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

    // Handle callback queries (inline keyboard buttons)
    async handleCallbackQuery(callbackQuery) {
        const userId = callbackQuery.from.id;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        
        try {
            // Record callback event
            this.analyticsEngine.recordEvent('callback_query', {
                user_id: userId,
                data: data
            }, userId);
            
            // Answer callback query
            await this.bot.answerCallbackQuery(callbackQuery.id);
            
            // Route callback through smart router
            const routingResult = await this.smartRouter.routeCallback(data, userId);
            
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
            this.analyticsEngine.recordEvent('inline_query', {
                user_id: userId,
                query: query
            }, userId);
            
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

    // Handle document uploads
    async handleDocument(update) {
        const message = update.message;
        const userId = message.from.id;
        const chatId = message.chat.id;
        
        try {
            let fileId, fileName, mimeType;
            
            if (message.document) {
                fileId = message.document.file_id;
                fileName = message.document.file_name;
                mimeType = message.document.mime_type;
            } else if (message.photo) {
                const photo = message.photo[message.photo.length - 1]; // Largest size
                fileId = photo.file_id;
                fileName = 'photo.jpg';
                mimeType = 'image/jpeg';
            }
            
            // Record document upload
            this.analyticsEngine.recordEvent('document_upload', {
                user_id: userId,
                file_type: mimeType,
                file_name: fileName
            }, userId);
            
            // Send processing message
            const processingMsg = await this.bot.sendMessage(chatId, 
                '📄 Обрабатываю документ...', {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '❌ Отменить', callback_data: 'cancel_processing' }
                    ]]
                }
            });
            
            // Download and process file
            const downloadResult = await this.fileManager.downloadFromTelegram(
                fileId, userId, this.botToken
            );
            
            if (downloadResult.success) {
                // Process document
                const processResult = await this.documentEngine.processDocument(
                    downloadResult.file.filePath, {
                        autoAnalyze: true,
                        analysisType: 'auto'
                    }
                );
                
                if (processResult.success) {
                    // Generate analysis report
                    const analysis = processResult.document.analysis;
                    const response = await this.generateDocumentAnalysisResponse(analysis);
                    
                    // Update processing message
                    await this.bot.editMessageText(response.text, {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        reply_markup: response.keyboard,
                        parse_mode: 'HTML'
                    });
                    
                    // Record successful analysis
                    this.analyticsEngine.recordEvent('document_analyzed', {
                        user_id: userId,
                        document_type: analysis.type,
                        processing_time: Date.now() - processingMsg.date * 1000
                    }, userId);
                    
                } else {
                    await this.bot.editMessageText(
                        '❌ Не удалось обработать документ: ' + processResult.error, {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    });
                }
            } else {
                await this.bot.editMessageText(
                    '❌ Не удалось загрузить файл: ' + downloadResult.error, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                });
            }
            
        } catch (error) {
            console.error('Document handling error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке документа');
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
                    
                case 'generate_contract':
                    await this.handleContractGeneration(context);
                    break;
                    
                case 'analyze_document':
                    await this.handleDocumentAnalysis(context);
                    break;
                    
                case 'user_statistics':
                    await this.handleUserStatistics(context);
                    break;
                    
                case 'settings':
                    await this.handleSettings(context);
                    break;
                    
                default:
                    await this.handleAIResponse(userId, chatId, context.message?.text || '');
            }
            
            // Record feature usage
            this.analyticsEngine.recordEvent('feature_used', {
                feature_name: action,
                user_id: userId
            }, userId);
            
        } catch (error) {
            console.error(`Action execution error (${action}):`, error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при выполнении команды');
        }
    }

    // Handle /start command
    async handleStart(context) {
        const { userId, chatId } = context;
        
        // Get user context
        const userContext = await this.contextManager.getUserContext(userId);
        const isNewUser = !userContext || !userContext.first_seen;
        
        if (isNewUser) {
            // Record new user
            this.analyticsEngine.recordEvent('new_user', { user_id: userId }, userId);
            
            // Initialize user context
            await this.contextManager.updateUserContext(userId, {
                first_seen: Date.now(),
                registration_date: new Date().toISOString()
            });
        }
        
        // Generate welcome message
        const welcomeMessage = await this.advancedUI.generateWelcomeMessage(isNewUser);
        
        await this.bot.sendMessage(chatId, welcomeMessage.text, {
            reply_markup: welcomeMessage.keyboard,
            parse_mode: 'HTML'
        });
    }

    // Handle help command
    async handleHelp(context) {
        const { chatId } = context;
        
        const helpMessage = await this.advancedUI.generateHelpMessage();
        
        await this.bot.sendMessage(chatId, helpMessage.text, {
            reply_markup: helpMessage.keyboard,
            parse_mode: 'HTML'
        });
    }

    // Handle INN check
    async handleInnCheck(context) {
        const { userId, chatId, parameters } = context;
        
        let inn = parameters?.inn;
        
        if (!inn) {
            // Request INN from user
            const form = await this.interactiveForms.createInnCheckForm();
            await this.bot.sendMessage(chatId, form.text, {
                reply_markup: form.keyboard,
                parse_mode: 'HTML'
            });
            return;
        }
        
        try {
            // Send processing message
            const processingMsg = await this.bot.sendMessage(chatId, '🔍 Проверяю ИНН...');
            
            // Check INN using enhanced DaData
            const checkResult = await this.enhancedDadata.checkINN(inn);
            
            // Record INN check
            this.analyticsEngine.recordEvent('inn_check', {
                user_id: userId,
                inn: inn,
                result: checkResult.success
            }, userId);
            
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
                    message_id: processingMsg.message_id
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
                const form = await this.interactiveForms.createLegalConsultationForm();
                await this.bot.sendMessage(chatId, form.text, {
                    reply_markup: form.keyboard,
                    parse_mode: 'HTML'
                });
                return;
            }
            
            // Send typing indicator
            await this.bot.sendChatAction(chatId, 'typing');
            
            // Get user context for personalized response
            const userContext = await this.contextManager.getUserContext(userId);
            
            // Generate AI response using advanced prompts
            const prompt = await this.advancedPrompts.getLegalConsultationPrompt(question, userContext);
            const aiResponse = await this.aiEngine.generateResponse(prompt, {
                userId,
                context: userContext,
                responseType: 'legal_consultation'
            });
            
            // Record AI processing time
            this.analyticsEngine.recordEvent('ai_response', {
                user_id: userId,
                processing_time: aiResponse.processingTime,
                model: aiResponse.model
            }, userId);
            
            // Generate response with UI
            const response = await this.advancedUI.generateLegalConsultationResponse(aiResponse);
            
            await this.bot.sendMessage(chatId, response.text, {
                reply_markup: response.keyboard,
                parse_mode: 'HTML'
            });
            
        } catch (error) {
            console.error('Legal consultation error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при обработке юридической консультации');
        }
    }

    // Handle contract generation
    async handleContractGeneration(context) {
        const { userId, chatId, parameters } = context;
        
        try {
            if (!parameters?.template) {
                // Show contract templates
                const templatesMessage = await this.advancedUI.generateContractTemplatesMessage();
                await this.bot.sendMessage(chatId, templatesMessage.text, {
                    reply_markup: templatesMessage.keyboard,
                    parse_mode: 'HTML'
                });
                return;
            }
            
            // Start contract generation form
            const form = await this.interactiveForms.createContractForm(parameters.template);
            await this.bot.sendMessage(chatId, form.text, {
                reply_markup: form.keyboard,
                parse_mode: 'HTML'
            });
            
        } catch (error) {
            console.error('Contract generation error:', error);
            await this.sendErrorMessage(chatId, 'Произошла ошибка при генерации договора');
        }
    }

    // Handle user statistics
    async handleUserStatistics(context) {
        const { userId, chatId } = context;
        
        try {
            // Generate user report
            const reportData = await this.generateUserReportData(userId);
            const report = await this.reportGenerator.generateReport('user_report', reportData, {
                userId,
                format: 'html'
            });
            
            if (report.success) {
                // Send statistics message
                const statsMessage = await this.advancedUI.generateUserStatisticsMessage(reportData);
                await this.bot.sendMessage(chatId, statsMessage.text, {
                    reply_markup: statsMessage.keyboard,
                    parse_mode: 'HTML'
                });
                
                // Optionally send detailed report as document
                // await this.bot.sendDocument(chatId, report.filePath);
            }
            
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
            
            // Get user context
            const userContext = await this.contextManager.getUserContext(userId);
            
            // Generate appropriate prompt
            const prompt = await this.advancedPrompts.getGeneralPrompt(text, userContext);
            
            // Generate AI response
            const aiResponse = await this.aiEngine.generateResponse(prompt, {
                userId,
                context: userContext,
                responseType: 'general'
            });
            
            // Record metrics
            this.analyticsEngine.recordEvent('ai_response', {
                user_id: userId,
                processing_time: aiResponse.processingTime,
                model: aiResponse.model
            }, userId);
            
            // Generate response with UI
            const response = await this.advancedUI.generateGeneralResponse(aiResponse);
            
            await this.bot.sendMessage(chatId, response.text, {
                reply_markup: response.keyboard,
                parse_mode: 'HTML'
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
            
            // Search for relevant legal information
            const searchResults = await this.externalAPIs.searchLegalInfo(query);
            
            searchResults.forEach((result, index) => {
                results.push({
                    type: 'article',
                    id: `legal_${index}`,
                    title: result.title,
                    description: result.description,
                    input_message_content: {
                        message_text: result.content,
                        parse_mode: 'HTML'
                    }
                });
            });
            
            return results.slice(0, 10); // Limit to 10 results
            
        } catch (error) {
            console.error('Inline results generation error:', error);
            return [];
        }
    }

    // Generate document analysis response
    async generateDocumentAnalysisResponse(analysis) {
        const confidence = analysis.confidence || 0;
        const type = analysis.type || 'unknown';
        
        let text = `📄 <b>Анализ документа завершен</b>\n\n`;
        text += `<b>Тип:</b> ${this.getDocumentTypeName(type)}\n`;
        text += `<b>Уверенность:</b> ${confidence}%\n\n`;
        
        if (analysis.risks && analysis.risks.length > 0) {
            text += `⚠️ <b>Выявленные риски:</b>\n`;
            analysis.risks.forEach(risk => {
                text += `• ${risk.title} (${risk.level})\n`;
            });
            text += '\n';
        }
        
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            text += `💡 <b>Рекомендации:</b>\n`;
            analysis.recommendations.forEach(rec => {
                text += `• ${rec}\n`;
            });
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📊 Подробный отчет', callback_data: 'detailed_analysis' },
                    { text: '📋 Создать протокол', callback_data: 'create_protocol' }
                ],
                [
                    { text: '🔄 Анализировать еще', callback_data: 'analyze_another' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };
        
        return { text, keyboard };
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
                [
                    { text: '📊 Подробная информация', callback_data: `detailed_inn_${data.inn}` },
                    { text: '📄 Создать договор', callback_data: `contract_with_${data.inn}` }
                ],
                [
                    { text: '🔍 Проверить другой ИНН', callback_data: 'check_another_inn' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };
        
        return { text, keyboard };
    }

    // Generate user report data
    async generateUserReportData(userId) {
        const userMetrics = this.analyticsEngine.userMetrics.get(userId);
        const userFiles = this.fileManager.getUserFiles(userId);
        
        return {
            user_id: userId,
            user_name: 'Пользователь',
            registration_date: userMetrics?.first_seen ? 
                new Date(userMetrics.first_seen).toLocaleDateString('ru-RU') : 'Неизвестно',
            total_messages: userMetrics?.metrics.get('messages_processed')?.total || 0,
            total_documents: userMetrics?.metrics.get('documents_analyzed')?.total || 0,
            total_inn_checks: userMetrics?.metrics.get('inn_checks_performed')?.total || 0,
            total_contracts: userMetrics?.metrics.get('contracts_generated')?.total || 0,
            recent_activity: this.getUserRecentActivity(userId),
            achievements: this.getUserAchievements(userId),
            generated_at: new Date().toLocaleString('ru-RU')
        };
    }

    // Get user recent activity
    getUserRecentActivity(userId) {
        // This would fetch recent activity from analytics
        return [
            { date: 'Сегодня', description: 'Проверил ИНН компании' },
            { date: 'Вчера', description: 'Проанализировал договор' },
            { date: '2 дня назад', description: 'Получил юридическую консультацию' }
        ];
    }

    // Get user achievements
    getUserAchievements(userId) {
        const userMetrics = this.analyticsEngine.userMetrics.get(userId);
        const achievements = [];
        
        if (userMetrics?.metrics.get('messages_processed')?.total >= 10) {
            achievements.push({
                icon: '💬',
                title: 'Активный пользователь',
                description: 'Отправил более 10 сообщений'
            });
        }
        
        if (userMetrics?.metrics.get('documents_analyzed')?.total >= 5) {
            achievements.push({
                icon: '📄',
                title: 'Аналитик документов',
                description: 'Проанализировал более 5 документов'
            });
        }
        
        return achievements;
    }

    // Send error message
    async sendErrorMessage(chatId, message) {
        try {
            await this.bot.sendMessage(chatId, `❌ ${message}`, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🏠 Главное меню', callback_data: 'main_menu' },
                        { text: '🆘 Помощь', callback_data: 'help' }
                    ]]
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

    // Get document type name
    getDocumentTypeName(type) {
        const typeNames = {
            'contract': 'Договор',
            'legal_document': 'Юридический документ',
            'financial': 'Финансовый документ',
            'unknown': 'Неопределенный тип'
        };
        return typeNames[type] || type;
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
            analytics: this.analyticsEngine.getSystemStats(),
            file_manager: this.fileManager.getStorageInfo(),
            document_engine: this.documentEngine.getStats()
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
                    document_engine: !!this.documentEngine,
                    analytics_engine: !!this.analyticsEngine,
                    file_manager: !!this.fileManager
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
            console.log('🚀 Initializing Eva Lawyer Bot Ultimate v5.0...');
            
            // Test OpenAI connection
            await this.aiEngine.testConnection();
            console.log('✅ OpenAI connection successful');
            
            // Test DaData connection
            await this.enhancedDadata.testConnection();
            console.log('✅ DaData connection successful');
            
            // Set bot commands
            await this.setBotCommands();
            console.log('✅ Bot commands set');
            
            this.isInitialized = true;
            console.log('🎉 Eva Lawyer Bot Ultimate v5.0 initialized successfully!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Bot initialization failed:', error);
            throw error;
        }
    }

    // Set bot commands
    async setBotCommands() {
        const commands = [
            { command: 'start', description: 'Запустить бота' },
            { command: 'help', description: 'Помощь и инструкции' },
            { command: 'inn', description: 'Проверить ИНН компании' },
            { command: 'contract', description: 'Создать договор' },
            { command: 'analyze', description: 'Анализ документа' },
            { command: 'stats', description: 'Моя статистика' },
            { command: 'settings', description: 'Настройки' }
        ];
        
        await this.bot.setMyCommands(commands);
    }
}

// Export for Vercel
module.exports = async (req, res) => {
    try {
        // Initialize bot instance (singleton pattern)
        if (!global.evaBot) {
            global.evaBot = new EvaLawyerBotUltimate();
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

