/**
 * Module for OpenAI Assistant integration
 */

import OpenAI from 'openai';

export interface AssistantResponse {
  success: boolean;
  message: string;
  error?: string;
  threadId?: string;
}

export interface AssistantConfig {
  assistantId: string;
  apiKey: string;
  model?: string;
}

/**
 * OpenAI Assistant client wrapper
 */
export class EvaAssistant {
  private openai: OpenAI;
  private assistantId: string;

  constructor(config: AssistantConfig) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.assistantId = config.assistantId;
  }

  /**
   * Create a new thread for conversation
   */
  async createThread(): Promise<string | null> {
    try {
      const thread = await this.openai.beta.threads.create();
      return thread.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      return null;
    }
  }

  /**
   * Add a message to thread and get assistant response
   */
  async askAssistant(
    message: string, 
    threadId?: string
  ): Promise<AssistantResponse> {
    try {
      // Create thread if not provided
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await this.createThread();
        if (!currentThreadId) {
          return {
            success: false,
            message: 'Не удалось создать сессию для общения с ассистентом.',
            error: 'Thread creation failed'
          };
        }
      }

      // Add user message to thread
      await this.openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: message
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(currentThreadId, {
        assistant_id: this.assistantId
      });

      // Wait for completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(
        currentThreadId, 
        run.id
      );

      // Poll for completion (max 30 seconds)
      const maxAttempts = 30;
      let attempts = 0;
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        if (attempts >= maxAttempts) {
          return {
            success: false,
            message: 'Время ожидания ответа истекло. Попробуйте еще раз.',
            error: 'Timeout waiting for assistant response',
            threadId: currentThreadId
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(
          currentThreadId, 
          run.id
        );
        attempts++;
      }

      // Handle different completion statuses
      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messages = await this.openai.beta.threads.messages.list(currentThreadId);
        const lastMessage = messages.data[0];
        
        if (lastMessage && lastMessage.role === 'assistant') {
          const content = lastMessage.content[0];
          if (content.type === 'text') {
            return {
              success: true,
              message: content.text.value,
              threadId: currentThreadId
            };
          }
        }
        
        return {
          success: false,
          message: 'Не удалось получить ответ от ассистента.',
          error: 'No assistant message found',
          threadId: currentThreadId
        };
      } else if (runStatus.status === 'requires_action') {
        // Handle function calls if needed
        return await this.handleRequiredActions(currentThreadId, run.id, runStatus);
      } else {
        return {
          success: false,
          message: 'Произошла ошибка при обработке запроса.',
          error: `Run failed with status: ${runStatus.status}`,
          threadId: currentThreadId
        };
      }

    } catch (error) {
      console.error('Error in askAssistant:', error);
      return {
        success: false,
        message: 'Произошла техническая ошибка. Попробуйте позже.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle required actions (function calls)
   */
  private async handleRequiredActions(
    threadId: string, 
    runId: string, 
    runStatus: any
  ): Promise<AssistantResponse> {
    try {
      const requiredActions = runStatus.required_action?.submit_tool_outputs?.tool_calls || [];
      const toolOutputs = [];

      for (const action of requiredActions) {
        if (action.type === 'function') {
          const functionName = action.function.name;
          const functionArgs = JSON.parse(action.function.arguments);

          let functionResult = '';

          // Handle different function calls
          switch (functionName) {
            case 'check_dadata':
              functionResult = await this.checkDaDataFunction(functionArgs);
              break;
            case 'generate_vercel_env_config':
              functionResult = await this.generateVercelEnvConfig(functionArgs);
              break;
            default:
              functionResult = JSON.stringify({ 
                error: `Unknown function: ${functionName}` 
              });
          }

          toolOutputs.push({
            tool_call_id: action.id,
            output: functionResult
          });
        }
      }

      // Submit tool outputs
      if (toolOutputs.length > 0) {
        await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
          tool_outputs: toolOutputs
        });

        // Wait for completion again
        let updatedRun = await this.openai.beta.threads.runs.retrieve(threadId, runId);
        const maxAttempts = 30;
        let attempts = 0;

        while (updatedRun.status === 'in_progress' || updatedRun.status === 'queued') {
          if (attempts >= maxAttempts) {
            return {
              success: false,
              message: 'Время ожидания ответа истекло.',
              error: 'Timeout after function call',
              threadId
            };
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          updatedRun = await this.openai.beta.threads.runs.retrieve(threadId, runId);
          attempts++;
        }

        if (updatedRun.status === 'completed') {
          const messages = await this.openai.beta.threads.messages.list(threadId);
          const lastMessage = messages.data[0];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            const content = lastMessage.content[0];
            if (content.type === 'text') {
              return {
                success: true,
                message: content.text.value,
                threadId
              };
            }
          }
        }
      }

      return {
        success: false,
        message: 'Не удалось обработать запрос с функциями.',
        error: 'Function call handling failed',
        threadId
      };

    } catch (error) {
      console.error('Error handling required actions:', error);
      return {
        success: false,
        message: 'Ошибка при выполнении дополнительных функций.',
        error: error instanceof Error ? error.message : 'Unknown error',
        threadId
      };
    }
  }

  /**
   * Handle DaData function call
   */
  private async checkDaDataFunction(args: any): Promise<string> {
    try {
      const { inn, kpp } = args;
      
      // This would integrate with the existing DaData module
      // For now, return a placeholder
      return JSON.stringify({
        success: true,
        data: {
          inn: inn,
          kpp: kpp || '',
          name: 'Функция проверки контрагентов будет интегрирована',
          status: 'ACTIVE'
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle Vercel env config generation
   */
  private async generateVercelEnvConfig(args: any): Promise<string> {
    try {
      const { environmentVariables } = args;
      
      return JSON.stringify({
        success: true,
        config: environmentVariables,
        message: 'Конфигурация переменных окружения сгенерирована'
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get thread messages history
   */
  async getThreadHistory(threadId: string): Promise<any[]> {
    try {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      return messages.data;
    } catch (error) {
      console.error('Error getting thread history:', error);
      return [];
    }
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<boolean> {
    try {
      await this.openai.beta.threads.del(threadId);
      return true;
    } catch (error) {
      console.error('Error deleting thread:', error);
      return false;
    }
  }
}

