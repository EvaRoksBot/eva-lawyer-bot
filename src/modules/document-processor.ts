/**
 * Document Processing Module for Eva Lawyer Bot
 * Handles file processing, OCR, and text extraction from various formats
 */

import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentProcessingResult {
  success: boolean;
  text?: string;
  documentType?: string;
  metadata?: DocumentMetadata;
  error?: string;
  filePath?: string;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  pages?: number;
  language?: string;
  confidence?: number;
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

/**
 * Document processor class for handling various file types
 */
export class DocumentProcessor {
  private tempDir: string;
  private telegramToken: string;

  constructor(telegramToken: string) {
    this.telegramToken = telegramToken;
    this.tempDir = join(tmpdir(), 'eva-bot-documents');
    this.ensureTempDir();
  }

  /**
   * Ensure temporary directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Download file from Telegram
   */
  async downloadTelegramFile(fileId: string): Promise<string | null> {
    try {
      // Get file info from Telegram
      const fileInfoResponse = await fetch(
        `https://api.telegram.org/bot${this.telegramToken}/getFile?file_id=${fileId}`
      );
      
      if (!fileInfoResponse.ok) {
        throw new Error(`Failed to get file info: ${fileInfoResponse.status}`);
      }

      const fileInfo = await fileInfoResponse.json();
      if (!fileInfo.ok || !fileInfo.result.file_path) {
        throw new Error('Invalid file info response');
      }

      // Download file
      const fileUrl = `https://api.telegram.org/file/bot${this.telegramToken}/${fileInfo.result.file_path}`;
      const fileResponse = await fetch(fileUrl);
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status}`);
      }

      // Save to temporary file
      const fileName = `${uuidv4()}_${fileInfo.result.file_path.split('/').pop()}`;
      const filePath = join(this.tempDir, fileName);
      
      const buffer = await fileResponse.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));

      return filePath;
    } catch (error) {
      console.error('Error downloading Telegram file:', error);
      return null;
    }
  }

  /**
   * Process document based on file type
   */
  async processDocument(
    fileId: string, 
    fileName: string, 
    mimeType: string, 
    fileSize?: number
  ): Promise<DocumentProcessingResult> {
    try {
      console.log('Processing document:', { fileName, mimeType, fileSize });

      // Download file from Telegram
      const filePath = await this.downloadTelegramFile(fileId);
      if (!filePath) {
        return {
          success: false,
          error: 'Не удалось загрузить файл из Telegram'
        };
      }

      const metadata: DocumentMetadata = {
        fileName,
        fileSize: fileSize || 0,
        mimeType
      };

      let result: DocumentProcessingResult;

      // Process based on file type
      if (mimeType.includes('pdf')) {
        result = await this.processPDF(filePath, metadata);
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        result = await this.processWord(filePath, metadata);
      } else if (mimeType.includes('image')) {
        result = await this.processImage(filePath, metadata);
      } else if (mimeType.includes('text')) {
        result = await this.processText(filePath, metadata);
      } else {
        result = {
          success: false,
          error: `Неподдерживаемый тип файла: ${mimeType}`,
          metadata
        };
      }

      // Clean up temporary file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }

      return result;

    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка при обработке документа'
      };
    }
  }

  /**
   * Process PDF files
   */
  private async processPDF(filePath: string, metadata: DocumentMetadata): Promise<DocumentProcessingResult> {
    try {
      // For serverless environment, we'll use a simple approach
      // In production, you might want to use pdf-parse or similar libraries
      
      // For now, return a placeholder that indicates PDF processing capability
      return {
        success: true,
        text: 'PDF файл получен. Для полной обработки PDF требуется установка дополнительных библиотек.',
        documentType: 'PDF',
        metadata: {
          ...metadata,
          pages: 1 // Placeholder
        },
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка обработки PDF: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        metadata
      };
    }
  }

  /**
   * Process Word documents
   */
  private async processWord(filePath: string, metadata: DocumentMetadata): Promise<DocumentProcessingResult> {
    try {
      // For serverless environment, we'll use a simple approach
      // In production, you might want to use mammoth or similar libraries
      
      return {
        success: true,
        text: 'Word документ получен. Для полной обработки DOCX требуется установка дополнительных библиотек.',
        documentType: 'Word',
        metadata,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка обработки Word документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        metadata
      };
    }
  }

  /**
   * Process images with OCR
   */
  private async processImage(filePath: string, metadata: DocumentMetadata): Promise<DocumentProcessingResult> {
    try {
      // For serverless environment, we'll use OpenAI Vision API for OCR
      // This is more suitable for Vercel deployment than Tesseract
      
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      return {
        success: true,
        text: `Изображение получено (${Math.round(imageBuffer.length / 1024)}KB). Готово для анализа с помощью OpenAI Vision.`,
        documentType: 'Image',
        metadata: {
          ...metadata,
          confidence: 0.95
        },
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка обработки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        metadata
      };
    }
  }

  /**
   * Process text files
   */
  private async processText(filePath: string, metadata: DocumentMetadata): Promise<DocumentProcessingResult> {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      
      return {
        success: true,
        text: text.trim(),
        documentType: 'Text',
        metadata,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка чтения текстового файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        metadata
      };
    }
  }

  /**
   * Analyze document with OpenAI Vision (for images)
   */
  async analyzeImageWithVision(filePath: string, prompt: string = "Извлеки весь текст из этого изображения"): Promise<string> {
    try {
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(filePath);

      // This would integrate with OpenAI Vision API
      // For now, return a placeholder
      return `Анализ изображения с помощью OpenAI Vision:\n\nПромпт: ${prompt}\n\nИзображение готово для обработки (${Math.round(imageBuffer.length / 1024)}KB, ${mimeType})`;
      
    } catch (error) {
      console.error('Error analyzing image with Vision:', error);
      return 'Ошибка анализа изображения с помощью OpenAI Vision';
    }
  }

  /**
   * Get MIME type from file path
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Determine document type and generate appropriate prompt
   */
  determineDocumentTypeAndPrompt(text: string, fileName: string): { documentType: string; analysisPrompt: string } {
    const lowerText = text.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // Contract detection
    if (lowerText.includes('договор') || lowerText.includes('соглашение') || 
        lowerText.includes('контракт') || lowerFileName.includes('договор')) {
      return {
        documentType: 'Договор',
        analysisPrompt: `Проанализируй этот договор и предоставь:
1. Тип договора и его основные характеристики
2. Стороны договора (наименования, реквизиты)
3. Предмет договора
4. Существенные условия (цена, сроки, порядок исполнения)
5. Права и обязанности сторон
6. Ответственность и штрафные санкции
7. Выявленные риски и проблемные моменты
8. Рекомендации по улучшению договора

Текст договора:
${text}`
      };
    }

    // Court decision detection
    if (lowerText.includes('решение') && (lowerText.includes('суд') || lowerText.includes('дело')) ||
        lowerText.includes('постановление') || lowerText.includes('определение')) {
      return {
        documentType: 'Судебное решение',
        analysisPrompt: `Проанализируй это судебное решение и предоставь:
1. Суд, принявший решение
2. Номер дела и дата
3. Стороны по делу
4. Суть спора
5. Правовые основания решения
6. Резолютивная часть
7. Возможность и основания для обжалования
8. Практическое значение решения

Текст решения:
${text}`
      };
    }

    // Corporate documents detection
    if (lowerText.includes('устав') || lowerText.includes('протокол') || 
        lowerText.includes('решение единственного участника') || lowerText.includes('учредительный')) {
      return {
        documentType: 'Корпоративный документ',
        analysisPrompt: `Проанализируй этот корпоративный документ и предоставь:
1. Тип документа
2. Организация, к которой относится документ
3. Основные положения и решения
4. Соответствие требованиям законодательства
5. Выявленные недостатки или риски
6. Рекомендации по доработке

Текст документа:
${text}`
      };
    }

    // Legal opinion/consultation detection
    if (lowerText.includes('заключение') || lowerText.includes('правовое мнение') || 
        lowerText.includes('консультация') || lowerText.includes('анализ')) {
      return {
        documentType: 'Правовое заключение',
        analysisPrompt: `Проанализируй это правовое заключение и предоставь:
1. Предмет анализа
2. Правовые основания и нормы
3. Основные выводы
4. Риски и рекомендации
5. Качество правового анализа
6. Дополнительные соображения

Текст заключения:
${text}`
      };
    }

    // Complaint/claim detection
    if (lowerText.includes('жалоба') || lowerText.includes('претензия') || 
        lowerText.includes('исковое заявление') || lowerText.includes('заявление')) {
      return {
        documentType: 'Обращение/Жалоба',
        analysisPrompt: `Проанализируй это обращение и предоставь:
1. Тип обращения (жалоба, претензия, иск)
2. Заявитель и адресат
3. Суть требований или жалобы
4. Правовые основания
5. Приложенные документы
6. Оценка обоснованности требований
7. Рекомендации по рассмотрению

Текст обращения:
${text}`
      };
    }

    // Default case
    return {
      documentType: 'Юридический документ',
      analysisPrompt: `Проанализируй этот юридический документ и предоставь:
1. Определение типа документа
2. Основное содержание
3. Правовое значение
4. Выявленные особенности
5. Рекомендации по использованию

Текст документа:
${text}`
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(join(this.tempDir, file));
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
}

