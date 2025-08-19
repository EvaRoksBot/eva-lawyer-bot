// Interactive Handlers for Enhanced UI System
// Specialized handlers for different consultation types and actions

class InteractiveHandlers {
    constructor(bot, uiSystem, assistantTools) {
        this.bot = bot;
        this.uiSystem = uiSystem;
        this.assistantTools = assistantTools;
        this.activeConsultations = new Map();
        this.documentSessions = new Map();
    }

    // Handle INN check with enhanced feedback
    async handleInnCheck(chatId, inn) {
        try {
            // Show loading message
            const loadingMsg = await this.bot.sendMessage(chatId, '🔍 Проверяю ИНН компании...', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⏹️ Отменить', callback_data: 'checks_menu' }]
                    ]
                }
            });

            // Validate INN format
            if (!/^[0-9]{10,12}$/.test(inn)) {
                await this.bot.editMessageText(
                    '❌ <b>Неверный формат ИНН</b>\n\nИНН должен содержать 10 или 12 цифр.\n\n💡 Пример: 7707083893', {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 Попробовать снова', callback_data: 'check_inn_form' }],
                            [{ text: '🔙 Назад к проверкам', callback_data: 'checks_menu' }]
                        ]
                    }
                });
                return;
            }

            // Perform INN check using assistant tools
            let result;
            if (this.assistantTools && typeof this.assistantTools.checkCompanyInn === 'function') {
                result = await this.assistantTools.checkCompanyInn(inn);
            } else {
                result = {
                    error: 'Сервис проверки временно недоступен',
                    suggestion: 'Попробуйте позже'
                };
            }

            // Format result message
            let resultText;
            let keyboard;

            if (result.error) {
                resultText = `❌ <b>Ошибка проверки ИНН</b>\n\n${result.error}`;
                if (result.suggestion) {
                    resultText += `\n\n💡 ${result.suggestion}`;
                }
                keyboard = [
                    [{ text: '🔄 Попробовать снова', callback_data: 'check_inn_form' }],
                    [{ text: '🔙 Назад к проверкам', callback_data: 'checks_menu' }]
                ];
            } else {
                resultText = `✅ <b>Информация о компании</b>\n\n`;
                resultText += `🏢 <b>Наименование:</b> ${result.name || 'Не указано'}\n`;
                resultText += `📍 <b>Адрес:</b> ${result.address || 'Не указан'}\n`;
                resultText += `👤 <b>Руководитель:</b> ${result.director || 'Не указан'}\n`;
                resultText += `📊 <b>Статус:</b> ${result.status || 'Неизвестен'}\n`;
                resultText += `💰 <b>Уставный капитал:</b> ${result.capital || 'Не указан'}\n`;
                
                if (result.risks && result.risks.length > 0) {
                    resultText += `\n⚠️ <b>Выявленные риски:</b>\n`;
                    result.risks.forEach(risk => {
                        resultText += `• ${risk}\n`;
                    });
                }

                keyboard = [
                    [{ text: '📊 Подробный отчет', callback_data: `detailed_report_${inn}` }],
                    [{ text: '🔍 Проверить другую компанию', callback_data: 'check_inn_form' }],
                    [{ text: '🔙 Назад к проверкам', callback_data: 'checks_menu' }]
                ];
            }

            // Update message with results
            await this.bot.editMessageText(resultText, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });

        } catch (error) {
            console.error('INN check error:', error);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка при проверке ИНН', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Попробовать снова', callback_data: 'check_inn_form' }],
                        [{ text: '🏠 Главное меню', callback_data: 'start' }]
                    ]
                }
            });
        }
    }

    // Handle specialized consultation
    async handleSpecializedConsultation(chatId, userId, type) {
        const consultationTypes = {
            corporate: {
                title: '🏢 Корпоративное право',
                description: 'Консультации по вопросам создания, реорганизации и ликвидации юридических лиц, корпоративным спорам, сделкам M&A.',
                examples: [
                    'Создание ООО или АО',
                    'Корпоративные споры',
                    'Сделки слияния и поглощения',
                    'Корпоративное управление'
                ]
            },
            labor: {
                title: '👥 Трудовое право',
                description: 'Консультации по трудовым отношениям, увольнениям, трудовым спорам, оформлению документов.',
                examples: [
                    'Увольнение сотрудников',
                    'Трудовые споры',
                    'Оформление трудовых договоров',
                    'Дисциплинарные взыскания'
                ]
            },
            civil: {
                title: '🏠 Гражданское право',
                description: 'Консультации по сделкам с недвижимостью, договорам, наследственным вопросам.',
                examples: [
                    'Купля-продажа недвижимости',
                    'Наследственные споры',
                    'Договорные отношения',
                    'Защита прав потребителей'
                ]
            },
            tax: {
                title: '💰 Налоговое право',
                description: 'Консультации по налогообложению, налоговым спорам, оптимизации налогов.',
                examples: [
                    'Налоговые проверки',
                    'Оптимизация налогов',
                    'Налоговые споры',
                    'Налоговое планирование'
                ]
            }
        };

        const consultation = consultationTypes[type];
        if (!consultation) {
            await this.bot.sendMessage(chatId, '❌ Неизвестный тип консультации');
            return;
        }

        const text = `${consultation.title}\n\n${consultation.description}\n\n📋 <b>Примеры вопросов:</b>\n${consultation.examples.map(ex => `• ${ex}`).join('\n')}\n\n💬 Задайте ваш вопрос:`;

        await this.bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад к консультациям', callback_data: 'consultation_menu' }],
                    [{ text: '🏠 Главное меню', callback_data: 'start' }]
                ]
            }
        });

        // Set consultation context
        this.activeConsultations.set(userId, {
            type: type,
            title: consultation.title,
            startTime: Date.now()
        });
    }

    // Handle urgent consultation
    async handleUrgentConsultation(chatId, userId) {
        const text = `🚨 <b>Срочная юридическая консультация</b>

⚡ Для срочных вопросов я предоставлю приоритетную обработку.

📞 <b>Когда обращаться:</b>
• Судебные заседания в ближайшие дни
• Срочные сделки и договоры
• Налоговые проверки
• Трудовые споры с увольнением

⏰ <b>Время ответа:</b> до 5 минут

💬 Опишите вашу ситуацию максимально подробно:`;

        await this.bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📞 Связаться с юристом', callback_data: 'contact_lawyer' }],
                    [{ text: '🔙 Назад к консультациям', callback_data: 'consultation_menu' }]
                ]
            }
        });

        // Set urgent consultation flag
        this.activeConsultations.set(userId, {
            type: 'urgent',
            title: 'Срочная консультация',
            priority: 'high',
            startTime: Date.now()
        });
    }

    // Handle contract analysis start
    async handleContractAnalysisStart(chatId, userId) {
        const text = `📋 <b>Анализ договора</b>

🔍 <b>Что я проверю:</b>
• Соответствие законодательству
• Потенциальные риски и проблемы
• Рекомендации по доработке
• Критические условия

📄 <b>Поддерживаемые форматы:</b>
• PDF документы
• DOCX файлы
• Изображения (JPG, PNG)
• Текстовые сообщения

📤 Отправьте договор для анализа:`;

        await this.bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 Пример анализа', callback_data: 'contract_example' }],
                    [{ text: '🔙 Назад к документам', callback_data: 'documents_menu' }]
                ]
            }
        });

        // Set document session
        this.documentSessions.set(userId, {
            type: 'contract_analysis',
            startTime: Date.now()
        });
    }

    // Handle document creation start
    async handleDocumentCreationStart(chatId, userId) {
        const menuData = this.uiSystem.getDocumentCreationWizard(userId);
        
        await this.bot.sendMessage(chatId, menuData.text, {
            parse_mode: 'HTML',
            reply_markup: menuData.reply_markup
        });
    }

    // Handle consultation start
    async handleConsultationStart(chatId, userId) {
        const text = `💬 <b>Юридическая консультация</b>

Я готов ответить на ваши вопросы по любым областям права.

📝 <b>Для получения качественной консультации укажите:</b>
• Суть проблемы или вопроса
• Какие документы у вас есть
• Какой результат вы хотите получить
• Сроки, если они критичны

💡 <b>Совет:</b> Чем подробнее вы опишете ситуацию, тем точнее будет консультация.

💬 Задайте ваш вопрос:`;

        await this.bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏢 Корпоративное право', callback_data: 'consult_corporate' }],
                    [{ text: '👥 Трудовое право', callback_data: 'consult_labor' }],
                    [{ text: '🏠 Гражданское право', callback_data: 'consult_civil' }],
                    [{ text: '💰 Налоговое право', callback_data: 'consult_tax' }],
                    [{ text: '🔙 Назад', callback_data: 'consultation_menu' }]
                ]
            }
        });
    }

    // Handle INN input mode
    async handleInnInputMode(chatId, userId) {
        const text = `🔍 <b>Ввод ИНН для проверки</b>

📝 Введите ИНН компании (10 или 12 цифр):

💡 <b>Примеры:</b>
• ИНН юридического лица: 7707083893
• ИНН индивидуального предпринимателя: 123456789012

⚠️ <b>Важно:</b> ИНН должен содержать только цифры без пробелов и дефисов.`;

        await this.bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 Пример: 7707083893', callback_data: 'inn_example' }],
                    [{ text: '🔙 Назад', callback_data: 'check_inn_form' }]
                ]
            }
        });

        // Set input mode
        this.uiSystem.updateUserState(userId, {
            inputMode: 'inn_check',
            inputStartTime: Date.now()
        });
    }

    // Get active consultation
    getActiveConsultation(userId) {
        return this.activeConsultations.get(userId);
    }

    // Clear consultation
    clearConsultation(userId) {
        this.activeConsultations.delete(userId);
    }

    // Get document session
    getDocumentSession(userId) {
        return this.documentSessions.get(userId);
    }

    // Clear document session
    clearDocumentSession(userId) {
        this.documentSessions.delete(userId);
    }

    // Check if user is in input mode
    isInInputMode(userId, mode) {
        const userState = this.uiSystem.getUserState(userId);
        return userState.inputMode === mode;
    }

    // Clear input mode
    clearInputMode(userId) {
        this.uiSystem.updateUserState(userId, {
            inputMode: null,
            inputStartTime: null
        });
    }
}

module.exports = InteractiveHandlers;

