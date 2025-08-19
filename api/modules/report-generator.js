// Report Generator for Eva Lawyer Bot
// Advanced report generation with charts and visualizations

const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
    constructor() {
        this.templates = new Map();
        this.chartGenerators = new Map();
        this.exporters = new Map();
        this.reportCache = new Map();
        this.tempDir = '/tmp/eva-reports';
        
        this.initializeTemplates();
        this.initializeChartGenerators();
        this.initializeExporters();
        this.ensureTempDir();
    }

    // Инициализация шаблонов отчетов
    initializeTemplates() {
        // Шаблон ежедневного отчета
        this.addTemplate('daily_activity', {
            name: 'Ежедневный отчет активности',
            format: 'html',
            content: `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ежедневный отчет активности - {{date}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header .date {
            font-size: 1.2em;
            opacity: 0.9;
            margin-top: 10px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        .metric-label {
            font-size: 1.1em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .metric-change {
            font-size: 0.9em;
            margin-top: 5px;
        }
        .metric-change.positive {
            color: #28a745;
        }
        .metric-change.negative {
            color: #dc3545;
        }
        .charts-section {
            padding: 30px;
            background: #fafafa;
        }
        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .chart-title {
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .chart-placeholder {
            height: 300px;
            background: #f0f0f0;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 1.1em;
        }
        .summary-section {
            padding: 30px;
            background: white;
        }
        .summary-title {
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #333;
        }
        .summary-text {
            line-height: 1.6;
            color: #555;
            font-size: 1.1em;
        }
        .footer {
            background: #333;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            .header h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ежедневный отчет активности</h1>
            <div class="date">{{date}}</div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Активные пользователи</div>
                <div class="metric-value">{{active_users}}</div>
                <div class="metric-change {{active_users_change_class}}">
                    {{active_users_change}}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Обработано сообщений</div>
                <div class="metric-value">{{messages_processed}}</div>
                <div class="metric-change {{messages_change_class}}">
                    {{messages_change}}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Проанализировано документов</div>
                <div class="metric-value">{{documents_analyzed}}</div>
                <div class="metric-change {{documents_change_class}}">
                    {{documents_change}}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Проверок ИНН</div>
                <div class="metric-value">{{inn_checks}}</div>
                <div class="metric-change {{inn_checks_change_class}}">
                    {{inn_checks_change}}
                </div>
            </div>
        </div>

        <div class="charts-section">
            <div class="chart-container">
                <div class="chart-title">Активность по часам</div>
                <div class="chart-placeholder">
                    {{hourly_activity_chart}}
                </div>
            </div>

            <div class="chart-container">
                <div class="chart-title">Использование функций</div>
                <div class="chart-placeholder">
                    {{feature_usage_chart}}
                </div>
            </div>
        </div>

        <div class="summary-section">
            <div class="summary-title">Сводка дня</div>
            <div class="summary-text">
                {{daily_summary}}
            </div>
        </div>

        <div class="footer">
            Сгенерировано Eva Lawyer Bot Analytics Engine в {{generated_at}}
        </div>
    </div>
</body>
</html>`
        });

        // Шаблон отчета производительности
        this.addTemplate('performance_report', {
            name: 'Отчет производительности',
            format: 'html',
            content: `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет производительности - {{period}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .performance-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #ff6b6b;
        }
        .performance-metric {
            font-size: 1.8em;
            font-weight: bold;
            color: #ff6b6b;
            margin: 10px 0;
        }
        .performance-label {
            font-size: 1.1em;
            color: #666;
            margin-bottom: 10px;
        }
        .performance-details {
            font-size: 0.9em;
            color: #777;
            margin-top: 10px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-good { background-color: #28a745; }
        .status-warning { background-color: #ffc107; }
        .status-critical { background-color: #dc3545; }
        .charts-section {
            padding: 30px;
            background: #fafafa;
        }
        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .recommendations {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 20px 30px;
            border-radius: 0 8px 8px 0;
        }
        .recommendations h3 {
            color: #1976d2;
            margin-top: 0;
        }
        .recommendation-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
            border-left: 3px solid #2196f3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Отчет производительности</h1>
            <div class="date">{{period}}</div>
        </div>

        <div class="performance-grid">
            <div class="performance-card">
                <div class="performance-label">
                    <span class="status-indicator status-{{response_time_status}}"></span>
                    Среднее время ответа
                </div>
                <div class="performance-metric">{{avg_response_time}}ms</div>
                <div class="performance-details">
                    P95: {{p95_response_time}}ms<br>
                    P99: {{p99_response_time}}ms
                </div>
            </div>

            <div class="performance-card">
                <div class="performance-label">
                    <span class="status-indicator status-{{ai_processing_status}}"></span>
                    Время обработки AI
                </div>
                <div class="performance-metric">{{avg_ai_processing}}ms</div>
                <div class="performance-details">
                    Медиана: {{median_ai_processing}}ms<br>
                    Максимум: {{max_ai_processing}}ms
                </div>
            </div>

            <div class="performance-card">
                <div class="performance-label">
                    <span class="status-indicator status-{{error_rate_status}}"></span>
                    Частота ошибок
                </div>
                <div class="performance-metric">{{error_rate}}%</div>
                <div class="performance-details">
                    Всего ошибок: {{total_errors}}<br>
                    Критических: {{critical_errors}}
                </div>
            </div>

            <div class="performance-card">
                <div class="performance-label">
                    <span class="status-indicator status-{{throughput_status}}"></span>
                    Пропускная способность
                </div>
                <div class="performance-metric">{{throughput}} req/min</div>
                <div class="performance-details">
                    Пик: {{peak_throughput}} req/min<br>
                    Среднее: {{avg_throughput}} req/min
                </div>
            </div>
        </div>

        <div class="charts-section">
            <div class="chart-container">
                <div class="chart-title">Время ответа по времени</div>
                <div class="chart-placeholder">
                    {{response_time_chart}}
                </div>
            </div>

            <div class="chart-container">
                <div class="chart-title">Распределение времени обработки AI</div>
                <div class="chart-placeholder">
                    {{ai_processing_histogram}}
                </div>
            </div>
        </div>

        <div class="recommendations">
            <h3>Рекомендации по оптимизации</h3>
            {{#each recommendations}}
            <div class="recommendation-item">
                <strong>{{priority}}:</strong> {{text}}
            </div>
            {{/each}}
        </div>

        <div class="footer">
            Сгенерировано Eva Lawyer Bot Analytics Engine в {{generated_at}}
        </div>
    </div>
</body>
</html>`
        });

        // Шаблон пользовательского отчета
        this.addTemplate('user_report', {
            name: 'Персональный отчет пользователя',
            format: 'html',
            content: `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ваша статистика - {{user_name}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .user-info {
            margin-top: 15px;
            opacity: 0.9;
        }
        .stats-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-icon {
            font-size: 2.5em;
            margin-bottom: 15px;
        }
        .stat-value {
            font-size: 2.2em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        .stat-label {
            color: #666;
            font-size: 1.1em;
        }
        .activity-section {
            padding: 30px;
        }
        .section-title {
            font-size: 1.8em;
            margin-bottom: 25px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .activity-timeline {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .timeline-item {
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
        }
        .timeline-item:last-child {
            border-bottom: none;
        }
        .timeline-date {
            font-weight: bold;
            color: #667eea;
            min-width: 120px;
        }
        .timeline-content {
            flex: 1;
            margin-left: 20px;
        }
        .achievements {
            background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
            border-radius: 10px;
            padding: 25px;
            margin: 20px 0;
            color: #2d3436;
        }
        .achievement-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 15px;
            background: rgba(255,255,255,0.3);
            border-radius: 8px;
        }
        .achievement-icon {
            font-size: 1.5em;
            margin-right: 15px;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #fafafa;
        }
        .chart-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        .chart-title {
            font-size: 1.3em;
            margin-bottom: 20px;
            color: #333;
        }
        .chart-placeholder {
            height: 250px;
            background: #f0f0f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ваша статистика</h1>
            <div class="user-info">
                {{user_name}} • Пользователь с {{registration_date}}
            </div>
        </div>

        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-icon">💬</div>
                <div class="stat-value">{{total_messages}}</div>
                <div class="stat-label">Всего сообщений</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📄</div>
                <div class="stat-value">{{total_documents}}</div>
                <div class="stat-label">Документов обработано</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔍</div>
                <div class="stat-value">{{total_inn_checks}}</div>
                <div class="stat-label">Проверок ИНН</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📋</div>
                <div class="stat-value">{{total_contracts}}</div>
                <div class="stat-label">Договоров создано</div>
            </div>
        </div>

        <div class="activity-section">
            <div class="section-title">Последняя активность</div>
            <div class="activity-timeline">
                {{#each recent_activity}}
                <div class="timeline-item">
                    <div class="timeline-date">{{date}}</div>
                    <div class="timeline-content">{{description}}</div>
                </div>
                {{/each}}
            </div>
        </div>

        <div class="achievements">
            <div class="section-title" style="color: #2d3436;">Достижения</div>
            {{#each achievements}}
            <div class="achievement-item">
                <div class="achievement-icon">{{icon}}</div>
                <div>
                    <strong>{{title}}</strong><br>
                    <small>{{description}}</small>
                </div>
            </div>
            {{/each}}
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title">Активность по дням</div>
                <div class="chart-placeholder">
                    {{daily_activity_chart}}
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-title">Использование функций</div>
                <div class="chart-placeholder">
                    {{feature_usage_chart}}
                </div>
            </div>
        </div>

        <div class="footer">
            Сгенерировано {{generated_at}}
        </div>
    </div>
</body>
</html>`
        });
    }

    // Инициализация генераторов графиков
    initializeChartGenerators() {
        // Генератор линейных графиков
        this.addChartGenerator('line', {
            generate: (data, options = {}) => {
                return this.generateLineChart(data, options);
            }
        });

        // Генератор столбчатых диаграмм
        this.addChartGenerator('bar', {
            generate: (data, options = {}) => {
                return this.generateBarChart(data, options);
            }
        });

        // Генератор круговых диаграмм
        this.addChartGenerator('pie', {
            generate: (data, options = {}) => {
                return this.generatePieChart(data, options);
            }
        });

        // Генератор гистограмм
        this.addChartGenerator('histogram', {
            generate: (data, options = {}) => {
                return this.generateHistogram(data, options);
            }
        });

        // Генератор календарных графиков
        this.addChartGenerator('calendar', {
            generate: (data, options = {}) => {
                return this.generateCalendarChart(data, options);
            }
        });
    }

    // Инициализация экспортеров
    initializeExporters() {
        // HTML экспортер
        this.addExporter('html', {
            export: async (content, filePath) => {
                await fs.writeFile(filePath, content, 'utf-8');
                return filePath;
            }
        });

        // PDF экспортер
        this.addExporter('pdf', {
            export: async (content, filePath) => {
                // Здесь будет конвертация HTML в PDF
                // Используя puppeteer или подобную библиотеку
                await this.convertHtmlToPdf(content, filePath);
                return filePath;
            }
        });

        // Excel экспортер
        this.addExporter('xlsx', {
            export: async (data, filePath) => {
                await this.exportToExcel(data, filePath);
                return filePath;
            }
        });

        // JSON экспортер
        this.addExporter('json', {
            export: async (data, filePath) => {
                await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
                return filePath;
            }
        });
    }

    // Добавление шаблона
    addTemplate(templateId, template) {
        this.templates.set(templateId, template);
    }

    // Добавление генератора графиков
    addChartGenerator(type, generator) {
        this.chartGenerators.set(type, generator);
    }

    // Добавление экспортера
    addExporter(format, exporter) {
        this.exporters.set(format, exporter);
    }

    // Генерация отчета
    async generateReport(templateId, data, options = {}) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        try {
            // Подготавливаем данные
            const reportData = await this.prepareReportData(data, options);
            
            // Генерируем графики если нужно
            if (options.includeCharts !== false) {
                reportData.charts = await this.generateCharts(data.charts || [], options);
            }

            // Обрабатываем шаблон
            let content = template.content;
            content = this.processTemplate(content, reportData);

            // Определяем формат вывода
            const format = options.format || template.format || 'html';
            
            // Генерируем имя файла
            const fileName = options.fileName || `${templateId}_${Date.now()}.${format}`;
            const filePath = path.join(this.tempDir, fileName);

            // Экспортируем отчет
            const exporter = this.exporters.get(format);
            if (!exporter) {
                throw new Error(`Exporter for format ${format} not found`);
            }

            const exportedPath = await exporter.export(content, filePath);

            // Кешируем отчет
            const reportId = this.generateId();
            this.reportCache.set(reportId, {
                id: reportId,
                templateId,
                filePath: exportedPath,
                format,
                generated_at: Date.now(),
                data: reportData
            });

            return {
                success: true,
                reportId,
                filePath: exportedPath,
                format,
                size: await this.getFileSize(exportedPath)
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Подготовка данных для отчета
    async prepareReportData(data, options) {
        const reportData = {
            ...data,
            generated_at: new Date().toLocaleString('ru-RU'),
            date: new Date().toLocaleDateString('ru-RU'),
            period: options.period || 'Сегодня'
        };

        // Форматируем числовые значения
        Object.keys(reportData).forEach(key => {
            if (typeof reportData[key] === 'number') {
                reportData[`${key}_formatted`] = this.formatNumber(reportData[key]);
            }
        });

        // Добавляем классы для изменений
        Object.keys(reportData).forEach(key => {
            if (key.endsWith('_change')) {
                const value = reportData[key];
                if (typeof value === 'number') {
                    reportData[`${key}_class`] = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
                    reportData[key] = this.formatChange(value);
                }
            }
        });

        return reportData;
    }

    // Генерация графиков
    async generateCharts(chartsConfig, options) {
        const charts = {};

        for (const chartConfig of chartsConfig) {
            try {
                const generator = this.chartGenerators.get(chartConfig.type);
                if (generator) {
                    const chartData = await generator.generate(chartConfig.data, chartConfig.options);
                    charts[chartConfig.id] = chartData;
                }
            } catch (error) {
                console.error(`Failed to generate chart ${chartConfig.id}:`, error);
                charts[chartConfig.id] = `<div class="chart-error">Ошибка генерации графика</div>`;
            }
        }

        return charts;
    }

    // Обработка шаблона
    processTemplate(template, data) {
        let content = template;

        // Простая замена переменных {{variable}}
        Object.entries(data).forEach(([key, value]) => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(placeholder, value || '');
        });

        // Обработка условных блоков {{#if condition}}
        content = this.processConditionalBlocks(content, data);

        // Обработка циклов {{#each array}}
        content = this.processLoops(content, data);

        return content;
    }

    // Обработка условных блоков
    processConditionalBlocks(content, data) {
        const ifPattern = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        
        return content.replace(ifPattern, (match, condition, block) => {
            return data[condition] ? block : '';
        });
    }

    // Обработка циклов
    processLoops(content, data) {
        const eachPattern = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
        
        return content.replace(eachPattern, (match, arrayName, template) => {
            const array = data[arrayName];
            if (!Array.isArray(array)) return '';
            
            return array.map(item => {
                let itemContent = template;
                Object.entries(item).forEach(([key, value]) => {
                    itemContent = itemContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
                });
                return itemContent;
            }).join('');
        });
    }

    // Генерация линейного графика
    generateLineChart(data, options = {}) {
        // Здесь будет реальная генерация SVG или Canvas графика
        // Пока возвращаем заглушку
        return `<svg width="100%" height="300" viewBox="0 0 800 300">
            <text x="400" y="150" text-anchor="middle" fill="#666">
                Линейный график: ${data.title || 'График'}
            </text>
        </svg>`;
    }

    // Генерация столбчатой диаграммы
    generateBarChart(data, options = {}) {
        return `<svg width="100%" height="300" viewBox="0 0 800 300">
            <text x="400" y="150" text-anchor="middle" fill="#666">
                Столбчатая диаграмма: ${data.title || 'Диаграмма'}
            </text>
        </svg>`;
    }

    // Генерация круговой диаграммы
    generatePieChart(data, options = {}) {
        return `<svg width="100%" height="300" viewBox="0 0 400 300">
            <circle cx="200" cy="150" r="100" fill="#667eea" opacity="0.3"/>
            <text x="200" y="150" text-anchor="middle" fill="#666">
                Круговая диаграмма
            </text>
        </svg>`;
    }

    // Генерация гистограммы
    generateHistogram(data, options = {}) {
        return `<svg width="100%" height="300" viewBox="0 0 800 300">
            <text x="400" y="150" text-anchor="middle" fill="#666">
                Гистограмма: ${data.title || 'Распределение'}
            </text>
        </svg>`;
    }

    // Генерация календарного графика
    generateCalendarChart(data, options = {}) {
        return `<svg width="100%" height="200" viewBox="0 0 800 200">
            <text x="400" y="100" text-anchor="middle" fill="#666">
                Календарный график активности
            </text>
        </svg>`;
    }

    // Конвертация HTML в PDF
    async convertHtmlToPdf(htmlContent, outputPath) {
        // Здесь будет реальная конвертация с использованием puppeteer
        // Пока просто сохраняем как HTML
        await fs.writeFile(outputPath, htmlContent, 'utf-8');
    }

    // Экспорт в Excel
    async exportToExcel(data, filePath) {
        // Здесь будет реальная генерация Excel файла
        // Используя библиотеку типа exceljs
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData, 'utf-8');
    }

    // Получение отчета из кеша
    getReport(reportId) {
        return this.reportCache.get(reportId);
    }

    // Получение списка отчетов
    getReports(options = {}) {
        let reports = Array.from(this.reportCache.values());

        // Фильтрация по шаблону
        if (options.templateId) {
            reports = reports.filter(report => report.templateId === options.templateId);
        }

        // Сортировка
        reports.sort((a, b) => b.generated_at - a.generated_at);

        // Пагинация
        if (options.limit) {
            const offset = options.offset || 0;
            reports = reports.slice(offset, offset + options.limit);
        }

        return reports;
    }

    // Удаление отчета
    async deleteReport(reportId) {
        const report = this.reportCache.get(reportId);
        if (!report) {
            return false;
        }

        try {
            // Удаляем файл
            await fs.unlink(report.filePath);
            
            // Удаляем из кеша
            this.reportCache.delete(reportId);
            
            return true;
        } catch (error) {
            console.error(`Failed to delete report ${reportId}:`, error);
            return false;
        }
    }

    // Очистка старых отчетов
    async cleanupOldReports(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 дней
        const cutoff = Date.now() - maxAge;
        let cleaned = 0;

        for (const [reportId, report] of this.reportCache.entries()) {
            if (report.generated_at < cutoff) {
                const deleted = await this.deleteReport(reportId);
                if (deleted) {
                    cleaned++;
                }
            }
        }

        return cleaned;
    }

    // Создание временной директории
    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create temp directory:', error);
        }
    }

    // Получение размера файла
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    // Форматирование чисел
    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        } else {
            return value.toLocaleString('ru-RU');
        }
    }

    // Форматирование изменений
    formatChange(value) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    }

    // Получение статистики
    getStats() {
        return {
            templates: this.templates.size,
            chart_generators: this.chartGenerators.size,
            exporters: this.exporters.size,
            cached_reports: this.reportCache.size,
            temp_dir: this.tempDir
        };
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

module.exports = ReportGenerator;

