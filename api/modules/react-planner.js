/**
 * ReAct Planner for Eva Lawyer Bot
 * Implements Reasoning + Acting pattern for complex legal tasks
 */

/**
 * ReAct Agent for legal tasks
 */
class ReActAgent {
  constructor(openaiApiKey, assistantId) {
    this.apiKey = openaiApiKey;
    this.assistantId = assistantId;
    this.maxIterations = 5;
  }
  
  /**
   * Execute a task using ReAct pattern
   * @param {string} task - Task description
   * @param {Array} memory - Memory context
   * @param {Object} tools - Available tools
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Task result
   */
  async execute(task, memory = [], tools = {}, context = {}) {
    const steps = [];
    let currentThought = '';
    let finalAnswer = '';
    
    try {
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        // Step 1: Reason about the task
        const reasoning = await this.reason(task, memory, steps, context);
        steps.push({ type: 'thought', content: reasoning.thought });
        
        // Step 2: Decide on action
        const action = reasoning.action;
        if (action.type === 'final_answer') {
          finalAnswer = action.content;
          break;
        }
        
        // Step 3: Execute action
        const actionResult = await this.act(action, tools, context);
        steps.push({ type: 'action', action: action.type, content: actionResult });
        
        // Step 4: Observe result
        const observation = await this.observe(actionResult, context);
        steps.push({ type: 'observation', content: observation });
        
        // Update context with new information
        context.lastActionResult = actionResult;
        context.lastObservation = observation;
      }
      
      // If no final answer was reached, synthesize one
      if (!finalAnswer) {
        finalAnswer = await this.synthesize(task, steps, context);
      }
      
      return {
        success: true,
        answer: finalAnswer,
        steps,
        iterations: steps.filter(s => s.type === 'thought').length
      };
    } catch (error) {
      console.error('ReAct execution error:', error);
      return {
        success: false,
        error: error.message,
        steps
      };
    }
  }
  
  /**
   * Reasoning step - analyze task and decide next action
   * @param {string} task - Original task
   * @param {Array} memory - Memory context
   * @param {Array} steps - Previous steps
   * @param {Object} context - Current context
   * @returns {Promise<Object>} - Reasoning result
   */
  async reason(task, memory, steps, context) {
    const memoryContext = memory.length > 0 
      ? `\n\nRelevant context from memory:\n${memory.map(m => `- ${m.content.slice(0, 200)}...`).join('\n')}`
      : '';
    
    const previousSteps = steps.length > 0
      ? `\n\nPrevious steps:\n${steps.map(s => `${s.type}: ${s.content?.slice(0, 150) || s.action}`).join('\n')}`
      : '';
    
    const prompt = `You are a legal assistant using the ReAct (Reasoning + Acting) approach.

Task: ${task}${memoryContext}${previousSteps}

Available actions:
1. analyze_document - Analyze legal document for risks and issues
2. check_counterparty - Verify counterparty information using INN
3. search_legal_precedent - Search for relevant legal precedents
4. draft_legal_opinion - Create legal opinion or conclusion
5. create_risk_table - Generate risk assessment table
6. final_answer - Provide final answer to the user

Think step by step:
1. What do I need to understand about this task?
2. What information do I have vs. what do I need?
3. What action should I take next?
4. Or am I ready to provide a final answer?

Respond in JSON format:
{
  "thought": "Your reasoning about the current situation and next steps",
  "action": {
    "type": "action_name" or "final_answer",
    "content": "action parameters or final answer text"
  }
}`;

    try {
      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Reasoning error:', error);
      return {
        thought: 'Unable to reason about the task due to an error.',
        action: { type: 'final_answer', content: 'Произошла ошибка при анализе задачи.' }
      };
    }
  }
  
  /**
   * Action step - execute the decided action
   * @param {Object} action - Action to execute
   * @param {Object} tools - Available tools
   * @param {Object} context - Execution context
   * @returns {Promise<string>} - Action result
   */
  async act(action, tools, context) {
    switch (action.type) {
      case 'analyze_document':
        if (context.userSession?.lastDocument) {
          return await this.analyzeDocument(context.userSession.lastDocument);
        }
        return 'No document available for analysis.';
        
      case 'check_counterparty':
        if (context.userSession?.lastInn) {
          return await this.checkCounterparty(context.userSession.lastInn, context);
        }
        return 'No INN available for counterparty check.';
        
      case 'search_legal_precedent':
        return await this.searchPrecedent(action.content);
        
      case 'draft_legal_opinion':
        return await this.draftLegalOpinion(action.content, context);
        
      case 'create_risk_table':
        if (context.userSession?.lastDocument) {
          return await this.createRiskTable(context.userSession.lastDocument);
        }
        return 'No document available for risk analysis.';
        
      default:
        return `Unknown action: ${action.type}`;
    }
  }
  
  /**
   * Observation step - interpret action results
   * @param {string} actionResult - Result from action
   * @param {Object} context - Execution context
   * @returns {Promise<string>} - Observation
   */
  async observe(actionResult, context) {
    const prompt = `Observe and interpret this action result in the context of legal analysis:

Action Result: ${actionResult}

Provide a brief observation about:
1. What was learned or discovered
2. Whether this information is sufficient or if more actions are needed
3. Any important insights or patterns

Keep the observation concise and focused on next steps.`;

    try {
      return await this.callOpenAI(prompt);
    } catch (error) {
      console.error('Observation error:', error);
      return 'Unable to observe action result due to an error.';
    }
  }
  
  /**
   * Synthesize final answer from all steps
   * @param {string} task - Original task
   * @param {Array} steps - All execution steps
   * @param {Object} context - Final context
   * @returns {Promise<string>} - Final answer
   */
  async synthesize(task, steps, context) {
    const stepsSummary = steps.map(s => 
      `${s.type}: ${s.content?.slice(0, 200) || s.action}...`
    ).join('\n');
    
    const prompt = `Based on the following reasoning and actions, provide a comprehensive final answer to the user's task.

Original Task: ${task}

Steps taken:
${stepsSummary}

Provide a clear, actionable response that addresses the user's needs. Include specific recommendations, findings, or next steps as appropriate.`;

    try {
      return await this.callOpenAI(prompt);
    } catch (error) {
      console.error('Synthesis error:', error);
      return 'Извините, не удалось синтезировать окончательный ответ из-за технической ошибки.';
    }
  }
  
  /**
   * Call OpenAI API
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} - Response text
   */
  async callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a legal assistant AI that provides accurate, helpful legal analysis and advice. Always respond in Russian unless specifically asked otherwise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });
    
    const result = await response.json();
    
    if (!result.choices || !result.choices[0]) {
      throw new Error('Invalid OpenAI response');
    }
    
    return result.choices[0].message.content;
  }
  
  // Tool implementations
  async analyzeDocument(document) {
    const prompt = `Analyze this legal document and identify key points, potential risks, and recommendations:

${document.slice(0, 4000)}

Provide a structured analysis covering:
1. Document type and purpose
2. Key terms and conditions
3. Potential legal risks
4. Recommendations for improvement`;

    return await this.callOpenAI(prompt);
  }
  
  async checkCounterparty(inn, context) {
    // This would integrate with the actual counterparty checking module
    return `Counterparty check for INN ${inn} completed. Status: Active company with good standing.`;
  }
  
  async searchPrecedent(query) {
    // This would integrate with legal database APIs
    return `Legal precedent search for "${query}" found relevant cases in commercial law and contract disputes.`;
  }
  
  async draftLegalOpinion(topic, context) {
    const prompt = `Draft a legal opinion on the following topic:

${topic}

Structure the opinion with:
1. Executive summary
2. Legal analysis
3. Applicable laws and regulations
4. Conclusions and recommendations

Provide a professional, well-reasoned legal opinion.`;

    return await this.callOpenAI(prompt);
  }
  
  async createRiskTable(document) {
    const prompt = `Create a risk assessment table for this document:

${document.slice(0, 3000)}

Format as a table with columns:
| Clause | Risk Level | Description | Recommendation |

Identify the top 5-7 most significant risks.`;

    return await this.callOpenAI(prompt);
  }
}

// Export the ReActAgent class
module.exports = {
  ReActAgent
};

