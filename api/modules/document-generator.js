// Document generation module for Eva Lawyer Bot
const fs = require('fs');
const path = require('path');

class DocumentGenerator {
    constructor() {
        this.templates = {
            contract_analysis: this.getContractAnalysisTemplate(),
            risk_table: this.getRiskTableTemplate(),
            legal_opinion: this.getLegalOpinionTemplate(),
            case_law: this.getCaseLawTemplate(),
            dispute_prep: this.getDisputePrepTemplate(),
            claim_reply: this.getClaimReplyTemplate(),
            counterparty_report: this.getCounterpartyReportTemplate(),
            invoice: this.getInvoiceTemplate()
        };
    }

    // Generate DOCX document
    async generateDOCX(type, data) {
        try {
            const template = this.templates[type];
            if (!template) {
                throw new Error(`Unknown document type: ${type}`);
            }

            const content = this.fillTemplate(template, data);
            const fileName = `${type}_${Date.now()}.docx`;
            const filePath = `/tmp/${fileName}`;

            // Simple DOCX generation (in real implementation would use docx library)
            const docxContent = this.createSimpleDOCX(content);
            fs.writeFileSync(filePath, docxContent);

            return {
                success: true,
                fileName: fileName,
                filePath: filePath,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
        } catch (error) {
            console.error('DOCX generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate PDF document
    async generatePDF(type, data) {
        try {
            const template = this.templates[type];
            if (!template) {
                throw new Error(`Unknown document type: ${type}`);
            }

            const content = this.fillTemplate(template, data);
            const fileName = `${type}_${Date.now()}.pdf`;
            const filePath = `/tmp/${fileName}`;

            // Simple PDF generation (in real implementation would use pdf library)
            const pdfContent = this.createSimplePDF(content);
            fs.writeFileSync(filePath, pdfContent);

            return {
                success: true,
                fileName: fileName,
                filePath: filePath,
                mimeType: 'application/pdf'
            };
        } catch (error) {
            console.error('PDF generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Fill template with data
    fillTemplate(template, data) {
        let content = template;
        
        // Replace placeholders with actual data
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            content = content.replace(new RegExp(placeholder, 'g'), value || '');
        }

        // Replace remaining placeholders with empty strings
        content = content.replace(/\{\{[^}]+\}\}/g, '');

        return content;
    }

    // Create simple DOCX content (placeholder implementation)
    createSimpleDOCX(content) {
        // In real implementation, would use proper DOCX library
        return Buffer.from(`DOCX Content:\n\n${content}`, 'utf8');
    }

    // Create simple PDF content (placeholder implementation)
    createSimplePDF(content) {
        // In real implementation, would use proper PDF library
        return Buffer.from(`PDF Content:\n\n${content}`, 'utf8');
    }

    // Template for contract analysis
    getContractAnalysisTemplate() {
        return `АНАЛИЗ ДОГОВОРА

Дата анализа: {{date}}
Сторона: {{side}}

КРАТКОЕ РЕЗЮМЕ:
{{summary}}

ОСНОВНЫЕ РИСКИ:
{{risks}}

РЕКОМЕНДАЦИИ:
{{recommendations}}

ПРЕДЛАГАЕМЫЕ ПРАВКИ:
{{edits}}

ЗАКЛЮЧЕНИЕ:
{{conclusion}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for risk table
    getRiskTableTemplate() {
        return `ТАБЛИЦА РИСКОВ ДОГОВОРА

Дата анализа: {{date}}
Документ: {{document_name}}

{{risk_table}}

ОБЩАЯ ОЦЕНКА РИСКА: {{overall_risk}}

РЕКОМЕНДАЦИИ ПО СНИЖЕНИЮ РИСКОВ:
{{risk_mitigation}}

ПРИОРИТЕТНЫЕ ДЕЙСТВИЯ:
{{priority_actions}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for legal opinion
    getLegalOpinionTemplate() {
        return `ЮРИДИЧЕСКОЕ ЗАКЛЮЧЕНИЕ

Тема: {{topic}}
Отрасль права: {{field}}
Дата: {{date}}

1. ПРАВОВАЯ КВАЛИФИКАЦИЯ:
{{legal_qualification}}

2. ПРИМЕНИМЫЕ НОРМЫ ПРАВА:
{{applicable_law}}

3. АНАЛИЗ ОБСТОЯТЕЛЬСТВ:
{{circumstances_analysis}}

4. ВЫВОДЫ:
{{conclusions}}

5. РЕКОМЕНДАЦИИ:
{{recommendations}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for case law analysis
    getCaseLawTemplate() {
        return `СПРАВКА ПО СУДЕБНОЙ ПРАКТИКЕ

Вопрос: {{question}}
Период анализа: {{period}}
Дата составления: {{date}}

ОСНОВНЫЕ ТЕНДЕНЦИИ:
{{trends}}

КЛЮЧЕВЫЕ РЕШЕНИЯ:
{{key_decisions}}

СТАТИСТИКА:
{{statistics}}

РЕКОМЕНДАЦИИ:
{{recommendations}}

ИСТОЧНИКИ:
{{sources}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for dispute preparation
    getDisputePrepTemplate() {
        return `ПОДГОТОВКА К СПОРУ

Тематика: {{topic}}
Дата: {{date}}

НАША ПОЗИЦИЯ:
{{our_position}}

ПОЗИЦИЯ ОППОНЕНТА:
{{opponent_position}}

КОНТРАРГУМЕНТЫ:
{{counterarguments}}

НЕОБХОДИМЫЕ ДОКАЗАТЕЛЬСТВА:
{{evidence_needed}}

СТРАТЕГИЯ ВЕДЕНИЯ ДЕЛА:
{{strategy}}

РИСКИ И ВОЗМОЖНОСТИ:
{{risks_opportunities}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for claim reply
    getClaimReplyTemplate() {
        return `ОТВЕТ НА ПРЕТЕНЗИЮ

Дата: {{date}}
Кому: {{recipient}}
От кого: {{sender}}

{{letter_content}}

С уважением,
{{signature}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for counterparty report
    getCounterpartyReportTemplate() {
        return `ОТЧЕТ ПО ПРОВЕРКЕ КОНТРАГЕНТА

ИНН: {{inn}}
Наименование: {{company_name}}
Дата проверки: {{date}}

РЕШЕНИЕ: {{decision}}

ОСНОВНЫЕ ДАННЫЕ:
- Статус: {{status}}
- Адрес: {{address}}
- Руководитель: {{director}}
- Уставный капитал: {{capital}}

РИСК-ФАКТОРЫ:
{{risk_factors}}

УРОВЕНЬ РИСКА: {{risk_level}}%

РЕКОМЕНДАЦИИ:
{{recommendations}}

ИСТОЧНИКИ ДАННЫХ:
{{data_sources}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Template for invoice
    getInvoiceTemplate() {
        return `СЧЕТ НА ОПЛАТУ №{{invoice_number}}

Дата: {{date}}

ПОСТАВЩИК:
{{supplier_details}}

ПОКУПАТЕЛЬ:
{{buyer_details}}

ТОВАРЫ/УСЛУГИ:
{{items_table}}

ИТОГО:
Сумма без НДС: {{amount_without_vat}} руб.
НДС (20%): {{vat_amount}} руб.
Всего к доплате: {{total_amount}} руб.

УСЛОВИЯ ОПЛАТЫ:
{{payment_terms}}

БАНКОВСКИЕ РЕКВИЗИТЫ:
{{bank_details}}

---
Документ создан Eva Lawyer Bot
`;
    }

    // Get available document types
    getAvailableTypes() {
        return Object.keys(this.templates);
    }

    // Validate document type
    isValidType(type) {
        return this.templates.hasOwnProperty(type);
    }
}

// File handling utilities
class FileHandler {
    constructor() {
        this.allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
        this.maxFileSize = 15 * 1024 * 1024; // 15 MB
    }

    // Validate uploaded file
    validateFile(file) {
        if (!file) {
            return { valid: false, error: 'Файл не найден' };
        }

        const fileName = file.file_name || '';
        const fileSize = file.file_size || 0;
        const fileExtension = '.' + fileName.split('.').pop().toLowerCase();

        if (!this.allowedTypes.includes(fileExtension)) {
            return {
                valid: false,
                error: `Поддерживаются только файлы: ${this.allowedTypes.join(', ')}`
            };
        }

        if (fileSize > this.maxFileSize) {
            return {
                valid: false,
                error: 'Размер файла не должен превышать 15 МБ'
            };
        }

        return { valid: true };
    }

    // Download file from Telegram
    async downloadTelegramFile(fileId, botToken) {
        try {
            // Get file path
            const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const fileInfo = await fileInfoResponse.json();

            if (!fileInfo.ok) {
                throw new Error('Failed to get file info');
            }

            // Download file
            const fileResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`);
            const fileBuffer = await fileResponse.buffer();

            return {
                success: true,
                buffer: fileBuffer,
                path: fileInfo.result.file_path
            };
        } catch (error) {
            console.error('File download error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Extract text from file
    async extractTextFromFile(fileBuffer, fileName) {
        try {
            const extension = '.' + fileName.split('.').pop().toLowerCase();

            switch (extension) {
                case '.txt':
                    return fileBuffer.toString('utf8');
                case '.pdf':
                    // In real implementation, would use pdf-parse library
                    return 'Extracted PDF text...';
                case '.docx':
                case '.doc':
                    // In real implementation, would use mammoth library
                    return 'Extracted DOCX text...';
                default:
                    throw new Error('Unsupported file type');
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            return 'Не удалось извлечь текст из файла';
        }
    }

    // Clean up temporary files
    cleanupTempFiles(olderThanMinutes = 60) {
        try {
            const tempDir = '/tmp';
            const files = fs.readdirSync(tempDir);
            const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up temp file: ${file}`);
                }
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = {
    DocumentGenerator,
    FileHandler
};

