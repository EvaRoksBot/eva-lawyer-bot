// Advanced Document Processor for Eva Lawyer Bot
// Handles document upload, OCR, analysis, and generation

const fs = require('fs');
const path = require('path');

class AdvancedDocumentProcessor {
    constructor() {
        this.supportedFormats = {
            documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
            images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'],
            spreadsheets: ['.xls', '.xlsx', '.csv'],
            presentations: ['.ppt', '.pptx']
        };
        
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.tempDir = '/tmp/eva-documents';
        
        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    
    // Process uploaded document
    async processDocument(fileBuffer, fileName, userId) {
        try {
            console.log(`Processing document: ${fileName} for user ${userId}`);
            
            // Validate file
            const validation = this.validateFile(fileBuffer, fileName);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Save temporary file
            const tempFilePath = await this.saveTempFile(fileBuffer, fileName, userId);
            
            // Determine processing strategy
            const fileExt = path.extname(fileName).toLowerCase();
            let result;
            
            if (this.supportedFormats.documents.includes(fileExt)) {
                result = await this.processTextDocument(tempFilePath, fileName);
            } else if (this.supportedFormats.images.includes(fileExt)) {
                result = await this.processImageDocument(tempFilePath, fileName);
            } else if (this.supportedFormats.spreadsheets.includes(fileExt)) {
                result = await this.processSpreadsheet(tempFilePath, fileName);
            } else {
                throw new Error(`Неподдерживаемый формат файла: ${fileExt}`);
            }
            
            // Clean up temp file
            this.cleanupTempFile(tempFilePath);
            
            return {
                success: true,
                fileName,
                fileType: this.getFileType(fileExt),
                content: result.content,
                metadata: result.metadata,
                analysis: result.analysis,
                suggestions: result.suggestions
            };
            
        } catch (error) {
            console.error('Document processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Validate uploaded file
    validateFile(fileBuffer, fileName) {
        // Check file size
        if (fileBuffer.length > this.maxFileSize) {
            return {
                valid: false,
                error: `Файл слишком большой. Максимальный размер: ${this.maxFileSize / 1024 / 1024}MB`
            };
        }
        
        // Check file extension
        const fileExt = path.extname(fileName).toLowerCase();
        const allSupportedFormats = [
            ...this.supportedFormats.documents,
            ...this.supportedFormats.images,
            ...this.supportedFormats.spreadsheets,
            ...this.supportedFormats.presentations
        ];
        
        if (!allSupportedFormats.includes(fileExt)) {
            return {
                valid: false,
                error: `Неподдерживаемый формат файла: ${fileExt}`
            };
        }
        
        // Check file content (basic magic number validation)
        const magicNumbers = {
            '.pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
            '.jpg': [0xFF, 0xD8, 0xFF],
            '.png': [0x89, 0x50, 0x4E, 0x47],
            '.docx': [0x50, 0x4B, 0x03, 0x04], // ZIP signature
            '.xlsx': [0x50, 0x4B, 0x03, 0x04]  // ZIP signature
        };
        
        const expectedMagic = magicNumbers[fileExt];
        if (expectedMagic) {
            const fileMagic = Array.from(fileBuffer.slice(0, expectedMagic.length));
            if (!expectedMagic.every((byte, index) => byte === fileMagic[index])) {
                return {
                    valid: false,
                    error: 'Файл поврежден или имеет неверный формат'
                };
            }
        }
        
        return { valid: true };
    }
    
    // Save temporary file
    async saveTempFile(fileBuffer, fileName, userId) {
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const tempFileName = `${userId}_${timestamp}_${sanitizedFileName}`;
        const tempFilePath = path.join(this.tempDir, tempFileName);
        
        await fs.promises.writeFile(tempFilePath, fileBuffer);
        return tempFilePath;
    }
    
    // Process text documents (PDF, DOC, DOCX, TXT)
    async processTextDocument(filePath, fileName) {
        console.log(`Processing text document: ${fileName}`);
        
        try {
            // Extract text content
            const content = await this.extractTextContent(filePath);
            
            // Analyze document structure
            const metadata = this.analyzeDocumentStructure(content);
            
            // Perform legal analysis
            const analysis = await this.performLegalAnalysis(content, 'contract');
            
            // Generate suggestions
            const suggestions = this.generateDocumentSuggestions(content, analysis);
            
            return {
                content,
                metadata,
                analysis,
                suggestions
            };
            
        } catch (error) {
            console.error('Text document processing error:', error);
            throw new Error(`Ошибка обработки документа: ${error.message}`);
        }
    }
    
    // Process image documents (OCR)
    async processImageDocument(filePath, fileName) {
        console.log(`Processing image document: ${fileName}`);
        
        try {
            // Perform OCR
            const ocrResult = await this.performOCR(filePath);
            
            // Analyze extracted text
            const metadata = this.analyzeDocumentStructure(ocrResult.text);
            
            // Perform legal analysis
            const analysis = await this.performLegalAnalysis(ocrResult.text, 'scanned_document');
            
            // Generate suggestions
            const suggestions = this.generateDocumentSuggestions(ocrResult.text, analysis);
            
            return {
                content: ocrResult.text,
                metadata: {
                    ...metadata,
                    ocrConfidence: ocrResult.confidence,
                    imageInfo: ocrResult.imageInfo
                },
                analysis,
                suggestions
            };
            
        } catch (error) {
            console.error('Image document processing error:', error);
            throw new Error(`Ошибка OCR обработки: ${error.message}`);
        }
    }
    
    // Process spreadsheets
    async processSpreadsheet(filePath, fileName) {
        console.log(`Processing spreadsheet: ${fileName}`);
        
        try {
            // Extract spreadsheet data
            const data = await this.extractSpreadsheetData(filePath);
            
            // Analyze data structure
            const metadata = this.analyzeSpreadsheetStructure(data);
            
            // Perform financial analysis if applicable
            const analysis = await this.performFinancialAnalysis(data);
            
            // Generate suggestions
            const suggestions = this.generateSpreadsheetSuggestions(data, analysis);
            
            return {
                content: this.formatSpreadsheetContent(data),
                metadata,
                analysis,
                suggestions
            };
            
        } catch (error) {
            console.error('Spreadsheet processing error:', error);
            throw new Error(`Ошибка обработки таблицы: ${error.message}`);
        }
    }
    
    // Extract text content from various formats
    async extractTextContent(filePath) {
        const fileExt = path.extname(filePath).toLowerCase();
        
        switch (fileExt) {
            case '.txt':
                return await fs.promises.readFile(filePath, 'utf8');
                
            case '.pdf':
                return await this.extractPDFText(filePath);
                
            case '.docx':
                return await this.extractDOCXText(filePath);
                
            case '.doc':
                return await this.extractDOCText(filePath);
                
            default:
                throw new Error(`Неподдерживаемый формат для извлечения текста: ${fileExt}`);
        }
    }
    
    // Extract text from PDF (simplified implementation)
    async extractPDFText(filePath) {
        // In a real implementation, you would use a library like pdf-parse
        // For now, return a placeholder
        return `[PDF содержимое из файла ${path.basename(filePath)}]\n\nЭто демонстрационный текст, извлеченный из PDF документа. В реальной реализации здесь был бы фактический текст документа.`;
    }
    
    // Extract text from DOCX
    async extractDOCXText(filePath) {
        // In a real implementation, you would use a library like mammoth or docx-parser
        return `[DOCX содержимое из файла ${path.basename(filePath)}]\n\nЭто демонстрационный текст, извлеченный из DOCX документа. В реальной реализации здесь был бы фактический текст документа.`;
    }
    
    // Extract text from DOC
    async extractDOCText(filePath) {
        // In a real implementation, you would use a library like antiword or textract
        return `[DOC содержимое из файла ${path.basename(filePath)}]\n\nЭто демонстрационный текст, извлеченный из DOC документа. В реальной реализации здесь был бы фактический текст документа.`;
    }
    
    // Perform OCR on image
    async performOCR(filePath) {
        // In a real implementation, you would use Tesseract.js or Google Vision API
        return {
            text: `[OCR текст из изображения ${path.basename(filePath)}]\n\nЭто демонстрационный текст, извлеченный с помощью OCR. В реальной реализации здесь был бы фактический распознанный текст.`,
            confidence: 0.95,
            imageInfo: {
                width: 1920,
                height: 1080,
                format: 'PNG'
            }
        };
    }
    
    // Extract data from spreadsheet
    async extractSpreadsheetData(filePath) {
        // In a real implementation, you would use a library like xlsx or csv-parser
        return {
            sheets: [
                {
                    name: 'Лист1',
                    data: [
                        ['Наименование', 'Количество', 'Цена', 'Сумма'],
                        ['Товар 1', '10', '100', '1000'],
                        ['Товар 2', '5', '200', '1000'],
                        ['Итого', '', '', '2000']
                    ]
                }
            ]
        };
    }
    
    // Analyze document structure
    analyzeDocumentStructure(content) {
        const lines = content.split('\n');
        const words = content.split(/\s+/).filter(word => word.length > 0);
        
        // Detect document type based on keywords
        const contractKeywords = ['договор', 'соглашение', 'контракт', 'сторона', 'обязательство'];
        const invoiceKeywords = ['счет', 'инвойс', 'к оплате', 'сумма', 'НДС'];
        const letterKeywords = ['уважаемый', 'письмо', 'обращение', 'просим', 'сообщаем'];
        
        const documentType = this.detectDocumentType(content, {
            contract: contractKeywords,
            invoice: invoiceKeywords,
            letter: letterKeywords
        });
        
        // Extract key information
        const entities = this.extractEntities(content);
        
        return {
            documentType,
            lineCount: lines.length,
            wordCount: words.length,
            characterCount: content.length,
            language: this.detectLanguage(content),
            entities,
            structure: this.analyzeStructure(lines)
        };
    }
    
    // Detect document type
    detectDocumentType(content, keywordSets) {
        const lowerContent = content.toLowerCase();
        let maxScore = 0;
        let detectedType = 'unknown';
        
        for (const [type, keywords] of Object.entries(keywordSets)) {
            const score = keywords.reduce((sum, keyword) => {
                const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
                return sum + matches;
            }, 0);
            
            if (score > maxScore) {
                maxScore = score;
                detectedType = type;
            }
        }
        
        return detectedType;
    }
    
    // Extract entities (companies, dates, amounts, etc.)
    extractEntities(content) {
        const entities = {
            companies: [],
            dates: [],
            amounts: [],
            emails: [],
            phones: [],
            inns: []
        };
        
        // Extract INNs
        const innRegex = /\b\d{10,12}\b/g;
        entities.inns = [...new Set((content.match(innRegex) || []))];
        
        // Extract emails
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        entities.emails = [...new Set((content.match(emailRegex) || []))];
        
        // Extract phone numbers
        const phoneRegex = /\+?[78][\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g;
        entities.phones = [...new Set((content.match(phoneRegex) || []))];
        
        // Extract dates
        const dateRegex = /\b\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}\b/g;
        entities.dates = [...new Set((content.match(dateRegex) || []))];
        
        // Extract amounts
        const amountRegex = /\b\d+[\s,]?\d*[.,]?\d*\s?(?:руб|₽|рублей|копеек)\b/gi;
        entities.amounts = [...new Set((content.match(amountRegex) || []))];
        
        return entities;
    }
    
    // Analyze document structure
    analyzeStructure(lines) {
        const structure = {
            headers: [],
            paragraphs: 0,
            lists: 0,
            tables: 0
        };
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Detect headers (lines with specific patterns)
            if (trimmedLine.length > 0 && trimmedLine.length < 100) {
                if (trimmedLine.match(/^[А-ЯЁ\s]+$/)) {
                    structure.headers.push({
                        text: trimmedLine,
                        line: index + 1
                    });
                }
            }
            
            // Count paragraphs
            if (trimmedLine.length > 50) {
                structure.paragraphs++;
            }
            
            // Detect lists
            if (trimmedLine.match(/^[\d\-\*\•]\s/)) {
                structure.lists++;
            }
            
            // Detect tables (simplified)
            if (trimmedLine.includes('|') || trimmedLine.match(/\t.*\t/)) {
                structure.tables++;
            }
        });
        
        return structure;
    }
    
    // Detect language
    detectLanguage(content) {
        const russianChars = (content.match(/[а-яё]/gi) || []).length;
        const englishChars = (content.match(/[a-z]/gi) || []).length;
        
        if (russianChars > englishChars) {
            return 'ru';
        } else if (englishChars > russianChars) {
            return 'en';
        } else {
            return 'mixed';
        }
    }
    
    // Perform legal analysis using AI
    async performLegalAnalysis(content, documentType) {
        try {
            // This would integrate with OpenAI API for legal analysis
            const analysis = {
                documentType,
                riskLevel: this.calculateRiskLevel(content),
                keyTerms: this.extractKeyTerms(content),
                missingClauses: this.identifyMissingClauses(content, documentType),
                recommendations: this.generateRecommendations(content, documentType),
                compliance: this.checkCompliance(content),
                summary: this.generateSummary(content)
            };
            
            return analysis;
            
        } catch (error) {
            console.error('Legal analysis error:', error);
            return {
                error: 'Ошибка при проведении правового анализа',
                documentType
            };
        }
    }
    
    // Calculate risk level
    calculateRiskLevel(content) {
        const riskFactors = [
            'без гарантии',
            'исключение ответственности',
            'форс-мажор',
            'одностороннее расторжение',
            'неустойка',
            'штраф'
        ];
        
        const riskCount = riskFactors.reduce((count, factor) => {
            return count + (content.toLowerCase().includes(factor) ? 1 : 0);
        }, 0);
        
        if (riskCount >= 4) return 'high';
        if (riskCount >= 2) return 'medium';
        return 'low';
    }
    
    // Extract key terms
    extractKeyTerms(content) {
        const terms = [];
        const legalTerms = [
            'предмет договора',
            'цена',
            'срок исполнения',
            'ответственность',
            'гарантии',
            'форс-мажор',
            'расторжение',
            'споры'
        ];
        
        legalTerms.forEach(term => {
            if (content.toLowerCase().includes(term)) {
                terms.push(term);
            }
        });
        
        return terms;
    }
    
    // Identify missing clauses
    identifyMissingClauses(content, documentType) {
        const requiredClauses = {
            contract: [
                'предмет договора',
                'цена и порядок расчетов',
                'сроки исполнения',
                'ответственность сторон',
                'порядок разрешения споров'
            ],
            invoice: [
                'реквизиты плательщика',
                'реквизиты получателя',
                'сумма к оплате',
                'срок оплаты'
            ]
        };
        
        const required = requiredClauses[documentType] || [];
        const missing = required.filter(clause => 
            !content.toLowerCase().includes(clause.toLowerCase())
        );
        
        return missing;
    }
    
    // Generate recommendations
    generateRecommendations(content, documentType) {
        const recommendations = [];
        
        if (documentType === 'contract') {
            if (!content.toLowerCase().includes('форс-мажор')) {
                recommendations.push('Рекомендуется добавить пункт о форс-мажорных обстоятельствах');
            }
            
            if (!content.toLowerCase().includes('конфиденциальность')) {
                recommendations.push('Рассмотрите добавление пункта о конфиденциальности');
            }
            
            if (!content.toLowerCase().includes('интеллектуальная собственность')) {
                recommendations.push('Уточните права на интеллектуальную собственность');
            }
        }
        
        return recommendations;
    }
    
    // Check compliance
    checkCompliance(content) {
        const compliance = {
            gdpr: false,
            personalData: false,
            antiCorruption: false
        };
        
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('персональные данные') || lowerContent.includes('обработка данных')) {
            compliance.personalData = true;
        }
        
        if (lowerContent.includes('коррупция') || lowerContent.includes('взятка')) {
            compliance.antiCorruption = true;
        }
        
        return compliance;
    }
    
    // Generate summary
    generateSummary(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const summary = sentences.slice(0, 3).join('. ') + '.';
        
        return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
    }
    
    // Generate document suggestions
    generateDocumentSuggestions(content, analysis) {
        const suggestions = [];
        
        if (analysis.riskLevel === 'high') {
            suggestions.push({
                type: 'warning',
                title: 'Высокий уровень риска',
                description: 'Документ содержит потенциально рискованные условия',
                action: 'review_risks'
            });
        }
        
        if (analysis.missingClauses && analysis.missingClauses.length > 0) {
            suggestions.push({
                type: 'improvement',
                title: 'Отсутствующие пункты',
                description: `Рекомендуется добавить: ${analysis.missingClauses.join(', ')}`,
                action: 'add_clauses'
            });
        }
        
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            suggestions.push({
                type: 'recommendation',
                title: 'Рекомендации по улучшению',
                description: analysis.recommendations.join('; '),
                action: 'apply_recommendations'
            });
        }
        
        return suggestions;
    }
    
    // Get file type category
    getFileType(extension) {
        if (this.supportedFormats.documents.includes(extension)) return 'document';
        if (this.supportedFormats.images.includes(extension)) return 'image';
        if (this.supportedFormats.spreadsheets.includes(extension)) return 'spreadsheet';
        if (this.supportedFormats.presentations.includes(extension)) return 'presentation';
        return 'unknown';
    }
    
    // Clean up temporary file
    cleanupTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up temp file: ${filePath}`);
            }
        } catch (error) {
            console.error(`Error cleaning up temp file ${filePath}:`, error);
        }
    }
    
    // Format spreadsheet content for display
    formatSpreadsheetContent(data) {
        let content = '';
        
        data.sheets.forEach(sheet => {
            content += `\n=== ${sheet.name} ===\n\n`;
            
            sheet.data.forEach(row => {
                content += row.join(' | ') + '\n';
            });
        });
        
        return content;
    }
    
    // Analyze spreadsheet structure
    analyzeSpreadsheetStructure(data) {
        const metadata = {
            sheetCount: data.sheets.length,
            totalRows: 0,
            totalColumns: 0,
            hasHeaders: false,
            dataTypes: []
        };
        
        data.sheets.forEach(sheet => {
            metadata.totalRows += sheet.data.length;
            if (sheet.data.length > 0) {
                metadata.totalColumns = Math.max(metadata.totalColumns, sheet.data[0].length);
                
                // Check if first row looks like headers
                const firstRow = sheet.data[0];
                const hasTextHeaders = firstRow.every(cell => 
                    typeof cell === 'string' && isNaN(parseFloat(cell))
                );
                if (hasTextHeaders) {
                    metadata.hasHeaders = true;
                }
            }
        });
        
        return metadata;
    }
    
    // Perform financial analysis
    async performFinancialAnalysis(data) {
        const analysis = {
            totals: {},
            trends: [],
            anomalies: []
        };
        
        // Simple financial analysis
        data.sheets.forEach(sheet => {
            sheet.data.forEach((row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    const numValue = parseFloat(cell);
                    if (!isNaN(numValue) && numValue > 0) {
                        const columnName = `column_${colIndex}`;
                        if (!analysis.totals[columnName]) {
                            analysis.totals[columnName] = 0;
                        }
                        analysis.totals[columnName] += numValue;
                    }
                });
            });
        });
        
        return analysis;
    }
    
    // Generate spreadsheet suggestions
    generateSpreadsheetSuggestions(data, analysis) {
        const suggestions = [];
        
        if (!data.sheets[0] || data.sheets[0].data.length < 2) {
            suggestions.push({
                type: 'warning',
                title: 'Недостаточно данных',
                description: 'Таблица содержит мало данных для анализа',
                action: 'add_data'
            });
        }
        
        if (Object.keys(analysis.totals).length > 0) {
            suggestions.push({
                type: 'info',
                title: 'Финансовые итоги',
                description: `Обнаружены числовые данные в ${Object.keys(analysis.totals).length} колонках`,
                action: 'view_totals'
            });
        }
        
        return suggestions;
    }
}

// Export singleton instance
const advancedDocumentProcessor = new AdvancedDocumentProcessor();
module.exports = advancedDocumentProcessor;

