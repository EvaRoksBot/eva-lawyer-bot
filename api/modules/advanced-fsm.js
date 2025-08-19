// Advanced FSM (Finite State Machine) for Eva Lawyer Bot
// Handles complex user workflows with persistent state management

class AdvancedFSM {
    constructor() {
        this.userStates = new Map();
        this.stateHistory = new Map();
        this.sessionData = new Map();
        
        // Define all possible states
        this.states = {
            IDLE: 'idle',
            MAIN_MENU: 'main_menu',
            
            // Contract analysis workflow
            CONTRACT_UPLOAD: 'contract_upload',
            CONTRACT_ANALYZING: 'contract_analyzing',
            CONTRACT_RESULTS: 'contract_results',
            CONTRACT_REDLINE: 'contract_redline',
            CONTRACT_PROTOCOL: 'contract_protocol',
            
            // INN checking workflow
            INN_INPUT: 'inn_input',
            INN_PROCESSING: 'inn_processing',
            INN_RESULTS: 'inn_results',
            INN_DETAILED: 'inn_detailed',
            
            // Everest package workflow
            EVEREST_MENU: 'everest_menu',
            EVEREST_SUPPLY: 'everest_supply',
            EVEREST_SPEC: 'everest_spec',
            EVEREST_WIZARD: 'everest_wizard',
            EVEREST_WIZARD_STEP1: 'everest_wizard_step1',
            EVEREST_WIZARD_STEP2: 'everest_wizard_step2',
            EVEREST_WIZARD_STEP3: 'everest_wizard_step3',
            
            // Document generation
            DOC_TYPE_SELECT: 'doc_type_select',
            DOC_PARAMS_INPUT: 'doc_params_input',
            DOC_GENERATING: 'doc_generating',
            DOC_READY: 'doc_ready',
            
            // Legal consultation
            LEGAL_QUESTION: 'legal_question',
            LEGAL_CATEGORY: 'legal_category',
            LEGAL_PROCESSING: 'legal_processing',
            LEGAL_RESPONSE: 'legal_response',
            
            // Settings and preferences
            SETTINGS_MENU: 'settings_menu',
            SETTINGS_PROFILE: 'settings_profile',
            SETTINGS_NOTIFICATIONS: 'settings_notifications',
            
            // Help and support
            HELP_MENU: 'help_menu',
            HELP_FAQ: 'help_faq',
            HELP_CONTACT: 'help_contact',
            
            // Error states
            ERROR: 'error',
            TIMEOUT: 'timeout'
        };
        
        // Define state transitions
        this.transitions = {
            [this.states.IDLE]: [this.states.MAIN_MENU],
            [this.states.MAIN_MENU]: [
                this.states.CONTRACT_UPLOAD,
                this.states.INN_INPUT,
                this.states.EVEREST_MENU,
                this.states.DOC_TYPE_SELECT,
                this.states.LEGAL_QUESTION,
                this.states.SETTINGS_MENU,
                this.states.HELP_MENU
            ],
            [this.states.CONTRACT_UPLOAD]: [
                this.states.CONTRACT_ANALYZING,
                this.states.MAIN_MENU,
                this.states.ERROR
            ],
            [this.states.CONTRACT_ANALYZING]: [
                this.states.CONTRACT_RESULTS,
                this.states.ERROR
            ],
            [this.states.CONTRACT_RESULTS]: [
                this.states.CONTRACT_REDLINE,
                this.states.CONTRACT_PROTOCOL,
                this.states.MAIN_MENU
            ],
            [this.states.INN_INPUT]: [
                this.states.INN_PROCESSING,
                this.states.MAIN_MENU,
                this.states.ERROR
            ],
            [this.states.INN_PROCESSING]: [
                this.states.INN_RESULTS,
                this.states.ERROR
            ],
            [this.states.INN_RESULTS]: [
                this.states.INN_DETAILED,
                this.states.MAIN_MENU
            ],
            [this.states.EVEREST_MENU]: [
                this.states.EVEREST_SUPPLY,
                this.states.EVEREST_SPEC,
                this.states.EVEREST_WIZARD,
                this.states.MAIN_MENU
            ],
            [this.states.EVEREST_WIZARD]: [
                this.states.EVEREST_WIZARD_STEP1,
                this.states.MAIN_MENU
            ],
            [this.states.EVEREST_WIZARD_STEP1]: [
                this.states.EVEREST_WIZARD_STEP2,
                this.states.EVEREST_WIZARD,
                this.states.MAIN_MENU
            ],
            [this.states.EVEREST_WIZARD_STEP2]: [
                this.states.EVEREST_WIZARD_STEP3,
                this.states.EVEREST_WIZARD_STEP1,
                this.states.MAIN_MENU
            ],
            [this.states.EVEREST_WIZARD_STEP3]: [
                this.states.DOC_GENERATING,
                this.states.EVEREST_WIZARD_STEP2,
                this.states.MAIN_MENU
            ]
        };
        
        // State timeouts (in minutes)
        this.stateTimeouts = {
            [this.states.CONTRACT_UPLOAD]: 10,
            [this.states.INN_INPUT]: 5,
            [this.states.DOC_PARAMS_INPUT]: 15,
            [this.states.LEGAL_QUESTION]: 10,
            [this.states.EVEREST_WIZARD_STEP1]: 10,
            [this.states.EVEREST_WIZARD_STEP2]: 10,
            [this.states.EVEREST_WIZARD_STEP3]: 10
        };
    }
    
    // Get current user state
    getUserState(userId) {
        return this.userStates.get(userId) || this.states.IDLE;
    }
    
    // Set user state with validation
    setUserState(userId, newState, data = {}) {
        const currentState = this.getUserState(userId);
        
        // Validate transition
        if (!this.isValidTransition(currentState, newState)) {
            console.warn(`Invalid transition from ${currentState} to ${newState} for user ${userId}`);
            return false;
        }
        
        // Save previous state to history
        if (!this.stateHistory.has(userId)) {
            this.stateHistory.set(userId, []);
        }
        this.stateHistory.get(userId).push({
            state: currentState,
            timestamp: Date.now(),
            data: this.getSessionData(userId)
        });
        
        // Keep only last 10 states in history
        const history = this.stateHistory.get(userId);
        if (history.length > 10) {
            history.shift();
        }
        
        // Set new state
        this.userStates.set(userId, newState);
        
        // Update session data
        this.updateSessionData(userId, data);
        
        // Set timeout if applicable
        this.setStateTimeout(userId, newState);
        
        console.log(`User ${userId} transitioned from ${currentState} to ${newState}`);
        return true;
    }
    
    // Check if transition is valid
    isValidTransition(fromState, toState) {
        // Allow transition to MAIN_MENU from any state
        if (toState === this.states.MAIN_MENU) {
            return true;
        }
        
        // Allow transition to ERROR state from any state
        if (toState === this.states.ERROR) {
            return true;
        }
        
        // Check defined transitions
        const allowedTransitions = this.transitions[fromState] || [];
        return allowedTransitions.includes(toState);
    }
    
    // Get session data for user
    getSessionData(userId) {
        return this.sessionData.get(userId) || {};
    }
    
    // Update session data
    updateSessionData(userId, data) {
        const currentData = this.getSessionData(userId);
        const updatedData = { ...currentData, ...data };
        this.sessionData.set(userId, updatedData);
    }
    
    // Clear session data
    clearSessionData(userId) {
        this.sessionData.delete(userId);
    }
    
    // Get state history
    getStateHistory(userId) {
        return this.stateHistory.get(userId) || [];
    }
    
    // Go back to previous state
    goBack(userId) {
        const history = this.getStateHistory(userId);
        if (history.length > 0) {
            const previousState = history.pop();
            this.userStates.set(userId, previousState.state);
            this.sessionData.set(userId, previousState.data);
            return previousState.state;
        }
        return this.states.MAIN_MENU;
    }
    
    // Reset user to initial state
    resetUser(userId) {
        this.userStates.set(userId, this.states.IDLE);
        this.clearSessionData(userId);
        this.stateHistory.delete(userId);
    }
    
    // Set state timeout
    setStateTimeout(userId, state) {
        const timeoutMinutes = this.stateTimeouts[state];
        if (timeoutMinutes) {
            setTimeout(() => {
                const currentState = this.getUserState(userId);
                if (currentState === state) {
                    console.log(`State timeout for user ${userId} in state ${state}`);
                    this.setUserState(userId, this.states.TIMEOUT);
                }
            }, timeoutMinutes * 60 * 1000);
        }
    }
    
    // Get state context for UI
    getStateContext(userId) {
        const state = this.getUserState(userId);
        const data = this.getSessionData(userId);
        const history = this.getStateHistory(userId);
        
        return {
            currentState: state,
            sessionData: data,
            canGoBack: history.length > 0,
            stateDescription: this.getStateDescription(state),
            expectedInput: this.getExpectedInput(state),
            availableActions: this.getAvailableActions(state)
        };
    }
    
    // Get human-readable state description
    getStateDescription(state) {
        const descriptions = {
            [this.states.IDLE]: 'Начальное состояние',
            [this.states.MAIN_MENU]: 'Главное меню',
            [this.states.CONTRACT_UPLOAD]: 'Ожидание загрузки договора',
            [this.states.CONTRACT_ANALYZING]: 'Анализ договора',
            [this.states.CONTRACT_RESULTS]: 'Результаты анализа договора',
            [this.states.INN_INPUT]: 'Ожидание ввода ИНН',
            [this.states.INN_PROCESSING]: 'Проверка ИНН',
            [this.states.INN_RESULTS]: 'Результаты проверки ИНН',
            [this.states.EVEREST_MENU]: 'Меню пакета Эверест',
            [this.states.EVEREST_WIZARD]: 'Мастер создания документов',
            [this.states.EVEREST_WIZARD_STEP1]: 'Шаг 1: Выбор типа договора',
            [this.states.EVEREST_WIZARD_STEP2]: 'Шаг 2: Заполнение реквизитов',
            [this.states.EVEREST_WIZARD_STEP3]: 'Шаг 3: Проверка и генерация',
            [this.states.DOC_TYPE_SELECT]: 'Выбор типа документа',
            [this.states.DOC_PARAMS_INPUT]: 'Ввод параметров документа',
            [this.states.DOC_GENERATING]: 'Генерация документа',
            [this.states.LEGAL_QUESTION]: 'Ожидание юридического вопроса',
            [this.states.LEGAL_PROCESSING]: 'Обработка вопроса',
            [this.states.SETTINGS_MENU]: 'Меню настроек',
            [this.states.HELP_MENU]: 'Меню помощи',
            [this.states.ERROR]: 'Ошибка',
            [this.states.TIMEOUT]: 'Тайм-аут сессии'
        };
        
        return descriptions[state] || 'Неизвестное состояние';
    }
    
    // Get expected input type for current state
    getExpectedInput(state) {
        const expectedInputs = {
            [this.states.CONTRACT_UPLOAD]: 'document',
            [this.states.INN_INPUT]: 'text',
            [this.states.DOC_PARAMS_INPUT]: 'text',
            [this.states.LEGAL_QUESTION]: 'text',
            [this.states.EVEREST_WIZARD_STEP1]: 'callback',
            [this.states.EVEREST_WIZARD_STEP2]: 'text',
            [this.states.EVEREST_WIZARD_STEP3]: 'callback'
        };
        
        return expectedInputs[state] || 'callback';
    }
    
    // Get available actions for current state
    getAvailableActions(state) {
        const actions = {
            [this.states.MAIN_MENU]: [
                'contracts', 'inn_check', 'everest', 'documents', 
                'legal_help', 'settings', 'help'
            ],
            [this.states.CONTRACT_RESULTS]: [
                'redline', 'protocol', 'download', 'back'
            ],
            [this.states.INN_RESULTS]: [
                'detailed_info', 'new_check', 'back'
            ],
            [this.states.EVEREST_MENU]: [
                'supply_contract', 'specification', 'wizard', 'back'
            ],
            [this.states.EVEREST_WIZARD_STEP1]: [
                'supply', 'service', 'mixed', 'back'
            ],
            [this.states.EVEREST_WIZARD_STEP3]: [
                'generate', 'preview', 'edit', 'back'
            ]
        };
        
        return actions[state] || ['back', 'home'];
    }
    
    // Validate user input for current state
    validateInput(userId, input, inputType) {
        const state = this.getUserState(userId);
        const expectedType = this.getExpectedInput(state);
        
        // Type validation
        if (expectedType !== inputType && expectedType !== 'any') {
            return {
                valid: false,
                error: `Ожидается ${expectedType}, получен ${inputType}`
            };
        }
        
        // State-specific validation
        switch (state) {
            case this.states.INN_INPUT:
                return this.validateINN(input);
                
            case this.states.EVEREST_WIZARD_STEP2:
                return this.validateCompanyData(input);
                
            case this.states.DOC_PARAMS_INPUT:
                return this.validateDocumentParams(input);
                
            default:
                return { valid: true };
        }
    }
    
    // Validate INN input
    validateINN(inn) {
        if (!inn || typeof inn !== 'string') {
            return {
                valid: false,
                error: 'ИНН должен быть строкой'
            };
        }
        
        const cleanINN = inn.replace(/\D/g, '');
        
        if (cleanINN.length !== 10 && cleanINN.length !== 12) {
            return {
                valid: false,
                error: 'ИНН должен содержать 10 или 12 цифр'
            };
        }
        
        return { valid: true, cleanValue: cleanINN };
    }
    
    // Validate company data
    validateCompanyData(data) {
        const required = ['name', 'inn', 'address'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            return {
                valid: false,
                error: `Отсутствуют обязательные поля: ${missing.join(', ')}`
            };
        }
        
        return { valid: true };
    }
    
    // Validate document parameters
    validateDocumentParams(params) {
        if (!params || typeof params !== 'object') {
            return {
                valid: false,
                error: 'Параметры должны быть объектом'
            };
        }
        
        return { valid: true };
    }
    
    // Get analytics data
    getAnalytics() {
        const totalUsers = this.userStates.size;
        const stateDistribution = {};
        
        for (const state of this.userStates.values()) {
            stateDistribution[state] = (stateDistribution[state] || 0) + 1;
        }
        
        return {
            totalUsers,
            stateDistribution,
            totalSessions: this.sessionData.size,
            averageHistoryLength: Array.from(this.stateHistory.values())
                .reduce((sum, history) => sum + history.length, 0) / this.stateHistory.size || 0
        };
    }
}

// Export singleton instance
const advancedFSM = new AdvancedFSM();
module.exports = advancedFSM;

