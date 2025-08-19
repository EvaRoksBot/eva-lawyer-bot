// Notification System for Eva Lawyer Bot
// Advanced notification and messaging system with scheduling and templates

class NotificationSystem {
    constructor() {
        this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        this.notifications = new Map(); // notificationId -> notification data
        this.scheduledNotifications = new Map(); // scheduleId -> timeout
        this.templates = new Map(); // templateId -> template
        this.userPreferences = new Map(); // userId -> preferences
        this.deliveryQueue = [];
        this.isProcessingQueue = false;
        
        this.initializeTemplates();
        this.startQueueProcessor();
    }

    // Инициализация шаблонов уведомлений
    initializeTemplates() {
        // Шаблон напоминания о проверке договора
        this.addTemplate('contract_reminder', {
            title: '📄 Напоминание о проверке договора',
            message: `Здравствуйте! 

Напоминаем, что у вас есть договор, который требует проверки:
📋 **Договор:** {{contract_name}}
📅 **Дата загрузки:** {{upload_date}}
⏰ **Срок проверки:** {{deadline}}

Рекомендуем завершить анализ в ближайшее время.`,
            buttons: [
                { text: '📄 Открыть договор', callback_data: 'eva:contracts:open:{{contract_id}}' },
                { text: '⏰ Отложить на час', callback_data: 'eva:remind:postpone:1h' }
            ]
        });

        // Шаблон уведомления о новых изменениях в законодательстве
        this.addTemplate('law_update', {
            title: '⚖️ Обновление законодательства',
            message: `📢 **Важные изменения в законодательстве**

{{law_title}}

📅 **Дата вступления в силу:** {{effective_date}}
📋 **Краткое описание:** {{description}}

Рекомендуем ознакомиться с изменениями и оценить их влияние на вашу деятельность.`,
            buttons: [
                { text: '📖 Подробнее', callback_data: 'eva:law:details:{{law_id}}' },
                { text: '📊 Анализ влияния', callback_data: 'eva:law:analyze:{{law_id}}' }
            ]
        });

        // Шаблон отчета о проверке контрагента
        this.addTemplate('counterparty_report', {
            title: '🔍 Отчет о проверке контрагента',
            message: `✅ **Проверка контрагента завершена**

🏢 **Организация:** {{company_name}}
🆔 **ИНН:** {{inn}}
📊 **Уровень риска:** {{risk_level}}
⭐ **Оценка:** {{score}}/100

{{risk_summary}}`,
            buttons: [
                { text: '📄 Полный отчет', callback_data: 'eva:report:full:{{report_id}}' },
                { text: '📤 Экспорт PDF', callback_data: 'eva:report:export:{{report_id}}' }
            ]
        });

        // Шаблон еженедельного отчета
        this.addTemplate('weekly_report', {
            title: '📊 Еженедельный отчет активности',
            message: `📈 **Ваша активность за неделю**

📄 **Проверено договоров:** {{contracts_count}}
🔍 **Проверено контрагентов:** {{counterparties_count}}
💬 **Консультаций получено:** {{consultations_count}}
⏱️ **Время использования:** {{usage_time}}

{{top_features}}`,
            buttons: [
                { text: '📊 Детальная статистика', callback_data: 'eva:stats:detailed' },
                { text: '⚙️ Настройки отчетов', callback_data: 'eva:settings:reports' }
            ]
        });

        // Шаблон системного уведомления
        this.addTemplate('system_notification', {
            title: '🔔 Системное уведомление',
            message: `{{message}}`,
            buttons: []
        });
    }

    // Добавление шаблона
    addTemplate(templateId, template) {
        this.templates.set(templateId, {
            id: templateId,
            ...template,
            created_at: Date.now()
        });
    }

    // Получение шаблона
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }

    // Отправка уведомления
    async sendNotification(userId, templateId, variables = {}, options = {}) {
        try {
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            // Проверяем предпочтения пользователя
            const preferences = this.getUserPreferences(userId);
            if (!this.shouldSendNotification(templateId, preferences)) {
                return { success: false, reason: 'User preferences' };
            }

            // Подставляем переменные в шаблон
            const notification = this.renderTemplate(template, variables);
            
            // Создаем уведомление
            const notificationData = {
                id: this.generateId(),
                userId,
                templateId,
                title: notification.title,
                message: notification.message,
                buttons: notification.buttons,
                variables,
                created_at: Date.now(),
                status: 'pending',
                attempts: 0,
                max_attempts: options.maxAttempts || 3,
                priority: options.priority || 'normal'
            };

            // Добавляем в очередь
            this.addToQueue(notificationData);
            
            return { success: true, notificationId: notificationData.id };

        } catch (error) {
            console.error('Send notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Планирование уведомления
    scheduleNotification(userId, templateId, variables, scheduleTime, options = {}) {
        const scheduleId = this.generateId();
        const delay = scheduleTime - Date.now();
        
        if (delay <= 0) {
            // Отправляем немедленно
            return this.sendNotification(userId, templateId, variables, options);
        }

        const timeout = setTimeout(async () => {
            await this.sendNotification(userId, templateId, variables, options);
            this.scheduledNotifications.delete(scheduleId);
        }, delay);

        this.scheduledNotifications.set(scheduleId, {
            timeout,
            userId,
            templateId,
            variables,
            scheduleTime,
            options
        });

        return { success: true, scheduleId };
    }

    // Отмена запланированного уведомления
    cancelScheduledNotification(scheduleId) {
        const scheduled = this.scheduledNotifications.get(scheduleId);
        if (scheduled) {
            clearTimeout(scheduled.timeout);
            this.scheduledNotifications.delete(scheduleId);
            return true;
        }
        return false;
    }

    // Рендеринг шаблона с переменными
    renderTemplate(template, variables) {
        let title = template.title;
        let message = template.message;
        let buttons = [...template.buttons];

        // Подставляем переменные
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            title = title.replace(new RegExp(placeholder, 'g'), value);
            message = message.replace(new RegExp(placeholder, 'g'), value);
            
            // Обрабатываем кнопки
            buttons = buttons.map(button => ({
                ...button,
                text: button.text.replace(new RegExp(placeholder, 'g'), value),
                callback_data: button.callback_data.replace(new RegExp(placeholder, 'g'), value)
            }));
        });

        return { title, message, buttons };
    }

    // Добавление в очередь доставки
    addToQueue(notification) {
        // Вставляем с учетом приоритета
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priority = priorityOrder[notification.priority] || 1;
        
        let insertIndex = this.deliveryQueue.length;
        for (let i = 0; i < this.deliveryQueue.length; i++) {
            const queuePriority = priorityOrder[this.deliveryQueue[i].priority] || 1;
            if (priority < queuePriority) {
                insertIndex = i;
                break;
            }
        }
        
        this.deliveryQueue.splice(insertIndex, 0, notification);
        this.notifications.set(notification.id, notification);
    }

    // Обработчик очереди
    startQueueProcessor() {
        setInterval(async () => {
            if (!this.isProcessingQueue && this.deliveryQueue.length > 0) {
                this.isProcessingQueue = true;
                await this.processQueue();
                this.isProcessingQueue = false;
            }
        }, 1000); // Проверяем каждую секунду
    }

    // Обработка очереди
    async processQueue() {
        while (this.deliveryQueue.length > 0) {
            const notification = this.deliveryQueue.shift();
            
            try {
                const result = await this.deliverNotification(notification);
                
                if (result.success) {
                    notification.status = 'delivered';
                    notification.delivered_at = Date.now();
                } else {
                    notification.attempts++;
                    
                    if (notification.attempts < notification.max_attempts) {
                        // Возвращаем в очередь с задержкой
                        setTimeout(() => {
                            this.addToQueue(notification);
                        }, 5000 * notification.attempts); // Увеличиваем задержку
                    } else {
                        notification.status = 'failed';
                        notification.failed_at = Date.now();
                        notification.error = result.error;
                    }
                }
                
                this.notifications.set(notification.id, notification);
                
            } catch (error) {
                console.error('Queue processing error:', error);
                notification.status = 'error';
                notification.error = error.message;
                this.notifications.set(notification.id, notification);
            }
            
            // Небольшая задержка между отправками
            await this.sleep(500);
        }
    }

    // Доставка уведомления
    async deliverNotification(notification) {
        try {
            const keyboard = notification.buttons.length > 0 ? {
                inline_keyboard: [notification.buttons]
            } : undefined;

            const response = await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: notification.userId,
                    text: `${notification.title}\n\n${notification.message}`,
                    reply_markup: keyboard,
                    parse_mode: 'Markdown'
                })
            });

            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Управление предпочтениями пользователя
    setUserPreferences(userId, preferences) {
        this.userPreferences.set(userId, {
            ...this.getUserPreferences(userId),
            ...preferences,
            updated_at: Date.now()
        });
    }

    getUserPreferences(userId) {
        return this.userPreferences.get(userId) || {
            contract_reminders: true,
            law_updates: true,
            counterparty_reports: true,
            weekly_reports: true,
            system_notifications: true,
            quiet_hours: { start: 22, end: 8 },
            timezone: 'Europe/Moscow'
        };
    }

    // Проверка, нужно ли отправлять уведомление
    shouldSendNotification(templateId, preferences) {
        // Проверяем общие настройки
        const templatePreference = preferences[templateId.replace('_', '_')];
        if (templatePreference === false) {
            return false;
        }

        // Проверяем тихие часы
        if (preferences.quiet_hours) {
            const now = new Date();
            const hour = now.getHours();
            const { start, end } = preferences.quiet_hours;
            
            if (start > end) { // Переход через полночь
                if (hour >= start || hour < end) {
                    return false;
                }
            } else {
                if (hour >= start && hour < end) {
                    return false;
                }
            }
        }

        return true;
    }

    // Массовая отправка уведомлений
    async broadcastNotification(userIds, templateId, variables = {}, options = {}) {
        const results = [];
        
        for (const userId of userIds) {
            const result = await this.sendNotification(userId, templateId, variables, options);
            results.push({ userId, ...result });
            
            // Небольшая задержка между отправками
            await this.sleep(100);
        }
        
        return results;
    }

    // Получение статистики уведомлений
    getNotificationStats(userId = null) {
        const notifications = Array.from(this.notifications.values());
        const filtered = userId ? notifications.filter(n => n.userId === userId) : notifications;
        
        const stats = {
            total: filtered.length,
            delivered: filtered.filter(n => n.status === 'delivered').length,
            pending: filtered.filter(n => n.status === 'pending').length,
            failed: filtered.filter(n => n.status === 'failed').length,
            by_template: {}
        };
        
        // Статистика по шаблонам
        filtered.forEach(notification => {
            const template = notification.templateId;
            if (!stats.by_template[template]) {
                stats.by_template[template] = { total: 0, delivered: 0, failed: 0 };
            }
            stats.by_template[template].total++;
            if (notification.status === 'delivered') {
                stats.by_template[template].delivered++;
            } else if (notification.status === 'failed') {
                stats.by_template[template].failed++;
            }
        });
        
        return stats;
    }

    // Очистка старых уведомлений
    cleanupOldNotifications(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 дней
        const cutoff = Date.now() - maxAge;
        let cleaned = 0;
        
        for (const [id, notification] of this.notifications.entries()) {
            if (notification.created_at < cutoff) {
                this.notifications.delete(id);
                cleaned++;
            }
        }
        
        return cleaned;
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Получение всех шаблонов
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    // Получение запланированных уведомлений
    getScheduledNotifications(userId = null) {
        const scheduled = Array.from(this.scheduledNotifications.values());
        return userId ? scheduled.filter(s => s.userId === userId) : scheduled;
    }
}

module.exports = NotificationSystem;

