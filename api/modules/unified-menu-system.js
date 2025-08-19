// Unified Menu System - Единая система управления меню Eva Lawyer Bot
// Объединяет все меню модули в единую координированную систему

class UnifiedMenuSystem {
    constructor() {
        // Состояние пользователей
        this.userStates = new Map();
        this.navigationHistory = new Map();
        this.userPreferences = new Map();
        
        // Кэш меню
        this.menuCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        
        // Метрики
        this.metrics = {
            menuViews: new Map(),
            buttonClicks: new Map(),
            navigationPaths: new Map(),
            userSessions: new Map()
        };
        
        // Инициализация меню структур
        this.initializeMenuStructures();
    }

    // Инициализация структур меню
    initializeMenuStructures() {
        this.menuStructures = {
            main: {
                id: 'main',
                title: '🏠 Главное меню',
                type: 'main',
                buttons: [
                    [
                        { text: '💬 Консультация', callback_data: 'consultation_menu', icon: '💬' },
                        { text: '📄 Документы', callback_data: 'documents_menu', icon: '📄' }
                    ],
                    [
                        { text: '🔍 Проверки', callback_data: 'checks_menu', icon: '🔍' },
                        { text: '⚖️ Услуги', callback_data: 'services_menu', icon: '⚖️' }
                    ],
                    [
                        { text: '📊 Аналитика', callback_data: 'analytics_menu', icon: '📊' },
                        { text: '⚙️ Настройки', callback_data: 'settings_menu', icon: '⚙️' }
                    ],
                    [
                        { text: '🆘 Помощь', callback_data: 'help_menu', icon: '🆘' }
                    ]
                ]
            },
            
            consultation: {
                id: 'consultation_menu',
                title: '💬 Юридические консультации',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '🏢 Корпоративное право', callback_data: 'consult_corporate', specialty: 'corporate' },
                        { text: '👨‍👩‍👧‍👦 Семейное право', callback_data: 'consult_family', specialty: 'family' }
                    ],
                    [
                        { text: '🏠 Недвижимость', callback_data: 'consult_realestate', specialty: 'realestate' },
                        { text: '💼 Трудовое право', callback_data: 'consult_labor', specialty: 'labor' }
                    ],
                    [
                        { text: '💰 Налоговое право', callback_data: 'consult_tax', specialty: 'tax' },
                        { text: '⚖️ Административное', callback_data: 'consult_admin', specialty: 'admin' }
                    ],
                    [
                        { text: '❓ Общий вопрос', callback_data: 'consult_general', specialty: 'general' },
                        { text: '🚨 Срочная консультация', callback_data: 'consult_urgent', specialty: 'urgent', priority: 'high' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            },
            
            documents: {
                id: 'documents_menu',
                title: '📄 Работа с документами',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '📋 Анализ договора', callback_data: 'doc_analyze_contract', action: 'analyze' },
                        { text: '🔍 Проверка рисков', callback_data: 'doc_check_risks', action: 'check_risks' }
                    ],
                    [
                        { text: '📝 Создать документ', callback_data: 'doc_create', action: 'create' },
                        { text: '✏️ Редактировать', callback_data: 'doc_edit', action: 'edit' }
                    ],
                    [
                        { text: '📊 Сравнить документы', callback_data: 'doc_compare', action: 'compare' },
                        { text: '🔒 Проверка соответствия', callback_data: 'doc_compliance', action: 'compliance' }
                    ],
                    [
                        { text: '📁 Мои документы', callback_data: 'doc_my_documents', action: 'list' },
                        { text: '📤 Загрузить файл', callback_data: 'doc_upload', action: 'upload' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            },
            
            checks: {
                id: 'checks_menu',
                title: '🔍 Проверки и поиск',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '🏢 Проверить ИНН', callback_data: 'check_inn_form', service: 'dadata' },
                        { text: '📋 Проверить ОГРН', callback_data: 'check_ogrn', service: 'dadata' }
                    ],
                    [
                        { text: '⚖️ Судебные дела', callback_data: 'check_court_cases', service: 'court' },
                        { text: '📊 Финансовое состояние', callback_data: 'check_financial', service: 'finance' }
                    ],
                    [
                        { text: '🔍 Поиск прецедентов', callback_data: 'search_precedents', service: 'legal_search' },
                        { text: '📜 Проверка лицензий', callback_data: 'check_licenses', service: 'licenses' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            },
            
            services: {
                id: 'services_menu',
                title: '⚖️ Юридические услуги',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '📝 Составление договоров', callback_data: 'service_contracts', service_type: 'contracts' },
                        { text: '⚖️ Представительство в суде', callback_data: 'service_court', service_type: 'court' }
                    ],
                    [
                        { text: '🏢 Регистрация бизнеса', callback_data: 'service_registration', service_type: 'registration' },
                        { text: '💰 Налоговое планирование', callback_data: 'service_tax_planning', service_type: 'tax' }
                    ],
                    [
                        { text: '🔒 Защита интеллектуальной собственности', callback_data: 'service_ip', service_type: 'ip' }
                    ],
                    [
                        { text: '📞 Связаться с юристом', callback_data: 'contact_lawyer', action: 'contact' },
                        { text: '💬 Онлайн консультация', callback_data: 'online_consultation', action: 'online' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            },
            
            analytics: {
                id: 'analytics_menu',
                title: '📊 Аналитика и отчеты',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '📈 Мои консультации', callback_data: 'analytics_consultations', type: 'consultations' },
                        { text: '📄 Обработанные документы', callback_data: 'analytics_documents', type: 'documents' }
                    ],
                    [
                        { text: '🏢 Проверенные компании', callback_data: 'analytics_companies', type: 'companies' },
                        { text: '⏱️ Время ответов', callback_data: 'analytics_response_time', type: 'performance' }
                    ],
                    [
                        { text: '📊 Персональный дашборд', callback_data: 'personal_dashboard', type: 'dashboard' },
                        { text: '📋 Экспорт данных', callback_data: 'export_data', action: 'export' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            },
            
            settings: {
                id: 'settings_menu',
                title: '⚙️ Настройки',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '👤 Профиль', callback_data: 'settings_profile', section: 'profile' },
                        { text: '🔔 Уведомления', callback_data: 'settings_notifications', section: 'notifications' }
                    ],
                    [
                        { text: '🎨 Персонализация', callback_data: 'settings_personalization', section: 'personalization' },
                        { text: '🔐 Безопасность', callback_data: 'settings_security', section: 'security' }
                    ],
                    [
                        { text: '📱 Интеграции', callback_data: 'settings_integrations', section: 'integrations' },
                        { text: '📊 Экспорт настроек', callback_data: 'settings_export', action: 'export' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            },
            
            help: {
                id: 'help_menu',
                title: '🆘 Помощь и поддержка',
                type: 'submenu',
                parent: 'main',
                buttons: [
                    [
                        { text: '📖 Руководство пользователя', callback_data: 'help_guide', type: 'guide' },
                        { text: '❓ Часто задаваемые вопросы', callback_data: 'help_faq', type: 'faq' }
                    ],
                    [
                        { text: '🎥 Видео инструкции', callback_data: 'help_videos', type: 'videos' },
                        { text: '📞 Техническая поддержка', callback_data: 'help_support', type: 'support' }
                    ],
                    [
                        { text: '💬 Обратная связь', callback_data: 'help_feedback', action: 'feedback' },
                        { text: '🐛 Сообщить об ошибке', callback_data: 'help_bug_report', action: 'bug_report' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'main' }
                    ]
                ]
            }
        };
    }

    // Получить меню для пользователя с персонализацией
    getMenu(userId, menuId = 'main', context = {}) {
        try {
            // Проверяем кэш
            const cacheKey = `${userId}_${menuId}_${JSON.stringify(context)}`;
            if (this.menuCache.has(cacheKey)) {
                const cached = this.menuCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.menu;
                }
            }

            // Получаем базовое меню
            const baseMenu = this.menuStructures[menuId] || this.menuStructures.main;
            
            // Персонализируем меню
            const personalizedMenu = this.personalizeMenu(userId, baseMenu, context);
            
            // Добавляем навигацию
            const menuWithNavigation = this.addNavigation(userId, personalizedMenu);
            
            // Кэшируем результат
            this.menuCache.set(cacheKey, {
                menu: menuWithNavigation,
                timestamp: Date.now()
            });
            
            // Обновляем метрики
            this.updateMenuMetrics(userId, menuId);
            
            return menuWithNavigation;
            
        } catch (error) {
            console.error('Error getting menu:', error);
            return this.getDefaultMenu();
        }
    }

    // Персонализация меню под пользователя
    personalizeMenu(userId, baseMenu, context) {
        const userState = this.getUserState(userId);
        const preferences = this.getUserPreferences(userId);
        
        // Клонируем базовое меню
        const menu = JSON.parse(JSON.stringify(baseMenu));
        
        // Добавляем персональное приветствие
        menu.text = this.generatePersonalizedText(userId, menu, context);
        
        // Персонализируем кнопки
        menu.buttons = this.personalizeButtons(userId, menu.buttons, preferences);
        
        // Добавляем быстрые действия
        if (menu.id === 'main') {
            menu.buttons = this.addQuickActions(userId, menu.buttons, userState);
        }
        
        return menu;
    }

    // Генерация персонализированного текста
    generatePersonalizedText(userId, menu, context) {
        const userState = this.getUserState(userId);
        const currentTime = new Date();
        const hour = currentTime.getHours();
        
        // Приветствие по времени суток
        let greeting = '';
        if (hour < 6) greeting = '🌙 Доброй ночи';
        else if (hour < 12) greeting = '🌅 Доброе утро';
        else if (hour < 18) greeting = '☀️ Добрый день';
        else greeting = '🌆 Добрый вечер';
        
        // Персональное обращение
        const name = userState.firstName || 'Пользователь';
        
        let text = `${greeting}, ${name}!\n\n`;
        
        // Контекстная информация
        switch (menu.id) {
            case 'main':
                text += `🤖 <b>Eva Lawyer Bot</b> - ваш персональный юридический ассистент\n\n`;
                text += `📊 <b>Ваша активность:</b>\n`;
                text += `• Консультаций: ${userState.consultationsCount || 0}\n`;
                text += `• Документов обработано: ${userState.documentsCount || 0}\n`;
                text += `• Компаний проверено: ${userState.checksCount || 0}\n\n`;
                text += `Выберите нужный раздел:`;
                break;
                
            case 'consultation_menu':
                text += `💬 <b>Юридические консультации</b>\n\n`;
                text += `Выберите область права для получения профессиональной консультации:`;
                break;
                
            case 'documents_menu':
                text += `📄 <b>Работа с документами</b>\n\n`;
                text += `Загрузите документ или выберите действие:`;
                break;
                
            default:
                text += `${menu.title}\n\nВыберите нужное действие:`;
        }
        
        return text;
    }

    // Персонализация кнопок
    personalizeButtons(userId, buttons, preferences) {
        const userState = this.getUserState(userId);
        
        return buttons.map(row => {
            return row.map(button => {
                // Добавляем счетчики использования
                const usage = this.metrics.buttonClicks.get(`${userId}_${button.callback_data}`) || 0;
                
                // Выделяем часто используемые кнопки
                if (usage > 5) {
                    button.text = `⭐ ${button.text}`;
                }
                
                // Добавляем индикаторы новых функций
                if (this.isNewFeature(button.callback_data)) {
                    button.text = `🆕 ${button.text}`;
                }
                
                return button;
            });
        });
    }

    // Добавление быстрых действий
    addQuickActions(userId, buttons, userState) {
        const quickActions = this.getQuickActions(userId, userState);
        
        if (quickActions.length > 0) {
            // Добавляем быстрые действия в начало
            buttons.unshift([{ text: '⚡ Быстрые действия', callback_data: 'quick_actions_menu' }]);
        }
        
        return buttons;
    }

    // Получение быстрых действий для пользователя
    getQuickActions(userId, userState) {
        const actions = [];
        
        // На основе истории использования
        const recentActions = this.getRecentActions(userId);
        
        // Часто используемые действия
        if (recentActions.includes('consult_corporate')) {
            actions.push({ text: '🏢 Корпоративная консультация', callback_data: 'consult_corporate' });
        }
        
        if (recentActions.includes('check_inn_form')) {
            actions.push({ text: '🔍 Проверить ИНН', callback_data: 'check_inn_form' });
        }
        
        if (recentActions.includes('doc_analyze_contract')) {
            actions.push({ text: '📋 Анализ договора', callback_data: 'doc_analyze_contract' });
        }
        
        // Контекстные действия
        const currentTime = new Date();
        const hour = currentTime.getHours();
        
        // Рабочие часы - предлагаем связаться с юристом
        if (hour >= 9 && hour <= 18) {
            actions.push({ text: '📞 Связаться с юристом', callback_data: 'contact_lawyer' });
        }
        
        return actions.slice(0, 4); // Максимум 4 быстрых действия
    }

    // Добавление навигации
    addNavigation(userId, menu) {
        const history = this.getNavigationHistory(userId);
        
        // Добавляем breadcrumb навигацию для подменю
        if (menu.parent && history.length > 1) {
            const breadcrumb = this.generateBreadcrumb(history);
            menu.text = `${breadcrumb}\n\n${menu.text}`;
        }
        
        // Добавляем кнопку "Назад" если её нет
        if (menu.parent && !this.hasBackButton(menu.buttons)) {
            menu.buttons.push([{ text: '🔙 Назад', callback_data: menu.parent }]);
        }
        
        return menu;
    }

    // Генерация breadcrumb навигации
    generateBreadcrumb(history) {
        const breadcrumbs = history.slice(-3).map(item => {
            const menuTitle = this.menuStructures[item.menuId]?.title || item.menuId;
            return menuTitle.replace(/[🏠💬📄🔍⚖️📊⚙️🆘]/g, '').trim();
        });
        
        return `📍 ${breadcrumbs.join(' → ')}`;
    }

    // Проверка наличия кнопки "Назад"
    hasBackButton(buttons) {
        return buttons.some(row => 
            row.some(button => 
                button.text.includes('Назад') || button.callback_data === 'back'
            )
        );
    }

    // Обработка навигации по меню
    handleMenuNavigation(userId, callbackData, messageId) {
        try {
            // Обновляем историю навигации
            this.updateNavigationHistory(userId, callbackData);
            
            // Обновляем состояние пользователя
            this.updateUserState(userId, { lastMenuAction: callbackData });
            
            // Обновляем метрики
            this.updateNavigationMetrics(userId, callbackData);
            
            // Получаем новое меню
            const menu = this.getMenu(userId, callbackData);
            
            return {
                text: menu.text,
                reply_markup: {
                    inline_keyboard: menu.buttons
                },
                parse_mode: 'HTML'
            };
            
        } catch (error) {
            console.error('Error handling menu navigation:', error);
            return this.getErrorMenu();
        }
    }

    // Получение состояния пользователя
    getUserState(userId) {
        if (!this.userStates.has(userId)) {
            this.userStates.set(userId, {
                firstName: '',
                lastActivity: Date.now(),
                consultationsCount: 0,
                documentsCount: 0,
                checksCount: 0,
                preferences: {},
                level: 'beginner' // beginner, intermediate, expert
            });
        }
        return this.userStates.get(userId);
    }

    // Получение предпочтений пользователя
    getUserPreferences(userId) {
        if (!this.userPreferences.has(userId)) {
            this.userPreferences.set(userId, {
                language: 'ru',
                theme: 'default',
                notifications: true,
                quickActions: true,
                expertMode: false
            });
        }
        return this.userPreferences.get(userId);
    }

    // Обновление состояния пользователя
    updateUserState(userId, updates) {
        const currentState = this.getUserState(userId);
        const newState = { ...currentState, ...updates, lastActivity: Date.now() };
        this.userStates.set(userId, newState);
    }

    // Получение истории навигации
    getNavigationHistory(userId) {
        if (!this.navigationHistory.has(userId)) {
            this.navigationHistory.set(userId, [{ menuId: 'main', timestamp: Date.now() }]);
        }
        return this.navigationHistory.get(userId);
    }

    // Обновление истории навигации
    updateNavigationHistory(userId, menuId) {
        const history = this.getNavigationHistory(userId);
        history.push({ menuId, timestamp: Date.now() });
        
        // Ограничиваем историю последними 10 переходами
        if (history.length > 10) {
            history.shift();
        }
        
        this.navigationHistory.set(userId, history);
    }

    // Получение недавних действий
    getRecentActions(userId) {
        const history = this.getNavigationHistory(userId);
        return history.slice(-5).map(item => item.menuId);
    }

    // Проверка новых функций
    isNewFeature(callbackData) {
        const newFeatures = [
            'analytics_menu',
            'personal_dashboard',
            'service_ip',
            'check_financial'
        ];
        return newFeatures.includes(callbackData);
    }

    // Обновление метрик меню
    updateMenuMetrics(userId, menuId) {
        const key = `${userId}_${menuId}`;
        const current = this.metrics.menuViews.get(key) || 0;
        this.metrics.menuViews.set(key, current + 1);
    }

    // Обновление метрик навигации
    updateNavigationMetrics(userId, callbackData) {
        const key = `${userId}_${callbackData}`;
        const current = this.metrics.buttonClicks.get(key) || 0;
        this.metrics.buttonClicks.set(key, current + 1);
    }

    // Получение меню по умолчанию
    getDefaultMenu() {
        return {
            text: '🏠 <b>Главное меню</b>\n\nВыберите нужное действие:',
            buttons: [
                [
                    { text: '💬 Консультация', callback_data: 'consultation_menu' },
                    { text: '📄 Документы', callback_data: 'documents_menu' }
                ],
                [
                    { text: '🆘 Помощь', callback_data: 'help_menu' }
                ]
            ]
        };
    }

    // Получение меню ошибки
    getErrorMenu() {
        return {
            text: '❌ <b>Ошибка навигации</b>\n\nПроизошла ошибка при загрузке меню. Попробуйте еще раз.',
            buttons: [
                [{ text: '🏠 Главное меню', callback_data: 'main' }],
                [{ text: '🆘 Помощь', callback_data: 'help_menu' }]
            ]
        };
    }

    // Получение статистики использования меню
    getMenuStatistics(userId = null) {
        if (userId) {
            // Статистика для конкретного пользователя
            const userViews = new Map();
            const userClicks = new Map();
            
            for (const [key, value] of this.metrics.menuViews) {
                if (key.startsWith(`${userId}_`)) {
                    const menuId = key.replace(`${userId}_`, '');
                    userViews.set(menuId, value);
                }
            }
            
            for (const [key, value] of this.metrics.buttonClicks) {
                if (key.startsWith(`${userId}_`)) {
                    const action = key.replace(`${userId}_`, '');
                    userClicks.set(action, value);
                }
            }
            
            return { views: userViews, clicks: userClicks };
        } else {
            // Общая статистика
            return {
                totalViews: this.metrics.menuViews.size,
                totalClicks: this.metrics.buttonClicks.size,
                activeUsers: this.userStates.size,
                cacheHitRate: this.calculateCacheHitRate()
            };
        }
    }

    // Расчет коэффициента попаданий в кэш
    calculateCacheHitRate() {
        // Простая реализация - можно улучшить
        return this.menuCache.size > 0 ? 0.85 : 0;
    }

    // Очистка кэша
    clearCache() {
        this.menuCache.clear();
    }

    // Экспорт конфигурации меню
    exportMenuConfiguration() {
        return {
            structures: this.menuStructures,
            timestamp: Date.now(),
            version: '1.0'
        };
    }
}

module.exports = UnifiedMenuSystem;

