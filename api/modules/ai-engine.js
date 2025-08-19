// Advanced AI Engine for Eva Lawyer Bot
// Enhanced OpenAI integration with context awareness and specialized processing

const AdvancedPrompts = require('./advanced-prompts');

class AIEngine {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.prompts = new AdvancedPrompts();
        this.conversationHistory = new Map(); // userId -> conversation history
        this.maxHistoryLength = 10;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Enhanced OpenAI API call with retry logic
    async callOpenAI(messages, options = {}) {
        if (!this.openaiApiKey || this.openaiApiKey === 'placeholder_openai_key') {
            return this.getFallbackResponse(messages[messages.length - 1].content);
        }

        const requestOptions = {
            model: this.model,
            messages: messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            frequency_penalty: options.frequencyPenalty || 0.1,
            presence_penalty: options.presencePenalty || 0.1,
            ...options
        };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestOptions)
                });

                if (!response.ok) {
                    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return {
                        success: true,
                        content: data.choices[0].message.content,
                        usage: data.usage,
                        model: data.model
                    };
                } else {
                    throw new Error('Invalid response format from OpenAI');
                }

            } catch (error) {
                console.error(`OpenAI API attempt ${attempt} failed:`, error);
                
                if (attempt === this.retryAttempts) {
                    return this.getFallbackResponse(messages[messages.length - 1].content, error);
                }
                
                // Exponential backoff
                await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
            }
        }
    }

    // Sleep utility for retry delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fallback response when OpenAI is unavailable
    getFallbackResponse(userQuery, error = null) {
        const fallbackResponses = {
            contract: `📋 **Анализ договора (базовый режим)**

К сожалению, AI-сервис временно недоступен, но я могу предоставить базовые рекомендации:

⚖️ **Основные моменты для проверки:**
• Предмет договора должен быть четко определен
• Цена и порядок расчетов
• Сроки исполнения обязательств
• Ответственность за нарушения
• Порядок изменения и расторжения

⚠️ **Типичные риски:**
• Неопределенность существенных условий
• Несбалансированная ответственность сторон
• Отсутствие механизмов защиты интересов

📞 Для детального анализа рекомендую обратиться к юристу.`,

            inn: `🔍 **Проверка контрагента (базовый режим)**

AI-сервис временно недоступен. Базовые рекомендации:

✅ **Что проверить:**
• Статус организации в ЕГРЮЛ
• Наличие задолженностей
• Судебные дела
• Финансовое состояние
• Лицензии и разрешения

🌐 **Полезные ресурсы:**
• egrul.nalog.ru - проверка в ЕГРЮЛ
• kad.arbitr.ru - арбитражные дела
• bankrot.fedresurs.ru - банкротство

📞 Для углубленной проверки обратитесь к специалисту.`,

            default: `⚖️ **Eva Lawyer Bot (базовый режим)**

AI-сервис временно недоступен, но я готова помочь с базовой информацией:

📋 **Доступные функции:**
• Общие рекомендации по договорам
• Базовая информация о проверке контрагентов
• Ссылки на полезные ресурсы
• Контакты для получения профессиональной помощи

🔄 Попробуйте повторить запрос через несколько минут.
📞 Для срочных вопросов рекомендую обратиться к юристу.`
        };

        // Определяем тип запроса для подходящего fallback
        const queryType = this.prompts.analyzeQueryType(userQuery);
        return {
            success: false,
            content: fallbackResponses[queryType] || fallbackResponses.default,
            fallback: true,
            error: error?.message
        };
    }

    // Получение истории разговора
    getConversationHistory(userId) {
        return this.conversationHistory.get(userId) || [];
    }

    // Добавление сообщения в историю
    addToHistory(userId, role, content) {
        let history = this.getConversationHistory(userId);
        history.push({ role, content, timestamp: Date.now() });
        
        // Ограничиваем длину истории
        if (history.length > this.maxHistoryLength) {
            history = history.slice(-this.maxHistoryLength);
        }
        
        this.conversationHistory.set(userId, history);
    }

    // Очистка истории разговора
    clearHistory(userId) {
        this.conversationHistory.delete(userId);
    }

    // Основной метод для обработки запросов
    async processQuery(userId, query, context = {}) {
        try {
            // Анализируем тип запроса
            const queryType = this.prompts.analyzeQueryType(query);
            
            // Получаем подходящий промпт
            const systemPrompt = this.prompts.selectPrompt(queryType, context.type);
            
            // Формируем сообщения для OpenAI
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Добавляем историю разговора если есть
            const history = this.getConversationHistory(userId);
            if (history.length > 0) {
                // Добавляем последние несколько сообщений для контекста
                const recentHistory = history.slice(-4);
                messages.push(...recentHistory);
            }

            // Добавляем текущий запрос
            messages.push({ role: 'user', content: query });

            // Вызываем OpenAI API
            const response = await this.callOpenAI(messages, {
                temperature: context.temperature || 0.7,
                maxTokens: context.maxTokens || 2000
            });

            // Сохраняем в историю
            this.addToHistory(userId, 'user', query);
            if (response.success) {
                this.addToHistory(userId, 'assistant', response.content);
            }

            return response;

        } catch (error) {
            console.error('AI Engine processing error:', error);
            return this.getFallbackResponse(query, error);
        }
    }

    // Специализированный анализ документов
    async analyzeDocument(userId, documentText, documentType = 'contract') {
        const contextualPrompt = this.prompts.createContextualPrompt(
            'contract',
            `Проанализируй следующий документ: ${documentText}`,
            { documentType }
        );

        return await this.processQuery(userId, contextualPrompt, {
            type: 'documentReview',
            maxTokens: 3000,
            temperature: 0.5
        });
    }

    // Анализ рисков
    async analyzeRisks(userId, situation, riskType = 'general') {
        const contextualPrompt = this.prompts.createContextualPrompt(
            'base',
            `Проведи анализ правовых рисков: ${situation}`,
            { urgency: 'high' }
        );

        return await this.processQuery(userId, contextualPrompt, {
            type: 'riskAnalysis',
            maxTokens: 2500,
            temperature: 0.6
        });
    }

    // Подготовка правового заключения
    async prepareLegalOpinion(userId, facts, question) {
        const contextualPrompt = this.prompts.createContextualPrompt(
            'base',
            `Подготовь правовое заключение. Факты: ${facts}. Вопрос: ${question}`,
            { documentType: 'legal_opinion' }
        );

        return await this.processQuery(userId, contextualPrompt, {
            type: 'legalOpinion',
            maxTokens: 3500,
            temperature: 0.4
        });
    }

    // Помощь в составлении договора
    async assistContractDrafting(userId, contractType, requirements) {
        const contextualPrompt = this.prompts.createContextualPrompt(
            'contract',
            `Помоги составить договор. Тип: ${contractType}. Требования: ${requirements}`,
            { documentType: contractType }
        );

        return await this.processQuery(userId, contextualPrompt, {
            type: 'contractDrafting',
            maxTokens: 4000,
            temperature: 0.5
        });
    }

    // Стратегия ведения спора
    async developDisputeStrategy(userId, disputeDetails, goals) {
        const contextualPrompt = this.prompts.createContextualPrompt(
            'litigation',
            `Разработай стратегию спора. Детали: ${disputeDetails}. Цели: ${goals}`,
            { urgency: 'high' }
        );

        return await this.processQuery(userId, contextualPrompt, {
            type: 'disputeStrategy',
            maxTokens: 3000,
            temperature: 0.6
        });
    }

    // Проверка контрагента с AI анализом
    async analyzeCounterparty(userId, innData, additionalInfo = '') {
        const prompt = `Проанализируй данные о контрагенте и оцени риски сотрудничества:

ДАННЫЕ КОНТРАГЕНТА:
${JSON.stringify(innData, null, 2)}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
${additionalInfo}

Проведи комплексный анализ и дай рекомендации по работе с данным контрагентом.`;

        return await this.processQuery(userId, prompt, {
            type: 'riskAnalysis',
            maxTokens: 2500,
            temperature: 0.6
        });
    }

    // Получение статистики использования
    getUsageStats() {
        return {
            totalUsers: this.conversationHistory.size,
            totalConversations: Array.from(this.conversationHistory.values())
                .reduce((sum, history) => sum + history.length, 0),
            activeUsers: Array.from(this.conversationHistory.entries())
                .filter(([userId, history]) => {
                    const lastMessage = history[history.length - 1];
                    return lastMessage && (Date.now() - lastMessage.timestamp) < 24 * 60 * 60 * 1000;
                }).length
        };
    }
}

module.exports = AIEngine;

