/**
 * Модуль выбора промптов для Eva Lawyer Bot
 * Отвечает за анализ запроса пользователя и выбор подходящего промпта
 */

import { findBestPromptTemplate, fillPromptTemplate, extractPromptParameters, PromptTemplate } from './prompt-templates';

/**
 * Интерфейс для результата обработки запроса пользователя
 */
export interface ProcessedQuery {
  originalQuery: string;
  detectedPrompt: PromptTemplate | null;
  enhancedPrompt: string | null;
  category: string | null;
}

/**
 * Класс для выбора и обработки промптов
 */
export class PromptSelector {
  /**
   * Обрабатывает запрос пользователя и выбирает подходящий промпт
   * @param userQuery Запрос пользователя
   * @returns Обработанный запрос с выбранным промптом
   */
  public processUserQuery(userQuery: string): ProcessedQuery {
    // Базовый результат
    const result: ProcessedQuery = {
      originalQuery: userQuery,
      detectedPrompt: null,
      enhancedPrompt: null,
      category: null
    };

    // Если запрос пустой, возвращаем базовый результат
    if (!userQuery || userQuery.trim() === '') {
      return result;
    }

    // Поиск подходящего промпта
    const bestPrompt = findBestPromptTemplate(userQuery);
    if (!bestPrompt) {
      return result;
    }

    // Заполняем результат
    result.detectedPrompt = bestPrompt;
    result.category = bestPrompt.category;

    // Извлекаем параметры из запроса пользователя
    const promptParams = extractPromptParameters(bestPrompt, userQuery);

    // Заполняем шаблон промпта
    result.enhancedPrompt = fillPromptTemplate(bestPrompt.template, promptParams);

    return result;
  }

  /**
   * Создает системное сообщение для OpenAI Assistant на основе обработанного запроса
   * @param processedQuery Обработанный запрос пользователя
   * @returns Системное сообщение для Assistant API
   */
  public createSystemMessage(processedQuery: ProcessedQuery): string {
    if (!processedQuery.enhancedPrompt) {
      // Базовый промпт для общих юридических вопросов
      return `Ты - юридический ассистент Eva, специализирующийся на российском праве. 
Твоя задача - предоставлять точную, актуальную и полезную юридическую информацию.
Отвечай на вопросы пользователя ясно, структурированно и со ссылками на законодательство.
Если вопрос выходит за рамки твоей компетенции или требует индивидуальной консультации, 
укажи на это и предложи обратиться к профессиональному юристу.`;
    }

    // Возвращаем специализированный промпт
    return processedQuery.enhancedPrompt;
  }

  /**
   * Определяет, требуется ли использование специализированного промпта
   * @param userQuery Запрос пользователя
   * @returns true, если нужен специализированный промпт
   */
  public needsSpecializedPrompt(userQuery: string): boolean {
    const processedQuery = this.processUserQuery(userQuery);
    return processedQuery.detectedPrompt !== null;
  }
}

