// Advanced UI Module for Eva Lawyer Bot
// Enhanced user interface with dynamic menus, rich formatting, and interactive elements

class AdvancedUI {
    constructor() {
        this.menuTemplates = new Map();
        this.uiComponents = new Map();
        this.userSessions = new Map(); // userId -> session data
        this.animations = new Map();
        this.themes = new Map();
        
        this.initializeMenuTemplates();
        this.initializeUIComponents();
        this.initializeThemes();
    }

    // Инициализация шаблонов меню
    initializeMenuTemplates() {
        // Главное меню с анимацией
        this.addMenuTemplate('main_menu', {
            title: '🏠 **Eva Lawyer Bot**',
            subtitle: 'Ваш персональный юридический ассистент',
            description: 'Выберите нужную функцию из меню ниже:',
            animation: 'fade_in',
            layout: 'grid_2x3',
            buttons: [
                {
                    text: '📄 Договоры',
                    emoji: '📄',
                    callback_data: 'eva:contracts:menu',
                    description: 'Анализ и проверка договоров',
                    color: 'blue'
                },
                {
                    text: '📚 Пакет «Эверест»',
                    emoji: '📚',
                    callback_data: 'eva:pkg:menu',
                    description: 'Готовые шаблоны документов',
                    color: 'green'
                },
                {
                    text: '🔍 Проверка контрагента',
                    emoji: '🔍',
                    callback_data: 'eva:inn:prompt',
                    description: 'Проверка по ИНН и анализ рисков',
                    color: 'orange'
                },
                {
                    text: '💳 Счёт/акты',
                    emoji: '💳',
                    callback_data: 'eva:docs:billing',
                    description: 'Генерация финансовых документов',
                    color: 'purple'
                },
                {
                    text: '📈 Отчёты',
                    emoji: '📈',
                    callback_data: 'eva:reports:menu',
                    description: 'Аналитика и статистика',
                    color: 'red'
                },
                {
                    text: '⚙️ Настройки',
                    emoji: '⚙️',
                    callback_data: 'eva:settings:menu',
                    description: 'Персонализация и настройки',
                    color: 'gray'
                }
            ],
            footer: {
                text: '💡 Совет: Используйте /help для получения подробной справки',
                buttons: [
                    { text: '🆘 Помощь', callback_data: 'eva:help:menu' },
                    { text: '📊 Статистика', callback_data: 'eva:stats:show' }
                ]
            }
        });

        // Меню договоров с прогресс-баром
        this.addMenuTemplate('contracts_menu', {
            title: '📄 **Работа с договорами**',
            subtitle: 'Профессиональный анализ и проверка',
            progress_bar: {
                current: 0,
                total: 4,
                steps: ['Загрузка', 'Анализ', 'Риски', 'Отчет']
            },
            layout: 'list',
            buttons: [
                {
                    text: '📤 Загрузить договор',
                    emoji: '📤',
                    callback_data: 'eva:contracts:upload',
                    description: 'Загрузите файл договора для анализа',
                    badge: 'Новое'
                },
                {
                    text: '🔍 Анализ рисков',
                    emoji: '🔍',
                    callback_data: 'eva:contracts:risks',
                    description: 'Выявление правовых рисков'
                },
                {
                    text: '✏️ Редлайн',
                    emoji: '✏️',
                    callback_data: 'eva:contracts:redline',
                    description: 'Предложения по изменениям'
                },
                {
                    text: '📊 Таблица рисков',
                    emoji: '📊',
                    callback_data: 'eva:contracts:risk_table',
                    description: 'Структурированная оценка рисков'
                },
                {
                    text: '📋 Протокол разногласий',
                    emoji: '📋',
                    callback_data: 'eva:contracts:protocol',
                    description: 'Формирование протокола'
                }
            ],
            navigation: {
                back: { text: '🔙 Назад', callback_data: 'eva:main' },
                home: { text: '🏠 Главное меню', callback_data: 'eva:main' }
            }
        });

        // Меню проверки ИНН с индикаторами
        this.addMenuTemplate('inn_check_menu', {
            title: '🔍 **Проверка контрагента**',
            subtitle: 'Комплексная проверка надежности',
            input_prompt: {
                text: 'Введите ИНН организации для проверки:',
                placeholder: 'Например: 7707083893',
                validation: 'inn',
                format_hint: '10 цифр для ЮЛ, 12 цифр для ИП'
            },
            quick_actions: [
                {
                    text: '📋 Последние проверки',
                    callback_data: 'eva:inn:history'
                },
                {
                    text: '📊 Пакетная проверка',
                    callback_data: 'eva:inn:batch'
                }
            ],
            examples: [
                { text: 'Сбербанк', inn: '7707083893' },
                { text: 'Газпром', inn: '7736050003' },
                { text: 'Яндекс', inn: '7736207543' }
            ]
        });

        // Меню настроек с переключателями
        this.addMenuTemplate('settings_menu', {
            title: '⚙️ **Настройки**',
            subtitle: 'Персонализация работы с ботом',
            layout: 'sections',
            sections: [
                {
                    title: '🎨 Интерфейс',
                    buttons: [
                        {
                            text: '🌙 Тема',
                            callback_data: 'eva:settings:theme',
                            current_value: 'Светлая',
                            type: 'toggle'
                        },
                        {
                            text: '🗣️ Язык',
                            callback_data: 'eva:settings:language',
                            current_value: 'Русский',
                            type: 'select'
                        }
                    ]
                },
                {
                    title: '🔔 Уведомления',
                    buttons: [
                        {
                            text: '📄 Напоминания о договорах',
                            callback_data: 'eva:settings:contract_reminders',
                            current_value: true,
                            type: 'switch'
                        },
                        {
                            text: '⚖️ Обновления законов',
                            callback_data: 'eva:settings:law_updates',
                            current_value: true,
                            type: 'switch'
                        }
                    ]
                },
                {
                    title: '📊 Отчеты',
                    buttons: [
                        {
                            text: '📈 Еженедельные отчеты',
                            callback_data: 'eva:settings:weekly_reports',
                            current_value: false,
                            type: 'switch'
                        }
                    ]
                }
            ]
        });
    }

    // Инициализация UI компонентов
    initializeUIComponents() {
        // Компонент прогресс-бара
        this.addUIComponent('progress_bar', (current, total, steps = []) => {
            const percentage = Math.round((current / total) * 100);
            const filled = Math.round((current / total) * 10);
            const empty = 10 - filled;
            
            const bar = '█'.repeat(filled) + '░'.repeat(empty);
            const step_text = steps.length > 0 ? `\n📍 Текущий этап: ${steps[current] || 'Завершено'}` : '';
            
            return `📊 **Прогресс:** ${percentage}%\n\`${bar}\` ${current}/${total}${step_text}`;
        });

        // Компонент рейтинга
        this.addUIComponent('rating', (score, maxScore = 100) => {
            const stars = Math.round((score / maxScore) * 5);
            const filled = '⭐'.repeat(stars);
            const empty = '☆'.repeat(5 - stars);
            
            return `${filled}${empty} ${score}/${maxScore}`;
        });

        // Компонент статуса
        this.addUIComponent('status', (status) => {
            const statusMap = {
                'active': '🟢 Активно',
                'inactive': '🔴 Неактивно',
                'pending': '🟡 В ожидании',
                'processing': '🔄 Обработка',
                'completed': '✅ Завершено',
                'failed': '❌ Ошибка',
                'warning': '⚠️ Предупреждение'
            };
            
            return statusMap[status] || `❓ ${status}`;
        });

        // Компонент индикатора риска
        this.addUIComponent('risk_indicator', (level) => {
            const riskMap = {
                'low': '🟢 Низкий риск',
                'medium': '🟡 Средний риск',
                'high': '🟠 Высокий риск',
                'critical': '🔴 Критический риск'
            };
            
            return riskMap[level] || '❓ Неизвестно';
        });

        // Компонент таймера
        this.addUIComponent('timer', (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hours > 0) {
                return `⏱️ ${hours}ч ${minutes}м ${secs}с`;
            } else if (minutes > 0) {
                return `⏱️ ${minutes}м ${secs}с`;
            } else {
                return `⏱️ ${secs}с`;
            }
        });
    }

    // Инициализация тем
    initializeThemes() {
        this.addTheme('light', {
            name: 'Светлая',
            colors: {
                primary: '🔵',
                secondary: '⚪',
                success: '🟢',
                warning: '🟡',
                danger: '🔴',
                info: '🔵'
            },
            emojis: {
                menu: '📋',
                back: '🔙',
                home: '🏠',
                settings: '⚙️',
                help: '🆘'
            }
        });

        this.addTheme('dark', {
            name: 'Темная',
            colors: {
                primary: '🔷',
                secondary: '⚫',
                success: '🟢',
                warning: '🟠',
                danger: '🔴',
                info: '🔷'
            },
            emojis: {
                menu: '📋',
                back: '◀️',
                home: '🏠',
                settings: '⚙️',
                help: '❓'
            }
        });
    }

    // Добавление шаблона меню
    addMenuTemplate(templateId, template) {
        this.menuTemplates.set(templateId, template);
    }

    // Добавление UI компонента
    addUIComponent(componentId, renderer) {
        this.uiComponents.set(componentId, renderer);
    }

    // Добавление темы
    addTheme(themeId, theme) {
        this.themes.set(themeId, theme);
    }

    // Рендеринг меню
    renderMenu(templateId, userId, variables = {}) {
        const template = this.menuTemplates.get(templateId);
        if (!template) {
            throw new Error(`Menu template ${templateId} not found`);
        }

        const userSession = this.getUserSession(userId);
        const theme = this.themes.get(userSession.theme || 'light');

        // Рендерим заголовок
        let message = this.renderTitle(template, theme);

        // Добавляем прогресс-бар если есть
        if (template.progress_bar) {
            const progressComponent = this.uiComponents.get('progress_bar');
            message += '\n\n' + progressComponent(
                template.progress_bar.current,
                template.progress_bar.total,
                template.progress_bar.steps
            );
        }

        // Добавляем описание
        if (template.description) {
            message += '\n\n' + template.description;
        }

        // Добавляем prompt для ввода если есть
        if (template.input_prompt) {
            message += '\n\n' + this.renderInputPrompt(template.input_prompt);
        }

        // Рендерим кнопки
        const keyboard = this.renderKeyboard(template, theme, userSession);

        return {
            text: message,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        };
    }

    // Рендеринг заголовка
    renderTitle(template, theme) {
        let title = template.title;
        
        if (template.subtitle) {
            title += `\n_${template.subtitle}_`;
        }

        return title;
    }

    // Рендеринг prompt для ввода
    renderInputPrompt(inputPrompt) {
        let prompt = `💬 ${inputPrompt.text}`;
        
        if (inputPrompt.format_hint) {
            prompt += `\n\n📝 Формат: ${inputPrompt.format_hint}`;
        }

        if (inputPrompt.placeholder) {
            prompt += `\n\n💡 Пример: \`${inputPrompt.placeholder}\``;
        }

        return prompt;
    }

    // Рендеринг клавиатуры
    renderKeyboard(template, theme, userSession) {
        const keyboard = { inline_keyboard: [] };

        if (template.layout === 'grid_2x3') {
            // Сетка 2x3
            for (let i = 0; i < template.buttons.length; i += 2) {
                const row = [];
                for (let j = 0; j < 2 && i + j < template.buttons.length; j++) {
                    row.push(this.renderButton(template.buttons[i + j], theme));
                }
                keyboard.inline_keyboard.push(row);
            }
        } else if (template.layout === 'list') {
            // Список (по одной кнопке в ряду)
            template.buttons.forEach(button => {
                keyboard.inline_keyboard.push([this.renderButton(button, theme)]);
            });
        } else if (template.layout === 'sections') {
            // Секции
            template.sections.forEach(section => {
                // Заголовок секции (если нужен)
                section.buttons.forEach(button => {
                    keyboard.inline_keyboard.push([this.renderButton(button, theme)]);
                });
                // Разделитель между секциями
                if (section !== template.sections[template.sections.length - 1]) {
                    keyboard.inline_keyboard.push([]);
                }
            });
        } else {
            // По умолчанию - адаптивная сетка
            const buttonsPerRow = template.buttons.length <= 4 ? 2 : 3;
            for (let i = 0; i < template.buttons.length; i += buttonsPerRow) {
                const row = [];
                for (let j = 0; j < buttonsPerRow && i + j < template.buttons.length; j++) {
                    row.push(this.renderButton(template.buttons[i + j], theme));
                }
                keyboard.inline_keyboard.push(row);
            }
        }

        // Добавляем быстрые действия
        if (template.quick_actions) {
            const quickRow = template.quick_actions.map(action => 
                this.renderButton(action, theme)
            );
            keyboard.inline_keyboard.push(quickRow);
        }

        // Добавляем примеры
        if (template.examples) {
            template.examples.forEach(example => {
                keyboard.inline_keyboard.push([{
                    text: `💡 ${example.text}`,
                    callback_data: `eva:example:${example.inn || example.callback_data}`
                }]);
            });
        }

        // Добавляем навигацию
        if (template.navigation) {
            const navRow = [];
            if (template.navigation.back) {
                navRow.push(this.renderButton(template.navigation.back, theme));
            }
            if (template.navigation.home) {
                navRow.push(this.renderButton(template.navigation.home, theme));
            }
            if (navRow.length > 0) {
                keyboard.inline_keyboard.push(navRow);
            }
        }

        // Добавляем footer
        if (template.footer && template.footer.buttons) {
            const footerRow = template.footer.buttons.map(button => 
                this.renderButton(button, theme)
            );
            keyboard.inline_keyboard.push(footerRow);
        }

        return keyboard;
    }

    // Рендеринг кнопки
    renderButton(button, theme) {
        let text = button.text;

        // Добавляем badge если есть
        if (button.badge) {
            text += ` 🔥`;
        }

        // Добавляем индикатор состояния для переключателей
        if (button.type === 'switch') {
            text += button.current_value ? ' ✅' : ' ❌';
        } else if (button.type === 'toggle') {
            text += ` (${button.current_value})`;
        }

        return {
            text: text,
            callback_data: button.callback_data
        };
    }

    // Создание динамического меню
    createDynamicMenu(userId, config) {
        const menuId = this.generateId();
        this.addMenuTemplate(menuId, config);
        return this.renderMenu(menuId, userId);
    }

    // Обновление меню с анимацией
    async updateMenuWithAnimation(userId, templateId, variables = {}, animationType = 'fade') {
        const menu = this.renderMenu(templateId, userId, variables);
        
        // Добавляем анимационные эффекты через эмодзи
        if (animationType === 'loading') {
            menu.text = '⏳ Загрузка...\n\n' + menu.text;
        } else if (animationType === 'success') {
            menu.text = '✅ Успешно!\n\n' + menu.text;
        } else if (animationType === 'error') {
            menu.text = '❌ Ошибка!\n\n' + menu.text;
        }

        return menu;
    }

    // Создание карусели
    createCarousel(items, currentIndex = 0) {
        const item = items[currentIndex];
        const totalItems = items.length;
        
        const navigation = [];
        
        if (currentIndex > 0) {
            navigation.push({
                text: '◀️ Назад',
                callback_data: `eva:carousel:prev:${currentIndex - 1}`
            });
        }
        
        navigation.push({
            text: `${currentIndex + 1}/${totalItems}`,
            callback_data: 'eva:carousel:info'
        });
        
        if (currentIndex < totalItems - 1) {
            navigation.push({
                text: 'Вперед ▶️',
                callback_data: `eva:carousel:next:${currentIndex + 1}`
            });
        }

        return {
            text: item.text || item.title,
            reply_markup: {
                inline_keyboard: [
                    item.buttons || [],
                    navigation
                ]
            },
            parse_mode: 'Markdown'
        };
    }

    // Создание формы
    createForm(formConfig) {
        const fields = formConfig.fields.map((field, index) => {
            let fieldText = `${index + 1}. **${field.label}**`;
            
            if (field.required) {
                fieldText += ' *';
            }
            
            if (field.description) {
                fieldText += `\n   _${field.description}_`;
            }
            
            if (field.current_value) {
                fieldText += `\n   💡 Текущее значение: ${field.current_value}`;
            }
            
            return fieldText;
        }).join('\n\n');

        const buttons = formConfig.fields.map((field, index) => [{
            text: `✏️ ${field.label}`,
            callback_data: `eva:form:field:${index}`
        }]);

        buttons.push([
            { text: '💾 Сохранить', callback_data: 'eva:form:save' },
            { text: '❌ Отмена', callback_data: 'eva:form:cancel' }
        ]);

        return {
            text: `📝 **${formConfig.title}**\n\n${fields}`,
            reply_markup: { inline_keyboard: buttons },
            parse_mode: 'Markdown'
        };
    }

    // Управление сессией пользователя
    getUserSession(userId) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, {
                theme: 'light',
                language: 'ru',
                animations: true,
                last_menu: null,
                menu_history: [],
                preferences: {}
            });
        }
        return this.userSessions.get(userId);
    }

    updateUserSession(userId, updates) {
        const session = this.getUserSession(userId);
        Object.assign(session, updates);
        this.userSessions.set(userId, session);
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Форматирование текста
    formatText(text, format = 'markdown') {
        if (format === 'markdown') {
            return text
                .replace(/\*\*(.*?)\*\*/g, '**$1**')
                .replace(/\*(.*?)\*/g, '_$1_')
                .replace(/`(.*?)`/g, '`$1`');
        }
        return text;
    }

    // Создание уведомления
    createNotification(type, title, message, buttons = []) {
        const typeEmojis = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const emoji = typeEmojis[type] || 'ℹ️';
        
        return {
            text: `${emoji} **${title}**\n\n${message}`,
            reply_markup: buttons.length > 0 ? { inline_keyboard: [buttons] } : undefined,
            parse_mode: 'Markdown'
        };
    }

    // Получение статистики UI
    getUIStats() {
        return {
            menu_templates: this.menuTemplates.size,
            ui_components: this.uiComponents.size,
            themes: this.themes.size,
            active_sessions: this.userSessions.size
        };
    }
}

module.exports = AdvancedUI;

