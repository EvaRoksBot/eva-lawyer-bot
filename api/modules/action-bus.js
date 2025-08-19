/**
 * Action Bus - System for handling cross-menu actions with tickets
 * Implements short-lived tickets to avoid callback_data size limits
 */

const crypto = require('crypto');

// In-memory storage for tickets (replace with Redis in production)
const TICKETS = new Map();
const ACTIONS = new Map();

// Ticket TTL in milliseconds (5 minutes)
const TICKET_TTL = 5 * 60 * 1000;

/**
 * Register an action handler
 * @param {string} name - Action name
 * @param {Function} handler - Action handler function
 */
function register(name, handler) {
  ACTIONS.set(name, handler);
}

/**
 * Create a short-lived ticket for an action
 * @param {string} action - Action name
 * @param {Object} params - Action parameters
 * @returns {string} - Ticket token
 */
function mintTicket(action, params) {
  const token = crypto.randomBytes(6).toString('base64url'); // ~8 characters
  const ticket = {
    action,
    params,
    timestamp: Date.now()
  };
  
  TICKETS.set(token, ticket);
  
  // Auto-cleanup after TTL
  setTimeout(() => {
    TICKETS.delete(token);
  }, TICKET_TTL);
  
  return token;
}

/**
 * Resolve and consume a ticket
 * @param {string} token - Ticket token
 * @returns {Object|null} - Ticket data or null if expired/invalid
 */
function resolveTicket(token) {
  const ticket = TICKETS.get(token);
  
  if (!ticket) {
    return null;
  }
  
  // Check if ticket is expired
  if (Date.now() - ticket.timestamp > TICKET_TTL) {
    TICKETS.delete(token);
    return null;
  }
  
  // Consume ticket (one-time use)
  TICKETS.delete(token);
  return ticket;
}

/**
 * Execute an action by ticket
 * @param {string} token - Ticket token
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} - Action result
 */
async function executeTicket(token, context) {
  const ticket = resolveTicket(token);
  
  if (!ticket) {
    return {
      success: false,
      error: 'Ticket expired or invalid'
    };
  }
  
  const handler = ACTIONS.get(ticket.action);
  
  if (!handler) {
    return {
      success: false,
      error: `Action handler not found: ${ticket.action}`
    };
  }
  
  try {
    const result = await handler(ticket.params, context);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error(`Action execution error [${ticket.action}]:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Create a button with action ticket
 * @param {string} text - Button text
 * @param {string} action - Action name
 * @param {Object} params - Action parameters
 * @returns {Object} - Button object
 */
function link(text, action, params = {}) {
  const token = mintTicket(action, params);
  return {
    text,
    callback_data: `a:${token}`
  };
}

/**
 * Clean up expired tickets (call periodically)
 */
function cleanup() {
  const now = Date.now();
  for (const [token, ticket] of TICKETS.entries()) {
    if (now - ticket.timestamp > TICKET_TTL) {
      TICKETS.delete(token);
    }
  }
}

// Periodic cleanup every minute
setInterval(cleanup, 60000);

// Register default actions
register('ui.back_home', async (params, context) => {
  return {
    type: 'menu',
    section: 'home'
  };
});

register('contracts.protocol_of_disagreements', async (params, context) => {
  const { file_id, side = 'client' } = params;
  
  if (!context.userSession?.lastDocument) {
    return {
      type: 'message',
      text: '⚠️ Сначала загрузите договор для создания протокола разногласий.'
    };
  }
  
  return {
    type: 'prompt',
    prompt: 'PROMPT_PROTOCOL_DRAFT',
    data: context.userSession.lastDocument,
    side
  };
});

register('contracts.suggest_edits', async (params, context) => {
  const { file_id } = params;
  
  if (!context.userSession?.lastDocument) {
    return {
      type: 'message',
      text: '⚠️ Сначала загрузите договор для предложения правок.'
    };
  }
  
  return {
    type: 'prompt',
    prompt: 'PROMPT_CONTRACT_EDITS',
    data: context.userSession.lastDocument
  };
});

register('utils.legal_opinion', async (params, context) => {
  const { topic } = params;
  
  return {
    type: 'prompt',
    prompt: 'PROMPT_LEGAL_OPINION',
    topic: topic || 'общий юридический вопрос'
  };
});

register('utils.risks_table', async (params, context) => {
  const { document } = params;
  
  const docText = document || context.userSession?.lastDocument;
  if (!docText) {
    return {
      type: 'message',
      text: '⚠️ Сначала загрузите документ для анализа рисков.'
    };
  }
  
  return {
    type: 'prompt',
    prompt: 'PROMPT_CONTRACT_RISKS',
    mode: 'table',
    data: docText
  };
});

register('kyc.full_scoring', async (params, context) => {
  const { inn } = params;
  
  const targetInn = inn || context.userSession?.lastInn;
  if (!targetInn) {
    return {
      type: 'message',
      text: '⚠️ Сначала введите ИНН контрагента для скоринга.'
    };
  }
  
  return {
    type: 'prompt',
    prompt: 'PROMPT_COUNTERPARTY_SCORING',
    mode: 'full',
    inn: targetInn
  };
});

// Export functions
module.exports = {
  register,
  mintTicket,
  resolveTicket,
  executeTicket,
  link,
  cleanup
};

