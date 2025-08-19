// Webhook Manager for Eva Lawyer Bot
// Advanced webhook management system for external integrations

class WebhookManager {
    constructor() {
        this.webhooks = new Map(); // webhookId -> webhook config
        this.handlers = new Map(); // event -> handler function
        this.eventQueue = [];
        this.isProcessingQueue = false;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.secretKey = process.env.WEBHOOK_SECRET || 'eva_webhook_secret_2024';
        
        this.initializeHandlers();
        this.startQueueProcessor();
    }

    // Инициализация обработчиков событий
    initializeHandlers() {
        // Обработчик обновлений законодательства
        this.addHandler('law_update', async (data) => {
            console.log('Processing law update:', data);
            // Здесь будет логика обработки обновлений законодательства
            return { success: true, processed: true };
        });

        // Обработчик изменений в ЕГРЮЛ
        this.addHandler('egrul_update', async (data) => {
            console.log('Processing EGRUL update:', data);
            // Здесь будет логика обработки изменений в ЕГРЮЛ
            return { success: true, processed: true };
        });

        // Обработчик новых арбитражных дел
        this.addHandler('arbitr_case', async (data) => {
            console.log('Processing arbitration case:', data);
            // Здесь будет логика обработки новых арбитражных дел
            return { success: true, processed: true };
        });

        // Обработчик уведомлений о банкротстве
        this.addHandler('bankruptcy_notice', async (data) => {
            console.log('Processing bankruptcy notice:', data);
            // Здесь будет логика обработки уведомлений о банкротстве
            return { success: true, processed: true };
        });

        // Обработчик системных событий
        this.addHandler('system_event', async (data) => {
            console.log('Processing system event:', data);
            return { success: true, processed: true };
        });
    }

    // Регистрация webhook
    registerWebhook(config) {
        const webhookId = this.generateId();
        const webhook = {
            id: webhookId,
            url: config.url,
            events: config.events || [],
            secret: config.secret || this.generateSecret(),
            active: config.active !== false,
            created_at: Date.now(),
            last_triggered: null,
            trigger_count: 0,
            retry_config: {
                max_attempts: config.retryAttempts || 3,
                delay: config.retryDelay || 1000,
                backoff: config.backoffMultiplier || 2
            },
            headers: config.headers || {},
            timeout: config.timeout || 30000
        };

        this.webhooks.set(webhookId, webhook);
        return webhook;
    }

    // Удаление webhook
    unregisterWebhook(webhookId) {
        return this.webhooks.delete(webhookId);
    }

    // Получение webhook
    getWebhook(webhookId) {
        return this.webhooks.get(webhookId);
    }

    // Получение всех webhook
    getAllWebhooks() {
        return Array.from(this.webhooks.values());
    }

    // Обновление webhook
    updateWebhook(webhookId, updates) {
        const webhook = this.webhooks.get(webhookId);
        if (webhook) {
            Object.assign(webhook, updates, { updated_at: Date.now() });
            this.webhooks.set(webhookId, webhook);
            return webhook;
        }
        return null;
    }

    // Добавление обработчика события
    addHandler(event, handler) {
        this.handlers.set(event, handler);
    }

    // Удаление обработчика события
    removeHandler(event) {
        return this.handlers.delete(event);
    }

    // Обработка входящего webhook
    async processIncomingWebhook(request) {
        try {
            // Проверяем подпись
            if (!this.verifySignature(request)) {
                return {
                    success: false,
                    error: 'Invalid signature',
                    status: 401
                };
            }

            // Парсим данные
            const data = typeof request.body === 'string' ? 
                JSON.parse(request.body) : request.body;

            // Определяем тип события
            const eventType = data.event || data.type || 'unknown';

            // Добавляем в очередь обработки
            const eventData = {
                id: this.generateId(),
                type: eventType,
                data: data,
                received_at: Date.now(),
                status: 'pending',
                attempts: 0,
                source_ip: request.ip || 'unknown'
            };

            this.addToEventQueue(eventData);

            return {
                success: true,
                eventId: eventData.id,
                status: 200
            };

        } catch (error) {
            console.error('Webhook processing error:', error);
            return {
                success: false,
                error: error.message,
                status: 500
            };
        }
    }

    // Отправка исходящего webhook
    async sendWebhook(webhookId, eventType, data) {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook || !webhook.active) {
            return { success: false, error: 'Webhook not found or inactive' };
        }

        // Проверяем, подписан ли webhook на это событие
        if (webhook.events.length > 0 && !webhook.events.includes(eventType)) {
            return { success: false, error: 'Webhook not subscribed to this event' };
        }

        const payload = {
            event: eventType,
            data: data,
            timestamp: Date.now(),
            webhook_id: webhookId
        };

        // Добавляем подпись
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
            'X-Webhook-ID': webhookId,
            ...webhook.headers
        };

        for (let attempt = 1; attempt <= webhook.retry_config.max_attempts; attempt++) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload),
                    timeout: webhook.timeout
                });

                if (response.ok) {
                    // Обновляем статистику webhook
                    webhook.last_triggered = Date.now();
                    webhook.trigger_count++;
                    this.webhooks.set(webhookId, webhook);

                    return {
                        success: true,
                        status: response.status,
                        attempt: attempt
                    };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (error) {
                console.error(`Webhook ${webhookId} attempt ${attempt} failed:`, error);

                if (attempt === webhook.retry_config.max_attempts) {
                    return {
                        success: false,
                        error: error.message,
                        attempts: attempt
                    };
                }

                // Ждем перед повторной попыткой
                const delay = webhook.retry_config.delay * 
                    Math.pow(webhook.retry_config.backoff, attempt - 1);
                await this.sleep(delay);
            }
        }
    }

    // Массовая отправка webhook
    async broadcastWebhook(eventType, data, filter = null) {
        const webhooks = Array.from(this.webhooks.values())
            .filter(webhook => {
                if (!webhook.active) return false;
                if (webhook.events.length > 0 && !webhook.events.includes(eventType)) return false;
                if (filter && !filter(webhook)) return false;
                return true;
            });

        const results = [];
        for (const webhook of webhooks) {
            const result = await this.sendWebhook(webhook.id, eventType, data);
            results.push({
                webhookId: webhook.id,
                url: webhook.url,
                ...result
            });
        }

        return results;
    }

    // Добавление события в очередь
    addToEventQueue(eventData) {
        this.eventQueue.push(eventData);
    }

    // Обработчик очереди событий
    startQueueProcessor() {
        setInterval(async () => {
            if (!this.isProcessingQueue && this.eventQueue.length > 0) {
                this.isProcessingQueue = true;
                await this.processEventQueue();
                this.isProcessingQueue = false;
            }
        }, 1000);
    }

    // Обработка очереди событий
    async processEventQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            
            try {
                const handler = this.handlers.get(event.type);
                
                if (handler) {
                    const result = await handler(event.data);
                    event.status = result.success ? 'processed' : 'failed';
                    event.result = result;
                } else {
                    event.status = 'no_handler';
                    event.result = { success: false, error: 'No handler found' };
                }

                event.processed_at = Date.now();

            } catch (error) {
                console.error('Event processing error:', error);
                event.status = 'error';
                event.result = { success: false, error: error.message };
                event.processed_at = Date.now();
            }

            // Небольшая задержка между обработкой событий
            await this.sleep(100);
        }
    }

    // Проверка подписи webhook
    verifySignature(request) {
        const signature = request.headers['x-webhook-signature'] || 
                         request.headers['X-Webhook-Signature'];
        
        if (!signature) {
            return false;
        }

        const body = typeof request.body === 'string' ? 
            request.body : JSON.stringify(request.body);
        
        const expectedSignature = this.generateSignature(body, this.secretKey);
        
        return signature === expectedSignature;
    }

    // Генерация подписи
    generateSignature(payload, secret) {
        const crypto = require('crypto');
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    // Генерация секретного ключа
    generateSecret() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    // Тестирование webhook
    async testWebhook(webhookId) {
        const testData = {
            test: true,
            message: 'This is a test webhook',
            timestamp: Date.now()
        };

        return await this.sendWebhook(webhookId, 'test', testData);
    }

    // Получение статистики webhook
    getWebhookStats(webhookId = null) {
        if (webhookId) {
            const webhook = this.webhooks.get(webhookId);
            return webhook ? {
                id: webhook.id,
                url: webhook.url,
                active: webhook.active,
                trigger_count: webhook.trigger_count,
                last_triggered: webhook.last_triggered,
                created_at: webhook.created_at
            } : null;
        }

        const webhooks = Array.from(this.webhooks.values());
        return {
            total_webhooks: webhooks.length,
            active_webhooks: webhooks.filter(w => w.active).length,
            total_triggers: webhooks.reduce((sum, w) => sum + w.trigger_count, 0),
            webhooks: webhooks.map(w => ({
                id: w.id,
                url: w.url,
                active: w.active,
                trigger_count: w.trigger_count,
                last_triggered: w.last_triggered
            }))
        };
    }

    // Получение логов событий
    getEventLogs(limit = 100, eventType = null) {
        // В реальной реализации это будет работать с базой данных
        return {
            events: [],
            total: 0,
            limit,
            eventType
        };
    }

    // Очистка старых логов
    cleanupOldLogs(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 дней
        // В реальной реализации это будет очищать базу данных
        return { cleaned: 0 };
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Экспорт конфигурации webhook
    exportWebhookConfig(webhookId) {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook) return null;

        return {
            url: webhook.url,
            events: webhook.events,
            headers: webhook.headers,
            timeout: webhook.timeout,
            retry_config: webhook.retry_config
        };
    }

    // Импорт конфигурации webhook
    importWebhookConfig(config) {
        return this.registerWebhook(config);
    }
}

module.exports = WebhookManager;

