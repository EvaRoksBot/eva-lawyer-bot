// Enhanced UI System for Eva Lawyer Bot
// Modern, intuitive and user-friendly interface

const PersonalizationEngine = require('./personalization-engine');

class EnhancedUISystem {
    constructor() {
        this.userStates = new Map();
        this.menuHistory = new Map();
        this.quickActions = new Map();
        this.personalization = new PersonalizationEngine();
        
        // UI Configuration
        this.config = {
            maxButtonsPerRow: 2,
            maxRows: 4,
            enableEmojis: true,
            enableBreadcrumbs: true,
            enableQuickActions: true
        };
    }

    // Main menu with personalization
    getMainMenu(userId) {
        // Initialize user profile if not exists
        if (!this.personalization.getUserProfile(userId)) {
            this.personalization.initializeUserProfile(userId, this.getUserState(userId));
        }

        // Get personalized welcome message
        const welcomeText = this.personalization.getPersonalizedWelcome(userId);
        
        // Get personalized menu layout
        const menuLayout = this.personalization.getPersonalizedMenuLayout(userId);
        
        // Build keyboard from layout
        const keyboard = [];
        
        menuLayout.forEach(section => {
            if (section.type === 'quick_actions' && section.buttons.length > 0) {
                // Add quick actions section
                keyboard.push([{ text: `⚡ ${section.title}`, callback_data: 'quick_actions_header' }]);
                
                // Add quick action buttons in pairs
                for (let i = 0; i < section.buttons.length; i += 2) {
                    const row = section.buttons.slice(i, i + 2);
                    keyboard.push(row);
                }
                
                // Add separator
                keyboard.push([{ text: '━━━━━━━━━━━━━━━━━━━━', callback_data: 'separator' }]);
            }
            
            if (section.type === 'main_menu') {
                // Add main menu buttons in pairs
                for (let i = 0; i < section.buttons.length; i += 2) {
                    const row = section.buttons.slice(i, i + 2);
                    keyboard.push(row);
                }
            }
        });

        // Add bottom navigation
        keyboard.push([
            { text: '🆘 Помощь', callback_data: 'help_menu' },
            { text: '📈 Статистика', callback_data: 'stats' }
        ]);

        return {
            text: welcomeText,
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
    }

    // Consultation menu with specialized options
    getConsultationMenu(userId) {
        return {
            text: `💬 <b>Юридические консультации</b>

Выберите область права или тип вопроса:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏢 Корпоративное право', callback_data: 'consult_corporate' },
                        { text: '👥 Трудовое право', callback_data: 'consult_labor' }
                    ],
                    [
                        { text: '🏠 Гражданское право', callback_data: 'consult_civil' },
                        { text: '💰 Налоговое право', callback_data: 'consult_tax' }
                    ],
                    [
                        { text: '⚖️ Административное', callback_data: 'consult_admin' },
                        { text: '👨‍👩‍👧‍👦 Семейное право', callback_data: 'consult_family' }
                    ],
                    [
                        { text: '❓ Общий вопрос', callback_data: 'consult_general' },
                        { text: '🚨 Срочная консультация', callback_data: 'consult_urgent' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Documents menu with processing options
    getDocumentsMenu(userId) {
        return {
            text: `📄 <b>Работа с документами</b>

Выберите действие с документами:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Анализ договора', callback_data: 'doc_analyze_contract' },
                        { text: '🔍 Проверка рисков', callback_data: 'doc_risk_check' }
                    ],
                    [
                        { text: '📝 Создать документ', callback_data: 'doc_create' },
                        { text: '✏️ Редактировать', callback_data: 'doc_edit' }
                    ],
                    [
                        { text: '📊 Сравнить документы', callback_data: 'doc_compare' },
                        { text: '🔒 Проверка соответствия', callback_data: 'doc_compliance' }
                    ],
                    [
                        { text: '📁 Мои документы', callback_data: 'doc_my_files' },
                        { text: '📤 Загрузить файл', callback_data: 'doc_upload' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Checks menu for various validations
    getChecksMenu(userId) {
        return {
            text: `🔍 <b>Проверки и валидация</b>

Доступные виды проверок:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏢 Проверить ИНН', callback_data: 'check_inn_form' },
                        { text: '📋 Проверить ОГРН', callback_data: 'check_ogrn' }
                    ],
                    [
                        { text: '⚖️ Судебные дела', callback_data: 'check_court_cases' },
                        { text: '💰 Исполнительные производства', callback_data: 'check_enforcement' }
                    ],
                    [
                        { text: '🏛️ Реестр банкротов', callback_data: 'check_bankruptcy' },
                        { text: '📊 Финансовое состояние', callback_data: 'check_financial' }
                    ],
                    [
                        { text: '🔍 Комплексная проверка', callback_data: 'check_comprehensive' },
                        { text: '📈 Мониторинг изменений', callback_data: 'check_monitoring' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Legal base menu for research
    getLegalBaseMenu(userId) {
        return {
            text: `⚖️ <b>Правовая база и исследования</b>

Поиск в правовых источниках:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📚 Кодексы РФ', callback_data: 'legal_codes' },
                        { text: '📜 Федеральные законы', callback_data: 'legal_federal_laws' }
                    ],
                    [
                        { text: '⚖️ Судебная практика', callback_data: 'legal_court_practice' },
                        { text: '📋 Постановления ВС', callback_data: 'legal_supreme_court' }
                    ],
                    [
                        { text: '🏛️ Арбитражная практика', callback_data: 'legal_arbitration' },
                        { text: '📊 Статистика судов', callback_data: 'legal_statistics' }
                    ],
                    [
                        { text: '🔍 Поиск по тексту', callback_data: 'legal_text_search' },
                        { text: '📅 Изменения в законах', callback_data: 'legal_changes' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Settings menu for personalization
    getSettingsMenu(userId) {
        const userState = this.userStates.get(userId) || {};
        
        return {
            text: `⚙️ <b>Настройки</b>

Персонализация бота:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔔 Уведомления', callback_data: 'settings_notifications' },
                        { text: '🌐 Язык интерфейса', callback_data: 'settings_language' }
                    ],
                    [
                        { text: '📊 Специализация', callback_data: 'settings_specialization' },
                        { text: '⏰ Часовой пояс', callback_data: 'settings_timezone' }
                    ],
                    [
                        { text: '🎨 Тема оформления', callback_data: 'settings_theme' },
                        { text: '📱 Быстрые действия', callback_data: 'settings_quick_actions' }
                    ],
                    [
                        { text: '💾 Экспорт данных', callback_data: 'settings_export' },
                        { text: '🗑️ Очистить историю', callback_data: 'settings_clear_history' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Help menu with detailed sections
    getHelpMenu(userId) {
        return {
            text: `🆘 <b>Помощь и поддержка</b>

Выберите раздел помощи:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🚀 Быстрый старт', callback_data: 'help_quick_start' },
                        { text: '📖 Руководство пользователя', callback_data: 'help_user_guide' }
                    ],
                    [
                        { text: '❓ Часто задаваемые вопросы', callback_data: 'help_faq' },
                        { text: '🎥 Видеоуроки', callback_data: 'help_video_tutorials' }
                    ],
                    [
                        { text: '💬 Обратная связь', callback_data: 'help_feedback' },
                        { text: '🐛 Сообщить об ошибке', callback_data: 'help_bug_report' }
                    ],
                    [
                        { text: '📞 Техподдержка', callback_data: 'help_support' },
                        { text: '📋 О боте', callback_data: 'help_about' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Quick actions panel
    getQuickActionsPanel(userId) {
        const userActions = this.quickActions.get(userId) || this.getDefaultQuickActions();
        
        return {
            text: `⚡ <b>Быстрые действия</b>

Часто используемые функции:`,
            reply_markup: {
                inline_keyboard: [
                    userActions.slice(0, 2).map(action => ({
                        text: action.text,
                        callback_data: action.callback_data
                    })),
                    userActions.slice(2, 4).map(action => ({
                        text: action.text,
                        callback_data: action.callback_data
                    })),
                    [
                        { text: '⚙️ Настроить действия', callback_data: 'configure_quick_actions' },
                        { text: '🔙 Назад', callback_data: 'start' }
                    ]
                ]
            }
        };
    }

    // Form for INN check with validation
    getInnCheckForm(userId) {
        return {
            text: `🔍 <b>Проверка ИНН компании</b>

Введите ИНН компании для получения подробной информации:

📋 <b>Что вы получите:</b>
• Полное наименование организации
• Юридический адрес и контакты
• Статус организации
• Руководство и учредители
• Финансовые показатели
• Судебные дела и исполнительные производства

💡 <i>ИНН должен содержать 10 или 12 цифр</i>`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📝 Ввести ИНН', callback_data: 'inn_input_mode' },
                        { text: '📋 Пример проверки', callback_data: 'inn_example' }
                    ],
                    [
                        { text: '📊 Массовая проверка', callback_data: 'inn_bulk_check' },
                        { text: '⏰ История проверок', callback_data: 'inn_history' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'checks_menu' }
                    ]
                ]
            }
        };
    }

    // Document creation wizard
    getDocumentCreationWizard(userId) {
        return {
            text: `📝 <b>Создание документа</b>

Выберите тип документа для создания:`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Договор', callback_data: 'create_contract' },
                        { text: '📄 Заявление', callback_data: 'create_application' }
                    ],
                    [
                        { text: '📝 Претензия', callback_data: 'create_claim' },
                        { text: '📜 Доверенность', callback_data: 'create_power_of_attorney' }
                    ],
                    [
                        { text: '📋 Жалоба', callback_data: 'create_complaint' },
                        { text: '📄 Уведомление', callback_data: 'create_notification' }
                    ],
                    [
                        { text: '📊 Отчет', callback_data: 'create_report' },
                        { text: '📋 Справка', callback_data: 'create_certificate' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'documents_menu' }
                    ]
                ]
            }
        };
    }

    // Breadcrumb navigation
    getBreadcrumb(userId, currentMenu) {
        const history = this.menuHistory.get(userId) || [];
        if (history.length === 0) return '';
        
        const breadcrumbItems = history.map(item => item.title).join(' → ');
        return `📍 <i>${breadcrumbItems} → ${currentMenu}</i>\n\n`;
    }

    // Add menu to history
    addToHistory(userId, menuData) {
        const history = this.menuHistory.get(userId) || [];
        history.push(menuData);
        
        // Keep only last 5 items
        if (history.length > 5) {
            history.shift();
        }
        
        this.menuHistory.set(userId, history);
    }

    // Get back button with smart navigation
    getBackButton(userId) {
        const history = this.menuHistory.get(userId) || [];
        if (history.length === 0) {
            return { text: '🏠 Главное меню', callback_data: 'start' };
        }
        
        const previousMenu = history[history.length - 1];
        return { text: '🔙 Назад', callback_data: previousMenu.callback_data };
    }

    // Default quick actions
    getDefaultQuickActions() {
        return [
            { text: '💬 Задать вопрос', callback_data: 'consult_general' },
            { text: '🔍 Проверить ИНН', callback_data: 'check_inn_form' },
            { text: '📄 Анализ договора', callback_data: 'doc_analyze_contract' },
            { text: '⚖️ Судебная практика', callback_data: 'legal_court_practice' }
        ];
    }

    // Welcome text with personalization
    getWelcomeText(userId = null) {
        const userState = this.userStates.get(userId) || {};
        const userName = userState.firstName || 'Пользователь';
        const timeOfDay = this.getTimeOfDay();
        
        return `${timeOfDay}, ${userName}! 👋

🤖 <b>Eva Lawyer Bot</b> - ваш персональный юридический ассистент

🎯 <b>Что я умею:</b>
• Консультации по всем отраслям права
• Анализ и создание документов
• Проверка контрагентов и организаций
• Поиск в правовых базах данных
• Мониторинг изменений в законодательстве

💡 <i>Выберите нужный раздел или просто напишите ваш вопрос</i>`;
    }

    // Get time of day greeting
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6) return '🌙 Доброй ночи';
        if (hour < 12) return '🌅 Доброе утро';
        if (hour < 18) return '☀️ Добрый день';
        return '🌆 Добрый вечер';
    }

    // Update user state with personalization tracking
    updateUserState(userId, stateUpdate) {
        const currentState = this.userStates.get(userId) || {};
        const newState = { ...currentState, ...stateUpdate };
        this.userStates.set(userId, newState);
        
        // Update personalization profile
        if (this.personalization.getUserProfile(userId)) {
            this.personalization.updateUserPreferences(userId, stateUpdate);
        }
    }

    // Track user activity for personalization
    trackUserActivity(userId, activity) {
        if (this.personalization.getUserProfile(userId)) {
            this.personalization.updateUserActivity(userId, activity);
        }
    }

    // Get personalized recommendations
    getPersonalizedRecommendations(userId) {
        return this.personalization.generateRecommendations(userId);
    }

    // Get user statistics
    getUserStatistics(userId) {
        return this.personalization.getUserStatistics(userId);
    }

    // Export user personalization data
    exportUserPersonalizationData(userId) {
        return this.personalization.exportUserData(userId);
    }

    // Import user personalization data
    importUserPersonalizationData(userId, data) {
        this.personalization.importUserData(userId, data);
    }

    // Get user state
    getUserState(userId) {
        return this.userStates.get(userId) || {};
    }

    // Configure quick actions for user
    configureQuickActions(userId, actions) {
        this.quickActions.set(userId, actions);
    }

    // Get menu by callback data
    getMenuByCallback(userId, callbackData) {
        const menus = {
            'start': () => this.getMainMenu(userId),
            'consultation_menu': () => this.getConsultationMenu(userId),
            'documents_menu': () => this.getDocumentsMenu(userId),
            'checks_menu': () => this.getChecksMenu(userId),
            'legal_base_menu': () => this.getLegalBaseMenu(userId),
            'settings_menu': () => this.getSettingsMenu(userId),
            'help_menu': () => this.getHelpMenu(userId),
            'quick_actions': () => this.getQuickActionsPanel(userId),
            'check_inn_form': () => this.getInnCheckForm(userId),
            'doc_create': () => this.getDocumentCreationWizard(userId)
        };

        const menuFunction = menus[callbackData];
        if (menuFunction) {
            const menuData = menuFunction();
            
            // Add breadcrumb if enabled
            if (this.config.enableBreadcrumbs && callbackData !== 'start') {
                menuData.text = this.getBreadcrumb(userId, this.getMenuTitle(callbackData)) + menuData.text;
            }
            
            return menuData;
        }

        return null;
    }

    // Get menu title by callback data
    getMenuTitle(callbackData) {
        const titles = {
            'start': 'Главное меню',
            'consultation_menu': 'Консультации',
            'documents_menu': 'Документы',
            'checks_menu': 'Проверки',
            'legal_base_menu': 'Правовая база',
            'settings_menu': 'Настройки',
            'help_menu': 'Помощь'
        };

        return titles[callbackData] || 'Меню';
    }

    // Generate inline keyboard with smart layout
    generateInlineKeyboard(buttons, maxPerRow = 2) {
        const keyboard = [];
        
        for (let i = 0; i < buttons.length; i += maxPerRow) {
            const row = buttons.slice(i, i + maxPerRow);
            keyboard.push(row);
        }
        
        return keyboard;
    }

    // Add loading state
    getLoadingMessage(action = 'Обработка') {
        return {
            text: `⏳ ${action}...`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⏹️ Отменить', callback_data: 'cancel_operation' }]
                ]
            }
        };
    }

    // Success message template
    getSuccessMessage(message, nextActions = []) {
        const keyboard = nextActions.length > 0 ? 
            [nextActions, [{ text: '🏠 Главное меню', callback_data: 'start' }]] :
            [[{ text: '🏠 Главное меню', callback_data: 'start' }]];

        return {
            text: `✅ ${message}`,
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
    }

    // Error message template
    getErrorMessage(message, retryAction = null) {
        const keyboard = retryAction ? 
            [[{ text: '🔄 Попробовать снова', callback_data: retryAction }], 
             [{ text: '🏠 Главное меню', callback_data: 'start' }]] :
            [[{ text: '🏠 Главное меню', callback_data: 'start' }]];

        return {
            text: `❌ ${message}`,
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
    }
}

module.exports = EnhancedUISystem;

