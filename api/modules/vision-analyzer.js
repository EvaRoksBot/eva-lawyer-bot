// Advanced Vision Analyzer for Eva Lawyer Bot
// Handles image analysis, OCR, and visual document processing

const OpenAI = require('openai');

class VisionAnalyzer {
    constructor() {
        this.supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
        this.maxImageSize = 20 * 1024 * 1024; // 20MB
        this.ocrLanguages = ['rus', 'eng'];
        
        // Document type detection patterns
        this.documentPatterns = {
            contract: {
                keywords: ['договор', 'соглашение', 'контракт', 'сторона'],
                visualMarkers: ['печать', 'подпись', 'штамп']
            },
            invoice: {
                keywords: ['счет', 'инвойс', 'к оплате', 'НДС'],
                visualMarkers: ['таблица', 'сумма', 'итого']
            },
            passport: {
                keywords: ['паспорт', 'гражданин', 'выдан'],
                visualMarkers: ['фото', 'герб', 'серия']
            },
            certificate: {
                keywords: ['сертификат', 'свидетельство', 'удостоверяет'],
                visualMarkers: ['печать', 'подпись', 'номер']
            }
        };
    }
    
    // Legacy method for backward compatibility
    async analyzeImage(imageUrl, apiKey) {
        try {
            console.log(`Analyzing image from ${imageUrl}`);
            
            // Initialize OpenAI client
            const openai = new OpenAI({ apiKey });
            
            // Enhanced prompt for better extraction
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { 
                                type: "text", 
                                text: `Проанализируй это изображение документа и извлеки всю информацию:

1. ТЕКСТ: Извлеки весь текст, сохраняя структуру и форматирование
2. ТИП ДОКУМЕНТА: Определи тип (договор, счет, паспорт, сертификат, др.)
3. КЛЮЧЕВЫЕ ДАННЫЕ: Найди важные поля (номера, даты, суммы, ИНН, имена)
4. СТРУКТУРА: Опиши разделы и их содержание
5. КАЧЕСТВО: Оцени читаемость и полноту

Если текст на иностранном языке, переведи на русский.
Если документ неполный или нечеткий, укажи это.

Ответ структурируй в JSON формате:
{
  "text": "полный извлеченный текст",
  "documentType": "тип документа",
  "keyData": {
    "numbers": ["номера"],
    "dates": ["даты"],
    "amounts": ["суммы"],
    "inns": ["ИНН"],
    "names": ["имена"]
  },
  "structure": ["разделы"],
  "quality": "оценка качества",
  "confidence": 0.95
}` 
                            },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                max_tokens: 4096
            });
            
            // Extract response
            const content = response.choices[0]?.message?.content || '';
            
            if (!content || content.trim() === '') {
                return {
                    success: false,
                    error: 'No content could be extracted from the image'
                };
            }
            
            // Try to parse JSON response
            let structuredData = null;
            try {
                // Extract JSON from response if it's wrapped in markdown
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    structuredData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                }
            } catch (parseError) {
                console.log('Could not parse JSON, using text response');
            }
            
            return {
                success: true,
                text: structuredData?.text || content,
                documentType: structuredData?.documentType || 'unknown',
                keyData: structuredData?.keyData || {},
                structure: structuredData?.structure || [],
                quality: structuredData?.quality || 'unknown',
                confidence: structuredData?.confidence || 0.8,
                rawResponse: content
            };
            
        } catch (error) {
            console.error('Image analysis error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error during image analysis'
            };
        }
    }
    
    // Advanced image analysis with full processing
    async analyzeImageAdvanced(imageBuffer, fileName, userId, apiKey) {
        try {
            console.log(`Advanced analysis of ${fileName} for user ${userId}`);
            
            // Validate image
            const validation = this.validateImage(imageBuffer, fileName);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Convert buffer to base64 for OpenAI
            const base64Image = imageBuffer.toString('base64');
            const mimeType = this.getMimeType(fileName);
            const dataUrl = `data:${mimeType};base64,${base64Image}`;
            
            // Use legacy method for OpenAI analysis
            const oaiResult = await this.analyzeImage(dataUrl, apiKey);
            
            if (!oaiResult.success) {
                throw new Error(oaiResult.error);
            }
            
            // Get image metadata
            const metadata = await this.getImageMetadata(imageBuffer);
            
            // Detect document type
            const documentType = this.detectDocumentType(oaiResult.text, metadata);
            
            // Extract structured data
            const structuredData = await this.extractStructuredData(oaiResult.text, documentType);
            
            // Generate insights
            const insights = this.generateInsights(oaiResult, structuredData, metadata);
            
            return {
                success: true,
                fileName,
                metadata,
                ocr: {
                    text: oaiResult.text,
                    confidence: oaiResult.confidence || 0.8,
                    documentType: oaiResult.documentType,
                    keyData: oaiResult.keyData
                },
                documentType,
                structuredData,
                insights,
                confidence: oaiResult.confidence || 0.8
            };
            
        } catch (error) {
            console.error('Advanced image analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Validate image file
    validateImage(imageBuffer, fileName) {
        // Check file size
        if (imageBuffer.length > this.maxImageSize) {
            return {
                valid: false,
                error: `Изображение слишком большое. Максимальный размер: ${this.maxImageSize / 1024 / 1024}MB`
            };
        }
        
        // Check file extension
        const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        if (!this.supportedImageFormats.includes(fileExt)) {
            return {
                valid: false,
                error: `Неподдерживаемый формат изображения: ${fileExt}`
            };
        }
        
        return { valid: true };
    }
    
    // Get MIME type from filename
    getMimeType(fileName) {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }
    
    // Get image metadata
    async getImageMetadata(imageBuffer) {
        return {
            format: 'JPEG',
            size: imageBuffer.length,
            quality: 'high'
        };
    }
    
    // Detect document type
    detectDocumentType(text, metadata) {
        const lowerText = text.toLowerCase();
        let maxScore = 0;
        let detectedType = 'unknown';
        
        for (const [type, patterns] of Object.entries(this.documentPatterns)) {
            let score = 0;
            
            // Check keywords
            patterns.keywords.forEach(keyword => {
                const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
                score += matches * 2;
            });
            
            // Check visual markers
            patterns.visualMarkers.forEach(marker => {
                if (lowerText.includes(marker)) {
                    score += 1;
                }
            });
            
            if (score > maxScore) {
                maxScore = score;
                detectedType = type;
            }
        }
        
        return {
            type: detectedType,
            confidence: Math.min(maxScore / 10, 1.0)
        };
    }
    
    // Extract structured data based on document type
    async extractStructuredData(text, documentType) {
        const structuredData = {};
        
        switch (documentType.type) {
            case 'contract':
                structuredData.contract = this.extractContractData(text);
                break;
                
            case 'invoice':
                structuredData.invoice = this.extractInvoiceData(text);
                break;
                
            case 'passport':
                structuredData.passport = this.extractPassportData(text);
                break;
                
            default:
                structuredData.general = this.extractGeneralData(text);
        }
        
        return structuredData;
    }
    
    // Extract contract data
    extractContractData(text) {
        const data = {
            number: null,
            date: null,
            parties: [],
            amount: null,
            deadline: null
        };
        
        // Extract contract number
        const numberMatch = text.match(/№\s*(\d+[\/\-\d]*)/i);
        if (numberMatch) {
            data.number = numberMatch[1];
        }
        
        // Extract dates
        const dateMatches = text.match(/\d{1,2}\.\d{1,2}\.\d{4}/g);
        if (dateMatches) {
            data.date = dateMatches[0];
            if (dateMatches.length > 1) {
                data.deadline = dateMatches[dateMatches.length - 1];
            }
        }
        
        // Extract INNs
        const innMatches = text.match(/ИНН:\s*(\d{10,12})/g);
        if (innMatches) {
            data.parties = innMatches.map(match => {
                const inn = match.match(/\d{10,12}/)[0];
                return { inn, type: 'organization' };
            });
        }
        
        // Extract amounts
        const amountMatch = text.match(/(\d+[\s,]?\d*)\s*(?:руб|₽|рублей)/i);
        if (amountMatch) {
            data.amount = amountMatch[1].replace(/\s/g, '');
        }
        
        return data;
    }
    
    // Extract invoice data
    extractInvoiceData(text) {
        const data = {
            number: null,
            date: null,
            total: null,
            vat: null
        };
        
        // Extract invoice number
        const numberMatch = text.match(/№\s*(\d+)/i);
        if (numberMatch) {
            data.number = numberMatch[1];
        }
        
        // Extract date
        const dateMatch = text.match(/\d{1,2}\.\d{1,2}\.\d{4}/);
        if (dateMatch) {
            data.date = dateMatch[0];
        }
        
        // Extract total amount
        const totalMatch = text.match(/ВСЕГО К ОПЛАТЕ:\s*([0-9,.\s]+)/i);
        if (totalMatch) {
            data.total = totalMatch[1].replace(/\s/g, '');
        }
        
        return data;
    }
    
    // Extract passport data
    extractPassportData(text) {
        const data = {
            series: null,
            number: null,
            lastName: null,
            firstName: null,
            birthDate: null
        };
        
        // Extract series and number
        const seriesNumberMatch = text.match(/Серия:\s*(\d{2}\s*\d{2})\s*Номер:\s*(\d{6})/i);
        if (seriesNumberMatch) {
            data.series = seriesNumberMatch[1];
            data.number = seriesNumberMatch[2];
        }
        
        // Extract names
        const lastNameMatch = text.match(/Фамилия:\s*([А-ЯЁ]+)/i);
        if (lastNameMatch) data.lastName = lastNameMatch[1];
        
        const firstNameMatch = text.match(/Имя:\s*([А-ЯЁ]+)/i);
        if (firstNameMatch) data.firstName = firstNameMatch[1];
        
        // Extract birth date
        const birthDateMatch = text.match(/Дата рождения:\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
        if (birthDateMatch) data.birthDate = birthDateMatch[1];
        
        return data;
    }
    
    // Extract general data
    extractGeneralData(text) {
        return {
            dates: text.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [],
            numbers: text.match(/№\s*([А-Я0-9\-\/]+)/gi) || [],
            emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
            phones: text.match(/\+?[78][\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g) || [],
            inns: text.match(/\b\d{10,12}\b/g) || []
        };
    }
    
    // Generate insights
    generateInsights(ocrResult, structuredData, metadata) {
        const insights = [];
        
        // OCR quality insights
        if (ocrResult.confidence < 0.8) {
            insights.push({
                type: 'warning',
                category: 'ocr_quality',
                message: 'Низкое качество распознавания текста',
                suggestion: 'Попробуйте загрузить изображение лучшего качества'
            });
        }
        
        // Document completeness
        const hasRequiredElements = this.checkDocumentCompleteness(structuredData);
        if (!hasRequiredElements) {
            insights.push({
                type: 'info',
                category: 'completeness',
                message: 'Документ может быть неполным',
                suggestion: 'Проверьте наличие всех необходимых разделов'
            });
        }
        
        return insights;
    }
    
    // Check document completeness
    checkDocumentCompleteness(structuredData) {
        for (const [key, data] of Object.entries(structuredData)) {
            if (typeof data === 'object' && data !== null) {
                const filledFields = Object.values(data).filter(value => value !== null && value !== '').length;
                const totalFields = Object.keys(data).length;
                
                if (filledFields / totalFields > 0.5) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

// Export singleton instance and legacy function
const visionAnalyzer = new VisionAnalyzer();

module.exports = {
    analyzeImage: visionAnalyzer.analyzeImage.bind(visionAnalyzer),
    analyzeImageAdvanced: visionAnalyzer.analyzeImageAdvanced.bind(visionAnalyzer),
    visionAnalyzer
};

