// Document Engine for Eva Lawyer Bot
// Advanced document processing, analysis, and generation system

const fs = require('fs').promises;
const path = require('path');

class DocumentEngine {
    constructor() {
        this.processors = new Map(); // fileType -> processor
        this.analyzers = new Map(); // analysisType -> analyzer
        this.generators = new Map(); // templateType -> generator
        this.templates = new Map(); // templateId -> template
        this.documents = new Map(); // documentId -> document data
        this.tempDir = '/tmp/eva-documents';
        
        this.initializeProcessors();
        this.initializeAnalyzers();
        this.initializeGenerators();
        this.initializeTemplates();
        this.ensureTempDir();
    }

    // Инициализация процессоров файлов
    initializeProcessors() {
        // Процессор PDF
        this.addProcessor('pdf', {
            extract: async (filePath) => {
                try {
                    // Здесь будет интеграция с PDF-парсером
                    const content = await this.extractPdfContent(filePath);
                    return {
                        success: true,
                        content,
                        metadata: await this.extractPdfMetadata(filePath)
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            validate: (filePath) => {
                return path.extname(filePath).toLowerCase() === '.pdf';
            }
        });

        // Процессор DOCX
        this.addProcessor('docx', {
            extract: async (filePath) => {
                try {
                    const content = await this.extractDocxContent(filePath);
                    return {
                        success: true,
                        content,
                        metadata: await this.extractDocxMetadata(filePath)
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            validate: (filePath) => {
                const ext = path.extname(filePath).toLowerCase();
                return ['.docx', '.doc'].includes(ext);
            }
        });

        // Процессор TXT
        this.addProcessor('txt', {
            extract: async (filePath) => {
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    return {
                        success: true,
                        content,
                        metadata: {
                            size: content.length,
                            lines: content.split('\n').length,
                            words: content.split(/\s+/).length
                        }
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            validate: (filePath) => {
                return path.extname(filePath).toLowerCase() === '.txt';
            }
        });

        // Процессор RTF
        this.addProcessor('rtf', {
            extract: async (filePath) => {
                try {
                    const content = await this.extractRtfContent(filePath);
                    return {
                        success: true,
                        content,
                        metadata: { format: 'rtf' }
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            validate: (filePath) => {
                return path.extname(filePath).toLowerCase() === '.rtf';
            }
        });
    }

    // Инициализация анализаторов
    initializeAnalyzers() {
        // Анализатор договоров
        this.addAnalyzer('contract', {
            analyze: async (content, metadata = {}) => {
                const analysis = {
                    type: 'contract',
                    confidence: 0,
                    sections: {},
                    parties: [],
                    terms: {},
                    risks: [],
                    recommendations: []
                };

                // Определение типа договора
                analysis.contract_type = this.detectContractType(content);
                analysis.confidence += 20;

                // Извлечение сторон договора
                analysis.parties = this.extractParties(content);
                analysis.confidence += analysis.parties.length > 0 ? 25 : 0;

                // Извлечение ключевых условий
                analysis.terms = this.extractTerms(content);
                analysis.confidence += Object.keys(analysis.terms).length > 0 ? 25 : 0;

                // Анализ рисков
                analysis.risks = this.analyzeContractRisks(content);
                analysis.confidence += 15;

                // Структурный анализ
                analysis.sections = this.analyzeContractStructure(content);
                analysis.confidence += 15;

                // Рекомендации
                analysis.recommendations = this.generateContractRecommendations(analysis);

                return analysis;
            }
        });

        // Анализатор юридических документов
        this.addAnalyzer('legal_document', {
            analyze: async (content, metadata = {}) => {
                const analysis = {
                    type: 'legal_document',
                    confidence: 0,
                    document_type: null,
                    legal_entities: [],
                    dates: [],
                    amounts: [],
                    references: [],
                    compliance: {}
                };

                // Определение типа документа
                analysis.document_type = this.detectDocumentType(content);
                analysis.confidence += 30;

                // Извлечение юридических лиц
                analysis.legal_entities = this.extractLegalEntities(content);
                analysis.confidence += analysis.legal_entities.length > 0 ? 20 : 0;

                // Извлечение дат
                analysis.dates = this.extractDates(content);
                analysis.confidence += analysis.dates.length > 0 ? 15 : 0;

                // Извлечение сумм
                analysis.amounts = this.extractAmounts(content);
                analysis.confidence += analysis.amounts.length > 0 ? 15 : 0;

                // Извлечение ссылок на законы
                analysis.references = this.extractLegalReferences(content);
                analysis.confidence += analysis.references.length > 0 ? 10 : 0;

                // Проверка соответствия
                analysis.compliance = this.checkCompliance(content, analysis.document_type);
                analysis.confidence += 10;

                return analysis;
            }
        });

        // Анализатор финансовых документов
        this.addAnalyzer('financial', {
            analyze: async (content, metadata = {}) => {
                const analysis = {
                    type: 'financial',
                    confidence: 0,
                    document_type: null,
                    amounts: [],
                    taxes: [],
                    accounts: [],
                    calculations: {}
                };

                // Определение типа финансового документа
                analysis.document_type = this.detectFinancialDocumentType(content);
                analysis.confidence += 30;

                // Извлечение сумм и расчетов
                analysis.amounts = this.extractFinancialAmounts(content);
                analysis.calculations = this.analyzeCalculations(content);
                analysis.confidence += 25;

                // Извлечение налоговой информации
                analysis.taxes = this.extractTaxInfo(content);
                analysis.confidence += 20;

                // Извлечение банковских реквизитов
                analysis.accounts = this.extractBankAccounts(content);
                analysis.confidence += 15;

                // Проверка корректности расчетов
                analysis.validation = this.validateCalculations(analysis.calculations);
                analysis.confidence += 10;

                return analysis;
            }
        });
    }

    // Инициализация генераторов
    initializeGenerators() {
        // Генератор договоров
        this.addGenerator('contract', {
            generate: async (templateId, data) => {
                const template = this.templates.get(templateId);
                if (!template) {
                    throw new Error(`Template ${templateId} not found`);
                }

                let content = template.content;

                // Подстановка переменных
                Object.entries(data).forEach(([key, value]) => {
                    const placeholder = new RegExp(`{{${key}}}`, 'g');
                    content = content.replace(placeholder, value);
                });

                // Обработка условных блоков
                content = this.processConditionalBlocks(content, data);

                // Обработка циклов
                content = this.processLoops(content, data);

                // Форматирование
                content = this.formatDocument(content, template.format);

                return {
                    content,
                    metadata: {
                        template: templateId,
                        generated_at: new Date().toISOString(),
                        format: template.format
                    }
                };
            }
        });

        // Генератор отчетов
        this.addGenerator('report', {
            generate: async (templateId, data) => {
                const template = this.templates.get(templateId);
                if (!template) {
                    throw new Error(`Template ${templateId} not found`);
                }

                // Генерация отчета с таблицами и графиками
                let content = template.content;

                // Обработка таблиц
                content = this.processTables(content, data);

                // Обработка графиков
                content = this.processCharts(content, data);

                // Подстановка данных
                Object.entries(data).forEach(([key, value]) => {
                    const placeholder = new RegExp(`{{${key}}}`, 'g');
                    content = content.replace(placeholder, this.formatValue(value));
                });

                return {
                    content,
                    metadata: {
                        template: templateId,
                        generated_at: new Date().toISOString(),
                        format: template.format,
                        data_points: Object.keys(data).length
                    }
                };
            }
        });

        // Генератор протоколов
        this.addGenerator('protocol', {
            generate: async (templateId, data) => {
                const template = this.templates.get(templateId);
                if (!template) {
                    throw new Error(`Template ${templateId} not found`);
                }

                let content = template.content;

                // Обработка списков разногласий
                if (data.disagreements) {
                    const disagreementsList = data.disagreements.map((item, index) => 
                        `${index + 1}. ${item.section}: ${item.current} → ${item.proposed}\n   Обоснование: ${item.reason}`
                    ).join('\n\n');
                    
                    content = content.replace('{{disagreements_list}}', disagreementsList);
                }

                // Подстановка остальных данных
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== 'disagreements') {
                        const placeholder = new RegExp(`{{${key}}}`, 'g');
                        content = content.replace(placeholder, value);
                    }
                });

                return {
                    content,
                    metadata: {
                        template: templateId,
                        generated_at: new Date().toISOString(),
                        disagreements_count: data.disagreements?.length || 0
                    }
                };
            }
        });
    }

    // Инициализация шаблонов
    initializeTemplates() {
        // Шаблон договора поставки
        this.addTemplate('supply_contract', {
            name: 'Договор поставки товаров',
            format: 'docx',
            content: `ДОГОВОР ПОСТАВКИ ТОВАРОВ № {{contract_number}}

г. {{city}}                                                    {{contract_date}}

{{supplier_name}}, именуемое в дальнейшем "Поставщик", в лице {{supplier_representative}}, действующего на основании {{supplier_authority}}, с одной стороны, и {{customer_name}}, именуемое в дальнейшем "Покупатель", в лице {{customer_representative}}, действующего на основании {{customer_authority}}, с другой стороны, заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА

1.1. Поставщик обязуется поставить, а Покупатель принять и оплатить товары согласно спецификации (Приложение № 1 к настоящему Договору).

1.2. Общая стоимость товаров составляет {{total_amount}} ({{total_amount_words}}) рублей, включая НДС {{vat_rate}}%.

2. СРОКИ ПОСТАВКИ

2.1. Поставка товаров осуществляется в период с {{delivery_start}} по {{delivery_end}}.

2.2. Конкретные сроки поставки партий товаров определяются дополнительными соглашениями к настоящему Договору.

3. ПОРЯДОК РАСЧЕТОВ

3.1. Расчеты по настоящему Договору производятся {{payment_method}}.

{{#if prepayment}}
3.2. Покупатель производит предоплату в размере {{prepayment_amount}} рублей в течение {{prepayment_days}} дней с момента подписания настоящего Договора.
{{/if}}

4. ОТВЕТСТВЕННОСТЬ СТОРОН

4.1. За нарушение сроков поставки Поставщик уплачивает Покупателю неустойку в размере {{penalty_rate}}% от стоимости несвоевременно поставленных товаров за каждый день просрочки.

4.2. За нарушение сроков оплаты Покупатель уплачивает Поставщику неустойку в размере {{payment_penalty_rate}}% от суммы просроченного платежа за каждый день просрочки.

5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ

5.1. Настоящий Договор вступает в силу с момента его подписания и действует до {{contract_end_date}}.

5.2. Все изменения и дополнения к настоящему Договору оформляются в письменном виде и подписываются обеими сторонами.

6. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ПОСТАВЩИК:                           ПОКУПАТЕЛЬ:
{{supplier_name}}                    {{customer_name}}
{{supplier_address}}                 {{customer_address}}
ИНН {{supplier_inn}}                 ИНН {{customer_inn}}
КПП {{supplier_kpp}}                 КПП {{customer_kpp}}

_________________                    _________________
{{supplier_representative}}         {{customer_representative}}`
        });

        // Шаблон протокола разногласий
        this.addTemplate('disagreement_protocol', {
            name: 'Протокол разногласий',
            format: 'docx',
            content: `ПРОТОКОЛ РАЗНОГЛАСИЙ
к договору {{contract_type}} № {{contract_number}} от {{contract_date}}

г. {{city}}                                                    {{protocol_date}}

{{customer_name}} рассмотрел проект договора {{contract_type}}, представленный {{supplier_name}}, и сообщает о следующих разногласиях:

{{disagreements_list}}

Настоящий протокол разногласий является неотъемлемой частью переговорного процесса и подлежит рассмотрению в течение {{review_period}} дней с момента получения.

{{customer_name}}

_________________
{{customer_representative}}
{{protocol_date}}`
        });

        // Шаблон отчета по анализу договора
        this.addTemplate('contract_analysis_report', {
            name: 'Отчет по анализу договора',
            format: 'html',
            content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Отчет по анализу договора</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 15px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .risk-high { color: #d32f2f; font-weight: bold; }
        .risk-medium { color: #f57c00; font-weight: bold; }
        .risk-low { color: #388e3c; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Отчет по анализу договора</h1>
        <p><strong>Документ:</strong> {{document_name}}</p>
        <p><strong>Дата анализа:</strong> {{analysis_date}}</p>
        <p><strong>Аналитик:</strong> Eva Lawyer Bot</p>
    </div>

    <div class="section">
        <h2>Общая информация</h2>
        <table>
            <tr><td><strong>Тип договора:</strong></td><td>{{contract_type}}</td></tr>
            <tr><td><strong>Стороны:</strong></td><td>{{parties}}</td></tr>
            <tr><td><strong>Предмет:</strong></td><td>{{subject}}</td></tr>
            <tr><td><strong>Сумма:</strong></td><td>{{amount}}</td></tr>
            <tr><td><strong>Срок действия:</strong></td><td>{{validity_period}}</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Анализ рисков</h2>
        <h3>Выявленные риски:</h3>
        {{#each risks}}
        <div class="risk-{{level}}">
            <strong>{{title}}</strong> ({{level_text}})
            <p>{{description}}</p>
            <p><em>Рекомендация:</em> {{recommendation}}</p>
        </div>
        {{/each}}
    </div>

    <div class="section">
        <h2>Рекомендации</h2>
        <ol>
        {{#each recommendations}}
            <li>{{this}}</li>
        {{/each}}
        </ol>
    </div>

    <div class="section">
        <h2>Заключение</h2>
        <p>{{conclusion}}</p>
        <p><strong>Общая оценка риска:</strong> <span class="risk-{{overall_risk}}">{{overall_risk_text}}</span></p>
    </div>
</body>
</html>`
        });
    }

    // Добавление процессора
    addProcessor(type, processor) {
        this.processors.set(type, processor);
    }

    // Добавление анализатора
    addAnalyzer(type, analyzer) {
        this.analyzers.set(type, analyzer);
    }

    // Добавление генератора
    addGenerator(type, generator) {
        this.generators.set(type, generator);
    }

    // Добавление шаблона
    addTemplate(templateId, template) {
        this.templates.set(templateId, template);
    }

    // Обработка документа
    async processDocument(filePath, options = {}) {
        try {
            const documentId = this.generateId();
            const fileType = this.detectFileType(filePath);
            const processor = this.processors.get(fileType);

            if (!processor) {
                throw new Error(`Unsupported file type: ${fileType}`);
            }

            // Валидация файла
            if (!processor.validate(filePath)) {
                throw new Error(`Invalid file format for type: ${fileType}`);
            }

            // Извлечение содержимого
            const extractResult = await processor.extract(filePath);
            if (!extractResult.success) {
                throw new Error(`Extraction failed: ${extractResult.error}`);
            }

            // Создание документа
            const document = {
                id: documentId,
                filePath,
                fileType,
                content: extractResult.content,
                metadata: extractResult.metadata,
                processed_at: Date.now(),
                analysis: null,
                status: 'processed'
            };

            // Автоматический анализ если указан
            if (options.autoAnalyze) {
                const analysisType = options.analysisType || this.detectAnalysisType(extractResult.content);
                document.analysis = await this.analyzeDocument(documentId, analysisType);
            }

            this.documents.set(documentId, document);

            return {
                success: true,
                documentId,
                document
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Анализ документа
    async analyzeDocument(documentId, analysisType) {
        const document = this.documents.get(documentId);
        if (!document) {
            throw new Error(`Document ${documentId} not found`);
        }

        const analyzer = this.analyzers.get(analysisType);
        if (!analyzer) {
            throw new Error(`Analyzer ${analysisType} not found`);
        }

        try {
            const analysis = await analyzer.analyze(document.content, document.metadata);
            analysis.analyzed_at = Date.now();
            analysis.analyzer_type = analysisType;

            // Сохраняем анализ в документе
            document.analysis = analysis;
            document.status = 'analyzed';

            return analysis;

        } catch (error) {
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    // Генерация документа
    async generateDocument(templateId, data, format = 'docx') {
        try {
            const template = this.templates.get(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            const generatorType = this.detectGeneratorType(templateId);
            const generator = this.generators.get(generatorType);
            
            if (!generator) {
                throw new Error(`Generator for ${generatorType} not found`);
            }

            const result = await generator.generate(templateId, data);
            
            // Сохранение в файл
            const fileName = `${templateId}_${Date.now()}.${format}`;
            const filePath = path.join(this.tempDir, fileName);
            
            if (format === 'html') {
                await fs.writeFile(filePath, result.content, 'utf-8');
            } else if (format === 'docx') {
                await this.saveAsDocx(result.content, filePath);
            } else if (format === 'pdf') {
                await this.saveAsPdf(result.content, filePath);
            }

            return {
                success: true,
                filePath,
                content: result.content,
                metadata: result.metadata
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Определение типа файла
    detectFileType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const typeMap = {
            '.pdf': 'pdf',
            '.docx': 'docx',
            '.doc': 'docx',
            '.txt': 'txt',
            '.rtf': 'rtf'
        };
        return typeMap[ext] || 'unknown';
    }

    // Определение типа анализа
    detectAnalysisType(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('договор') || lowerContent.includes('соглашение')) {
            return 'contract';
        } else if (lowerContent.includes('счет') || lowerContent.includes('акт') || lowerContent.includes('накладная')) {
            return 'financial';
        } else {
            return 'legal_document';
        }
    }

    // Определение типа генератора
    detectGeneratorType(templateId) {
        if (templateId.includes('contract')) {
            return 'contract';
        } else if (templateId.includes('report')) {
            return 'report';
        } else if (templateId.includes('protocol')) {
            return 'protocol';
        } else {
            return 'contract'; // по умолчанию
        }
    }

    // Методы извлечения содержимого (заглушки для реальной реализации)
    async extractPdfContent(filePath) {
        // Здесь будет реальная реализация с использованием pdf-parse или подобной библиотеки
        return "Содержимое PDF документа";
    }

    async extractPdfMetadata(filePath) {
        return {
            pages: 1,
            size: 0,
            created: new Date().toISOString()
        };
    }

    async extractDocxContent(filePath) {
        // Здесь будет реальная реализация с использованием mammoth или подобной библиотеки
        return "Содержимое DOCX документа";
    }

    async extractDocxMetadata(filePath) {
        return {
            pages: 1,
            words: 0,
            created: new Date().toISOString()
        };
    }

    async extractRtfContent(filePath) {
        // Здесь будет реальная реализация RTF парсера
        return "Содержимое RTF документа";
    }

    // Методы анализа (упрощенные реализации)
    detectContractType(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('поставк')) return 'supply';
        if (lowerContent.includes('услуг')) return 'service';
        if (lowerContent.includes('работ')) return 'work';
        if (lowerContent.includes('аренд')) return 'lease';
        
        return 'other';
    }

    extractParties(content) {
        // Упрощенное извлечение сторон договора
        const parties = [];
        const patterns = [
            /именуемое в дальнейшем "([^"]+)"/gi,
            /именуемый в дальнейшем "([^"]+)"/gi
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                parties.push(match[1]);
            }
        });

        return parties;
    }

    extractTerms(content) {
        const terms = {};
        
        // Извлечение суммы
        const amountMatch = content.match(/(\d+(?:\s\d+)*(?:,\d+)?)\s*(?:руб|₽)/i);
        if (amountMatch) {
            terms.amount = amountMatch[1];
        }

        // Извлечение сроков
        const datePattern = /(\d{1,2}\.?\d{1,2}\.?\d{4})/g;
        const dates = content.match(datePattern);
        if (dates) {
            terms.dates = dates;
        }

        return terms;
    }

    analyzeContractRisks(content) {
        const risks = [];
        const lowerContent = content.toLowerCase();

        // Проверка на отсутствие штрафных санкций
        if (!lowerContent.includes('неустойк') && !lowerContent.includes('штраф') && !lowerContent.includes('пени')) {
            risks.push({
                level: 'medium',
                title: 'Отсутствие штрафных санкций',
                description: 'В договоре не предусмотрены штрафные санкции за нарушение обязательств'
            });
        }

        // Проверка на форс-мажор
        if (!lowerContent.includes('форс-мажор') && !lowerContent.includes('непреодолимая сила')) {
            risks.push({
                level: 'low',
                title: 'Отсутствие форс-мажорных обстоятельств',
                description: 'Не предусмотрены условия освобождения от ответственности при форс-мажоре'
            });
        }

        return risks;
    }

    analyzeContractStructure(content) {
        const sections = {};
        
        // Поиск разделов договора
        const sectionPattern = /(\d+\.?\s*[А-ЯЁ][А-ЯЁ\s]+)/g;
        let match;
        
        while ((match = sectionPattern.exec(content)) !== null) {
            const sectionTitle = match[1].trim();
            sections[sectionTitle] = {
                found: true,
                position: match.index
            };
        }

        return sections;
    }

    generateContractRecommendations(analysis) {
        const recommendations = [];

        if (analysis.risks.length > 0) {
            recommendations.push('Рекомендуется устранить выявленные риски перед подписанием договора');
        }

        if (analysis.parties.length < 2) {
            recommendations.push('Необходимо четко определить стороны договора');
        }

        if (!analysis.terms.amount) {
            recommendations.push('Следует указать точную сумму договора');
        }

        return recommendations;
    }

    // Методы для других типов анализа (заглушки)
    detectDocumentType(content) { return 'unknown'; }
    extractLegalEntities(content) { return []; }
    extractDates(content) { return []; }
    extractAmounts(content) { return []; }
    extractLegalReferences(content) { return []; }
    checkCompliance(content, docType) { return {}; }
    detectFinancialDocumentType(content) { return 'unknown'; }
    extractFinancialAmounts(content) { return []; }
    analyzeCalculations(content) { return {}; }
    extractTaxInfo(content) { return []; }
    extractBankAccounts(content) { return []; }
    validateCalculations(calculations) { return {}; }

    // Методы обработки шаблонов
    processConditionalBlocks(content, data) {
        // Обработка {{#if condition}} блоков
        const ifPattern = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        
        return content.replace(ifPattern, (match, condition, block) => {
            return data[condition] ? block : '';
        });
    }

    processLoops(content, data) {
        // Обработка {{#each array}} блоков
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

    formatDocument(content, format) {
        // Базовое форматирование в зависимости от формата
        if (format === 'html') {
            return content.replace(/\n/g, '<br>');
        }
        return content;
    }

    processTables(content, data) {
        // Обработка таблиц в шаблонах
        return content; // Заглушка
    }

    processCharts(content, data) {
        // Обработка графиков в шаблонах
        return content; // Заглушка
    }

    formatValue(value) {
        if (typeof value === 'number') {
            return value.toLocaleString('ru-RU');
        }
        return value;
    }

    // Методы сохранения файлов (заглушки)
    async saveAsDocx(content, filePath) {
        // Здесь будет реальная реализация сохранения в DOCX
        await fs.writeFile(filePath, content, 'utf-8');
    }

    async saveAsPdf(content, filePath) {
        // Здесь будет реальная реализация сохранения в PDF
        await fs.writeFile(filePath, content, 'utf-8');
    }

    // Создание временной директории
    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create temp directory:', error);
        }
    }

    // Получение документа
    getDocument(documentId) {
        return this.documents.get(documentId);
    }

    // Получение всех документов пользователя
    getUserDocuments(userId) {
        return Array.from(this.documents.values()).filter(doc => 
            doc.metadata && doc.metadata.userId === userId
        );
    }

    // Удаление документа
    deleteDocument(documentId) {
        const document = this.documents.get(documentId);
        if (document) {
            // Удаляем файл
            fs.unlink(document.filePath).catch(console.error);
            // Удаляем из памяти
            this.documents.delete(documentId);
            return true;
        }
        return false;
    }

    // Получение статистики
    getStats() {
        const documents = Array.from(this.documents.values());
        
        return {
            total_documents: documents.length,
            processed_documents: documents.filter(d => d.status === 'processed').length,
            analyzed_documents: documents.filter(d => d.status === 'analyzed').length,
            processors: this.processors.size,
            analyzers: this.analyzers.size,
            generators: this.generators.size,
            templates: this.templates.size
        };
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

module.exports = DocumentEngine;

