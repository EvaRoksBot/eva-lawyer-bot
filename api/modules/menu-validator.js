// Валидатор меню и клавиатур для Eva Lawyer Bot
// Реализует требования Manus для проверки Telegram-ботов

class MenuValidator {
    constructor() {
        this.MAX_CALLBACK_LENGTH = 64;
        this.MAX_MESSAGE_LENGTH = 4096;
        this.MAX_BUTTONS_PER_ROW = 3;
        this.MAX_ROWS = 3;
    }

    // Проверка всей структуры меню
    validateMenuStructure(menus) {
        const results = {
            summary: [],
            findings: [],
            fixes: [],
            testMatrix: [],
            memoryPlan: []
        };

        // Проверяем каждое меню
        for (const [menuKey, menuData] of Object.entries(menus)) {
            this.validateSingleMenu(menuKey, menuData, results);
        }

        // Проверяем связность между меню
        this.validateMenuConnectivity(menus, results);

        // Проверяем callback_data
        this.validateCallbacks(menus, results);

        return results;
    }

    // Проверка одного меню
    validateSingleMenu(menuKey, menuData, results) {
        const { text, keyboard } = menuData;

        // Проверка длины текста
        if (text && text.length > this.MAX_MESSAGE_LENGTH) {
            results.findings.push({
                type: 'FAIL',
                menu: menuKey,
                issue: `Текст превышает ${this.MAX_MESSAGE_LENGTH} символов: ${text.length}`
            });
        }

        // Проверка клавиатуры
        if (keyboard && keyboard.inline_keyboard) {
            this.validateKeyboard(menuKey, keyboard.inline_keyboard, results);
        }

        // Проверка наличия кнопки "Домой"
        const hasHomeButton = this.hasHomeButton(keyboard);
        if (!hasHomeButton && menuKey !== 'home') {
            results.findings.push({
                type: 'WARN',
                menu: menuKey,
                issue: 'Отсутствует кнопка "Домой"'
            });
        }
    }

    // Проверка клавиатуры
    validateKeyboard(menuKey, inlineKeyboard, results) {
        if (inlineKeyboard.length > this.MAX_ROWS) {
            results.findings.push({
                type: 'WARN',
                menu: menuKey,
                issue: `Слишком много рядов кнопок: ${inlineKeyboard.length} > ${this.MAX_ROWS}`
            });
        }

        inlineKeyboard.forEach((row, rowIndex) => {
            if (row.length > this.MAX_BUTTONS_PER_ROW) {
                results.findings.push({
                    type: 'WARN',
                    menu: menuKey,
                    issue: `Слишком много кнопок в ряду ${rowIndex}: ${row.length} > ${this.MAX_BUTTONS_PER_ROW}`
                });
            }

            row.forEach((button, buttonIndex) => {
                this.validateButton(menuKey, button, rowIndex, buttonIndex, results);
            });
        });
    }

    // Проверка кнопки
    validateButton(menuKey, button, rowIndex, buttonIndex, results) {
        const { text, callback_data } = button;

        // Проверка длины callback_data
        if (callback_data && callback_data.length > this.MAX_CALLBACK_LENGTH) {
            results.findings.push({
                type: 'FAIL',
                menu: menuKey,
                issue: `callback_data превышает ${this.MAX_CALLBACK_LENGTH} байт: "${callback_data}" (${callback_data.length})`
            });
        }

        // Проверка формата callback_data
        if (callback_data) {
            const isValidFormat = this.isValidCallbackFormat(callback_data);
            if (!isValidFormat) {
                results.findings.push({
                    type: 'WARN',
                    menu: menuKey,
                    issue: `Неправильный формат callback_data: "${callback_data}"`
                });
            }
        }

        // Проверка текста кнопки
        if (!text || text.trim().length === 0) {
            results.findings.push({
                type: 'FAIL',
                menu: menuKey,
                issue: `Пустой текст кнопки в ряду ${rowIndex}, позиция ${buttonIndex}`
            });
        }
    }

    // Проверка формата callback_data
    isValidCallbackFormat(callbackData) {
        // Допустимые форматы:
        // MENU:section
        // ACT:SECTION:ACTION
        // a:ticket_id
        const patterns = [
            /^MENU:[a-z_]+$/,
            /^ACT:[A-Z_]+:[A-Z_]+$/,
            /^a:[a-zA-Z0-9]+$/
        ];

        return patterns.some(pattern => pattern.test(callbackData));
    }

    // Проверка наличия кнопки "Домой"
    hasHomeButton(keyboard) {
        if (!keyboard || !keyboard.inline_keyboard) return false;

        return keyboard.inline_keyboard.some(row =>
            row.some(button =>
                button.callback_data === 'MENU:home' ||
                button.text.includes('🏠') ||
                button.text.includes('Домой')
            )
        );
    }

    // Проверка связности между меню
    validateMenuConnectivity(menus, results) {
        const allCallbacks = new Set();
        const referencedCallbacks = new Set();

        // Собираем все callback_data
        for (const [menuKey, menuData] of Object.entries(menus)) {
            if (menuData.keyboard && menuData.keyboard.inline_keyboard) {
                menuData.keyboard.inline_keyboard.forEach(row => {
                    row.forEach(button => {
                        if (button.callback_data) {
                            allCallbacks.add(button.callback_data);
                            
                            // Если это ссылка на меню, добавляем в referenced
                            if (button.callback_data.startsWith('MENU:')) {
                                const targetMenu = button.callback_data.replace('MENU:', '');
                                referencedCallbacks.add(targetMenu);
                            }
                        }
                    });
                });
            }
        }

        // Проверяем, что все ссылки на меню существуют
        referencedCallbacks.forEach(menuRef => {
            if (!menus[menuRef]) {
                results.findings.push({
                    type: 'FAIL',
                    issue: `Ссылка на несуществующее меню: MENU:${menuRef}`
                });
            }
        });

        results.summary.push(`Проверено ${Object.keys(menus).length} меню, ${allCallbacks.size} кнопок`);
    }

    // Проверка обработчиков callback
    validateCallbackHandlers(callbacks, handlers, results) {
        const missingHandlers = [];
        const extraHandlers = [];

        // Проверяем покрытие обработчиками
        callbacks.forEach(callback => {
            if (!handlers.includes(callback) && !callback.startsWith('a:')) {
                missingHandlers.push(callback);
            }
        });

        // Проверяем лишние обработчики
        handlers.forEach(handler => {
            if (!callbacks.includes(handler) && handler !== 'a:*') {
                extraHandlers.push(handler);
            }
        });

        if (missingHandlers.length > 0) {
            results.findings.push({
                type: 'FAIL',
                issue: `Отсутствуют обработчики: ${missingHandlers.join(', ')}`
            });
        }

        if (extraHandlers.length > 0) {
            results.findings.push({
                type: 'WARN',
                issue: `Лишние обработчики: ${extraHandlers.join(', ')}`
            });
        }

        const coverage = ((callbacks.length - missingHandlers.length) / callbacks.length * 100).toFixed(1);
        results.summary.push(`Покрытие обработчиками: ${coverage}%`);
    }

    // Генерация тест-матрицы
    generateTestMatrix(menus) {
        const testCases = [];

        // Базовые тесты для каждого меню
        for (const [menuKey, menuData] of Object.entries(menus)) {
            testCases.push({
                flow: `Navigate to ${menuKey}`,
                input: `MENU:${menuKey}`,
                steps: ['Click button', 'Wait for response'],
                expect: `Menu ${menuKey} displayed with buttons`
            });

            // Тесты для кнопок действий
            if (menuData.keyboard && menuData.keyboard.inline_keyboard) {
                menuData.keyboard.inline_keyboard.forEach(row => {
                    row.forEach(button => {
                        if (button.callback_data && button.callback_data.startsWith('ACT:')) {
                            testCases.push({
                                flow: `Action ${button.callback_data}`,
                                input: button.callback_data,
                                steps: ['Click action', 'Process request'],
                                expect: 'Action completed with result'
                            });
                        }
                    });
                });
            }
        }

        return testCases;
    }

    // Генерация плана векторной памяти
    generateMemoryPlan() {
        return {
            collections: {
                episodic: {
                    description: 'История взаимодействий пользователя',
                    keys: ['user_id', 'action', 'timestamp', 'result'],
                    embedding_field: 'action_description',
                    ttl: '30 days'
                },
                semantic: {
                    description: 'Семантические знания и ответы',
                    keys: ['content', 'route', 'category', 'metadata'],
                    embedding_field: 'content',
                    ttl: 'permanent'
                },
                profile: {
                    description: 'Профиль и предпочтения пользователя',
                    keys: ['user_id', 'preferences', 'settings'],
                    embedding_field: 'preferences_text',
                    ttl: '1 year'
                }
            },
            search_params: {
                k: 6,
                similarity_threshold: 0.7,
                embedding_model: 'text-embedding-3-small'
            }
        };
    }
}

module.exports = { MenuValidator };

