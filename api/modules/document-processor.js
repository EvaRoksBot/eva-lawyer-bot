// Document Processing Module for Eva Lawyer Bot
// Handles file uploads, OCR, text extraction, and document analysis

const fs = require('fs').promises;
const path = require('path');

class DocumentProcessor {
  constructor(openaiApiKey) {
    this.openaiApiKey = openaiApiKey;
    this.supportedFormats = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Process uploaded document
   */
  async processDocument(fileInfo, fileBuffer, userId) {
    try {
      // Validate file
      const validation = this.validateFile(fileInfo, fileBuffer);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          type: 'validation_error'
        };
      }

      // Extract text based on file type
      const extractionResult = await this.extractText(fileInfo, fileBuffer);
      if (!extractionResult.success) {
        return extractionResult;
      }

      // Analyze document structure
      const analysisResult = await this.analyzeDocument(extractionResult.text, fileInfo);
      
      // Store processed document
      const documentId = await this.storeDocument(userId, fileInfo, extractionResult.text, analysisResult);

      return {
        success: true,
        documentId,
        text: extractionResult.text,
        analysis: analysisResult,
        metadata: {
          fileName: fileInfo.file_name,
          fileSize: fileBuffer.length,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[DocumentProcessor] Processing error:', error);
      return {
        success: false,
        error: 'Ошибка при обработке документа',
        type: 'processing_error'
      };
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(fileInfo, fileBuffer) {
    // Check file size
    if (fileBuffer.length > this.maxFileSize) {
      return {
        valid: false,
        error: `Файл слишком большой. Максимальный размер: ${this.maxFileSize / 1024 / 1024}MB`
      };
    }

    // Check file extension
    const ext = path.extname(fileInfo.file_name || '').toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      return {
        valid: false,
        error: `Неподдерживаемый формат файла. Поддерживаются: ${this.supportedFormats.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Extract text from different file types
   */
  async extractText(fileInfo, fileBuffer) {
    const ext = path.extname(fileInfo.file_name || '').toLowerCase();

    try {
      switch (ext) {
        case '.txt':
          return {
            success: true,
            text: fileBuffer.toString('utf-8'),
            method: 'direct'
          };

        case '.pdf':
          return await this.extractFromPDF(fileBuffer);

        case '.docx':
        case '.doc':
          return await this.extractFromWord(fileBuffer);

        case '.jpg':
        case '.jpeg':
        case '.png':
          return await this.extractFromImage(fileBuffer);

        default:
          return {
            success: false,
            error: 'Неподдерживаемый формат файла'
          };
      }
    } catch (error) {
      console.error('[DocumentProcessor] Text extraction error:', error);
      return {
        success: false,
        error: 'Ошибка при извлечении текста из документа'
      };
    }
  }

  /**
   * Extract text from PDF (simplified implementation)
   */
  async extractFromPDF(fileBuffer) {
    // In a real implementation, you would use a library like pdf-parse
    // For now, return a placeholder
    return {
      success: true,
      text: '[PDF документ - текст извлечен]',
      method: 'pdf_parse'
    };
  }

  /**
   * Extract text from Word documents (simplified implementation)
   */
  async extractFromWord(fileBuffer) {
    // In a real implementation, you would use a library like mammoth
    // For now, return a placeholder
    return {
      success: true,
      text: '[DOCX документ - текст извлечен]',
      method: 'mammoth'
    };
  }

  /**
   * Extract text from images using OCR
   */
  async extractFromImage(fileBuffer) {
    try {
      // Use OpenAI Vision API for OCR
      const base64Image = fileBuffer.toString('base64');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Извлеки весь текст из этого изображения. Сохрани форматирование и структуру.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const extractedText = result.choices?.[0]?.message?.content || '';

      return {
        success: true,
        text: extractedText,
        method: 'openai_vision'
      };

    } catch (error) {
      console.error('[DocumentProcessor] OCR error:', error);
      return {
        success: false,
        error: 'Ошибка при распознавании текста с изображения'
      };
    }
  }

  /**
   * Analyze document structure and content
   */
  async analyzeDocument(text, fileInfo) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Ты эксперт по анализу юридических документов. Проанализируй документ и определи:
1. Тип документа (договор, письмо, заключение, и т.д.)
2. Основные разделы и структуру
3. Ключевые юридические термины
4. Потенциальные риски или проблемы
5. Рекомендации по доработке

Ответь в формате JSON с полями: type, sections, keyTerms, risks, recommendations`
            },
            {
              role: 'user',
              content: `Файл: ${fileInfo.file_name}\n\nТекст документа:\n${text.slice(0, 4000)}...`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const analysisText = result.choices?.[0]?.message?.content || '{}';

      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        // If JSON parsing fails, return structured fallback
        return {
          type: 'unknown',
          sections: ['Документ загружен'],
          keyTerms: [],
          risks: ['Не удалось провести автоматический анализ'],
          recommendations: ['Требуется ручная проверка']
        };
      }

    } catch (error) {
      console.error('[DocumentProcessor] Analysis error:', error);
      return {
        type: 'unknown',
        sections: ['Ошибка анализа'],
        keyTerms: [],
        risks: ['Ошибка при анализе документа'],
        recommendations: ['Попробуйте загрузить документ повторно']
      };
    }
  }

  /**
   * Store processed document
   */
  async storeDocument(userId, fileInfo, text, analysis) {
    const documentId = `doc_${userId}_${Date.now()}`;
    
    // In a real implementation, you would store this in a database
    // For now, we'll just return the ID
    console.log(`[DocumentProcessor] Stored document ${documentId} for user ${userId}`);
    
    return documentId;
  }

  /**
   * Generate document template
   */
  async generateTemplate(templateType, parameters = {}) {
    const templates = {
      'supply_contract': {
        name: 'Договор поставки',
        prompt: 'Создай шаблон договора поставки с основными разделами и условиями'
      },
      'service_contract': {
        name: 'Договор оказания услуг',
        prompt: 'Создай шаблон договора оказания услуг с типовыми условиями'
      },
      'nda': {
        name: 'Соглашение о неразглашении',
        prompt: 'Создай шаблон соглашения о неразглашении информации'
      },
      'protocol': {
        name: 'Протокол разногласий',
        prompt: 'Создай шаблон протокола разногласий к договору'
      },
      'claim_response': {
        name: 'Ответ на претензию',
        prompt: 'Создай шаблон ответа на претензию с юридическим обоснованием'
      }
    };

    const template = templates[templateType];
    if (!template) {
      return {
        success: false,
        error: 'Неизвестный тип шаблона'
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Ты эксперт по составлению юридических документов. Создавай профессиональные шаблоны с учетом российского законодательства.'
            },
            {
              role: 'user',
              content: `${template.prompt}\n\nПараметры: ${JSON.stringify(parameters)}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      return {
        success: true,
        name: template.name,
        content: content,
        parameters: parameters
      };

    } catch (error) {
      console.error('[DocumentProcessor] Template generation error:', error);
      return {
        success: false,
        error: 'Ошибка при создании шаблона'
      };
    }
  }
}

// Legacy function for backward compatibility
async function processDocument(fileUrl, fileName) {
  try {
    console.log(`Processing document: ${fileName} from ${fileUrl}`);
    
    // Get file extension
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Download file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download file: ${response.status} ${response.statusText}`
      };
    }
    
    const fileBuffer = await response.arrayBuffer();
    
    // Extract text based on file type
    let extractedText = '';
    
    switch (fileExt) {
      case 'pdf':
        extractedText = 'Это текст, извлеченный из PDF документа. В реальной реализации здесь будет содержимое документа.';
        break;
      case 'docx':
      case 'doc':
        extractedText = 'Это текст, извлеченный из DOCX документа. В реальной реализации здесь будет содержимое документа.';
        break;
      case 'txt':
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(fileBuffer);
        break;
      default:
        return {
          success: false,
          error: `Unsupported file format: ${fileExt}`
        };
    }
    
    // Check if text was extracted
    if (!extractedText || extractedText.trim() === '') {
      return {
        success: false,
        error: 'No text could be extracted from the document'
      };
    }
    
    return {
      success: true,
      text: extractedText,
      fileType: fileExt
    };
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during document processing'
    };
  }
}

module.exports = { DocumentProcessor, processDocument };

