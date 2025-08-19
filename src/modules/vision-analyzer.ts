/**
 * Vision Analyzer Module for Eva Lawyer Bot
 * Handles image analysis using OpenAI Vision API
 */

import OpenAI from 'openai';
import { promises as fs } from 'fs';

export interface VisionAnalysisResult {
  success: boolean;
  extractedText?: string;
  analysis?: string;
  confidence?: number;
  error?: string;
  documentType?: string;
}

export interface VisionAnalysisOptions {
  prompt?: string;
  maxTokens?: number;
  detail?: 'low' | 'high' | 'auto';
  extractTextOnly?: boolean;
}

/**
 * Vision analyzer for processing images with OpenAI Vision API
 */
export class VisionAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze image with OpenAI Vision API
   */
  async analyzeImage(
    imagePath: string, 
    options: VisionAnalysisOptions = {}
  ): Promise<VisionAnalysisResult> {
    try {
      const {
        prompt = "Извлеки весь текст из этого изображения документа. Сохрани форматирование и структуру.",
        maxTokens = 4000,
        detail = 'high',
        extractTextOnly = false
      } = options;

      // Read and encode image
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);

      console.log('Analyzing image with Vision API:', { 
        size: Math.round(imageBuffer.length / 1024) + 'KB',
        mimeType,
        prompt: prompt.substring(0, 100) + '...'
      });

      // Call OpenAI Vision API
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: detail
                }
              }
            ]
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.1
      });

      const analysisResult = response.choices[0]?.message?.content;
      
      if (!analysisResult) {
        return {
          success: false,
          error: 'Не удалось получить результат анализа изображения'
        };
      }

      // Determine document type from extracted text
      const documentType = this.determineDocumentTypeFromText(analysisResult);

      if (extractTextOnly) {
        return {
          success: true,
          extractedText: analysisResult,
          documentType,
          confidence: 0.9
        };
      }

      // Generate detailed analysis
      const detailedAnalysis = await this.generateDetailedAnalysis(analysisResult, documentType);

      return {
        success: true,
        extractedText: analysisResult,
        analysis: detailedAnalysis,
        documentType,
        confidence: 0.9
      };

    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка при анализе изображения'
      };
    }
  }

  /**
   * Extract text only from image
   */
  async extractTextFromImage(imagePath: string): Promise<VisionAnalysisResult> {
    return this.analyzeImage(imagePath, {
      prompt: "Извлеки весь текст из этого изображения. Верни только текст без дополнительных комментариев.",
      extractTextOnly: true,
      detail: 'high'
    });
  }

  /**
   * Analyze legal document from image
   */
  async analyzeLegalDocument(imagePath: string): Promise<VisionAnalysisResult> {
    return this.analyzeImage(imagePath, {
      prompt: `Проанализируй это изображение юридического документа:

1. Извлеки весь текст с сохранением структуры
2. Определи тип документа (договор, решение суда, устав и т.д.)
3. Выдели ключевые элементы (стороны, даты, суммы, условия)
4. Отметь любые печати, подписи или штампы
5. Укажи на возможные проблемы с качеством или читаемостью

Предоставь структурированный анализ.`,
      maxTokens: 4000,
      detail: 'high'
    });
  }

  /**
   * Analyze contract from image
   */
  async analyzeContract(imagePath: string): Promise<VisionAnalysisResult> {
    return this.analyzeImage(imagePath, {
      prompt: `Проанализируй этот договор на изображении:

1. Извлеки полный текст договора
2. Определи тип договора
3. Выдели стороны договора и их реквизиты
4. Найди существенные условия (предмет, цена, сроки)
5. Отметь права и обязанности сторон
6. Выяви условия ответственности
7. Проверь наличие подписей и печатей
8. Укажи на потенциальные риски или проблемы

Структурируй ответ по разделам.`,
      maxTokens: 4000,
      detail: 'high'
    });
  }

  /**
   * Analyze court decision from image
   */
  async analyzeCourtDecision(imagePath: string): Promise<VisionAnalysisResult> {
    return this.analyzeImage(imagePath, {
      prompt: `Проанализируй это судебное решение на изображении:

1. Извлеки полный текст решения
2. Определи суд и судью
3. Найди номер дела и дату
4. Выдели стороны по делу
5. Определи суть спора
6. Найди мотивировочную часть
7. Выдели резолютивную часть
8. Отметь сроки для обжалования
9. Проверь наличие подписей и печатей

Структурируй анализ по разделам.`,
      maxTokens: 4000,
      detail: 'high'
    });
  }

  /**
   * Generate detailed analysis based on extracted text
   */
  private async generateDetailedAnalysis(extractedText: string, documentType: string): Promise<string> {
    try {
      const analysisPrompt = this.getAnalysisPromptForDocumentType(documentType, extractedText);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Ты - опытный юрист-аналитик. Проводи детальный анализ юридических документов."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.2
      });

      return response.choices[0]?.message?.content || 'Не удалось сгенерировать анализ';
    } catch (error) {
      console.error('Error generating detailed analysis:', error);
      return 'Ошибка при генерации детального анализа';
    }
  }

  /**
   * Determine document type from extracted text
   */
  private determineDocumentTypeFromText(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('договор') || lowerText.includes('соглашение')) {
      return 'Договор';
    }
    if (lowerText.includes('решение') && lowerText.includes('суд')) {
      return 'Судебное решение';
    }
    if (lowerText.includes('постановление')) {
      return 'Постановление';
    }
    if (lowerText.includes('определение')) {
      return 'Определение суда';
    }
    if (lowerText.includes('устав')) {
      return 'Устав';
    }
    if (lowerText.includes('протокол')) {
      return 'Протокол';
    }
    if (lowerText.includes('заявление')) {
      return 'Заявление';
    }
    if (lowerText.includes('жалоба')) {
      return 'Жалоба';
    }
    if (lowerText.includes('претензия')) {
      return 'Претензия';
    }
    if (lowerText.includes('справка')) {
      return 'Справка';
    }
    if (lowerText.includes('свидетельство')) {
      return 'Свидетельство';
    }
    if (lowerText.includes('лицензия')) {
      return 'Лицензия';
    }

    return 'Документ';
  }

  /**
   * Get analysis prompt for specific document type
   */
  private getAnalysisPromptForDocumentType(documentType: string, text: string): string {
    const basePrompt = `Проанализируй следующий ${documentType.toLowerCase()}:\n\n${text}\n\n`;

    switch (documentType) {
      case 'Договор':
        return basePrompt + `
Предоставь анализ по следующим пунктам:
1. Тип и предмет договора
2. Стороны договора и их статус
3. Существенные условия (цена, сроки, качество)
4. Права и обязанности сторон
5. Условия ответственности и штрафы
6. Порядок изменения и расторжения
7. Выявленные риски и недостатки
8. Рекомендации по улучшению`;

      case 'Судебное решение':
        return basePrompt + `
Предоставь анализ по следующим пунктам:
1. Суд, дело, дата
2. Стороны по делу
3. Суть спора и требования
4. Установленные факты
5. Правовые основания решения
6. Резолютивная часть
7. Возможности обжалования
8. Практическое значение`;

      default:
        return basePrompt + `
Предоставь общий анализ документа:
1. Тип и назначение документа
2. Основное содержание
3. Ключевые положения
4. Правовое значение
5. Возможные риски или проблемы
6. Рекомендации`;
    }
  }

  /**
   * Get MIME type from file path
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext || ''] || 'image/jpeg';
  }

  /**
   * Validate image file
   */
  async validateImage(imagePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const stats = await fs.stat(imagePath);
      
      // Check file size (max 20MB for Vision API)
      if (stats.size > 20 * 1024 * 1024) {
        return {
          valid: false,
          error: 'Размер файла превышает 20MB'
        };
      }

      // Check file extension
      const ext = imagePath.split('.').pop()?.toLowerCase();
      const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      
      if (!ext || !supportedFormats.includes(ext)) {
        return {
          valid: false,
          error: 'Неподдерживаемый формат изображения'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Ошибка при проверке файла изображения'
      };
    }
  }
}

