// Unified AI Orchestrator - Единый AI оркестратор Eva Lawyer Bot
// Координирует все AI компоненты, генераторы и промпты в единую систему

const OpenAI = require('openai');

class UnifiedAIOrchestrator {
    constructor(apiKey, assistantId) {
        this.openai = new OpenAI({ apiKey });
        this.assistantId = assistantId;
        
        // Кэш для ответов и промптов
        this.responseCache = new Map();
        this.promptCache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 минут
        
        // Активные сессии
        this.activeSessions = new Map();
        this.threadPool = new Map();
        
        // Метрики AI
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            tokensUsed: 0,
            cacheHits: 0,
            activeThreads: 0
        };
        
        // Специализированные промпты
        this.prompts = this.initializePrompts();
        
        // Генераторы
        this.generators = this.initializeGenerators();
        
        // Анализаторы
        this.analyzers = this.initializeAnalyzers();
        
        // Инициализация
        this.initialize();
    }

    // Инициализация системы
    async initialize() {
        try {
            // Проверяем подключение к OpenAI
            await this.testConnection();
            
            // Инициализируем Assistant
            await this.initializeAssistant();
            
            console.log('✅ AI Orchestrator initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AI Orchestrator:', error);
        }
    }

    // Инициализация промптов
    initializePrompts() {
        return {
            // Консультации по областям права
            corporate: {
                system: `Вы - эксперт по корпоративному праву России. Предоставляйте точные, актуальные консультации по:
                - Создание и регистрация ООО, АО
                - Корпоративные споры и конфликты
                - Реорганизация и ликвидация
                - Сделки M&A
                - Корпоративное управление
                - Акционерные соглашения
                
                Всегда ссылайтесь на актуальное законодательство РФ.`,
                temperature: 0.3,
                maxTokens: 1500
            },
            
            family: {
                system: `Вы - специалист по семейному праву России. Консультируйте по:
                - Заключение и расторжение брака
                - Раздел имущества супругов
                - Алименты и содержание
                - Права и обязанности родителей
                - Усыновление и опека
                - Брачные договоры
                
                Учитывайте эмоциональную составляющую, будьте деликатны.`,
                temperature: 0.4,
                maxTokens: 1200
            },
            
            realestate: {
                system: `Вы - эксперт по недвижимости и земельному праву России. Консультируйте по:
                - Купля-продажа недвижимости
                - Аренда и найм жилых помещений
                - Права на земельные участки
                - Регистрация прав собственности
                - Споры с застройщиками
                - Ипотека и залог недвижимости`,
                temperature: 0.3,
                maxTokens: 1400
            },
            
            labor: {
                system: `Вы - специалист по трудовому праву России. Консультируйте по:
                - Трудовые договоры и контракты
                - Увольнение и сокращение
                - Заработная плата и компенсации
                - Рабочее время и отпуска
                - Трудовые споры
                - Охрана труда и безопасность`,
                temperature: 0.3,
                maxTokens: 1300
            },
            
            tax: {
                system: `Вы - эксперт по налоговому праву России. Консультируйте по:
                - Налогообложение физических лиц
                - Налогообложение юридических лиц
                - НДС, налог на прибыль, НДФЛ
                - Налоговые льготы и вычеты
                - Налоговые споры и проверки
                - Специальные налоговые режимы`,
                temperature: 0.2,
                maxTokens: 1600
            },
            
            admin: {
                system: `Вы - специалист по административному праву России. Консультируйте по:
                - Административные правонарушения
                - Лицензирование и разрешения
                - Государственные услуги
                - Административные процедуры
                - Обжалование действий органов власти
                - Административная ответственность`,
                temperature: 0.3,
                maxTokens: 1400
            },
            
            // Анализ документов
            contractAnalysis: {
                system: `Вы - эксперт по анализу договоров. Проводите детальный анализ:
                - Правовая корректность условий
                - Выявление рисков и недостатков
                - Соответствие законодательству
                - Рекомендации по улучшению
                - Потенциальные споры
                
                Структурируйте ответ по разделам: Анализ, Риски, Рекомендации.`,
                temperature: 0.2,
                maxTokens: 2000
            },
            
            riskAssessment: {
                system: `Вы - специалист по правовой оценке рисков. Анализируйте:
                - Юридические риски сделок
                - Финансовые последствия
                - Репутационные риски
                - Регуляторные риски
                - Операционные риски
                
                Оценивайте риски по шкале: Низкий, Средний, Высокий, Критический.`,
                temperature: 0.2,
                maxTokens: 1800
            },
            
            // Генерация документов
            documentGeneration: {
                system: `Вы - эксперт по составлению юридических документов. Создавайте:
                - Договоры различных типов
                - Исковые заявления
                - Претензии и уведомления
                - Доверенности
                - Корпоративные документы
                
                Используйте актуальные формы и требования российского законодательства.`,
                temperature: 0.1,
                maxTokens: 2500
            },
            
            // Общие консультации
            general: {
                system: `Вы - универсальный юридический консультант по российскому праву. 
                Предоставляйте квалифицированные консультации по всем отраслям права.
                Если вопрос требует узкой специализации, рекомендуйте обратиться к профильному специалисту.
                Всегда указывайте актуальные нормы законодательства.`,
                temperature: 0.4,
                maxTokens: 1500
            }
        };
    }

    // Инициализация генераторов
    initializeGenerators() {
        return {
            contract: new ContractGenerator(this),
            document: new DocumentGenerator(this),
            report: new ReportGenerator(this),
            analysis: new AnalysisGenerator(this),
            summary: new SummaryGenerator(this)
        };
    }

    // Инициализация анализаторов
    initializeAnalyzers() {
        return {
            text: new TextAnalyzer(this),
            document: new DocumentAnalyzer(this),
            risk: new RiskAnalyzer(this),
            compliance: new ComplianceAnalyzer(this),
            sentiment: new SentimentAnalyzer(this)
        };
    }

    // Тестирование подключения
    async testConnection() {
        try {
            const response = await this.openai.models.list();
            return response.data.length > 0;
        } catch (error) {
            throw new Error(`OpenAI connection failed: ${error.message}`);
        }
    }

    // Инициализация Assistant
    async initializeAssistant() {
        try {
            if (this.assistantId) {
                const assistant = await this.openai.beta.assistants.retrieve(this.assistantId);
                console.log(`✅ Connected to assistant: ${assistant.name}`);
                return assistant;
            }
        } catch (error) {
            console.warn('⚠️ Assistant not available, using fallback mode');
        }
    }

    // Основной метод для получения консультации
    async getConsultation(question, options = {}) {
        const startTime = Date.now();
        
        try {
            // Определяем специализацию
            const specialty = options.specialty || this.detectSpecialty(question);
            
            // Проверяем кэш
            const cacheKey = this.generateCacheKey(question, specialty, options);
            const cached = this.getCachedResponse(cacheKey);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }
            
            // Получаем ответ
            let response;
            if (this.assistantId && options.useAssistant !== false) {
                response = await this.getAssistantResponse(question, options);
            } else {
                response = await this.getChatResponse(question, specialty, options);
            }
            
            // Кэшируем ответ
            this.cacheResponse(cacheKey, response);
            
            // Обновляем метрики
            this.updateMetrics(startTime, true);
            
            return response;
            
        } catch (error) {
            console.error('Error getting consultation:', error);
            this.updateMetrics(startTime, false);
            
            // Fallback ответ
            return this.getFallbackResponse(error);
        }
    }

    // Ответ через Assistant API
    async getAssistantResponse(question, options = {}) {
        const userId = options.userId || 'anonymous';
        
        try {
            // Получаем или создаем thread
            let thread = this.threadPool.get(userId);
            if (!thread) {
                thread = await this.openai.beta.threads.create();
                this.threadPool.set(userId, thread);
                this.metrics.activeThreads++;
            }
            
            // Добавляем сообщение в thread
            await this.openai.beta.threads.messages.create(thread.id, {
                role: 'user',
                content: question
            });
            
            // Запускаем Assistant
            const run = await this.openai.beta.threads.runs.create(thread.id, {
                assistant_id: this.assistantId,
                additional_instructions: this.getAdditionalInstructions(options)
            });
            
            // Ждем завершения
            const result = await this.waitForRunCompletion(thread.id, run.id);
            
            if (result.status === 'completed') {
                // Получаем ответ
                const messages = await this.openai.beta.threads.messages.list(thread.id);
                const lastMessage = messages.data[0];
                
                if (lastMessage.role === 'assistant') {
                    return lastMessage.content[0].text.value;
                }
            } else if (result.status === 'requires_action') {
                // Обрабатываем tool calls
                return await this.handleToolCalls(thread.id, run.id, result);
            }
            
            throw new Error(`Assistant run failed with status: ${result.status}`);
            
        } catch (error) {
            console.error('Assistant API error:', error);
            // Fallback к обычному Chat API
            return await this.getChatResponse(question, options.specialty || 'general', options);
        }
    }

    // Ответ через Chat API
    async getChatResponse(question, specialty = 'general', options = {}) {
        const prompt = this.prompts[specialty] || this.prompts.general;
        
        const messages = [
            { role: 'system', content: prompt.system },
            { role: 'user', content: question }
        ];
        
        // Добавляем контекст если есть
        if (options.context) {
            const contextMessage = this.buildContextMessage(options.context);
            messages.splice(1, 0, contextMessage);
        }
        
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: prompt.temperature,
            max_tokens: prompt.maxTokens,
            stream: false
        });
        
        this.metrics.tokensUsed += response.usage.total_tokens;
        
        return response.choices[0].message.content;
    }

    // Ожидание завершения Assistant run
    async waitForRunCompletion(threadId, runId, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
            
            if (['completed', 'failed', 'cancelled', 'expired', 'requires_action'].includes(run.status)) {
                return run;
            }
            
            // Ждем 2 секунды перед следующей проверкой
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('Assistant run timeout');
    }

    // Обработка tool calls
    async handleToolCalls(threadId, runId, run) {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];
        
        for (const toolCall of toolCalls) {
            const output = await this.executeToolCall(toolCall);
            toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(output)
            });
        }
        
        // Отправляем результаты tool calls
        await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
            tool_outputs: toolOutputs
        });
        
        // Ждем завершения
        const result = await this.waitForRunCompletion(threadId, runId);
        
        if (result.status === 'completed') {
            const messages = await this.openai.beta.threads.messages.list(threadId);
            return messages.data[0].content[0].text.value;
        }
        
        throw new Error('Tool call execution failed');
    }

    // Выполнение tool call
    async executeToolCall(toolCall) {
        const { name, arguments: args } = toolCall.function;
        const parsedArgs = JSON.parse(args);
        
        switch (name) {
            case 'check_company_inn':
                return await this.generators.analysis.checkCompanyByINN(parsedArgs.inn);
                
            case 'analyze_contract_risks':
                return await this.analyzers.risk.analyzeContract(parsedArgs.contract_text);
                
            case 'generate_document':
                return await this.generators.document.generateDocument(parsedArgs);
                
            case 'search_legal_precedents':
                return await this.analyzers.compliance.searchPrecedents(parsedArgs.query);
                
            case 'calculate_legal_deadlines':
                return await this.generators.analysis.calculateDeadlines(parsedArgs);
                
            case 'check_compliance':
                return await this.analyzers.compliance.checkCompliance(parsedArgs);
                
            default:
                return { error: `Unknown tool: ${name}` };
        }
    }

    // Определение специализации по вопросу
    detectSpecialty(question) {
        const keywords = {
            corporate: ['ооо', 'ао', 'корпорация', 'акции', 'учредитель', 'устав', 'реорганизация'],
            family: ['брак', 'развод', 'алименты', 'ребенок', 'супруг', 'имущество супругов'],
            realestate: ['недвижимость', 'квартира', 'дом', 'участок', 'аренда', 'покупка', 'продажа'],
            labor: ['работа', 'трудовой', 'увольнение', 'зарплата', 'отпуск', 'больничный'],
            tax: ['налог', 'ндфл', 'ндс', 'декларация', 'вычет', 'льгота'],
            admin: ['штраф', 'административный', 'лицензия', 'разрешение', 'госуслуги']
        };
        
        const lowerQuestion = question.toLowerCase();
        
        for (const [specialty, words] of Object.entries(keywords)) {
            if (words.some(word => lowerQuestion.includes(word))) {
                return specialty;
            }
        }
        
        return 'general';
    }

    // Генерация ключа кэша
    generateCacheKey(question, specialty, options) {
        const key = `${specialty}_${question}_${JSON.stringify(options)}`;
        return require('crypto').createHash('md5').update(key).digest('hex');
    }

    // Получение кэшированного ответа
    getCachedResponse(key) {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.response;
        }
        return null;
    }

    // Кэширование ответа
    cacheResponse(key, response) {
        this.responseCache.set(key, {
            response,
            timestamp: Date.now()
        });
        
        // Очищаем старые записи
        if (this.responseCache.size > 1000) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
    }

    // Построение контекстного сообщения
    buildContextMessage(context) {
        let contextText = 'Дополнительная информация о пользователе:\n';
        
        if (context.consultationsCount) {
            contextText += `- Количество предыдущих консультаций: ${context.consultationsCount}\n`;
        }
        
        if (context.level) {
            contextText += `- Уровень пользователя: ${context.level}\n`;
        }
        
        if (context.lastConsultation) {
            contextText += `- Последняя консультация: ${new Date(context.lastConsultation).toLocaleDateString()}\n`;
        }
        
        return { role: 'system', content: contextText };
    }

    // Получение дополнительных инструкций для Assistant
    getAdditionalInstructions(options) {
        let instructions = '';
        
        if (options.specialty) {
            instructions += `Специализация: ${options.specialty}. `;
        }
        
        if (options.urgent) {
            instructions += 'Это срочная консультация, требуется быстрый и точный ответ. ';
        }
        
        if (options.context?.level === 'expert') {
            instructions += 'Пользователь - эксперт, можно использовать специальную терминологию. ';
        }
        
        return instructions;
    }

    // Fallback ответ при ошибке
    getFallbackResponse(error) {
        const errorMessages = {
            'rate_limit': 'Превышен лимит запросов. Попробуйте через минуту.',
            'invalid_api_key': 'Проблема с API ключом. Обратитесь к администратору.',
            'timeout': 'Превышено время ожидания. Попробуйте упростить вопрос.',
            'content_filter': 'Вопрос не может быть обработан из-за ограничений контента.'
        };
        
        // Определяем тип ошибки
        const errorType = this.classifyError(error);
        const message = errorMessages[errorType] || 'Временные технические проблемы. Попробуйте позже.';
        
        return `❌ ${message}\n\n💡 Вы можете:\n• Переформулировать вопрос\n• Обратиться к разделу помощи\n• Связаться с поддержкой`;
    }

    // Классификация ошибок
    classifyError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('rate limit')) return 'rate_limit';
        if (message.includes('api key') || message.includes('unauthorized')) return 'invalid_api_key';
        if (message.includes('timeout')) return 'timeout';
        if (message.includes('content filter')) return 'content_filter';
        
        return 'unknown';
    }

    // Обновление метрик
    updateMetrics(startTime, success) {
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        // Обновляем среднее время ответа
        const responseTime = Date.now() - startTime;
        const total = this.metrics.totalRequests;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;
    }

    // Анализ документа
    async analyzeDocument(documentText, analysisType = 'general') {
        const analyzer = this.analyzers[analysisType] || this.analyzers.document;
        return await analyzer.analyze(documentText);
    }

    // Генерация документа
    async generateDocument(type, parameters) {
        const generator = this.generators[type] || this.generators.document;
        return await generator.generate(parameters);
    }

    // Оценка рисков
    async assessRisks(content, riskType = 'general') {
        return await this.analyzers.risk.assess(content, riskType);
    }

    // Проверка соответствия
    async checkCompliance(content, regulations) {
        return await this.analyzers.compliance.check(content, regulations);
    }

    // Очистка кэша
    clearCache() {
        this.responseCache.clear();
        this.promptCache.clear();
    }

    // Очистка неактивных threads
    async cleanupThreads() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа
        
        for (const [userId, thread] of this.threadPool.entries()) {
            if (now - thread.created_at * 1000 > maxAge) {
                try {
                    await this.openai.beta.threads.del(thread.id);
                    this.threadPool.delete(userId);
                    this.metrics.activeThreads--;
                } catch (error) {
                    console.error(`Error deleting thread for user ${userId}:`, error);
                }
            }
        }
    }

    // Получение статистики
    getStatistics() {
        return {
            ...this.metrics,
            cacheSize: this.responseCache.size,
            successRate: this.metrics.successfulRequests / this.metrics.totalRequests,
            errorRate: this.metrics.failedRequests / this.metrics.totalRequests
        };
    }

    // Экспорт конфигурации
    exportConfiguration() {
        return {
            prompts: this.prompts,
            metrics: this.metrics,
            cacheSize: this.responseCache.size,
            activeThreads: this.threadPool.size,
            timestamp: Date.now()
        };
    }
}

// Вспомогательные классы генераторов
class ContractGenerator {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async generate(parameters) {
        // Реализация генерации договоров
        return { success: true, document: 'Generated contract...' };
    }
}

class DocumentGenerator {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async generate(parameters) {
        // Реализация генерации документов
        return { success: true, document: 'Generated document...' };
    }
}

class ReportGenerator {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async generate(parameters) {
        // Реализация генерации отчетов
        return { success: true, report: 'Generated report...' };
    }
}

class AnalysisGenerator {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async checkCompanyByINN(inn) {
        // Реализация проверки компании
        return { success: true, company: 'Company info...' };
    }
    
    async calculateDeadlines(parameters) {
        // Реализация расчета сроков
        return { success: true, deadlines: 'Calculated deadlines...' };
    }
}

class SummaryGenerator {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async generate(text) {
        // Реализация генерации резюме
        return { success: true, summary: 'Generated summary...' };
    }
}

// Вспомогательные классы анализаторов
class TextAnalyzer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async analyze(text) {
        // Реализация анализа текста
        return { success: true, analysis: 'Text analysis...' };
    }
}

class DocumentAnalyzer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async analyze(document) {
        // Реализация анализа документов
        return { success: true, analysis: 'Document analysis...' };
    }
}

class RiskAnalyzer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async assess(content, riskType) {
        // Реализация оценки рисков
        return { success: true, risks: 'Risk assessment...' };
    }
    
    async analyzeContract(contractText) {
        // Реализация анализа рисков договора
        return { success: true, risks: 'Contract risk analysis...' };
    }
}

class ComplianceAnalyzer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async check(content, regulations) {
        // Реализация проверки соответствия
        return { success: true, compliance: 'Compliance check...' };
    }
    
    async searchPrecedents(query) {
        // Реализация поиска прецедентов
        return { success: true, precedents: 'Legal precedents...' };
    }
    
    async checkCompliance(parameters) {
        // Реализация проверки соответствия
        return { success: true, compliance: 'Compliance analysis...' };
    }
}

class SentimentAnalyzer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    
    async analyze(text) {
        // Реализация анализа тональности
        return { success: true, sentiment: 'Sentiment analysis...' };
    }
}

module.exports = UnifiedAIOrchestrator;

