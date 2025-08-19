/**
 * Enhanced UI module for Eva Lawyer Bot
 * Provides contextual quick actions and memory-enhanced interfaces
 */

const { link } = require('./action-bus');

/**
 * Add contextual quick actions to UI based on user session
 * @param {Object} ui - Base UI object
 * @param {Object} userSession - User session data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Enhanced UI
 */
async function addQuickActions(ui, userSession, userId) {
  const quickActions = [];
  
  // Add document-related actions if document is available
  if (userSession.lastDocument) {
    quickActions.push(
      link('🧩 Протокол разногласий', 'contracts.protocol_of_disagreements', { 
        file_id: userSession.lastDocumentId || 'current' 
      }),
      link('🛠 Перечень правок', 'contracts.suggest_edits', { 
        file_id: userSession.lastDocumentId || 'current' 
      }),
      link('🧪 Таблица рисков', 'utils.risks_table', { 
        document: userSession.lastDocument 
      })
    );
  }
  
  // Add counterparty actions if INN is available
  if (userSession.lastInn) {
    quickActions.push(
      link('📊 Полный скоринг', 'kyc.full_scoring', { 
        inn: userSession.lastInn 
      })
    );
  }
  
  // Add universal actions
  quickActions.push(
    link('📑 Юрзаключение', 'utils.legal_opinion', { 
      topic: 'текущий вопрос' 
    })
  );
  
  // If there are quick actions, add them to the UI
  if (quickActions.length > 0) {
    const quickActionRows = [];
    for (let i = 0; i < quickActions.length; i += 2) {
      quickActionRows.push(quickActions.slice(i, i + 2));
    }
    
    // Add separator and quick actions
    const enhancedKeyboard = [
      ...ui.reply_markup.inline_keyboard,
      [{ text: '⚡ Быстрые действия', callback_data: 'noop' }],
      ...quickActionRows
    ];
    
    return {
      ...ui,
      reply_markup: {
        inline_keyboard: enhancedKeyboard
      }
    };
  }
  
  return ui;
}

/**
 * Handle action result with enhanced processing
 * @param {Object} actionResult - Action result
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function handleActionResult(actionResult, chatId, messageId, userId) {
  const { sendMessage, sendTypingAction, vectorMemory, reactAgent, userSessions } = require('../telegram');
  
  switch (actionResult.type) {
    case 'force_reply':
      await sendMessage(chatId, actionResult.text, { reply_markup: actionResult.reply_markup });
      break;
      
    case 'message':
      await sendMessage(chatId, actionResult.text);
      break;
      
    case 'menu':
      const { render } = require('./menus');
      const ui = render(actionResult.section);
      const userSession = userSessions[userId] || {};
      const enhancedUi = await addQuickActions(ui, userSession, userId);
      await sendMessage(chatId, enhancedUi.text, { reply_markup: enhancedUi.reply_markup });
      break;
      
    case 'prompt':
      await sendTypingAction(chatId);
      
      // Get memory context for enhanced responses
      const memoryContext = await vectorMemory.enrichWithMemory(
        userId, 
        actionResult.prompt || 'legal analysis', 
        6
      );
      
      // Use ReAct agent for complex tasks
      if (actionResult.useReAct) {
        const reactResult = await reactAgent.execute(
          actionResult.prompt,
          memoryContext,
          {},
          { userSession: userSessions[userId] }
        );
        
        if (reactResult.success) {
          await sendMessage(chatId, reactResult.answer);
          
          // Record interaction in memory
          await vectorMemory.recordInteraction(
            userId,
            actionResult.prompt,
            reactResult.answer,
            { type: 'react_analysis', steps: reactResult.steps.length }
          );
        } else {
          await sendMessage(chatId, 'Произошла ошибка при выполнении сложного анализа.');
        }
      } else {
        // Use regular assistant with memory context
        const promptResponse = await processPromptActionWithMemory(
          actionResult, 
          userId, 
          chatId, 
          memoryContext
        );
        await sendMessage(chatId, promptResponse);
      }
      break;
      
    case 'clear_context':
      // Clear user session and memory
      if (userSessions[userId]) {
        delete userSessions[userId];
      }
      await sendMessage(chatId, actionResult.text);
      break;
      
    default:
      await sendMessage(chatId, 'Неизвестный тип действия.');
  }
}

/**
 * Process prompt action with memory context
 * @param {Object} actionResult - Action result
 * @param {number} userId - User ID
 * @param {number} chatId - Chat ID
 * @param {Array} memoryContext - Memory context
 * @returns {Promise<string>} - Response
 */
async function processPromptActionWithMemory(actionResult, userId, chatId, memoryContext) {
  const { assistant, userSessions, vectorMemory } = require('../telegram');
  
  try {
    // Get user session
    const userSession = userSessions[userId] || {};
    const threadId = userSession.threadId;
    
    // Build enhanced prompt with memory context
    let promptText = buildPromptFromAction(actionResult);
    
    // Add memory context if available
    if (memoryContext.length > 0) {
      const contextText = memoryContext
        .map(m => `• ${m.content.slice(0, 200)}...`)
        .join('\n');
      
      promptText = `Контекст из предыдущих взаимодействий:\n${contextText}\n\n${promptText}`;
    }
    
    // Process with assistant
    const response = await assistant.askAssistant(promptText, threadId, userId.toString());
    
    // Save thread ID and record interaction
    if (response.success && response.threadId) {
      userSessions[userId] = {
        ...userSession,
        threadId: response.threadId,
        lastActivity: Date.now()
      };
      
      // Record in memory
      await vectorMemory.recordInteraction(
        userId,
        promptText,
        response.message,
        { 
          type: 'prompt_action',
          prompt_type: actionResult.prompt,
          has_memory_context: memoryContext.length > 0
        }
      );
    }
    
    return response.success ? response.message : 'Извините, произошла ошибка при обработке запроса.';
  } catch (error) {
    console.error('Process prompt action with memory error:', error);
    return 'Произошла ошибка при обработке запроса.';
  }
}

/**
 * Build prompt text from action result
 * @param {Object} actionResult - Action result
 * @returns {string} - Prompt text
 */
function buildPromptFromAction(actionResult) {
  switch (actionResult.prompt) {
    case 'PROMPT_CONTRACT_REVIEW':
      return 'Проанализируй договор и выдели основные пункты, риски и рекомендации.';
    case 'PROMPT_CONTRACT_RISKS':
      return 'Создай подробную таблицу рисков для договора с указанием пунктов, рисков и рекомендаций по редактированию.';
    case 'PROMPT_LEGAL_OPINION':
      return `Подготовь юридическое заключение по теме: ${actionResult.topic || 'предоставленный вопрос'}`;
    case 'PROMPT_PROTOCOL_DRAFT':
      return `Создай протокол разногласий с позиции ${actionResult.side || 'клиента'} для анализируемого договора.`;
    case 'PROMPT_CONTRACT_EDITS':
      return 'Предложи конкретные правки и улучшения для договора с обоснованием каждого изменения.';
    case 'PROMPT_COUNTERPARTY_SCORING':
      return `Проведи ${actionResult.mode || 'полный'} скоринг контрагента с ИНН ${actionResult.inn}`;
    default:
      return 'Обработай запрос согласно выбранному действию.';
  }
}

// Export functions
module.exports = {
  addQuickActions,
  handleActionResult,
  processPromptActionWithMemory
};

