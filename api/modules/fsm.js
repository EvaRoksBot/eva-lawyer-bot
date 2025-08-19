// FSM (Finite State Machine) для управления состояниями пользователей
class UserStateManager {
    constructor() {
        this.userStates = new Map();
        this.userData = new Map();
    }

    // Получить текущее состояние пользователя
    getState(userId) {
        return this.userStates.get(userId) || 'idle';
    }

    // Установить состояние пользователя
    setState(userId, state) {
        this.userStates.set(userId, state);
        console.log(`User ${userId} state changed to: ${state}`);
    }

    // Получить данные пользователя
    getUserData(userId) {
        if (!this.userData.has(userId)) {
            this.userData.set(userId, {});
        }
        return this.userData.get(userId);
    }

    // Установить данные пользователя
    setUserData(userId, key, value) {
        const userData = this.getUserData(userId);
        userData[key] = value;
        this.userData.set(userId, userData);
    }

    // Очистить данные пользователя
    clearUserData(userId) {
        this.userData.delete(userId);
        this.setState(userId, 'idle');
    }

    // Проверить, находится ли пользователь в процессе ввода
    isAwaitingInput(userId) {
        const state = this.getState(userId);
        return state.startsWith('await_');
    }

    // Получить контекст текущего действия
    getCurrentAction(userId) {
        const userData = this.getUserData(userId);
        return userData.currentAction || null;
    }

    // Установить текущее действие
    setCurrentAction(userId, action) {
        this.setUserData(userId, 'currentAction', action);
    }
}

// Состояния FSM
const STATES = {
    IDLE: 'idle',
    
    // Проверка договора
    CONTRACT_AWAIT_FILE: 'await_contract_file',
    CONTRACT_AWAIT_SIDE: 'await_contract_side',
    CONTRACT_PROCESSING: 'contract_processing',
    CONTRACT_PREVIEW: 'contract_preview',
    
    // Таблица рисков
    RISK_AWAIT_FILE: 'await_risk_file',
    RISK_PROCESSING: 'risk_processing',
    RISK_PREVIEW: 'risk_preview',
    
    // Пакет Эверест
    EVEREST_MENU: 'everest_menu',
    EVEREST_AWAIT_FIELDS: 'await_everest_fields',
    EVEREST_PROCESSING: 'everest_processing',
    EVEREST_PREVIEW: 'everest_preview',
    
    // Юридическое заключение
    OPINION_AWAIT_TOPIC: 'await_opinion_topic',
    OPINION_AWAIT_FIELD: 'await_opinion_field',
    OPINION_AWAIT_FACTS: 'await_opinion_facts',
    OPINION_PROCESSING: 'opinion_processing',
    OPINION_PREVIEW: 'opinion_preview',
    
    // Судебная практика
    CASE_AWAIT_QUESTION: 'await_case_question',
    CASE_AWAIT_PERIOD: 'await_case_period',
    CASE_PROCESSING: 'case_processing',
    CASE_PREVIEW: 'case_preview',
    
    // Подготовка к спору
    DISPUTE_AWAIT_TOPIC: 'await_dispute_topic',
    DISPUTE_AWAIT_FACTS: 'await_dispute_facts',
    DISPUTE_AWAIT_OPPONENT: 'await_dispute_opponent',
    DISPUTE_PROCESSING: 'dispute_processing',
    DISPUTE_PREVIEW: 'dispute_preview',
    
    // Ответ на претензию
    CLAIM_AWAIT_ESSENCE: 'await_claim_essence',
    CLAIM_AWAIT_CONTRACT: 'await_claim_contract',
    CLAIM_AWAIT_FACTS: 'await_claim_facts',
    CLAIM_PROCESSING: 'claim_processing',
    CLAIM_PREVIEW: 'claim_preview',
    
    // Проверка контрагента
    COUNTERPARTY_AWAIT_INN: 'await_counterparty_inn',
    COUNTERPARTY_PROCESSING: 'counterparty_processing',
    COUNTERPARTY_PREVIEW: 'counterparty_preview',
    
    // Счет на оплату
    INVOICE_AWAIT_BUYER: 'await_invoice_buyer',
    INVOICE_AWAIT_ITEMS: 'await_invoice_items',
    INVOICE_AWAIT_TERMS: 'await_invoice_terms',
    INVOICE_PROCESSING: 'invoice_processing',
    INVOICE_PREVIEW: 'invoice_preview'
};

// Действия (actions)
const ACTIONS = {
    CONTRACT_REVIEW: 'contract_review',
    RISK_TABLE: 'risk_table',
    EVEREST_PACKAGE: 'everest_package',
    LEGAL_OPINION: 'legal_opinion',
    CASE_LAW: 'case_law',
    DISPUTE_PREP: 'dispute_prep',
    CLAIM_REPLY: 'claim_reply',
    COUNTERPARTY_SCORE: 'counterparty_score',
    INVOICE: 'invoice',
    
    // Подменю Эверест
    EVEREST_CONTRACT: 'everest_contract',
    EVEREST_SPEC: 'everest_spec',
    EVEREST_PROTOCOL: 'everest_protocol',
    EVEREST_INVOICE: 'everest_invoice'
};

// Валидация файлов
function validateFile(file) {
    const allowedTypes = ['.docx', '.pdf'];
    const maxSize = 15 * 1024 * 1024; // 15 MB
    
    if (!file) {
        return { valid: false, error: 'Файл не найден' };
    }
    
    const fileExtension = file.file_name ? 
        '.' + file.file_name.split('.').pop().toLowerCase() : '';
    
    if (!allowedTypes.includes(fileExtension)) {
        return { 
            valid: false, 
            error: 'Поддерживаются только файлы .docx и .pdf' 
        };
    }
    
    if (file.file_size > maxSize) {
        return { 
            valid: false, 
            error: 'Размер файла не должен превышать 15 МБ' 
        };
    }
    
    return { valid: true };
}

// Валидация ИНН
function validateINN(inn) {
    if (!inn) return { valid: false, error: 'ИНН не указан' };
    
    const cleanINN = inn.replace(/\D/g, '');
    
    if (cleanINN.length !== 10 && cleanINN.length !== 12) {
        return { 
            valid: false, 
            error: 'ИНН должен содержать 10 или 12 цифр' 
        };
    }
    
    return { valid: true, inn: cleanINN };
}

// Валидация текста
function validateText(text, minLength = 10, maxLength = 2000) {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Текст не может быть пустым' };
    }
    
    if (text.length < minLength) {
        return { 
            valid: false, 
            error: `Минимальная длина текста: ${minLength} символов` 
        };
    }
    
    if (text.length > maxLength) {
        return { 
            valid: false, 
            error: `Максимальная длина текста: ${maxLength} символов` 
        };
    }
    
    return { valid: true };
}

module.exports = {
    UserStateManager,
    STATES,
    ACTIONS,
    validateFile,
    validateINN,
    validateText
};

