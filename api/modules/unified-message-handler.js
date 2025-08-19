// Unified Message Handler - Единый обработчик сообщений Eva Lawyer Bot
// Объединяет все роутеры и обработчики в единую координированную систему

class UnifiedMessageHandler {
    constructor(bot, aiEngine, menuSystem, assistantTools) {
        this.bot = bot;
        this.aiEngine = aiEngine;
        this.menuSystem = menuSystem;
        this.assistantTools = assistantTools;
        
        // Состояния пользователей
        this.userStates = new Map();
        this.activeConversations = new Map();
        this.pendingActions = new Map();
        
        // Обработчики по типам
        this.handlers = {
            text: new Map(),
            callback: new Map(),
            document: new Map(),
            photo: new Map(),
            voice: new Map(),
            contact: new Map(),
            location: new Map()
        };
        
        // Middleware цепочка
        this.middleware = [];
        
        // Метрики
        this.metrics = {
            messagesProcessed: 0,
            errorsCount: 0,
            averageResponseTime: 0,
            handlerUsage: new Map()
        };
        
        // Инициализация обработчиков
        this.initializeHandlers();
        this.initializeMiddleware();
    }

    // Инициализация обработчиков
    initializeHandlers() {
        // Текстовые команды
        this.registerTextHandler('/start', this.handleStart.bind(this));
        this.registerTextHandler('/help', this.handleHelp.bind(this));
        this.registerTextHandler('/menu', this.handleMenu.bind(this));
        this.registerTextHandler('/settings', this.handleSettings.bind(this));
        this.registerTextHandler('/stats', this.handleStats.bind(this));
        
        // Callback обработчики для меню
        this.registerCallbackHandler('main', this.handleMainMenu.bind(this));
        this.registerCallbackHandler('consultation_menu', this.handleConsultationMenu.bind(this));
        this.registerCallbackHandler('documents_menu', this.handleDocumentsMenu.bind(this));
        this.registerCallbackHandler('checks_menu', this.handleChecksMenu.bind(this));
        this.registerCallbackHandler('services_menu', this.handleServicesMenu.bind(this));
        this.registerCallbackHandler('analytics_menu', this.handleAnalyticsMenu.bind(this));
        this.registerCallbackHandler('settings_menu', this.handleSettingsMenu.bind(this));
        this.registerCallbackHandler('help_menu', this.handleHelpMenu.bind(this));
        
        // Консультации по областям права
        this.registerCallbackHandler('consult_corporate', this.handleCorporateConsultation.bind(this));
        this.registerCallbackHandler('consult_family', this.handleFamilyConsultation.bind(this));
        this.registerCallbackHandler('consult_realestate', this.handleRealEstateConsultation.bind(this));
        this.registerCallbackHandler('consult_labor', this.handleLaborConsultation.bind(this));
        this.registerCallbackHandler('consult_tax', this.handleTaxConsultation.bind(this));
        this.registerCallbackHandler('consult_admin', this.handleAdminConsultation.bind(this));
        this.registerCallbackHandler('consult_general', this.handleGeneralConsultation.bind(this));
        this.registerCallbackHandler('consult_urgent', this.handleUrgentConsultation.bind(this));
        
        // Работа с документами
        this.registerCallbackHandler('doc_analyze_contract', this.handleAnalyzeContract.bind(this));
        this.registerCallbackHandler('doc_check_risks', this.handleCheckRisks.bind(this));
        this.registerCallbackHandler('doc_create', this.handleCreateDocument.bind(this));
        this.registerCallbackHandler('doc_edit', this.handleEditDocument.bind(this));
        this.registerCallbackHandler('doc_compare', this.handleCompareDocuments.bind(this));
        this.registerCallbackHandler('doc_compliance', this.handleComplianceCheck.bind(this));
        this.registerCallbackHandler('doc_my_documents', this.handleMyDocuments.bind(this));
        this.registerCallbackHandler('doc_upload', this.handleUploadDocument.bind(this));
        
        // Проверки
        this.registerCallbackHandler('check_inn_form', this.handleCheckINN.bind(this));
        this.registerCallbackHandler('check_ogrn', this.handleCheckOGRN.bind(this));
        this.registerCallbackHandler('check_court_cases', this.handleCheckCourtCases.bind(this));
        this.registerCallbackHandler('check_financial', this.handleCheckFinancial.bind(this));
        this.registerCallbackHandler('search_precedents', this.handleSearchPrecedents.bind(this));
        this.registerCallbackHandler('check_licenses', this.handleCheckLicenses.bind(this));
        
        // Услуги
        this.registerCallbackHandler('service_contracts', this.handleServiceContracts.bind(this));
        this.registerCallbackHandler('service_court', this.handleServiceCourt.bind(this));
        this.registerCallbackHandler('service_registration', this.handleServiceRegistration.bind(this));
        this.registerCallbackHandler('service_tax_planning', this.handleServiceTaxPlanning.bind(this));
        this.registerCallbackHandler('service_ip', this.handleServiceIP.bind(this));
        this.registerCallbackHandler('contact_lawyer', this.handleContactLawyer.bind(this));
        this.registerCallbackHandler('online_consultation', this.handleOnlineConsultation.bind(this));
        
        // Аналитика
        this.registerCallbackHandler('analytics_consultations', this.handleAnalyticsConsultations.bind(this));
        this.registerCallbackHandler('analytics_documents', this.handleAnalyticsDocuments.bind(this));
        this.registerCallbackHandler('analytics_companies', this.handleAnalyticsCompanies.bind(this));
        this.registerCallbackHandler('analytics_response_time', this.handleAnalyticsResponseTime.bind(this));
        this.registerCallbackHandler('personal_dashboard', this.handlePersonalDashboard.bind(this));
        this.registerCallbackHandler('export_data', this.handleExportData.bind(this));
        
        // Настройки
        this.registerCallbackHandler('settings_profile', this.handleSettingsProfile.bind(this));
        this.registerCallbackHandler('settings_notifications', this.handleSettingsNotifications.bind(this));
        this.registerCallbackHandler('settings_personalization', this.handleSettingsPersonalization.bind(this));
        this.registerCallbackHandler('settings_security', this.handleSettingsSecurity.bind(this));
        this.registerCallbackHandler('settings_integrations', this.handleSettingsIntegrations.bind(this));
        this.registerCallbackHandler('settings_export', this.handleSettingsExport.bind(this));
        
        // Помощь
        this.registerCallbackHandler('help_guide', this.handleHelpGuide.bind(this));
        this.registerCallbackHandler('help_faq', this.handleHelpFAQ.bind(this));
        this.registerCallbackHandler('help_videos', this.handleHelpVideos.bind(this));
        this.registerCallbackHandler('help_support', this.handleHelpSupport.bind(this));
        this.registerCallbackHandler('help_feedback', this.handleHelpFeedback.bind(this));
        this.registerCallbackHandler('help_bug_report', this.handleHelpBugReport.bind(this));
        
        // Обработчики файлов
        this.registerDocumentHandler('pdf', this.handlePDFDocument.bind(this));
        this.registerDocumentHandler('docx', this.handleWordDocument.bind(this));
        this.registerDocumentHandler('txt', this.handleTextDocument.bind(this));
        this.registerDocumentHandler('image', this.handleImageDocument.bind(this));
        
        // Обработчики фотографий
        this.registerPhotoHandler('contract', this.handleContractPhoto.bind(this));
        this.registerPhotoHandler('document', this.handleDocumentPhoto.bind(this));
        this.registerPhotoHandler('general', this.handleGeneralPhoto.bind(this));
    }

    // Инициализация middleware
    initializeMiddleware() {
        // Middleware для логирования
        this.addMiddleware(this.loggingMiddleware.bind(this));
        
        // Middleware для аутентификации
        this.addMiddleware(this.authMiddleware.bind(this));
        
        // Middleware для rate limiting
        this.addMiddleware(this.rateLimitMiddleware.bind(this));
        
        // Middleware для валидации
        this.addMiddleware(this.validationMiddleware.bind(this));
        
        // Middleware для метрик
        this.addMiddleware(this.metricsMiddleware.bind(this));
    }

    // Основной обработчик сообщений
    async handleMessage(message) {
        const startTime = Date.now();
        let response = null;
        
        try {
            // Применяем middleware
            const context = await this.applyMiddleware(message);
            if (!context.continue) {
                return context.response;
            }
            
            // Определяем тип сообщения и вызываем соответствующий обработчик
            if (message.text) {
                response = await this.handleTextMessage(message, context);
            } else if (message.document) {
                response = await this.handleDocumentMessage(message, context);
            } else if (message.photo) {
                response = await this.handlePhotoMessage(message, context);
            } else if (message.voice) {
                response = await this.handleVoiceMessage(message, context);
            } else if (message.contact) {
                response = await this.handleContactMessage(message, context);
            } else if (message.location) {
                response = await this.handleLocationMessage(message, context);
            } else {
                response = await this.handleUnknownMessage(message, context);
            }
            
            // Обновляем метрики
            this.updateMetrics(startTime, true);
            
            return response;
            
        } catch (error) {
            console.error('Error handling message:', error);
            this.updateMetrics(startTime, false);
            return this.getErrorResponse(error);
        }
    }

    // Обработчик callback queries
    async handleCallbackQuery(callbackQuery) {
        const startTime = Date.now();
        
        try {
            const { data, message, from } = callbackQuery;
            const userId = from.id;
            
            // Применяем middleware
            const context = await this.applyMiddleware({ ...callbackQuery, userId });
            if (!context.continue) {
                return context.response;
            }
            
            // Ищем обработчик
            const handler = this.handlers.callback.get(data);
            
            if (handler) {
                const response = await handler(callbackQuery, context);
                this.updateMetrics(startTime, true);
                return response;
            } else {
                // Если нет специального обработчика, используем меню систему
                const menuResponse = this.menuSystem.handleMenuNavigation(userId, data, message.message_id);
                this.updateMetrics(startTime, true);
                return menuResponse;
            }
            
        } catch (error) {
            console.error('Error handling callback query:', error);
            this.updateMetrics(startTime, false);
            return this.getErrorResponse(error);
        }
    }

    // Обработчик текстовых сообщений
    async handleTextMessage(message, context) {
        const { text, from } = message;
        const userId = from.id;
        
        // Проверяем команды
        if (text.startsWith('/')) {
            const command = text.split(' ')[0];
            const handler = this.handlers.text.get(command);
            
            if (handler) {
                return await handler(message, context);
            }
        }
        
        // Проверяем состояние пользователя
        const userState = this.getUserState(userId);
        
        // Если пользователь в режиме ввода данных
        if (userState.waitingFor) {
            return await this.handleUserInput(message, context);
        }
        
        // Проверяем специальные паттерны
        if (this.isINN(text)) {
            return await this.handleINNInput(message, context);
        }
        
        if (this.isOGRN(text)) {
            return await this.handleOGRNInput(message, context);
        }
        
        // Обычная консультация через AI
        return await this.handleGeneralConsultation(message, context);
    }

    // Обработчик документов
    async handleDocumentMessage(message, context) {
        const { document, from } = message;
        const userId = from.id;
        
        // Определяем тип документа
        const fileExtension = this.getFileExtension(document.file_name);
        const handler = this.handlers.document.get(fileExtension) || this.handlers.document.get('general');
        
        if (handler) {
            return await handler(message, context);
        }
        
        return {
            text: '❌ Неподдерживаемый тип документа. Поддерживаются: PDF, DOCX, TXT, изображения.',
            reply_markup: {
                inline_keyboard: [[
                    { text: '📄 Меню документов', callback_data: 'documents_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            }
        };
    }

    // Обработчик фотографий
    async handlePhotoMessage(message, context) {
        const { photo, from } = message;
        const userId = from.id;
        
        // Используем обработчик изображений
        const handler = this.handlers.photo.get('general');
        
        if (handler) {
            return await handler(message, context);
        }
        
        return {
            text: '📷 Изображение получено. Анализирую содержимое...',
            reply_markup: {
                inline_keyboard: [[
                    { text: '📄 Меню документов', callback_data: 'documents_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            }
        };
    }

    // Обработчик голосовых сообщений
    async handleVoiceMessage(message, context) {
        return {
            text: '🎤 Голосовые сообщения пока не поддерживаются. Пожалуйста, отправьте текстовое сообщение.',
            reply_markup: {
                inline_keyboard: [[
                    { text: '💬 Консультация', callback_data: 'consultation_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            }
        };
    }

    // Обработчик контактов
    async handleContactMessage(message, context) {
        const { contact, from } = message;
        const userId = from.id;
        
        // Сохраняем контакт пользователя
        this.updateUserState(userId, {
            contact: {
                phone: contact.phone_number,
                firstName: contact.first_name,
                lastName: contact.last_name
            }
        });
        
        return {
            text: '📞 Контакт сохранен! Теперь наши юристы смогут связаться с вами.',
            reply_markup: {
                inline_keyboard: [[
                    { text: '⚖️ Услуги', callback_data: 'services_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            }
        };
    }

    // Обработчик местоположения
    async handleLocationMessage(message, context) {
        const { location, from } = message;
        const userId = from.id;
        
        // Сохраняем местоположение
        this.updateUserState(userId, {
            location: {
                latitude: location.latitude,
                longitude: location.longitude
            }
        });
        
        return {
            text: '📍 Местоположение сохранено! Это поможет найти ближайших юристов.',
            reply_markup: {
                inline_keyboard: [[
                    { text: '📞 Связаться с юристом', callback_data: 'contact_lawyer' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            }
        };
    }

    // Обработчик неизвестных сообщений
    async handleUnknownMessage(message, context) {
        return {
            text: '🤔 Не понимаю этот тип сообщения. Попробуйте отправить текст, документ или изображение.',
            reply_markup: {
                inline_keyboard: [[
                    { text: '🆘 Помощь', callback_data: 'help_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            }
        };
    }

    // Обработчики команд
    async handleStart(message, context) {
        const { from } = message;
        const userId = from.id;
        
        // Инициализируем пользователя
        this.initializeUser(userId, from);
        
        // Получаем главное меню
        const menu = this.menuSystem.getMenu(userId, 'main');
        
        return {
            text: menu.text,
            reply_markup: {
                inline_keyboard: menu.buttons
            },
            parse_mode: 'HTML'
        };
    }

    async handleHelp(message, context) {
        const { from } = message;
        const userId = from.id;
        
        const menu = this.menuSystem.getMenu(userId, 'help_menu');
        
        return {
            text: menu.text,
            reply_markup: {
                inline_keyboard: menu.buttons
            },
            parse_mode: 'HTML'
        };
    }

    async handleMenu(message, context) {
        const { from } = message;
        const userId = from.id;
        
        const menu = this.menuSystem.getMenu(userId, 'main');
        
        return {
            text: menu.text,
            reply_markup: {
                inline_keyboard: menu.buttons
            },
            parse_mode: 'HTML'
        };
    }

    async handleSettings(message, context) {
        const { from } = message;
        const userId = from.id;
        
        const menu = this.menuSystem.getMenu(userId, 'settings_menu');
        
        return {
            text: menu.text,
            reply_markup: {
                inline_keyboard: menu.buttons
            },
            parse_mode: 'HTML'
        };
    }

    async handleStats(message, context) {
        const { from } = message;
        const userId = from.id;
        
        const stats = this.menuSystem.getMenuStatistics(userId);
        const userState = this.getUserState(userId);
        
        let text = `📊 <b>Ваша статистика</b>\n\n`;
        text += `👤 <b>Профиль:</b>\n`;
        text += `• Имя: ${userState.firstName || 'Не указано'}\n`;
        text += `• Уровень: ${this.getUserLevelText(userState.level)}\n`;
        text += `• Регистрация: ${new Date(userState.registrationDate || Date.now()).toLocaleDateString()}\n\n`;
        
        text += `📈 <b>Активность:</b>\n`;
        text += `• Консультаций: ${userState.consultationsCount || 0}\n`;
        text += `• Документов обработано: ${userState.documentsCount || 0}\n`;
        text += `• Компаний проверено: ${userState.checksCount || 0}\n`;
        text += `• Последняя активность: ${new Date(userState.lastActivity).toLocaleString()}\n\n`;
        
        text += `🎯 <b>Использование меню:</b>\n`;
        const topMenus = Array.from(stats.views.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        topMenus.forEach(([menu, count]) => {
            text += `• ${this.getMenuTitle(menu)}: ${count} раз\n`;
        });
        
        return {
            text,
            reply_markup: {
                inline_keyboard: [[
                    { text: '📊 Аналитика', callback_data: 'analytics_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            },
            parse_mode: 'HTML'
        };
    }

    // Обработчики меню
    async handleMainMenu(callbackQuery, context) {
        const { from } = callbackQuery;
        const userId = from.id;
        
        const menu = this.menuSystem.getMenu(userId, 'main');
        
        return {
            text: menu.text,
            reply_markup: {
                inline_keyboard: menu.buttons
            },
            parse_mode: 'HTML'
        };
    }

    async handleConsultationMenu(callbackQuery, context) {
        const { from } = callbackQuery;
        const userId = from.id;
        
        const menu = this.menuSystem.getMenu(userId, 'consultation_menu');
        
        return {
            text: menu.text,
            reply_markup: {
                inline_keyboard: menu.buttons
            },
            parse_mode: 'HTML'
        };
    }

    // Обработчики консультаций
    async handleCorporateConsultation(callbackQuery, context) {
        const { from } = callbackQuery;
        const userId = from.id;
        
        // Устанавливаем состояние ожидания вопроса
        this.updateUserState(userId, {
            waitingFor: 'corporate_question',
            consultationType: 'corporate'
        });
        
        return {
            text: `🏢 <b>Корпоративное право</b>\n\n` +
                  `Опишите вашу ситуацию или задайте вопрос по корпоративному праву.\n\n` +
                  `<i>Например:</i>\n` +
                  `• Вопросы создания и регистрации ООО\n` +
                  `• Корпоративные споры и конфликты\n` +
                  `• Реорганизация и ликвидация компаний\n` +
                  `• Сделки M&A\n` +
                  `• Корпоративное управление`,
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Назад к консультациям', callback_data: 'consultation_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            },
            parse_mode: 'HTML'
        };
    }

    async handleGeneralConsultation(message, context) {
        const { text, from } = message;
        const userId = from.id;
        
        try {
            // Отправляем индикатор печати
            await this.sendChatAction(userId, 'typing');
            
            // Получаем ответ от AI
            const aiResponse = await this.aiEngine.getConsultation(text, {
                userId,
                specialty: 'general',
                context: this.getUserState(userId)
            });
            
            // Обновляем статистику
            this.updateUserState(userId, {
                consultationsCount: (this.getUserState(userId).consultationsCount || 0) + 1,
                lastConsultation: Date.now()
            });
            
            return {
                text: `🤖 <b>Юридическая консультация:</b>\n\n${aiResponse}`,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '💬 Задать еще вопрос', callback_data: 'consultation_menu' },
                        { text: '📄 Создать документ', callback_data: 'doc_create' }
                    ], [
                        { text: '🏠 Главное меню', callback_data: 'main' }
                    ]]
                },
                parse_mode: 'HTML'
            };
            
        } catch (error) {
            console.error('Error in general consultation:', error);
            return {
                text: '❌ Извините, временные технические проблемы. Попробуйте позже.',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Попробовать снова', callback_data: 'consult_general' },
                        { text: '🏠 Главное меню', callback_data: 'main' }
                    ]]
                }
            };
        }
    }

    // Обработчик ввода ИНН
    async handleINNInput(message, context) {
        const { text, from } = message;
        const userId = from.id;
        
        try {
            await this.sendChatAction(userId, 'typing');
            
            // Проверяем ИНН через DaData
            const companyInfo = await this.assistantTools.checkCompanyByINN(text);
            
            if (companyInfo.success) {
                const company = companyInfo.data;
                
                let responseText = `🏢 <b>Информация о компании</b>\n\n`;
                responseText += `<b>Название:</b> ${company.name}\n`;
                responseText += `<b>ИНН:</b> ${company.inn}\n`;
                responseText += `<b>ОГРН:</b> ${company.ogrn || 'Не указан'}\n`;
                responseText += `<b>Статус:</b> ${company.status}\n`;
                responseText += `<b>Адрес:</b> ${company.address}\n`;
                
                if (company.director) {
                    responseText += `<b>Руководитель:</b> ${company.director}\n`;
                }
                
                // Обновляем статистику
                this.updateUserState(userId, {
                    checksCount: (this.getUserState(userId).checksCount || 0) + 1
                });
                
                return {
                    text: responseText,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📊 Подробная проверка', callback_data: `detailed_check_${text}` },
                            { text: '⚖️ Судебные дела', callback_data: `court_cases_${text}` }
                        ], [
                            { text: '🔍 Проверить другую компанию', callback_data: 'check_inn_form' },
                            { text: '🏠 Главное меню', callback_data: 'main' }
                        ]]
                    },
                    parse_mode: 'HTML'
                };
            } else {
                return {
                    text: `❌ Не удалось найти информацию по ИНН: ${text}\n\nПроверьте правильность ввода.`,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔄 Попробовать снова', callback_data: 'check_inn_form' },
                            { text: '🏠 Главное меню', callback_data: 'main' }
                        ]]
                    }
                };
            }
            
        } catch (error) {
            console.error('Error checking INN:', error);
            return {
                text: '❌ Ошибка при проверке ИНН. Попробуйте позже.',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Попробовать снова', callback_data: 'check_inn_form' },
                        { text: '🏠 Главное меню', callback_data: 'main' }
                    ]]
                }
            };
        }
    }

    // Обработчик проверки ИНН
    async handleCheckINN(callbackQuery, context) {
        const { from } = callbackQuery;
        const userId = from.id;
        
        // Устанавливаем состояние ожидания ИНН
        this.updateUserState(userId, {
            waitingFor: 'inn_input'
        });
        
        return {
            text: `🔍 <b>Проверка компании по ИНН</b>\n\n` +
                  `Отправьте ИНН компании (10 или 12 цифр) для получения подробной информации.\n\n` +
                  `<i>Например:</i> 7707083893`,
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔙 Назад к проверкам', callback_data: 'checks_menu' },
                    { text: '🏠 Главное меню', callback_data: 'main' }
                ]]
            },
            parse_mode: 'HTML'
        };
    }

    // Middleware функции
    async applyMiddleware(message) {
        const context = {
            message,
            continue: true,
            response: null,
            userId: message.from?.id || message.userId,
            timestamp: Date.now()
        };
        
        for (const middleware of this.middleware) {
            await middleware(context);
            if (!context.continue) {
                break;
            }
        }
        
        return context;
    }

    async loggingMiddleware(context) {
        const { message, userId } = context;
        console.log(`[${new Date().toISOString()}] User ${userId}: ${message.text || message.data || 'non-text message'}`);
    }

    async authMiddleware(context) {
        // Простая аутентификация - можно расширить
        const { userId } = context;
        if (!userId) {
            context.continue = false;
            context.response = { text: '❌ Ошибка аутентификации' };
        }
    }

    async rateLimitMiddleware(context) {
        const { userId } = context;
        const now = Date.now();
        const userState = this.getUserState(userId);
        
        // Проверяем rate limit (30 сообщений в минуту)
        if (!userState.rateLimitWindow) {
            userState.rateLimitWindow = { start: now, count: 0 };
        }
        
        if (now - userState.rateLimitWindow.start > 60000) {
            userState.rateLimitWindow = { start: now, count: 0 };
        }
        
        userState.rateLimitWindow.count++;
        
        if (userState.rateLimitWindow.count > 30) {
            context.continue = false;
            context.response = {
                text: '⏱️ Слишком много запросов. Подождите минуту.',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🏠 Главное меню', callback_data: 'main' }
                    ]]
                }
            };
        }
    }

    async validationMiddleware(context) {
        // Валидация входящих данных
        const { message } = context;
        
        if (message.text && message.text.length > 4000) {
            context.continue = false;
            context.response = {
                text: '❌ Сообщение слишком длинное. Максимум 4000 символов.',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🏠 Главное меню', callback_data: 'main' }
                    ]]
                }
            };
        }
    }

    async metricsMiddleware(context) {
        // Обновляем метрики
        this.metrics.messagesProcessed++;
        
        const handlerType = this.getHandlerType(context.message);
        const current = this.metrics.handlerUsage.get(handlerType) || 0;
        this.metrics.handlerUsage.set(handlerType, current + 1);
    }

    // Вспомогательные методы
    registerTextHandler(command, handler) {
        this.handlers.text.set(command, handler);
    }

    registerCallbackHandler(data, handler) {
        this.handlers.callback.set(data, handler);
    }

    registerDocumentHandler(type, handler) {
        this.handlers.document.set(type, handler);
    }

    registerPhotoHandler(type, handler) {
        this.handlers.photo.set(type, handler);
    }

    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    getUserState(userId) {
        if (!this.userStates.has(userId)) {
            this.userStates.set(userId, {
                firstName: '',
                lastName: '',
                username: '',
                registrationDate: Date.now(),
                lastActivity: Date.now(),
                consultationsCount: 0,
                documentsCount: 0,
                checksCount: 0,
                level: 'beginner',
                preferences: {},
                waitingFor: null,
                rateLimitWindow: null
            });
        }
        return this.userStates.get(userId);
    }

    updateUserState(userId, updates) {
        const currentState = this.getUserState(userId);
        const newState = { ...currentState, ...updates, lastActivity: Date.now() };
        this.userStates.set(userId, newState);
    }

    initializeUser(userId, userInfo) {
        const existingState = this.userStates.get(userId);
        if (!existingState) {
            this.userStates.set(userId, {
                firstName: userInfo.first_name || '',
                lastName: userInfo.last_name || '',
                username: userInfo.username || '',
                registrationDate: Date.now(),
                lastActivity: Date.now(),
                consultationsCount: 0,
                documentsCount: 0,
                checksCount: 0,
                level: 'beginner',
                preferences: {},
                waitingFor: null,
                rateLimitWindow: null
            });
        } else {
            // Обновляем информацию о пользователе
            this.updateUserState(userId, {
                firstName: userInfo.first_name || existingState.firstName,
                lastName: userInfo.last_name || existingState.lastName,
                username: userInfo.username || existingState.username
            });
        }
    }

    isINN(text) {
        return /^\d{10}$|^\d{12}$/.test(text.trim());
    }

    isOGRN(text) {
        return /^\d{13}$|^\d{15}$/.test(text.trim());
    }

    getFileExtension(filename) {
        if (!filename) return 'unknown';
        const ext = filename.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) {
            return 'image';
        }
        
        return ext;
    }

    getHandlerType(message) {
        if (message.text) return 'text';
        if (message.document) return 'document';
        if (message.photo) return 'photo';
        if (message.voice) return 'voice';
        if (message.contact) return 'contact';
        if (message.location) return 'location';
        return 'unknown';
    }

    getUserLevelText(level) {
        const levels = {
            beginner: '🌱 Новичок',
            intermediate: '🌿 Опытный',
            expert: '🌳 Эксперт'
        };
        return levels[level] || '❓ Неизвестно';
    }

    getMenuTitle(menuId) {
        const titles = {
            main: 'Главное меню',
            consultation_menu: 'Консультации',
            documents_menu: 'Документы',
            checks_menu: 'Проверки',
            services_menu: 'Услуги',
            analytics_menu: 'Аналитика',
            settings_menu: 'Настройки',
            help_menu: 'Помощь'
        };
        return titles[menuId] || menuId;
    }

    async sendChatAction(userId, action) {
        try {
            await this.bot.sendChatAction(userId, action);
        } catch (error) {
            console.error('Error sending chat action:', error);
        }
    }

    updateMetrics(startTime, success) {
        const responseTime = Date.now() - startTime;
        
        if (success) {
            // Обновляем среднее время ответа
            const current = this.metrics.averageResponseTime;
            const count = this.metrics.messagesProcessed;
            this.metrics.averageResponseTime = (current * (count - 1) + responseTime) / count;
        } else {
            this.metrics.errorsCount++;
        }
    }

    getErrorResponse(error) {
        return {
            text: '❌ Произошла ошибка при обработке запроса. Попробуйте позже.',
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔄 Попробовать снова', callback_data: 'main' },
                    { text: '🆘 Помощь', callback_data: 'help_menu' }
                ]]
            }
        };
    }

    // Получение статистики обработчика
    getHandlerStatistics() {
        return {
            messagesProcessed: this.metrics.messagesProcessed,
            errorsCount: this.metrics.errorsCount,
            errorRate: this.metrics.errorsCount / this.metrics.messagesProcessed,
            averageResponseTime: this.metrics.averageResponseTime,
            handlerUsage: Object.fromEntries(this.metrics.handlerUsage),
            activeUsers: this.userStates.size
        };
    }
}

module.exports = UnifiedMessageHandler;

