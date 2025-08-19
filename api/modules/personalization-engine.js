// Personalization Engine for Eva Lawyer Bot
// Adaptive interface based on user behavior and preferences

class PersonalizationEngine {
    constructor() {
        this.userProfiles = new Map();
        this.usagePatterns = new Map();
        this.preferences = new Map();
        this.recommendations = new Map();
        
        // Default personalization settings
        this.defaultSettings = {
            language: 'ru',
            timezone: 'Europe/Moscow',
            theme: 'default',
            notifications: true,
            quickActions: [],
            specialization: 'general',
            experienceLevel: 'beginner'
        };
    }

    // Initialize user profile
    initializeUserProfile(userId, userData = {}) {
        const profile = {
            userId: userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            username: userData.username || '',
            registrationDate: Date.now(),
            lastActivity: Date.now(),
            totalSessions: 0,
            totalQuestions: 0,
            preferredTopics: [],
            settings: { ...this.defaultSettings },
            ...userData
        };

        this.userProfiles.set(userId, profile);
        this.usagePatterns.set(userId, {
            consultationTypes: new Map(),
            documentTypes: new Map(),
            timePatterns: [],
            frequentActions: new Map(),
            sessionDurations: []
        });

        return profile;
    }

    // Update user activity
    updateUserActivity(userId, activity) {
        const profile = this.getUserProfile(userId);
        if (!profile) return;

        profile.lastActivity = Date.now();
        profile.totalSessions++;

        // Track activity patterns
        const patterns = this.usagePatterns.get(userId);
        if (patterns) {
            // Track consultation types
            if (activity.type === 'consultation') {
                const count = patterns.consultationTypes.get(activity.subtype) || 0;
                patterns.consultationTypes.set(activity.subtype, count + 1);
            }

            // Track document types
            if (activity.type === 'document') {
                const count = patterns.documentTypes.get(activity.subtype) || 0;
                patterns.documentTypes.set(activity.subtype, count + 1);
            }

            // Track time patterns
            const hour = new Date().getHours();
            patterns.timePatterns.push(hour);

            // Track frequent actions
            if (activity.action) {
                const count = patterns.frequentActions.get(activity.action) || 0;
                patterns.frequentActions.set(activity.action, count + 1);
            }
        }

        this.userProfiles.set(userId, profile);
        this.generateRecommendations(userId);
    }

    // Get user profile
    getUserProfile(userId) {
        return this.userProfiles.get(userId);
    }

    // Update user preferences
    updateUserPreferences(userId, preferences) {
        const profile = this.getUserProfile(userId);
        if (!profile) return;

        profile.settings = { ...profile.settings, ...preferences };
        this.userProfiles.set(userId, profile);
        this.generateRecommendations(userId);
    }

    // Generate personalized recommendations
    generateRecommendations(userId) {
        const profile = this.getUserProfile(userId);
        const patterns = this.usagePatterns.get(userId);
        
        if (!profile || !patterns) return;

        const recommendations = {
            quickActions: this.generateQuickActions(patterns),
            suggestedTopics: this.generateTopicSuggestions(patterns),
            timeBasedSuggestions: this.generateTimeBasedSuggestions(patterns),
            experienceLevel: this.determineExperienceLevel(profile, patterns)
        };

        this.recommendations.set(userId, recommendations);
        return recommendations;
    }

    // Generate personalized quick actions
    generateQuickActions(patterns) {
        const actions = [];
        
        // Most used consultation types
        const topConsultations = Array.from(patterns.consultationTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        topConsultations.forEach(([type, count]) => {
            if (count >= 2) {
                actions.push({
                    text: this.getConsultationButtonText(type),
                    callback_data: `consult_${type}`,
                    priority: count
                });
            }
        });

        // Most used document types
        const topDocuments = Array.from(patterns.documentTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        topDocuments.forEach(([type, count]) => {
            if (count >= 2) {
                actions.push({
                    text: this.getDocumentButtonText(type),
                    callback_data: `doc_${type}`,
                    priority: count
                });
            }
        });

        // Most frequent actions
        const topActions = Array.from(patterns.frequentActions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        topActions.forEach(([action, count]) => {
            if (count >= 3) {
                actions.push({
                    text: this.getActionButtonText(action),
                    callback_data: action,
                    priority: count
                });
            }
        });

        // Sort by priority and return top 4
        return actions
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 4);
    }

    // Generate topic suggestions
    generateTopicSuggestions(patterns) {
        const suggestions = [];
        
        // Based on consultation history
        const consultationTypes = Array.from(patterns.consultationTypes.keys());
        consultationTypes.forEach(type => {
            suggestions.push(...this.getRelatedTopics(type));
        });

        // Remove duplicates and return top 5
        return [...new Set(suggestions)].slice(0, 5);
    }

    // Generate time-based suggestions
    generateTimeBasedSuggestions(patterns) {
        const currentHour = new Date().getHours();
        const suggestions = [];

        // Morning suggestions (6-12)
        if (currentHour >= 6 && currentHour < 12) {
            suggestions.push({
                text: '☀️ Доброе утро! Проверить новости законодательства?',
                callback_data: 'legal_changes'
            });
        }

        // Afternoon suggestions (12-18)
        if (currentHour >= 12 && currentHour < 18) {
            suggestions.push({
                text: '☀️ Добрый день! Проанализировать договор?',
                callback_data: 'doc_analyze_contract'
            });
        }

        // Evening suggestions (18-22)
        if (currentHour >= 18 && currentHour < 22) {
            suggestions.push({
                text: '🌆 Добрый вечер! Подготовить документы на завтра?',
                callback_data: 'doc_create'
            });
        }

        return suggestions;
    }

    // Determine user experience level
    determineExperienceLevel(profile, patterns) {
        const totalInteractions = profile.totalQuestions + profile.totalSessions;
        const uniqueTopics = patterns.consultationTypes.size + patterns.documentTypes.size;

        if (totalInteractions < 5) return 'beginner';
        if (totalInteractions < 20 || uniqueTopics < 3) return 'intermediate';
        if (totalInteractions < 50 || uniqueTopics < 5) return 'advanced';
        return 'expert';
    }

    // Get personalized welcome message
    getPersonalizedWelcome(userId) {
        const profile = this.getUserProfile(userId);
        if (!profile) return this.getDefaultWelcome();

        const recommendations = this.recommendations.get(userId);
        const timeGreeting = this.getTimeGreeting();
        const name = profile.firstName || 'Пользователь';

        let message = `${timeGreeting}, ${name}! 👋\n\n`;
        message += `🤖 <b>Eva Lawyer Bot</b> - ваш персональный юридический ассистент\n\n`;

        // Add experience-based message
        const experience = recommendations?.experienceLevel || 'beginner';
        switch (experience) {
            case 'beginner':
                message += `💡 <i>Новичок в юридических вопросах? Я помогу разобраться!</i>\n\n`;
                break;
            case 'intermediate':
                message += `📚 <i>Вижу, вы уже знакомы с основами. Готов к более сложным вопросам!</i>\n\n`;
                break;
            case 'advanced':
                message += `⚖️ <i>Опытный пользователь! Давайте решать сложные юридические задачи.</i>\n\n`;
                break;
            case 'expert':
                message += `🎓 <i>Эксперт! Готов к самым сложным консультациям и анализу.</i>\n\n`;
                break;
        }

        // Add recent activity hint
        if (profile.lastActivity && Date.now() - profile.lastActivity < 86400000) {
            message += `🔄 <i>Продолжим с того места, где остановились?</i>\n\n`;
        }

        return message;
    }

    // Get personalized menu layout
    getPersonalizedMenuLayout(userId) {
        const recommendations = this.recommendations.get(userId);
        if (!recommendations) return this.getDefaultMenuLayout();

        const layout = [];

        // Add quick actions if available
        if (recommendations.quickActions.length > 0) {
            layout.push({
                type: 'quick_actions',
                title: '⚡ Быстрые действия',
                buttons: recommendations.quickActions
            });
        }

        // Add standard menu items
        layout.push({
            type: 'main_menu',
            buttons: [
                { text: '💬 Консультация', callback_data: 'consultation_menu' },
                { text: '📄 Документы', callback_data: 'documents_menu' },
                { text: '🔍 Проверки', callback_data: 'checks_menu' },
                { text: '⚖️ Правовая база', callback_data: 'legal_base_menu' }
            ]
        });

        return layout;
    }

    // Get consultation button text
    getConsultationButtonText(type) {
        const texts = {
            corporate: '🏢 Корпоративное право',
            labor: '👥 Трудовое право',
            civil: '🏠 Гражданское право',
            tax: '💰 Налоговое право',
            admin: '⚖️ Административное',
            family: '👨‍👩‍👧‍👦 Семейное право'
        };
        return texts[type] || '💬 Консультация';
    }

    // Get document button text
    getDocumentButtonText(type) {
        const texts = {
            analyze_contract: '📋 Анализ договора',
            create: '📝 Создать документ',
            risk_check: '🔍 Проверка рисков',
            compliance: '🔒 Соответствие'
        };
        return texts[type] || '📄 Документ';
    }

    // Get action button text
    getActionButtonText(action) {
        const texts = {
            check_inn_form: '🔍 Проверить ИНН',
            legal_court_practice: '⚖️ Судебная практика',
            doc_analyze_contract: '📋 Анализ договора',
            consult_general: '💬 Консультация'
        };
        return texts[action] || action;
    }

    // Get related topics
    getRelatedTopics(consultationType) {
        const related = {
            corporate: ['Создание ООО', 'Корпоративные споры', 'M&A сделки'],
            labor: ['Увольнение', 'Трудовые договоры', 'Дисциплинарные взыскания'],
            civil: ['Недвижимость', 'Наследство', 'Договоры'],
            tax: ['Налоговые проверки', 'Оптимизация', 'Споры с ФНС']
        };
        return related[consultationType] || [];
    }

    // Get time greeting
    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 6) return '🌙 Доброй ночи';
        if (hour < 12) return '🌅 Доброе утро';
        if (hour < 18) return '☀️ Добрый день';
        return '🌆 Добрый вечер';
    }

    // Get default welcome
    getDefaultWelcome() {
        return `${this.getTimeGreeting()}! 👋\n\n🤖 <b>Eva Lawyer Bot</b> - ваш персональный юридический ассистент\n\n💡 <i>Выберите нужный раздел или просто напишите ваш вопрос</i>`;
    }

    // Get default menu layout
    getDefaultMenuLayout() {
        return [
            {
                type: 'main_menu',
                buttons: [
                    { text: '💬 Консультация', callback_data: 'consultation_menu' },
                    { text: '📄 Документы', callback_data: 'documents_menu' },
                    { text: '🔍 Проверки', callback_data: 'checks_menu' },
                    { text: '⚖️ Правовая база', callback_data: 'legal_base_menu' }
                ]
            }
        ];
    }

    // Export user data
    exportUserData(userId) {
        const profile = this.getUserProfile(userId);
        const patterns = this.usagePatterns.get(userId);
        const recommendations = this.recommendations.get(userId);

        return {
            profile,
            patterns: patterns ? {
                consultationTypes: Object.fromEntries(patterns.consultationTypes),
                documentTypes: Object.fromEntries(patterns.documentTypes),
                timePatterns: patterns.timePatterns,
                frequentActions: Object.fromEntries(patterns.frequentActions),
                sessionDurations: patterns.sessionDurations
            } : null,
            recommendations
        };
    }

    // Import user data
    importUserData(userId, data) {
        if (data.profile) {
            this.userProfiles.set(userId, data.profile);
        }

        if (data.patterns) {
            const patterns = {
                consultationTypes: new Map(Object.entries(data.patterns.consultationTypes || {})),
                documentTypes: new Map(Object.entries(data.patterns.documentTypes || {})),
                timePatterns: data.patterns.timePatterns || [],
                frequentActions: new Map(Object.entries(data.patterns.frequentActions || {})),
                sessionDurations: data.patterns.sessionDurations || []
            };
            this.usagePatterns.set(userId, patterns);
        }

        if (data.recommendations) {
            this.recommendations.set(userId, data.recommendations);
        }
    }

    // Clear user data
    clearUserData(userId) {
        this.userProfiles.delete(userId);
        this.usagePatterns.delete(userId);
        this.recommendations.delete(userId);
    }

    // Get usage statistics
    getUserStatistics(userId) {
        const profile = this.getUserProfile(userId);
        const patterns = this.usagePatterns.get(userId);

        if (!profile || !patterns) return null;

        return {
            totalSessions: profile.totalSessions,
            totalQuestions: profile.totalQuestions,
            registrationDate: profile.registrationDate,
            lastActivity: profile.lastActivity,
            mostUsedConsultationType: this.getMostUsed(patterns.consultationTypes),
            mostUsedDocumentType: this.getMostUsed(patterns.documentTypes),
            mostActiveHour: this.getMostActiveHour(patterns.timePatterns),
            experienceLevel: this.recommendations.get(userId)?.experienceLevel || 'beginner'
        };
    }

    // Get most used item from map
    getMostUsed(map) {
        if (map.size === 0) return null;
        return Array.from(map.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Get most active hour
    getMostActiveHour(timePatterns) {
        if (timePatterns.length === 0) return null;
        
        const hourCounts = {};
        timePatterns.forEach(hour => {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        return Object.entries(hourCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }
}

module.exports = PersonalizationEngine;

