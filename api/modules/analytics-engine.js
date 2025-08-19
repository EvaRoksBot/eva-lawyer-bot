// Analytics Engine for Eva Lawyer Bot
// Advanced analytics, reporting, and data visualization system

class AnalyticsEngine {
    constructor() {
        this.metrics = new Map(); // metricId -> metric data
        this.events = new Map(); // eventId -> event data
        this.reports = new Map(); // reportId -> report config
        this.dashboards = new Map(); // dashboardId -> dashboard config
        this.userMetrics = new Map(); // userId -> user metrics
        this.aggregatedData = new Map(); // aggregation key -> aggregated data
        
        this.eventBuffer = [];
        this.isProcessingEvents = false;
        this.aggregationInterval = 5 * 60 * 1000; // 5 минут
        
        this.initializeMetrics();
        this.initializeReports();
        this.initializeDashboards();
        this.startEventProcessor();
        this.startAggregationProcessor();
    }

    // Инициализация метрик
    initializeMetrics() {
        // Метрики использования
        this.addMetric('user_sessions', {
            name: 'Пользовательские сессии',
            type: 'counter',
            description: 'Количество активных сессий пользователей',
            unit: 'sessions',
            aggregations: ['sum', 'avg', 'max']
        });

        this.addMetric('messages_processed', {
            name: 'Обработанные сообщения',
            type: 'counter',
            description: 'Общее количество обработанных сообщений',
            unit: 'messages',
            aggregations: ['sum', 'rate']
        });

        this.addMetric('documents_analyzed', {
            name: 'Проанализированные документы',
            type: 'counter',
            description: 'Количество проанализированных документов',
            unit: 'documents',
            aggregations: ['sum', 'rate']
        });

        this.addMetric('inn_checks_performed', {
            name: 'Проверки ИНН',
            type: 'counter',
            description: 'Количество выполненных проверок ИНН',
            unit: 'checks',
            aggregations: ['sum', 'rate']
        });

        this.addMetric('contracts_generated', {
            name: 'Сгенерированные договоры',
            type: 'counter',
            description: 'Количество сгенерированных договоров',
            unit: 'contracts',
            aggregations: ['sum', 'rate']
        });

        // Метрики производительности
        this.addMetric('response_time', {
            name: 'Время ответа',
            type: 'histogram',
            description: 'Время ответа на запросы пользователей',
            unit: 'ms',
            aggregations: ['avg', 'p50', 'p95', 'p99']
        });

        this.addMetric('ai_processing_time', {
            name: 'Время обработки AI',
            type: 'histogram',
            description: 'Время обработки запросов через AI',
            unit: 'ms',
            aggregations: ['avg', 'p50', 'p95', 'p99']
        });

        this.addMetric('document_processing_time', {
            name: 'Время обработки документов',
            type: 'histogram',
            description: 'Время обработки и анализа документов',
            unit: 'ms',
            aggregations: ['avg', 'p50', 'p95', 'p99']
        });

        // Метрики качества
        this.addMetric('user_satisfaction', {
            name: 'Удовлетворенность пользователей',
            type: 'gauge',
            description: 'Средняя оценка удовлетворенности пользователей',
            unit: 'rating',
            aggregations: ['avg', 'min', 'max']
        });

        this.addMetric('error_rate', {
            name: 'Частота ошибок',
            type: 'rate',
            description: 'Частота возникновения ошибок',
            unit: 'errors/min',
            aggregations: ['rate', 'sum']
        });

        // Бизнес-метрики
        this.addMetric('active_users', {
            name: 'Активные пользователи',
            type: 'gauge',
            description: 'Количество активных пользователей',
            unit: 'users',
            aggregations: ['sum', 'unique']
        });

        this.addMetric('feature_usage', {
            name: 'Использование функций',
            type: 'counter',
            description: 'Статистика использования различных функций',
            unit: 'uses',
            aggregations: ['sum', 'rate'],
            dimensions: ['feature_name', 'user_type']
        });
    }

    // Инициализация отчетов
    initializeReports() {
        // Ежедневный отчет активности
        this.addReport('daily_activity', {
            name: 'Ежедневный отчет активности',
            description: 'Сводка активности пользователей за день',
            schedule: 'daily',
            format: 'html',
            template: 'daily_activity_template',
            metrics: [
                'user_sessions',
                'messages_processed',
                'documents_analyzed',
                'inn_checks_performed',
                'active_users'
            ],
            charts: [
                {
                    type: 'line',
                    title: 'Активность по часам',
                    metrics: ['messages_processed'],
                    timeframe: '24h',
                    granularity: 'hour'
                },
                {
                    type: 'bar',
                    title: 'Использование функций',
                    metrics: ['feature_usage'],
                    dimensions: ['feature_name']
                }
            ]
        });

        // Еженедельный отчет производительности
        this.addReport('weekly_performance', {
            name: 'Еженедельный отчет производительности',
            description: 'Анализ производительности системы за неделю',
            schedule: 'weekly',
            format: 'pdf',
            template: 'performance_template',
            metrics: [
                'response_time',
                'ai_processing_time',
                'document_processing_time',
                'error_rate'
            ],
            charts: [
                {
                    type: 'line',
                    title: 'Время ответа',
                    metrics: ['response_time'],
                    aggregation: 'avg',
                    timeframe: '7d'
                },
                {
                    type: 'histogram',
                    title: 'Распределение времени обработки AI',
                    metrics: ['ai_processing_time']
                }
            ]
        });

        // Месячный бизнес-отчет
        this.addReport('monthly_business', {
            name: 'Месячный бизнес-отчет',
            description: 'Бизнес-метрики и аналитика за месяц',
            schedule: 'monthly',
            format: 'html',
            template: 'business_template',
            metrics: [
                'active_users',
                'user_satisfaction',
                'feature_usage',
                'contracts_generated'
            ],
            charts: [
                {
                    type: 'pie',
                    title: 'Распределение использования функций',
                    metrics: ['feature_usage'],
                    dimensions: ['feature_name']
                },
                {
                    type: 'line',
                    title: 'Рост активных пользователей',
                    metrics: ['active_users'],
                    timeframe: '30d'
                }
            ]
        });

        // Отчет по пользователю
        this.addReport('user_activity', {
            name: 'Отчет активности пользователя',
            description: 'Персональная статистика пользователя',
            schedule: 'on_demand',
            format: 'html',
            template: 'user_activity_template',
            user_specific: true,
            metrics: [
                'messages_processed',
                'documents_analyzed',
                'inn_checks_performed',
                'contracts_generated'
            ],
            charts: [
                {
                    type: 'timeline',
                    title: 'История активности',
                    metrics: ['messages_processed'],
                    timeframe: '30d'
                },
                {
                    type: 'donut',
                    title: 'Использование функций',
                    metrics: ['feature_usage'],
                    dimensions: ['feature_name']
                }
            ]
        });
    }

    // Инициализация дашбордов
    initializeDashboards() {
        // Основной дашборд
        this.addDashboard('main_dashboard', {
            name: 'Основной дашборд',
            description: 'Общий обзор системы',
            refresh_interval: 30000, // 30 секунд
            widgets: [
                {
                    type: 'metric_card',
                    title: 'Активные пользователи',
                    metric: 'active_users',
                    timeframe: '1h',
                    size: 'small'
                },
                {
                    type: 'metric_card',
                    title: 'Сообщений за час',
                    metric: 'messages_processed',
                    timeframe: '1h',
                    aggregation: 'sum',
                    size: 'small'
                },
                {
                    type: 'chart',
                    title: 'Активность в реальном времени',
                    chart_type: 'line',
                    metrics: ['messages_processed', 'documents_analyzed'],
                    timeframe: '6h',
                    granularity: '5m',
                    size: 'large'
                },
                {
                    type: 'chart',
                    title: 'Время ответа',
                    chart_type: 'area',
                    metrics: ['response_time'],
                    aggregation: 'avg',
                    timeframe: '1h',
                    size: 'medium'
                }
            ]
        });

        // Дашборд производительности
        this.addDashboard('performance_dashboard', {
            name: 'Дашборд производительности',
            description: 'Мониторинг производительности системы',
            refresh_interval: 10000, // 10 секунд
            widgets: [
                {
                    type: 'metric_card',
                    title: 'Среднее время ответа',
                    metric: 'response_time',
                    aggregation: 'avg',
                    timeframe: '5m',
                    size: 'small'
                },
                {
                    type: 'metric_card',
                    title: 'Частота ошибок',
                    metric: 'error_rate',
                    timeframe: '5m',
                    size: 'small'
                },
                {
                    type: 'chart',
                    title: 'Время обработки AI',
                    chart_type: 'histogram',
                    metrics: ['ai_processing_time'],
                    timeframe: '1h',
                    size: 'large'
                },
                {
                    type: 'chart',
                    title: 'Производительность по времени',
                    chart_type: 'line',
                    metrics: ['response_time', 'ai_processing_time'],
                    aggregation: 'p95',
                    timeframe: '24h',
                    size: 'large'
                }
            ]
        });

        // Пользовательский дашборд
        this.addDashboard('user_dashboard', {
            name: 'Пользовательский дашборд',
            description: 'Персональная статистика пользователя',
            user_specific: true,
            refresh_interval: 60000, // 1 минута
            widgets: [
                {
                    type: 'metric_card',
                    title: 'Всего запросов',
                    metric: 'messages_processed',
                    timeframe: 'all',
                    aggregation: 'sum',
                    size: 'small'
                },
                {
                    type: 'metric_card',
                    title: 'Документов проанализировано',
                    metric: 'documents_analyzed',
                    timeframe: 'all',
                    aggregation: 'sum',
                    size: 'small'
                },
                {
                    type: 'chart',
                    title: 'Ваша активность',
                    chart_type: 'calendar',
                    metrics: ['messages_processed'],
                    timeframe: '90d',
                    size: 'large'
                },
                {
                    type: 'chart',
                    title: 'Использование функций',
                    chart_type: 'pie',
                    metrics: ['feature_usage'],
                    dimensions: ['feature_name'],
                    timeframe: '30d',
                    size: 'medium'
                }
            ]
        });
    }

    // Добавление метрики
    addMetric(metricId, config) {
        this.metrics.set(metricId, {
            id: metricId,
            ...config,
            created_at: Date.now(),
            data_points: []
        });
    }

    // Добавление отчета
    addReport(reportId, config) {
        this.reports.set(reportId, {
            id: reportId,
            ...config,
            created_at: Date.now(),
            last_generated: null,
            generation_count: 0
        });
    }

    // Добавление дашборда
    addDashboard(dashboardId, config) {
        this.dashboards.set(dashboardId, {
            id: dashboardId,
            ...config,
            created_at: Date.now(),
            last_accessed: null,
            access_count: 0
        });
    }

    // Запись события
    recordEvent(eventType, data, userId = null) {
        const eventId = this.generateId();
        const event = {
            id: eventId,
            type: eventType,
            data,
            userId,
            timestamp: Date.now(),
            processed: false
        };

        this.eventBuffer.push(event);
        
        // Немедленная обработка критических событий
        if (this.isCriticalEvent(eventType)) {
            this.processEvent(event);
        }

        return eventId;
    }

    // Запись метрики
    recordMetric(metricId, value, tags = {}, userId = null) {
        const metric = this.metrics.get(metricId);
        if (!metric) {
            console.warn(`Metric ${metricId} not found`);
            return;
        }

        const dataPoint = {
            value,
            tags,
            userId,
            timestamp: Date.now()
        };

        metric.data_points.push(dataPoint);

        // Обновляем пользовательские метрики
        if (userId) {
            this.updateUserMetrics(userId, metricId, value, tags);
        }

        // Запускаем агрегацию если нужно
        this.scheduleAggregation(metricId);
    }

    // Обновление пользовательских метрик
    updateUserMetrics(userId, metricId, value, tags) {
        if (!this.userMetrics.has(userId)) {
            this.userMetrics.set(userId, {
                userId,
                metrics: new Map(),
                first_seen: Date.now(),
                last_seen: Date.now(),
                total_events: 0
            });
        }

        const userMetric = this.userMetrics.get(userId);
        userMetric.last_seen = Date.now();
        userMetric.total_events++;

        if (!userMetric.metrics.has(metricId)) {
            userMetric.metrics.set(metricId, {
                total: 0,
                count: 0,
                min: value,
                max: value,
                last_value: value,
                last_updated: Date.now()
            });
        }

        const metricData = userMetric.metrics.get(metricId);
        metricData.total += value;
        metricData.count++;
        metricData.min = Math.min(metricData.min, value);
        metricData.max = Math.max(metricData.max, value);
        metricData.last_value = value;
        metricData.last_updated = Date.now();
    }

    // Обработка событий
    startEventProcessor() {
        setInterval(async () => {
            if (!this.isProcessingEvents && this.eventBuffer.length > 0) {
                this.isProcessingEvents = true;
                await this.processEventBuffer();
                this.isProcessingEvents = false;
            }
        }, 1000);
    }

    async processEventBuffer() {
        const batchSize = 100;
        
        while (this.eventBuffer.length > 0) {
            const batch = this.eventBuffer.splice(0, batchSize);
            
            for (const event of batch) {
                try {
                    await this.processEvent(event);
                    event.processed = true;
                } catch (error) {
                    console.error('Event processing error:', error);
                }
            }
        }
    }

    async processEvent(event) {
        // Обновляем соответствующие метрики на основе события
        switch (event.type) {
            case 'user_message':
                this.recordMetric('messages_processed', 1, { type: 'user' }, event.userId);
                this.recordMetric('user_sessions', 1, {}, event.userId);
                break;
                
            case 'document_analyzed':
                this.recordMetric('documents_analyzed', 1, { 
                    document_type: event.data.document_type 
                }, event.userId);
                this.recordMetric('document_processing_time', event.data.processing_time, {}, event.userId);
                break;
                
            case 'inn_check':
                this.recordMetric('inn_checks_performed', 1, {
                    result: event.data.result ? 'success' : 'failure'
                }, event.userId);
                break;
                
            case 'contract_generated':
                this.recordMetric('contracts_generated', 1, {
                    template: event.data.template
                }, event.userId);
                break;
                
            case 'ai_response':
                this.recordMetric('ai_processing_time', event.data.processing_time, {
                    model: event.data.model
                }, event.userId);
                break;
                
            case 'response_time':
                this.recordMetric('response_time', event.data.time, {
                    endpoint: event.data.endpoint
                }, event.userId);
                break;
                
            case 'error':
                this.recordMetric('error_rate', 1, {
                    error_type: event.data.error_type
                }, event.userId);
                break;
                
            case 'feature_used':
                this.recordMetric('feature_usage', 1, {
                    feature_name: event.data.feature_name
                }, event.userId);
                break;
        }

        // Сохраняем событие
        this.events.set(event.id, event);
    }

    // Проверка критичности события
    isCriticalEvent(eventType) {
        const criticalEvents = ['error', 'system_failure', 'security_breach'];
        return criticalEvents.includes(eventType);
    }

    // Агрегация данных
    startAggregationProcessor() {
        setInterval(() => {
            this.performAggregation();
        }, this.aggregationInterval);
    }

    performAggregation() {
        const now = Date.now();
        const timeframes = ['5m', '1h', '1d', '7d', '30d'];
        
        for (const [metricId, metric] of this.metrics.entries()) {
            for (const timeframe of timeframes) {
                const timeframeMs = this.parseTimeframe(timeframe);
                const cutoff = now - timeframeMs;
                
                const relevantData = metric.data_points.filter(dp => dp.timestamp >= cutoff);
                
                if (relevantData.length > 0) {
                    const aggregated = this.aggregateData(relevantData, metric.aggregations);
                    
                    const aggregationKey = `${metricId}_${timeframe}`;
                    this.aggregatedData.set(aggregationKey, {
                        metricId,
                        timeframe,
                        data: aggregated,
                        updated_at: now,
                        data_points_count: relevantData.length
                    });
                }
            }
        }
    }

    // Агрегация данных
    aggregateData(dataPoints, aggregations) {
        const values = dataPoints.map(dp => dp.value);
        const result = {};

        for (const aggregation of aggregations) {
            switch (aggregation) {
                case 'sum':
                    result.sum = values.reduce((a, b) => a + b, 0);
                    break;
                case 'avg':
                    result.avg = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'min':
                    result.min = Math.min(...values);
                    break;
                case 'max':
                    result.max = Math.max(...values);
                    break;
                case 'count':
                    result.count = values.length;
                    break;
                case 'p50':
                    result.p50 = this.percentile(values, 0.5);
                    break;
                case 'p95':
                    result.p95 = this.percentile(values, 0.95);
                    break;
                case 'p99':
                    result.p99 = this.percentile(values, 0.99);
                    break;
                case 'rate':
                    const timeSpan = Math.max(...dataPoints.map(dp => dp.timestamp)) - 
                                   Math.min(...dataPoints.map(dp => dp.timestamp));
                    result.rate = (values.length / timeSpan) * 60000; // per minute
                    break;
                case 'unique':
                    const uniqueUsers = new Set(dataPoints.map(dp => dp.userId)).size;
                    result.unique = uniqueUsers;
                    break;
            }
        }

        return result;
    }

    // Вычисление перцентиля
    percentile(values, p) {
        const sorted = values.slice().sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[index];
    }

    // Генерация отчета
    async generateReport(reportId, options = {}) {
        const report = this.reports.get(reportId);
        if (!report) {
            throw new Error(`Report ${reportId} not found`);
        }

        const reportData = {
            id: this.generateId(),
            reportId,
            name: report.name,
            generated_at: Date.now(),
            timeframe: options.timeframe || '24h',
            userId: options.userId || null,
            data: {},
            charts: []
        };

        // Собираем данные метрик
        for (const metricId of report.metrics) {
            const metricData = await this.getMetricData(metricId, {
                timeframe: reportData.timeframe,
                userId: reportData.userId
            });
            reportData.data[metricId] = metricData;
        }

        // Генерируем графики
        for (const chartConfig of report.charts || []) {
            const chartData = await this.generateChartData(chartConfig, {
                timeframe: reportData.timeframe,
                userId: reportData.userId
            });
            reportData.charts.push(chartData);
        }

        // Обновляем статистику отчета
        report.last_generated = Date.now();
        report.generation_count++;

        return reportData;
    }

    // Получение данных метрики
    async getMetricData(metricId, options = {}) {
        const timeframe = options.timeframe || '1h';
        const userId = options.userId;
        
        const aggregationKey = `${metricId}_${timeframe}`;
        const aggregated = this.aggregatedData.get(aggregationKey);
        
        if (aggregated) {
            let data = aggregated.data;
            
            // Фильтрация по пользователю если нужно
            if (userId) {
                const userMetric = this.userMetrics.get(userId);
                if (userMetric && userMetric.metrics.has(metricId)) {
                    data = userMetric.metrics.get(metricId);
                }
            }
            
            return {
                metricId,
                timeframe,
                data,
                updated_at: aggregated.updated_at
            };
        }

        return null;
    }

    // Генерация данных для графика
    async generateChartData(chartConfig, options = {}) {
        const chartData = {
            type: chartConfig.type,
            title: chartConfig.title,
            data: [],
            labels: [],
            options: chartConfig.options || {}
        };

        // Здесь будет логика генерации данных для различных типов графиков
        // В зависимости от типа графика (line, bar, pie, etc.)
        
        return chartData;
    }

    // Получение дашборда
    getDashboard(dashboardId, userId = null) {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error(`Dashboard ${dashboardId} not found`);
        }

        // Проверяем права доступа для пользовательских дашбордов
        if (dashboard.user_specific && !userId) {
            throw new Error('User ID required for user-specific dashboard');
        }

        // Обновляем статистику доступа
        dashboard.last_accessed = Date.now();
        dashboard.access_count++;

        // Генерируем данные для виджетов
        const dashboardData = {
            ...dashboard,
            widgets: dashboard.widgets.map(widget => ({
                ...widget,
                data: this.generateWidgetData(widget, userId)
            }))
        };

        return dashboardData;
    }

    // Генерация данных для виджета
    generateWidgetData(widget, userId = null) {
        switch (widget.type) {
            case 'metric_card':
                return this.generateMetricCardData(widget, userId);
            case 'chart':
                return this.generateChartWidgetData(widget, userId);
            default:
                return {};
        }
    }

    // Генерация данных для карточки метрики
    generateMetricCardData(widget, userId) {
        const metricData = this.getMetricData(widget.metric, {
            timeframe: widget.timeframe,
            userId
        });

        if (!metricData) {
            return { value: 0, change: 0 };
        }

        const aggregation = widget.aggregation || 'sum';
        const value = metricData.data[aggregation] || 0;

        // Вычисляем изменение относительно предыдущего периода
        // Здесь будет логика сравнения с предыдущим периодом
        const change = 0; // Заглушка

        return {
            value,
            change,
            formatted_value: this.formatMetricValue(value, widget.metric),
            updated_at: metricData.updated_at
        };
    }

    // Генерация данных для графика виджета
    generateChartWidgetData(widget, userId) {
        // Здесь будет логика генерации данных для графиков
        return {
            labels: [],
            datasets: [],
            updated_at: Date.now()
        };
    }

    // Форматирование значения метрики
    formatMetricValue(value, metricId) {
        const metric = this.metrics.get(metricId);
        if (!metric) return value.toString();

        switch (metric.unit) {
            case 'ms':
                return `${Math.round(value)}ms`;
            case 'users':
                return value.toLocaleString();
            case 'messages':
                return value.toLocaleString();
            case 'rating':
                return `${value.toFixed(1)}/5`;
            default:
                return value.toString();
        }
    }

    // Экспорт данных
    async exportData(options = {}) {
        const exportData = {
            exported_at: new Date().toISOString(),
            timeframe: options.timeframe || '30d',
            format: options.format || 'json',
            data: {}
        };

        // Экспорт метрик
        if (options.includeMetrics !== false) {
            exportData.data.metrics = {};
            for (const [metricId, metric] of this.metrics.entries()) {
                const metricData = await this.getMetricData(metricId, options);
                if (metricData) {
                    exportData.data.metrics[metricId] = metricData;
                }
            }
        }

        // Экспорт событий
        if (options.includeEvents) {
            const timeframeMs = this.parseTimeframe(exportData.timeframe);
            const cutoff = Date.now() - timeframeMs;
            
            exportData.data.events = Array.from(this.events.values())
                .filter(event => event.timestamp >= cutoff)
                .map(event => ({
                    type: event.type,
                    timestamp: event.timestamp,
                    userId: event.userId,
                    data: event.data
                }));
        }

        return exportData;
    }

    // Планирование агрегации
    scheduleAggregation(metricId) {
        // Здесь можно добавить логику планирования агрегации
        // для конкретных метрик при необходимости
    }

    // Парсинг временного интервала
    parseTimeframe(timeframe) {
        const units = {
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000,
            'w': 7 * 24 * 60 * 60 * 1000
        };

        const match = timeframe.match(/^(\d+)([mhdw])$/);
        if (match) {
            const [, amount, unit] = match;
            return parseInt(amount) * units[unit];
        }

        return 60 * 60 * 1000; // 1 час по умолчанию
    }

    // Получение статистики системы
    getSystemStats() {
        return {
            metrics: this.metrics.size,
            events: this.events.size,
            reports: this.reports.size,
            dashboards: this.dashboards.size,
            active_users: this.userMetrics.size,
            aggregated_data_points: this.aggregatedData.size,
            event_buffer_size: this.eventBuffer.length
        };
    }

    // Очистка старых данных
    cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 дней
        const cutoff = Date.now() - maxAge;
        let cleaned = 0;

        // Очистка старых точек данных в метриках
        for (const metric of this.metrics.values()) {
            const originalLength = metric.data_points.length;
            metric.data_points = metric.data_points.filter(dp => dp.timestamp >= cutoff);
            cleaned += originalLength - metric.data_points.length;
        }

        // Очистка старых событий
        for (const [eventId, event] of this.events.entries()) {
            if (event.timestamp < cutoff) {
                this.events.delete(eventId);
                cleaned++;
            }
        }

        return cleaned;
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

module.exports = AnalyticsEngine;

