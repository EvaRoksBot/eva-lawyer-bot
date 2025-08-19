// Comprehensive Eva Lawyer Bot with FSM and all 9 scenarios
const { UserStateManager, STATES, ACTIONS, validateFile, validateINN, validateText } = require('./modules/fsm');

// Telegram Bot Token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8355504616:AAGrfPmGarrAz0YxrycZcy2hg9uT-vaYLGg';

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

// DaData Configuration
const DADATA_API_KEY = process.env.DADATA_API_KEY || 'ap6te7l4ub6sq1dwt608';
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY || '8bf724e4ee6cc03ce6b6';

// Initialize state manager
const stateManager = new UserStateManager();

// Telegram API helper
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('Telegram API error:', await response.text());
            return false;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Send message error:', error);
        return false;
    }
}

// Main menu
function getMainMenu() {
    return {
        inline_keyboard: [
            [
                { text: '📄 Проверка договора', callback_data: `act:${ACTIONS.CONTRACT_REVIEW}` }
            ],
            [
                { text: '📊 Таблица рисков', callback_data: `act:${ACTIONS.RISK_TABLE}` }
            ],
            [
                { text: '📦 Пакет «Эверест»', callback_data: `act:${ACTIONS.EVEREST_PACKAGE}` }
            ],
            [
                { text: '⚖️ Юр. заключение', callback_data: `act:${ACTIONS.LEGAL_OPINION}` }
            ],
            [
                { text: '🏛️ Практика судов', callback_data: `act:${ACTIONS.CASE_LAW}` }
            ],
            [
                { text: '⚔️ Подготовка к спору', callback_data: `act:${ACTIONS.DISPUTE_PREP}` }
            ],
            [
                { text: '📬 Ответ на претензию', callback_data: `act:${ACTIONS.CLAIM_REPLY}` }
            ],
            [
                { text: '🔍 Проверка контрагента (ИНН)', callback_data: `act:${ACTIONS.COUNTERPARTY_SCORE}` }
            ],
            [
                { text: '🧾 Счёт на оплату', callback_data: `act:${ACTIONS.INVOICE}` }
            ]
        ]
    };
}

// Everest package menu
function getEverestMenu() {
    return {
        inline_keyboard: [
            [
                { text: '📄 Договор поставки', callback_data: `everest:${ACTIONS.EVEREST_CONTRACT}` }
            ],
            [
                { text: '📋 Спецификация', callback_data: `everest:${ACTIONS.EVEREST_SPEC}` }
            ],
            [
                { text: '📝 Протокол разногласий', callback_data: `everest:${ACTIONS.EVEREST_PROTOCOL}` }
            ],
            [
                { text: '🧾 Счёт на оплату', callback_data: `everest:${ACTIONS.EVEREST_INVOICE}` }
            ],
            [
                { text: '📦 Сформировать все документы', callback_data: 'everest:all' }
            ],
            [
                { text: '↩️ Назад', callback_data: 'back' },
                { text: '🏠 Главное меню', callback_data: 'main_menu' }
            ]
        ]
    };
}

// Navigation buttons
function getNavigationButtons() {
    return [
        [
            { text: '↩️ Назад', callback_data: 'back' },
            { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
    ];
}

// Cancel button
function getCancelButton() {
    return [
        [
            { text: '❌ Отмена', callback_data: 'cancel' }
        ]
    ];
}

// OpenAI API call
async function callOpenAI(prompt, maxTokens = 1500) {
    if (!OPENAI_API_KEY) {
        return 'OpenAI API недоступен. Обратитесь к администратору.';
    }

    try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI error:', error);
        return 'Произошла ошибка при обращении к AI. Попробуйте позже.';
    }
}

// DaData API call
async function callDaData(inn) {
    if (!DADATA_API_KEY || !DADATA_SECRET_KEY) {
        return null;
    }

    try {
        const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DADATA_API_KEY}`,
                'X-Secret': DADATA_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: inn })
        });

        if (!response.ok) {
            throw new Error(`DaData API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('DaData error:', error);
        return null;
    }
}

// Process user input based on current state
async function processUserInput(userId, chatId, text, fileData = null) {
    const state = stateManager.getState(userId);
    const action = stateManager.getCurrentAction(userId);

    switch (state) {
        case STATES.CONTRACT_AWAIT_FILE:
            if (fileData) {
                const validation = validateFile(fileData);
                if (!validation.valid) {
                    return await sendTelegramMessage(chatId, `❌ ${validation.error}`);
                }
                stateManager.setUserData(userId, 'contractFile', fileData);
                stateManager.setState(userId, STATES.CONTRACT_AWAIT_SIDE);
                return await sendTelegramMessage(chatId, 
                    '📄 Файл получен! Теперь укажите, чью сторону защищаем:\n\n• Заказчик\n• Исполнитель\n• Поставщик\n• Покупатель',
                    { inline_keyboard: getCancelButton() }
                );
            } else {
                return await sendTelegramMessage(chatId, '❌ Пожалуйста, загрузите файл договора (.docx или .pdf)');
            }

        case STATES.CONTRACT_AWAIT_SIDE:
            const side = text.toLowerCase();
            if (!['заказчик', 'исполнитель', 'поставщик', 'покупатель'].includes(side)) {
                return await sendTelegramMessage(chatId, '❌ Пожалуйста, выберите одну из сторон: Заказчик, Исполнитель, Поставщик, Покупатель');
            }
            
            stateManager.setUserData(userId, 'contractSide', side);
            stateManager.setState(userId, STATES.CONTRACT_PROCESSING);
            
            const contractFile = stateManager.getUserData(userId).contractFile;
            const analysis = await analyzeContract(contractFile, side);
            
            stateManager.setState(userId, STATES.CONTRACT_PREVIEW);
            return await sendTelegramMessage(chatId, analysis, {
                inline_keyboard: [
                    [{ text: '📄 Скачать отчёт DOCX', callback_data: 'download:docx:contract' }],
                    [{ text: '🔁 Повторить анализ', callback_data: `act:${ACTIONS.CONTRACT_REVIEW}` }],
                    ...getNavigationButtons()
                ]
            });

        case STATES.RISK_AWAIT_FILE:
            if (fileData) {
                const validation = validateFile(fileData);
                if (!validation.valid) {
                    return await sendTelegramMessage(chatId, `❌ ${validation.error}`);
                }
                
                stateManager.setState(userId, STATES.RISK_PROCESSING);
                const riskTable = await generateRiskTable(fileData);
                
                stateManager.setState(userId, STATES.RISK_PREVIEW);
                return await sendTelegramMessage(chatId, riskTable, {
                    inline_keyboard: [
                        [{ text: '📄 DOCX таблица рисков', callback_data: 'download:docx:risks' }],
                        [{ text: '🔁 Повторить анализ', callback_data: `act:${ACTIONS.RISK_TABLE}` }],
                        ...getNavigationButtons()
                    ]
                });
            } else {
                return await sendTelegramMessage(chatId, '❌ Пожалуйста, загрузите файл договора (.docx или .pdf)');
            }

        case STATES.OPINION_AWAIT_TOPIC:
            const validation = validateText(text, 10);
            if (!validation.valid) {
                return await sendTelegramMessage(chatId, `❌ ${validation.error}`);
            }
            
            stateManager.setUserData(userId, 'opinionTopic', text);
            stateManager.setState(userId, STATES.OPINION_AWAIT_FIELD);
            return await sendTelegramMessage(chatId, 
                '⚖️ Укажите отрасль права:\n\n• Гражданское право\n• Трудовое право\n• Корпоративное право\n• Налоговое право\n• Другое',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.OPINION_AWAIT_FIELD:
            stateManager.setUserData(userId, 'opinionField', text);
            stateManager.setState(userId, STATES.OPINION_AWAIT_FACTS);
            return await sendTelegramMessage(chatId, 
                '📋 Опишите входные факты и обстоятельства (минимум 50 символов):',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.OPINION_AWAIT_FACTS:
            const factsValidation = validateText(text, 50);
            if (!factsValidation.valid) {
                return await sendTelegramMessage(chatId, `❌ ${factsValidation.error}`);
            }
            
            stateManager.setState(userId, STATES.OPINION_PROCESSING);
            const userData = stateManager.getUserData(userId);
            const opinion = await generateLegalOpinion(userData.opinionTopic, userData.opinionField, text);
            
            stateManager.setState(userId, STATES.OPINION_PREVIEW);
            return await sendTelegramMessage(chatId, opinion, {
                inline_keyboard: [
                    [{ text: '📄 DOCX заключение', callback_data: 'download:docx:opinion' }],
                    [{ text: '🔁 Новое заключение', callback_data: `act:${ACTIONS.LEGAL_OPINION}` }],
                    ...getNavigationButtons()
                ]
            });

        case STATES.CASE_AWAIT_QUESTION:
            const questionValidation = validateText(text, 20);
            if (!questionValidation.valid) {
                return await sendTelegramMessage(chatId, `❌ ${questionValidation.error}`);
            }
            
            stateManager.setUserData(userId, 'caseQuestion', text);
            stateManager.setState(userId, STATES.CASE_AWAIT_PERIOD);
            return await sendTelegramMessage(chatId, 
                '📅 Укажите период анализа (например: "2020-2024" или "последние 3 года"):',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.CASE_AWAIT_PERIOD:
            stateManager.setState(userId, STATES.CASE_PROCESSING);
            const caseUserData = stateManager.getUserData(userId);
            const caseLaw = await analyzeCaseLaw(caseUserData.caseQuestion, text);
            
            stateManager.setState(userId, STATES.CASE_PREVIEW);
            return await sendTelegramMessage(chatId, caseLaw, {
                inline_keyboard: [
                    [{ text: '📄 DOCX справка', callback_data: 'download:docx:caselaw' }],
                    [{ text: '🔍 Подготовка к спору', callback_data: `act:${ACTIONS.DISPUTE_PREP}` }],
                    ...getNavigationButtons()
                ]
            });

        case STATES.DISPUTE_AWAIT_TOPIC:
            const topicValidation = validateText(text, 20);
            if (!topicValidation.valid) {
                return await sendTelegramMessage(chatId, `❌ ${topicValidation.error}`);
            }
            
            stateManager.setUserData(userId, 'disputeTopic', text);
            stateManager.setState(userId, STATES.DISPUTE_AWAIT_FACTS);
            return await sendTelegramMessage(chatId, 
                '📋 Опишите факты и обстоятельства дела:',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.DISPUTE_AWAIT_FACTS:
            stateManager.setUserData(userId, 'disputeFacts', text);
            stateManager.setState(userId, STATES.DISPUTE_AWAIT_OPPONENT);
            return await sendTelegramMessage(chatId, 
                '⚔️ Что требует оппонент? Опишите их позицию:',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.DISPUTE_AWAIT_OPPONENT:
            stateManager.setState(userId, STATES.DISPUTE_PROCESSING);
            const disputeUserData = stateManager.getUserData(userId);
            const disputePrep = await prepareDispute(disputeUserData.disputeTopic, disputeUserData.disputeFacts, text);
            
            stateManager.setState(userId, STATES.DISPUTE_PREVIEW);
            return await sendTelegramMessage(chatId, disputePrep, {
                inline_keyboard: [
                    [{ text: '📄 DOCX табличка', callback_data: 'download:docx:dispute' }],
                    [{ text: '➕ Ещё аргументы', callback_data: 'dispute:more_arguments' }],
                    ...getNavigationButtons()
                ]
            });

        case STATES.CLAIM_AWAIT_ESSENCE:
            const essenceValidation = validateText(text, 30);
            if (!essenceValidation.valid) {
                return await sendTelegramMessage(chatId, `❌ ${essenceValidation.error}`);
            }
            
            stateManager.setUserData(userId, 'claimEssence', text);
            stateManager.setState(userId, STATES.CLAIM_AWAIT_CONTRACT);
            return await sendTelegramMessage(chatId, 
                '📄 Опишите договор и его условия:',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.CLAIM_AWAIT_CONTRACT:
            stateManager.setUserData(userId, 'claimContract', text);
            stateManager.setState(userId, STATES.CLAIM_AWAIT_FACTS);
            return await sendTelegramMessage(chatId, 
                '📋 Приведите факты и переписку по делу:',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.CLAIM_AWAIT_FACTS:
            stateManager.setState(userId, STATES.CLAIM_PROCESSING);
            const claimUserData = stateManager.getUserData(userId);
            const claimReply = await generateClaimReply(claimUserData.claimEssence, claimUserData.claimContract, text);
            
            stateManager.setState(userId, STATES.CLAIM_PREVIEW);
            return await sendTelegramMessage(chatId, claimReply, {
                inline_keyboard: [
                    [{ text: '✉️ DOCX письмо', callback_data: 'download:docx:claim' }],
                    [{ text: '🪪 Подпись/реквизиты', callback_data: 'claim:add_signature' }],
                    ...getNavigationButtons()
                ]
            });

        case STATES.COUNTERPARTY_AWAIT_INN:
            const innValidation = validateINN(text);
            if (!innValidation.valid) {
                return await sendTelegramMessage(chatId, `❌ ${innValidation.error}`);
            }
            
            stateManager.setState(userId, STATES.COUNTERPARTY_PROCESSING);
            const counterpartyScore = await checkCounterparty(innValidation.inn);
            
            stateManager.setState(userId, STATES.COUNTERPARTY_PREVIEW);
            return await sendTelegramMessage(chatId, counterpartyScore, {
                inline_keyboard: [
                    [{ text: '📄 PDF отчёт', callback_data: 'download:pdf:counterparty' }],
                    [{ text: '🔁 Пересчитать с условиями', callback_data: 'counterparty:recalculate' }],
                    ...getNavigationButtons()
                ]
            });

        case STATES.INVOICE_AWAIT_BUYER:
            stateManager.setUserData(userId, 'invoiceBuyer', text);
            stateManager.setState(userId, STATES.INVOICE_AWAIT_ITEMS);
            return await sendTelegramMessage(chatId, 
                '🛒 Укажите товары/услуги (позиции, цены, НДС):',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.INVOICE_AWAIT_ITEMS:
            stateManager.setUserData(userId, 'invoiceItems', text);
            stateManager.setState(userId, STATES.INVOICE_AWAIT_TERMS);
            return await sendTelegramMessage(chatId, 
                '📅 Укажите сроки отгрузки/оплаты/доставки:',
                { inline_keyboard: getCancelButton() }
            );

        case STATES.INVOICE_AWAIT_TERMS:
            stateManager.setState(userId, STATES.INVOICE_PROCESSING);
            const invoiceUserData = stateManager.getUserData(userId);
            const invoice = await generateInvoice(invoiceUserData.invoiceBuyer, invoiceUserData.invoiceItems, text);
            
            stateManager.setState(userId, STATES.INVOICE_PREVIEW);
            return await sendTelegramMessage(chatId, invoice, {
                inline_keyboard: [
                    [{ text: '📄 DOCX счёт', callback_data: 'download:docx:invoice' }],
                    [{ text: '📨 Отправить по email', callback_data: 'invoice:send_email' }],
                    ...getNavigationButtons()
                ]
            });

        default:
            // Обычное сообщение - отправляем в AI
            const aiResponse = await callOpenAI(`Ты юридический консультант. Ответь на вопрос: ${text}`);
            return await sendTelegramMessage(chatId, aiResponse);
    }
}

// AI Analysis Functions
async function analyzeContract(fileData, side) {
    const prompt = `Проанализируй договор с позиции ${side}. Выдели основные риски и предложи правки.

Формат ответа:
📄 **Анализ договора**

**Краткое резюме:**
[резюме]

**Основные риски:**
• [риск 1]
• [риск 2]
• [риск 3]

**Рекомендации:**
• [рекомендация 1]
• [рекомендация 2]`;

    return await callOpenAI(prompt);
}

async function generateRiskTable(fileData) {
    const prompt = `Создай таблицу рисков для договора в формате:

📊 **Таблица рисков**

| Пункт договора | Уровень риска | Описание риска | Как снизить |
|----------------|---------------|----------------|-------------|
| [пункт] | 🔴 Высокий | [описание] | [рекомендация] |

**Общая оценка:** [оценка]`;

    return await callOpenAI(prompt);
}

async function generateLegalOpinion(topic, field, facts) {
    const prompt = `Создай юридическое заключение по теме "${topic}" в области "${field}".

Факты: ${facts}

Формат ответа:
⚖️ **Юридическое заключение**

**1. Правовая квалификация:**
[анализ]

**2. Применимые нормы:**
[нормы права]

**3. Выводы:**
[выводы]

**4. Рекомендации:**
[рекомендации]`;

    return await callOpenAI(prompt);
}

async function analyzeCaseLaw(question, period) {
    const prompt = `Проанализируй судебную практику по вопросу: "${question}" за период ${period}.

Формат ответа:
🏛️ **Анализ судебной практики**

**Основные тенденции:**
• [тенденция 1]
• [тенденция 2]

**Ключевые решения:**
• [решение 1]
• [решение 2]

**Рекомендации:**
[рекомендации]`;

    return await callOpenAI(prompt);
}

async function prepareDispute(topic, facts, opponentClaims) {
    const prompt = `Подготовь стратегию для спора по теме: "${topic}"

Факты: ${facts}
Требования оппонента: ${opponentClaims}

Формат ответа:
⚔️ **Подготовка к спору**

**Наша позиция:**
[позиция]

**Контраргументы:**
• [аргумент 1]
• [аргумент 2]

**Доказательства:**
• [доказательство 1]
• [доказательство 2]

**Стратегия:**
[стратегия]`;

    return await callOpenAI(prompt);
}

async function generateClaimReply(essence, contract, facts) {
    const prompt = `Создай ответ на претензию.

Суть претензии: ${essence}
Договор: ${contract}
Факты: ${facts}

Формат ответа:
📬 **Ответ на претензию**

[Официальное письмо с обоснованием позиции]`;

    return await callOpenAI(prompt);
}

async function checkCounterparty(inn) {
    // Сначала пробуем DaData API
    const dadataResult = await callDaData(inn);
    
    if (dadataResult && dadataResult.suggestions && dadataResult.suggestions.length > 0) {
        const company = dadataResult.suggestions[0];
        const riskLevel = calculateRiskLevel(company);
        const decision = riskLevel > 70 ? '🔴 **ОТКАЗАТЬ**' : 
                        riskLevel > 40 ? '🟡 **ОДОБРИТЬ С УСЛОВИЯМИ**' : 
                        '🟢 **ОДОБРИТЬ**';
        
        return `🔍 **Проверка контрагента**

${decision}

**ИНН:** ${inn}
**Компания:** ${company.value}
**Статус:** ${company.data.state?.status || 'Неизвестен'}
**Риск-уровень:** ${riskLevel}%

**Адрес:** ${company.data.address?.value || 'Не указан'}
**Руководитель:** ${company.data.management?.name || 'Не указан'}

**Рекомендации:**
${getRiskRecommendations(riskLevel)}`;
    }
    
    // Fallback на AI
    const prompt = `Проанализируй контрагента с ИНН ${inn}. Дай рекомендации по работе.`;
    return await callOpenAI(prompt);
}

function calculateRiskLevel(company) {
    let risk = 0;
    
    if (company.data.state?.status !== 'ACTIVE') risk += 30;
    if (!company.data.address) risk += 20;
    if (!company.data.phones) risk += 15;
    if (company.data.capital?.value < 10000) risk += 10;
    
    return Math.min(risk, 100);
}

function getRiskRecommendations(riskLevel) {
    if (riskLevel > 70) {
        return '• Высокий риск неисполнения обязательств\n• Рекомендуется отказ от сотрудничества\n• При необходимости - 100% предоплата';
    } else if (riskLevel > 40) {
        return '• Средний риск\n• Рекомендуется предоплата 50%\n• Дополнительные гарантии\n• Сокращенные сроки платежей';
    } else {
        return '• Низкий риск\n• Можно работать на стандартных условиях\n• Рекомендуется стандартная отсрочка платежа';
    }
}

async function generateInvoice(buyer, items, terms) {
    const prompt = `Создай счет на оплату.

Покупатель: ${buyer}
Товары/услуги: ${items}
Условия: ${terms}

Формат ответа:
🧾 **Счет на оплату**

**Покупатель:** [данные]
**Товары/услуги:** [список]
**Сумма без НДС:** [сумма]
**НДС 20%:** [сумма НДС]
**Итого к доплате:** [общая сумма]

**Условия оплаты:** [условия]`;

    return await callOpenAI(prompt);
}

// Main handler function
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, callback_query } = req.body;

        // Handle callback queries (button presses)
        if (callback_query) {
            const chatId = callback_query.message.chat.id;
            const userId = callback_query.from.id;
            const data = callback_query.callback_data;

            if (data === 'main_menu') {
                stateManager.setState(userId, STATES.IDLE);
                stateManager.clearUserData(userId);
                await sendTelegramMessage(chatId, 
                    '⚖️ **Ева — юридический ассистент**\n\nВыберите действие:', 
                    getMainMenu()
                );
            } else if (data === 'cancel') {
                stateManager.setState(userId, STATES.IDLE);
                stateManager.clearUserData(userId);
                await sendTelegramMessage(chatId, 
                    '❌ Операция отменена.\n\n⚖️ **Ева — юридический ассистент**\n\nВыберите действие:', 
                    getMainMenu()
                );
            } else if (data.startsWith('act:')) {
                const action = data.replace('act:', '');
                
                if (action === ACTIONS.EVEREST_PACKAGE) {
                    await sendTelegramMessage(chatId, 
                        '📦 **Пакет «Эверест»**\n\nВыберите документ для создания:', 
                        getEverestMenu()
                    );
                } else {
                    // Start specific action
                    const startMessage = getActionStartMessage(action);
                    stateManager.setCurrentAction(userId, action);
                    
                    // Set appropriate state
                    switch (action) {
                        case ACTIONS.CONTRACT_REVIEW:
                            stateManager.setState(userId, STATES.CONTRACT_AWAIT_FILE);
                            break;
                        case ACTIONS.RISK_TABLE:
                            stateManager.setState(userId, STATES.RISK_AWAIT_FILE);
                            break;
                        case ACTIONS.LEGAL_OPINION:
                            stateManager.setState(userId, STATES.OPINION_AWAIT_TOPIC);
                            break;
                        case ACTIONS.CASE_LAW:
                            stateManager.setState(userId, STATES.CASE_AWAIT_QUESTION);
                            break;
                        case ACTIONS.DISPUTE_PREP:
                            stateManager.setState(userId, STATES.DISPUTE_AWAIT_TOPIC);
                            break;
                        case ACTIONS.CLAIM_REPLY:
                            stateManager.setState(userId, STATES.CLAIM_AWAIT_ESSENCE);
                            break;
                        case ACTIONS.COUNTERPARTY_SCORE:
                            stateManager.setState(userId, STATES.COUNTERPARTY_AWAIT_INN);
                            break;
                        case ACTIONS.INVOICE:
                            stateManager.setState(userId, STATES.INVOICE_AWAIT_BUYER);
                            break;
                    }
                    
                    await sendTelegramMessage(chatId, startMessage.text, { inline_keyboard: startMessage.buttons });
                }
            }

            return res.status(200).json({ ok: true });
        }

        // Handle regular messages
        if (message) {
            const chatId = message.chat.id;
            const userId = message.from.id;
            const text = message.text;
            const fileData = message.document;

            // Handle /start command
            if (text === '/start') {
                stateManager.setState(userId, STATES.IDLE);
                stateManager.clearUserData(userId);
                await sendTelegramMessage(chatId, 
                    '⚖️ **Добро пожаловать в Ева — юридический ассистент!**\n\nЯ помогу вам с:\n• Анализом договоров\n• Проверкой контрагентов\n• Юридическими консультациями\n• Созданием документов\n\nВыберите действие:', 
                    getMainMenu()
                );
                return res.status(200).json({ ok: true });
            }

            // Process user input based on current state
            await processUserInput(userId, chatId, text, fileData);
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Helper function to get action start message
function getActionStartMessage(action) {
    const messages = {
        [ACTIONS.CONTRACT_REVIEW]: {
            text: '📄 **Проверка договора**\n\nПришлите договор (.docx или .pdf) и укажите, чью сторону защищаем:\n• Заказчик\n• Исполнитель',
            buttons: getCancelButton()
        },
        [ACTIONS.RISK_TABLE]: {
            text: '📊 **Таблица рисков**\n\nПришлите договор (.docx или .pdf) для анализа рисков.',
            buttons: getCancelButton()
        },
        [ACTIONS.LEGAL_OPINION]: {
            text: '⚖️ **Юридическое заключение**\n\nУкажите тему запроса:',
            buttons: getCancelButton()
        },
        [ACTIONS.CASE_LAW]: {
            text: '🏛️ **Анализ судебной практики**\n\nУкажите вопрос или ситуацию для анализа:',
            buttons: getCancelButton()
        },
        [ACTIONS.DISPUTE_PREP]: {
            text: '⚔️ **Подготовка к спору**\n\nУкажите тематику спора:',
            buttons: getCancelButton()
        },
        [ACTIONS.CLAIM_REPLY]: {
            text: '📬 **Ответ на претензию**\n\nОпишите суть претензии:',
            buttons: getCancelButton()
        },
        [ACTIONS.COUNTERPARTY_SCORE]: {
            text: '🔍 **Проверка контрагента**\n\nВведите ИНН организации для проверки:',
            buttons: getCancelButton()
        },
        [ACTIONS.INVOICE]: {
            text: '🧾 **Счёт на оплату**\n\nУкажите данные покупателя (ИНН/КПП/адрес/тел):',
            buttons: getCancelButton()
        }
    };
    
    return messages[action] || {
        text: 'Неизвестное действие',
        buttons: getNavigationButtons()
    };
}

