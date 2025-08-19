// Улучшенная система меню Eva Lawyer Bot v2.0
// Соответствует требованиям Manus для Telegram-ботов

const { MenuValidator } = require('./menu-validator');

class EnhancedMenus {
    constructor() {
        this.validator = new MenuValidator();
        this.activeSection = new Map(); // user_id -> current_section
        this.userHistory = new Map(); // user_id -> action_history[]
    }

    // Главное меню
    getMainMenu(userId) {
        this.setActiveSection(userId, 'home');
        
        return {
            text: `🤖 **Ева Юрист v2.0** — ваш AI-помощник

🧠 **Новые возможности:**
• Векторная память — помню наши разговоры
• ReAct планировщик — решаю сложные задачи
• Быстрые действия — предлагаю следующие шаги

Выберите раздел:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '📄 Договор', callback_data: 'MENU:contract' },
                        { text: '🔍 Контрагент', callback_data: 'MENU:kyc' }
                    ],
                    [
                        { text: '📬 Письмо', callback_data: 'MENU:letter' },
                        { text: '📑 Шаблоны', callback_data: 'MENU:templates' }
                    ],
                    [
                        { text: '➕ Ещё', callback_data: 'MENU:more' },
                        { text: '⚙️ Настройки', callback_data: 'MENU:settings' }
                    ]
                ]
            }
        };
    }

    // Меню "Договор"
    getContractMenu(userId) {
        this.setActiveSection(userId, 'contract');
        
        return {
            text: `📄 **Работа с договорами**

Выберите действие:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '📤 Загрузить', callback_data: 'ACT:CONTRACT:UPLOAD' },
                        { text: '🔍 Анализ', callback_data: 'ACT:CONTRACT:ANALYZE' }
                    ],
                    [
                        { text: '📑 Риски', callback_data: 'ACT:CONTRACT:RISKTABLE' },
                        { text: '📋 Протокол', callback_data: 'ACT:CONTRACT:PROTOCOL' }
                    ],
                    [
                        { text: '🏠 Домой', callback_data: 'MENU:home' },
                        { text: '🔙 Назад', callback_data: 'MENU:home' }
                    ]
                ]
            }
        };
    }

    // Меню "Контрагент"
    getKycMenu(userId) {
        this.setActiveSection(userId, 'kyc');
        
        return {
            text: `🔍 **Проверка контрагентов**

Полный скоринг по ИНН с анализом рисков:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '🔢 Ввести ИНН', callback_data: 'ACT:KYC:INPUT_INN' },
                        { text: '📊 Скоринг', callback_data: 'ACT:KYC:SCORING' }
                    ],
                    [
                        { text: '🚩 Флаги', callback_data: 'ACT:KYC:RED_FLAGS' },
                        { text: '✅ Чек-лист', callback_data: 'ACT:KYC:CHECKLIST' }
                    ],
                    [
                        { text: '🏠 Домой', callback_data: 'MENU:home' },
                        { text: '🔙 Назад', callback_data: 'MENU:home' }
                    ]
                ]
            }
        };
    }

    // Меню "Письмо"
    getLetterMenu(userId) {
        this.setActiveSection(userId, 'letter');
        
        return {
            text: `📬 **Деловая переписка**

Создание юридических писем и ответов:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '📥 Претензия', callback_data: 'ACT:LETTER:PRETENSION' },
                        { text: '⚖️ Заключение', callback_data: 'ACT:LETTER:LEGAL_OPINION' }
                    ],
                    [
                        { text: '🏛️ В госорган', callback_data: 'ACT:LETTER:GOVERNMENT' },
                        { text: '📋 Уведомление', callback_data: 'ACT:LETTER:NOTICE' }
                    ],
                    [
                        { text: '🏠 Домой', callback_data: 'MENU:home' },
                        { text: '🔙 Назад', callback_data: 'MENU:home' }
                    ]
                ]
            }
        };
    }

    // Меню "Шаблоны"
    getTemplatesMenu(userId) {
        this.setActiveSection(userId, 'templates');
        
        return {
            text: `📑 **Шаблоны документов**

Готовые формы и бланки:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '📄 Договоры', callback_data: 'ACT:TEMPLATES:CONTRACTS' },
                        { text: '📋 Заявления', callback_data: 'ACT:TEMPLATES:APPLICATIONS' }
                    ],
                    [
                        { text: '📝 Доверенности', callback_data: 'ACT:TEMPLATES:POWERS' },
                        { text: '📊 Формы', callback_data: 'ACT:TEMPLATES:FORMS' }
                    ],
                    [
                        { text: '🏠 Домой', callback_data: 'MENU:home' },
                        { text: '🔙 Назад', callback_data: 'MENU:home' }
                    ]
                ]
            }
        };
    }

    // Меню "Ещё"
    getMoreMenu(userId) {
        this.setActiveSection(userId, 'more');
        
        return {
            text: `➕ **Дополнительные возможности**

Расширенные функции и утилиты:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '⚖️ Практика', callback_data: 'ACT:MORE:PRACTICE' },
                        { text: '🔧 Утилиты', callback_data: 'ACT:MORE:UTILS' }
                    ],
                    [
                        { text: '📚 База знаний', callback_data: 'ACT:MORE:KNOWLEDGE' },
                        { text: '🤖 AI Помощь', callback_data: 'ACT:MORE:AI_HELP' }
                    ],
                    [
                        { text: '🏠 Домой', callback_data: 'MENU:home' },
                        { text: '🔙 Назад', callback_data: 'MENU:home' }
                    ]
                ]
            }
        };
    }

    // Меню "Настройки"
    getSettingsMenu(userId) {
        this.setActiveSection(userId, 'settings');
        
        return {
            text: `⚙️ **Настройки**

Персонализация и управление:`,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '👤 Профиль', callback_data: 'ACT:SETTINGS:PROFILE' },
                        { text: '🧠 Память', callback_data: 'ACT:SETTINGS:MEMORY' }
                    ],
                    [
                        { text: '🔔 Уведомления', callback_data: 'ACT:SETTINGS:NOTIFICATIONS' },
                        { text: '📊 Статистика', callback_data: 'ACT:SETTINGS:STATS' }
                    ],
                    [
                        { text: '🏠 Домой', callback_data: 'MENU:home' },
                        { text: '🔙 Назад', callback_data: 'MENU:home' }
                    ]
                ]
            }
        };
    }

    // Получить меню по ключу
    getMenu(menuKey, userId) {
        switch (menuKey) {
            case 'home': return this.getMainMenu(userId);
            case 'contract': return this.getContractMenu(userId);
            case 'kyc': return this.getKycMenu(userId);
            case 'letter': return this.getLetterMenu(userId);
            case 'templates': return this.getTemplatesMenu(userId);
            case 'more': return this.getMoreMenu(userId);
            case 'settings': return this.getSettingsMenu(userId);
            default: return this.getMainMenu(userId);
        }
    }

    // Установить активный раздел
    setActiveSection(userId, section) {
        this.activeSection.set(userId, section);
    }

    // Получить активный раздел
    getActiveSection(userId) {
        return this.activeSection.get(userId) || 'home';
    }

    // Добавить действие в историю
    addToHistory(userId, action) {
        if (!this.userHistory.has(userId)) {
            this.userHistory.set(userId, []);
        }
        
        const history = this.userHistory.get(userId);
        history.push({
            action,
            timestamp: Date.now(),
            section: this.getActiveSection(userId)
        });

        // Ограничиваем историю 50 записями
        if (history.length > 50) {
            history.shift();
        }
    }

    // Получить историю пользователя
    getUserHistory(userId, limit = 10) {
        const history = this.userHistory.get(userId) || [];
        return history.slice(-limit);
    }

    // Создать быстрые действия на основе контекста
    createQuickActions(userId, context) {
        const currentSection = this.getActiveSection(userId);
        const history = this.getUserHistory(userId, 5);
        
        const actions = [];

        // Контекстные действия на основе текущего раздела
        switch (currentSection) {
            case 'contract':
                if (context.includes('договор') || context.includes('контракт')) {
                    actions.push({ text: '📑 Риски', callback_data: 'ACT:CONTRACT:RISKTABLE' });
                    actions.push({ text: '📋 Протокол', callback_data: 'ACT:CONTRACT:PROTOCOL' });
                }
                break;
            case 'kyc':
                if (context.match(/\d{10,12}/)) { // ИНН найден
                    actions.push({ text: '🚩 Флаги', callback_data: 'ACT:KYC:RED_FLAGS' });
                    actions.push({ text: '✅ Чек-лист', callback_data: 'ACT:KYC:CHECKLIST' });
                }
                break;
            case 'letter':
                actions.push({ text: '📤 Экспорт', callback_data: 'ACT:LETTER:EXPORT' });
                actions.push({ text: '💾 Сохранить', callback_data: 'ACT:LETTER:SAVE' });
                break;
        }

        // Общие действия
        actions.push({ text: '🔍 Поиск', callback_data: 'ACT:GENERAL:SEARCH' });
        actions.push({ text: '❓ Помощь', callback_data: 'ACT:GENERAL:HELP' });

        return actions.slice(0, 6); // Максимум 6 быстрых действий
    }

    // Валидация всех меню
    validateAllMenus() {
        const menus = {
            home: this.getMainMenu('test'),
            contract: this.getContractMenu('test'),
            kyc: this.getKycMenu('test'),
            letter: this.getLetterMenu('test'),
            templates: this.getTemplatesMenu('test'),
            more: this.getMoreMenu('test'),
            settings: this.getSettingsMenu('test')
        };

        return this.validator.validateMenuStructure(menus);
    }

    // Получить все callback_data для проверки обработчиков
    getAllCallbacks() {
        const callbacks = new Set();
        const menus = {
            home: this.getMainMenu('test'),
            contract: this.getContractMenu('test'),
            kyc: this.getKycMenu('test'),
            letter: this.getLetterMenu('test'),
            templates: this.getTemplatesMenu('test'),
            more: this.getMoreMenu('test'),
            settings: this.getSettingsMenu('test')
        };

        for (const menu of Object.values(menus)) {
            if (menu.keyboard && menu.keyboard.inline_keyboard) {
                menu.keyboard.inline_keyboard.forEach(row => {
                    row.forEach(button => {
                        if (button.callback_data) {
                            callbacks.add(button.callback_data);
                        }
                    });
                });
            }
        }

        return Array.from(callbacks);
    }
}

module.exports = { EnhancedMenus };

