// Context Manager for Eva Lawyer Bot
// Smart context and state management with user preferences and session handling

class ContextManager {
    constructor() {
        this.userContexts = new Map(); // userId -> context data
        this.sessionTimeouts = new Map(); // userId -> timeout
        this.defaultSessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.maxContextSize = 50; // Maximum context entries per user
    }

    // Получение контекста пользователя
    getUserContext(userId) {
        if (!this.userContexts.has(userId)) {
            this.initializeUserContext(userId);
        }
        
        this.refreshSession(userId);
        return this.userContexts.get(userId);
    }

    // Инициализация контекста нового пользователя
    initializeUserContext(userId) {
        const context = {
            userId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            preferences: {
                language: 'ru',
                expertise_level: 'general', // general, advanced, expert
                notification_preferences: {
                    reminders: true,
                    updates: true,
                    marketing: false
                },
                preferred_response_format: 'structured', // structured, brief, detailed
                timezone: 'Europe/Moscow'
            },
            currentSession: {
                startTime: Date.now(),
                currentFlow: null, // contract_review, inn_check, etc.
                currentStep: null,
                flowData: {},
                menuHistory: [],
                lastMenuAction: null
            },
            history: {
                queries: [],
                documents: [],
                inn_checks: [],
                contracts_reviewed: [],
                reports_generated: []
            },
            statistics: {
                total_queries: 0,
                total_documents: 0,
                total_inn_checks: 0,
                favorite_features: {},
                session_count: 1,
                total_time_spent: 0
            },
            temporary: {
                uploaded_files: [],
                current_document: null,
                pending_actions: [],
                form_data: {}
            }
        };

        this.userContexts.set(userId, context);
        this.setSessionTimeout(userId);
        return context;
    }

    // Обновление активности пользователя
    refreshSession(userId) {
        const context = this.userContexts.get(userId);
        if (context) {
            context.lastActivity = Date.now();
            this.setSessionTimeout(userId);
        }
    }

    // Установка таймаута сессии
    setSessionTimeout(userId) {
        // Очищаем предыдущий таймаут
        if (this.sessionTimeouts.has(userId)) {
            clearTimeout(this.sessionTimeouts.get(userId));
        }

        // Устанавливаем новый таймаут
        const timeout = setTimeout(() => {
            this.endSession(userId);
        }, this.defaultSessionTimeout);

        this.sessionTimeouts.set(userId, timeout);
    }

    // Завершение сессии
    endSession(userId) {
        const context = this.userContexts.get(userId);
        if (context) {
            // Сохраняем статистику сессии
            const sessionDuration = Date.now() - context.currentSession.startTime;
            context.statistics.total_time_spent += sessionDuration;
            
            // Очищаем временные данные
            context.temporary = {
                uploaded_files: [],
                current_document: null,
                pending_actions: [],
                form_data: {}
            };

            // Сбрасываем текущую сессию
            context.currentSession = {
                startTime: Date.now(),
                currentFlow: null,
                currentStep: null,
                flowData: {},
                menuHistory: [],
                lastMenuAction: null
            };
        }

        // Удаляем таймаут
        if (this.sessionTimeouts.has(userId)) {
            clearTimeout(this.sessionTimeouts.get(userId));
            this.sessionTimeouts.delete(userId);
        }
    }

    // Начало нового потока (flow)
    startFlow(userId, flowType, initialData = {}) {
        const context = this.getUserContext(userId);
        
        context.currentSession.currentFlow = flowType;
        context.currentSession.currentStep = 'start';
        context.currentSession.flowData = { ...initialData };
        context.currentSession.menuHistory = [];
        
        this.updateStatistics(userId, 'flow_started', flowType);
        return context;
    }

    // Переход к следующему шагу в потоке
    nextStep(userId, stepName, stepData = {}) {
        const context = this.getUserContext(userId);
        
        if (context.currentSession.currentFlow) {
            context.currentSession.currentStep = stepName;
            context.currentSession.flowData = {
                ...context.currentSession.flowData,
                ...stepData
            };
        }
        
        return context;
    }

    // Завершение потока
    completeFlow(userId, result = {}) {
        const context = this.getUserContext(userId);
        
        if (context.currentSession.currentFlow) {
            const flowType = context.currentSession.currentFlow;
            
            // Сохраняем результат в историю
            this.addToHistory(userId, flowType, {
                ...context.currentSession.flowData,
                ...result,
                completedAt: Date.now()
            });
            
            // Обновляем статистику
            this.updateStatistics(userId, 'flow_completed', flowType);
            
            // Очищаем текущий поток
            context.currentSession.currentFlow = null;
            context.currentSession.currentStep = null;
            context.currentSession.flowData = {};
        }
        
        return context;
    }

    // Добавление в историю
    addToHistory(userId, type, data) {
        const context = this.getUserContext(userId);
        
        const historyEntry = {
            id: this.generateId(),
            type,
            data,
            timestamp: Date.now()
        };

        // Определяем в какую категорию истории добавить
        switch (type) {
            case 'contract_review':
                context.history.contracts_reviewed.push(historyEntry);
                break;
            case 'inn_check':
                context.history.inn_checks.push(historyEntry);
                break;
            case 'document_upload':
                context.history.documents.push(historyEntry);
                break;
            case 'query':
                context.history.queries.push(historyEntry);
                break;
            default:
                context.history.queries.push(historyEntry);
        }

        // Ограничиваем размер истории
        this.limitHistorySize(context);
    }

    // Ограничение размера истории
    limitHistorySize(context) {
        const maxHistoryPerType = 20;
        
        Object.keys(context.history).forEach(key => {
            if (Array.isArray(context.history[key]) && context.history[key].length > maxHistoryPerType) {
                context.history[key] = context.history[key].slice(-maxHistoryPerType);
            }
        });
    }

    // Обновление статистики
    updateStatistics(userId, action, details = null) {
        const context = this.getUserContext(userId);
        
        switch (action) {
            case 'query':
                context.statistics.total_queries++;
                break;
            case 'document_upload':
                context.statistics.total_documents++;
                break;
            case 'inn_check':
                context.statistics.total_inn_checks++;
                break;
            case 'feature_used':
                if (details) {
                    context.statistics.favorite_features[details] = 
                        (context.statistics.favorite_features[details] || 0) + 1;
                }
                break;
            case 'flow_started':
            case 'flow_completed':
                if (details) {
                    const key = `${action}_${details}`;
                    context.statistics[key] = (context.statistics[key] || 0) + 1;
                }
                break;
        }
    }

    // Обновление предпочтений пользователя
    updatePreferences(userId, preferences) {
        const context = this.getUserContext(userId);
        context.preferences = {
            ...context.preferences,
            ...preferences
        };
        return context;
    }

    // Добавление в меню истории
    addToMenuHistory(userId, menuAction) {
        const context = this.getUserContext(userId);
        context.currentSession.menuHistory.push({
            action: menuAction,
            timestamp: Date.now()
        });
        context.currentSession.lastMenuAction = menuAction;
        
        // Ограничиваем размер истории меню
        if (context.currentSession.menuHistory.length > 10) {
            context.currentSession.menuHistory = context.currentSession.menuHistory.slice(-10);
        }
    }

    // Получение предыдущего действия в меню
    getPreviousMenuAction(userId) {
        const context = this.getUserContext(userId);
        const history = context.currentSession.menuHistory;
        
        if (history.length >= 2) {
            return history[history.length - 2].action;
        }
        
        return 'main_menu';
    }

    // Сохранение временных данных
    setTemporaryData(userId, key, value) {
        const context = this.getUserContext(userId);
        context.temporary[key] = value;
    }

    // Получение временных данных
    getTemporaryData(userId, key) {
        const context = this.getUserContext(userId);
        return context.temporary[key];
    }

    // Очистка временных данных
    clearTemporaryData(userId, key = null) {
        const context = this.getUserContext(userId);
        
        if (key) {
            delete context.temporary[key];
        } else {
            context.temporary = {
                uploaded_files: [],
                current_document: null,
                pending_actions: [],
                form_data: {}
            };
        }
    }

    // Проверка активности пользователя
    isUserActive(userId) {
        const context = this.userContexts.get(userId);
        if (!context) return false;
        
        const timeSinceLastActivity = Date.now() - context.lastActivity;
        return timeSinceLastActivity < this.defaultSessionTimeout;
    }

    // Получение статистики пользователя
    getUserStatistics(userId) {
        const context = this.getUserContext(userId);
        return {
            ...context.statistics,
            session_duration: Date.now() - context.currentSession.startTime,
            total_history_items: Object.values(context.history).reduce((sum, arr) => sum + arr.length, 0),
            current_flow: context.currentSession.currentFlow,
            current_step: context.currentSession.currentStep
        };
    }

    // Экспорт данных пользователя
    exportUserData(userId) {
        const context = this.getUserContext(userId);
        return {
            userId,
            preferences: context.preferences,
            statistics: this.getUserStatistics(userId),
            history: context.history,
            exportedAt: Date.now()
        };
    }

    // Очистка данных пользователя (GDPR compliance)
    deleteUserData(userId) {
        this.userContexts.delete(userId);
        
        if (this.sessionTimeouts.has(userId)) {
            clearTimeout(this.sessionTimeouts.get(userId));
            this.sessionTimeouts.delete(userId);
        }
        
        return true;
    }

    // Генерация уникального ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Получение общей статистики
    getGlobalStatistics() {
        const totalUsers = this.userContexts.size;
        const activeUsers = Array.from(this.userContexts.values())
            .filter(context => this.isUserActive(context.userId)).length;
        
        const totalQueries = Array.from(this.userContexts.values())
            .reduce((sum, context) => sum + context.statistics.total_queries, 0);
        
        const totalDocuments = Array.from(this.userContexts.values())
            .reduce((sum, context) => sum + context.statistics.total_documents, 0);
        
        return {
            totalUsers,
            activeUsers,
            totalQueries,
            totalDocuments,
            averageQueriesPerUser: totalUsers > 0 ? Math.round(totalQueries / totalUsers) : 0,
            timestamp: Date.now()
        };
    }

    // Очистка неактивных пользователей
    cleanupInactiveUsers() {
        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 дней
        let cleanedCount = 0;
        
        for (const [userId, context] of this.userContexts.entries()) {
            if (context.lastActivity < cutoffTime) {
                this.deleteUserData(userId);
                cleanedCount++;
            }
        }
        
        return cleanedCount;
    }
}

module.exports = ContextManager;

