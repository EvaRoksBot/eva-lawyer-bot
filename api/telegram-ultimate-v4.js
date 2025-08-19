// Eva Lawyer Bot - Ultimate Implementation v4.0
// Complete legal assistant with all 13 scenarios and advanced features

const { analyzeImage } = require('./modules/vision-analyzer');
const { checkCounterparty } = require('./modules/dadata');
const { generateDocument } = require('./modules/document-generator');
const { AdvancedFSM } = require('./modules/advanced-fsm');

// Bot configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8355504616:AAGrfPmGarrAz0YxrycZcy2hg9uT-vaYLGg';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DADATA_API_KEY = process.env.DADATA_API_KEY;
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY;

// Initialize FSM
const fsm = new AdvancedFSM();

// Legal scenarios configuration
const LEGAL_SCENARIOS = {
    contract_analysis: {
        id: 'contract_analysis',
        title: '📄 Анализ договора',
        description: 'Загрузите договор для анализа рисков и правок',
        states: ['waiting_document', 'analyzing', 'providing_results'],
        prompt: `Ты - опытный юрист-аналитик. Проанализируй договор и предоставь:
1. ОСНОВНЫЕ РИСКИ (топ-5 критических)
2. РЕКОМЕНДАЦИИ ПО ПРАВКАМ (конкретные формулировки)
3. ОЦЕНКА СБАЛАНСИРОВАННОСТИ (от 1 до 10)
4. КЛЮЧЕВЫЕ УСЛОВИЯ (сроки, суммы, ответственность)
5. ПЛАН ДЕЙСТВИЙ (что делать дальше)

Ответ структурируй четко, используй эмодзи для наглядности.`
    },
    
    risk_table: {
        id: 'risk_table',
        title: '📊 Таблица рисков',
        description: 'Создание таблицы рисков в формате DOCX',
        states: ['collecting_info', 'generating_table', 'sending_document'],
        prompt: `Создай профессиональную таблицу рисков для юридического проекта:
1. ИДЕНТИФИКАЦИЯ РИСКОВ (описание, вероятность, влияние)
2. ОЦЕНКА (матрица рисков, приоритизация)
3. МЕРЫ МИТИГАЦИИ (превентивные и реактивные)
4. ОТВЕТСТВЕННЫЕ (кто контролирует)
5. МОНИТОРИНГ (как отслеживать)

Формат: структурированная таблица с цветовой кодировкой рисков.`
    },
    
    everest_package: {
        id: 'everest_package',
        title: '📚 Пакет «Эверест»',
        description: 'Комплексное решение для поставок',
        submenu: {
            supply_contract: '📋 Договор поставки',
            specification: '📝 Спецификация',
            disagreement_protocol: '⚖️ Протокол разногласий',
            complete_package: '📦 Полный комплект'
        },
        states: ['selecting_option', 'collecting_data', 'generating_docs'],
        prompt: `Ты - специалист по договорам поставки для компании "Эверест". 
Создай профессиональные документы с учетом:
1. СПЕЦИФИКА ПОСТАВОК (подшипники, РТИ, промышленное оборудование)
2. РОССИЙСКОЕ ЗАКОНОДАТЕЛЬСТВО (ГК РФ, торговое право)
3. ОТРАСЛЕВЫЕ СТАНДАРТЫ (ГОСТ, технические требования)
4. КОММЕРЧЕСКИЕ УСЛОВИЯ (цены, сроки, качество)
5. РИСКИ И ЗАЩИТА (форс-мажор, ответственность, гарантии)

Документы должны быть готовы к использованию.`
    },
    
    legal_conclusion: {
        id: 'legal_conclusion',
        title: '✍️ Юридическое заключение',
        description: 'Подготовка правового заключения',
        states: ['defining_question', 'researching', 'drafting_conclusion'],
        prompt: `Подготовь профессиональное юридическое заключение:
1. ПРАВОВАЯ КВАЛИФИКАЦИЯ (применимые нормы)
2. АНАЛИЗ СИТУАЦИИ (фактические обстоятельства)
3. ПРАВОВЫЕ ПОЗИЦИИ (аргументы за и против)
4. СУДЕБНАЯ ПРАКТИКА (релевантные решения)
5. ВЫВОДЫ И РЕКОМЕНДАЦИИ (конкретные действия)

Стиль: академический, со ссылками на НПА и судебную практику.`
    },
    
    court_practice: {
        id: 'court_practice',
        title: '📊 Анализ судебной практики',
        description: 'Исследование судебных решений',
        states: ['defining_criteria', 'searching_cases', 'analyzing_trends'],
        prompt: `Проведи анализ судебной практики по заданной тематике:
1. ПОИСК РЕШЕНИЙ (критерии отбора, источники)
2. СТАТИСТИЧЕСКИЙ АНАЛИЗ (тенденции, статистика)
3. КЛЮЧЕВЫЕ ПОЗИЦИИ СУДОВ (правовые подходы)
4. ФАКТОРЫ УСПЕХА (что влияет на исход)
5. ПРАКТИЧЕСКИЕ РЕКОМЕНДАЦИИ (стратегия ведения дел)

Включи конкретные примеры дел и номера решений.`
    },
    
    dispute_preparation: {
        id: 'dispute_preparation',
        title: '🔍 Подготовка к спору',
        description: 'Стратегия и документы для спора',
        states: ['analyzing_dispute', 'developing_strategy', 'preparing_documents'],
        prompt: `Подготовь комплексную стратегию для судебного спора:
1. АНАЛИЗ ПОЗИЦИЙ (сильные и слабые стороны)
2. ДОКАЗАТЕЛЬСТВЕННАЯ БАЗА (что собрать, как оформить)
3. ПРОЦЕССУАЛЬНАЯ СТРАТЕГИЯ (тактика ведения дела)
4. РИСКИ И АЛЬТЕРНАТИВЫ (медиация, мировое соглашение)
5. ПЛАН ДЕЙСТВИЙ (пошаговый алгоритм)

Учти специфику российского процессуального права.`
    },
    
    claim_response: {
        id: 'claim_response',
        title: '📬 Ответ на претензию',
        description: 'Составление ответа на претензию',
        states: ['analyzing_claim', 'preparing_response', 'finalizing_document'],
        prompt: `Составь профессиональный ответ на претензию:
1. АНАЛИЗ ПРЕТЕНЗИИ (обоснованность требований)
2. ПРАВОВАЯ ПОЗИЦИЯ (ссылки на договор и закон)
3. ФАКТИЧЕСКИЕ ВОЗРАЖЕНИЯ (опровержение доводов)
4. ВСТРЕЧНЫЕ ТРЕБОВАНИЯ (если применимо)
5. ПРЕДЛОЖЕНИЯ ПО УРЕГУЛИРОВАНИЮ (конструктивные решения)

Тон: деловой, аргументированный, без эмоций.`
    },
    
    counterparty_check: {
        id: 'counterparty_check',
        title: '🔍 Проверка контрагента',
        description: 'Комплексная проверка по ИНН',
        states: ['collecting_inn', 'checking_data', 'generating_report'],
        prompt: `Проведи комплексную проверку контрагента:
1. РЕГИСТРАЦИОННЫЕ ДАННЫЕ (ЕГРЮЛ/ЕГРИП, статус)
2. ФИНАНСОВОЕ СОСТОЯНИЕ (отчетность, показатели)
3. СУДЕБНАЯ ИСТОРИЯ (споры, исполнительные производства)
4. РЕПУТАЦИОННЫЕ РИСКИ (СМИ, отзывы)
5. РЕКОМЕНДАЦИИ (уровень риска, условия сотрудничества)

Используй данные из официальных источников.`
    },
    
    invoice_generation: {
        id: 'invoice_generation',
        title: '🧾 Генерация счетов',
        description: 'Создание счетов и актов',
        states: ['collecting_details', 'generating_invoice', 'sending_document'],
        prompt: `Создай профессиональные финансовые документы:
1. СЧЕТ НА ОПЛАТУ (с корректными реквизитами)
2. АКТ ВЫПОЛНЕННЫХ РАБОТ (детализация услуг)
3. СЧЕТ-ФАКТУРА (если требуется НДС)
4. ТОВАРНАЯ НАКЛАДНАЯ (для поставок)
5. ЗАКРЫВАЮЩИЕ ДОКУМЕНТЫ (полный комплект)

Соблюди требования российского законодательства.`
    },
    
    document_structure: {
        id: 'document_structure',
        title: '🧱 Структура документа',
        description: 'Анализ структуры юридического документа',
        states: ['uploading_document', 'analyzing_structure', 'providing_recommendations'],
        prompt: `Проанализируй структуру юридического документа:
1. КОМПОЗИЦИЯ (логика построения, последовательность)
2. ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ (что должно быть включено)
3. НЕДОСТАЮЩИЕ РАЗДЕЛЫ (что добавить)
4. СТИЛИСТИЧЕСКИЕ ЗАМЕЧАНИЯ (язык, терминология)
5. РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ (конкретные предложения)

Дай оценку профессионального качества документа.`
    },
    
    client_explanation: {
        id: 'client_explanation',
        title: '⚖️ Объяснение клиенту',
        description: 'Разъяснение правовой ситуации',
        states: ['understanding_situation', 'preparing_explanation', 'providing_advice'],
        prompt: `Объясни клиенту правовую ситуацию простым языком:
1. СУТЬ ПРОБЛЕМЫ (что происходит, почему важно)
2. ПРАВОВЫЕ АСПЕКТЫ (какие законы применяются)
3. ВОЗМОЖНЫЕ СЦЕНАРИИ (варианты развития событий)
4. РИСКИ И ВОЗМОЖНОСТИ (что может пойти не так/хорошо)
5. РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ (что делать прямо сейчас)

Избегай юридического жаргона, используй примеры и аналогии.`
    },
    
    template_library: {
        id: 'template_library',
        title: '📑 Библиотека шаблонов',
        description: 'Готовые шаблоны документов',
        submenu: {
            contracts: '📋 Договоры',
            applications: '📝 Заявления',
            letters: '📧 Письма',
            protocols: '📊 Протоколы'
        },
        states: ['selecting_template', 'customizing', 'generating_document'],
        prompt: `Предоставь готовый шаблон документа с возможностью кастомизации:
1. БАЗОВАЯ СТРУКТУРА (стандартные разделы)
2. ПЕРЕМЕННЫЕ ПОЛЯ (что нужно заполнить)
3. АЛЬТЕРНАТИВНЫЕ ФОРМУЛИРОВКИ (варианты условий)
4. ИНСТРУКЦИИ ПО ЗАПОЛНЕНИЮ (как правильно оформить)
5. ПРАВОВЫЕ КОММЕНТАРИИ (на что обратить внимание)

Шаблон должен соответствовать актуальному законодательству.`
    }
};

// Enhanced menu system
const MAIN_MENU = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '📄 Договоры', callback_data: 'menu_contracts' },
                { text: '📚 Пакет «Эверест»', callback_data: 'menu_everest' }
            ],
            [
                { text: '🔍 Проверка контрагента', callback_data: 'action_counterparty_check' },
                { text: '💳 Счёт/акты', callback_data: 'action_invoice_generation' }
            ],
            [
                { text: '📊 Отчёты', callback_data: 'menu_reports' },
                { text: '📑 Шаблоны', callback_data: 'menu_templates' }
            ],
            [
                { text: '⚙️ Настройки', callback_data: 'menu_settings' },
                { text: '🆘 Помощь', callback_data: 'menu_help' }
            ]
        ]
    }
};

const CONTRACTS_MENU = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '📄 Анализ договора', callback_data: 'action_contract_analysis' },
                { text: '📊 Таблица рисков', callback_data: 'action_risk_table' }
            ],
            [
                { text: '🧱 Структура документа', callback_data: 'action_document_structure' },
                { text: '✍️ Юридическое заключение', callback_data: 'action_legal_conclusion' }
            ],
            [
                { text: '🏠 Главное меню', callback_data: 'menu_main' },
                { text: '🔙 Назад', callback_data: 'menu_main' }
            ]
        ]
    }
};

const EVEREST_MENU = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '📋 Договор поставки', callback_data: 'everest_supply_contract' },
                { text: '📝 Спецификация', callback_data: 'everest_specification' }
            ],
            [
                { text: '⚖️ Протокол разногласий', callback_data: 'everest_disagreement_protocol' },
                { text: '📦 Полный комплект', callback_data: 'everest_complete_package' }
            ],
            [
                { text: '🏠 Главное меню', callback_data: 'menu_main' },
                { text: '🔙 Назад', callback_data: 'menu_main' }
            ]
        ]
    }
};

const REPORTS_MENU = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '📊 Анализ судебной практики', callback_data: 'action_court_practice' },
                { text: '🔍 Подготовка к спору', callback_data: 'action_dispute_preparation' }
            ],
            [
                { text: '📬 Ответ на претензию', callback_data: 'action_claim_response' },
                { text: '⚖️ Объяснение клиенту', callback_data: 'action_client_explanation' }
            ],
            [
                { text: '🏠 Главное меню', callback_data: 'menu_main' },
                { text: '🔙 Назад', callback_data: 'menu_main' }
            ]
        ]
    }
};

// Utility functions
async function sendMessage(chatId, text, options = {}) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Send message error:', error);
        throw error;
    }
}

async function editMessage(chatId, messageId, text, options = {}) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
        const payload = {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        return await response.json();
    } catch (error) {
        console.error('Edit message error:', error);
        return null;
    }
}

async function answerCallbackQuery(callbackQueryId, text = '') {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
        const payload = {
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: false
        };
        
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Answer callback query error:', error);
    }
}

// AI Integration
async function getAIResponse(prompt, userMessage, scenario = null) {
    try {
        if (!OPENAI_API_KEY) {
            return 'Извините, AI-консультант временно недоступен. Попробуйте позже.';
        }
        
        const systemPrompt = scenario ? LEGAL_SCENARIOS[scenario].prompt : 
            `Ты - профессиональный юрист-консультант Eva Lawyer Bot. 
            Отвечай на русском языке, давай практические советы, 
            ссылайся на российское законодательство.`;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 4000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || 'Не удалось получить ответ от AI-консультанта.';
        
    } catch (error) {
        console.error('AI response error:', error);
        return 'Извините, произошла ошибка при обращении к AI-консультанту. Попробуйте позже.';
    }
}

// INN validation and checking
function validateINN(inn) {
    if (!inn || typeof inn !== 'string') return false;
    
    const cleanINN = inn.replace(/\D/g, '');
    if (cleanINN.length !== 10 && cleanINN.length !== 12) return false;
    
    // Checksum validation for 10-digit INN
    if (cleanINN.length === 10) {
        const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanINN[i]) * coefficients[i];
        }
        const checksum = (sum % 11) % 10;
        return checksum === parseInt(cleanINN[9]);
    }
    
    // Checksum validation for 12-digit INN
    if (cleanINN.length === 12) {
        const coefficients1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
        const coefficients2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
        
        let sum1 = 0;
        for (let i = 0; i < 10; i++) {
            sum1 += parseInt(cleanINN[i]) * coefficients1[i];
        }
        const checksum1 = (sum1 % 11) % 10;
        
        let sum2 = 0;
        for (let i = 0; i < 11; i++) {
            sum2 += parseInt(cleanINN[i]) * coefficients2[i];
        }
        const checksum2 = (sum2 % 11) % 10;
        
        return checksum1 === parseInt(cleanINN[10]) && checksum2 === parseInt(cleanINN[11]);
    }
    
    return false;
}

// Enhanced counterparty checking
async function performCounterpartyCheck(inn, userId) {
    try {
        // Validate INN first
        if (!validateINN(inn)) {
            return {
                success: false,
                error: 'Некорректный ИНН. Проверьте правильность ввода.'
            };
        }
        
        // Try DaData API first
        if (DADATA_API_KEY && DADATA_SECRET_KEY) {
            try {
                const dadataResult = await checkCounterparty(inn, DADATA_API_KEY, DADATA_SECRET_KEY);
                if (dadataResult.success) {
                    return dadataResult;
                }
            } catch (dadataError) {
                console.error('DaData API error:', dadataError);
            }
        }
        
        // Fallback to AI analysis
        const aiPrompt = `Проанализируй ИНН ${inn} и предоставь информацию о компании:
1. Проверь корректность ИНН (контрольная сумма)
2. Определи тип организации (ООО, ИП, АО и т.д.)
3. Оцени потенциальные риски
4. Дай рекомендации по сотрудничеству

Если не можешь найти конкретную информацию, укажи это честно.`;
        
        const aiResponse = await getAIResponse(aiPrompt, `ИНН для проверки: ${inn}`, 'counterparty_check');
        
        return {
            success: true,
            source: 'ai_analysis',
            data: {
                inn: inn,
                analysis: aiResponse,
                checked_at: new Date().toISOString()
            }
        };
        
    } catch (error) {
        console.error('Counterparty check error:', error);
        return {
            success: false,
            error: 'Ошибка при проверке контрагента. Попробуйте позже.'
        };
    }
}

// Document processing
async function processDocument(fileUrl, fileName, userId, scenario) {
    try {
        // Download file
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            throw new Error('Failed to download file');
        }
        
        const fileBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);
        
        // Check if it's an image
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
        const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        
        if (imageExtensions.includes(fileExt)) {
            // Process as image using vision analyzer
            const visionResult = await analyzeImage(fileUrl, OPENAI_API_KEY);
            
            if (visionResult.success) {
                // Get AI analysis based on scenario
                const scenarioPrompt = LEGAL_SCENARIOS[scenario]?.prompt || 
                    'Проанализируй этот документ и дай профессиональную оценку.';
                
                const aiAnalysis = await getAIResponse(
                    scenarioPrompt, 
                    `Текст документа: ${visionResult.text}`, 
                    scenario
                );
                
                return {
                    success: true,
                    type: 'image',
                    extractedText: visionResult.text,
                    analysis: aiAnalysis,
                    documentType: visionResult.documentType,
                    keyData: visionResult.keyData
                };
            } else {
                throw new Error(visionResult.error);
            }
        } else {
            // Process as text document
            const textContent = buffer.toString('utf-8');
            
            const scenarioPrompt = LEGAL_SCENARIOS[scenario]?.prompt || 
                'Проанализируй этот документ и дай профессиональную оценку.';
            
            const aiAnalysis = await getAIResponse(
                scenarioPrompt, 
                `Содержимое документа: ${textContent}`, 
                scenario
            );
            
            return {
                success: true,
                type: 'text',
                content: textContent,
                analysis: aiAnalysis
            };
        }
        
    } catch (error) {
        console.error('Document processing error:', error);
        return {
            success: false,
            error: 'Ошибка при обработке документа. Попробуйте другой файл.'
        };
    }
}

// Action handlers
async function handleAction(action, userId, chatId, messageId, data = {}) {
    try {
        const scenario = LEGAL_SCENARIOS[action];
        if (!scenario) {
            await sendMessage(chatId, 'Неизвестное действие. Попробуйте снова.');
            return;
        }
        
        // Set user state
        fsm.setState(userId, scenario.states[0], { scenario: action, chatId, messageId });
        
        let responseText = `<b>${scenario.title}</b>\n\n${scenario.description}\n\n`;
        
        switch (action) {
            case 'contract_analysis':
            case 'document_structure':
                responseText += '📎 Загрузите документ для анализа (изображение или текстовый файл)';
                break;
                
            case 'counterparty_check':
                responseText += '🔢 Введите ИНН организации для проверки:';
                break;
                
            case 'risk_table':
                responseText += '📝 Опишите проект или ситуацию для создания таблицы рисков:';
                break;
                
            case 'legal_conclusion':
                responseText += '❓ Опишите правовой вопрос для подготовки заключения:';
                break;
                
            case 'court_practice':
                responseText += '🔍 Укажите тематику для анализа судебной практики:';
                break;
                
            case 'dispute_preparation':
                responseText += '⚖️ Опишите спорную ситуацию для подготовки стратегии:';
                break;
                
            case 'claim_response':
                responseText += '📬 Загрузите претензию или опишите её содержание:';
                break;
                
            case 'client_explanation':
                responseText += '💬 Опишите ситуацию, которую нужно объяснить клиенту:';
                break;
                
            case 'invoice_generation':
                responseText += '💳 Укажите данные для создания счёта (наименование, сумма, реквизиты):';
                break;
                
            default:
                responseText += '📝 Опишите детали вашего запроса:';
        }
        
        const backMenu = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏠 Главное меню', callback_data: 'menu_main' },
                        { text: '❌ Отмена', callback_data: 'cancel_action' }
                    ]
                ]
            }
        };
        
        if (messageId) {
            await editMessage(chatId, messageId, responseText, backMenu);
        } else {
            await sendMessage(chatId, responseText, backMenu);
        }
        
    } catch (error) {
        console.error('Action handler error:', error);
        await sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
}

// Everest package handlers
async function handleEverestAction(action, userId, chatId, messageId) {
    try {
        const everestActions = {
            'everest_supply_contract': {
                title: '📋 Договор поставки «Эверест»',
                description: 'Создание договора поставки подшипников и РТИ'
            },
            'everest_specification': {
                title: '📝 Спецификация «Эверест»',
                description: 'Техническая спецификация товаров'
            },
            'everest_disagreement_protocol': {
                title: '⚖️ Протокол разногласий «Эверест»',
                description: 'Протокол разногласий к договору'
            },
            'everest_complete_package': {
                title: '📦 Полный комплект «Эверест»',
                description: 'Все документы в одном пакете'
            }
        };
        
        const actionInfo = everestActions[action];
        if (!actionInfo) {
            await sendMessage(chatId, 'Неизвестное действие пакета «Эверест».');
            return;
        }
        
        // Set FSM state
        fsm.setState(userId, 'collecting_everest_data', { 
            scenario: 'everest_package', 
            action: action,
            chatId, 
            messageId 
        });
        
        const responseText = `<b>${actionInfo.title}</b>\n\n${actionInfo.description}\n\n📝 Укажите следующие данные:\n\n• Наименование товара\n• Количество\n• Цена\n• Сроки поставки\n• Особые условия (если есть)`;
        
        const backMenu = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔙 К пакету «Эверест»', callback_data: 'menu_everest' },
                        { text: '🏠 Главное меню', callback_data: 'menu_main' }
                    ]
                ]
            }
        };
        
        await editMessage(chatId, messageId, responseText, backMenu);
        
    } catch (error) {
        console.error('Everest action error:', error);
        await sendMessage(chatId, 'Произошла ошибка при обработке запроса «Эверест».');
    }
}

// Main webhook handler
export default async function handler(req, res) {
    try {
        // Health check
        if (req.method === 'GET') {
            return res.status(200).json({ 
                status: 'Eva Lawyer Bot v4.0 - Ultimate Edition',
                timestamp: new Date().toISOString(),
                features: [
                    '13 legal scenarios',
                    'Advanced FSM',
                    'Document processing',
                    'DaData integration',
                    'AI-powered analysis',
                    'Everest package'
                ]
            });
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const update = req.body;
        console.log('Received update:', JSON.stringify(update, null, 2));
        
        // Handle callback queries (button presses)
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            const userId = callbackQuery.from.id;
            const data = callbackQuery.data;
            
            await answerCallbackQuery(callbackQuery.id);
            
            // Menu navigation
            if (data === 'menu_main') {
                const welcomeText = `🤖 <b>Eva Lawyer Bot v4.0</b>\n\n⚖️ Ваш профессиональный юридический помощник\n\n📋 Выберите нужную услугу:`;
                await editMessage(chatId, messageId, welcomeText, MAIN_MENU);
                
            } else if (data === 'menu_contracts') {
                const contractsText = `📄 <b>Работа с договорами</b>\n\nВыберите действие:`;
                await editMessage(chatId, messageId, contractsText, CONTRACTS_MENU);
                
            } else if (data === 'menu_everest') {
                const everestText = `📚 <b>Пакет «Эверест»</b>\n\n🏭 Комплексное решение для поставок подшипников и РТИ\n\nВыберите документ:`;
                await editMessage(chatId, messageId, everestText, EVEREST_MENU);
                
            } else if (data === 'menu_reports') {
                const reportsText = `📊 <b>Отчёты и анализ</b>\n\nВыберите тип отчёта:`;
                await editMessage(chatId, messageId, reportsText, REPORTS_MENU);
                
            } else if (data.startsWith('action_')) {
                const action = data.replace('action_', '');
                await handleAction(action, userId, chatId, messageId);
                
            } else if (data.startsWith('everest_')) {
                await handleEverestAction(data, userId, chatId, messageId);
                
            } else if (data === 'cancel_action') {
                fsm.clearState(userId);
                const cancelText = `❌ <b>Действие отменено</b>\n\nВозвращаемся в главное меню.`;
                await editMessage(chatId, messageId, cancelText, MAIN_MENU);
            }
            
            return res.status(200).json({ ok: true });
        }
        
        // Handle regular messages
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const userId = message.from.id;
            const text = message.text || '';
            
            // Handle /start command
            if (text === '/start') {
                fsm.clearState(userId);
                const welcomeText = `🤖 <b>Добро пожаловать в Eva Lawyer Bot v4.0!</b>\n\n⚖️ Ваш профессиональный юридический помощник с расширенными возможностями:\n\n✅ 13 специализированных сценариев\n✅ Анализ документов с ИИ\n✅ Проверка контрагентов\n✅ Пакет «Эверест» для поставок\n✅ Генерация документов\n\n📋 Выберите нужную услугу:`;
                
                await sendMessage(chatId, welcomeText, MAIN_MENU);
                return res.status(200).json({ ok: true });
            }
            
            // Check user state
            const userState = fsm.getState(userId);
            
            if (userState) {
                // Handle state-based interactions
                await handleStateMessage(userId, chatId, message, userState);
            } else {
                // Handle general messages
                await handleGeneralMessage(chatId, text, userId);
            }
        }
        
        return res.status(200).json({ ok: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Handle state-based messages
async function handleStateMessage(userId, chatId, message, userState) {
    try {
        const { state, data } = userState;
        const scenario = data.scenario;
        const text = message.text || '';
        
        if (state === 'waiting_document' && message.document) {
            // Handle document upload
            await sendMessage(chatId, '📄 Обрабатываю документ...');
            
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${message.document.file_path}`;
            const result = await processDocument(fileUrl, message.document.file_name, userId, scenario);
            
            if (result.success) {
                const responseText = `✅ <b>Анализ завершён</b>\n\n${result.analysis}`;
                await sendMessage(chatId, responseText, MAIN_MENU);
                fsm.clearState(userId);
            } else {
                await sendMessage(chatId, `❌ ${result.error}`);
            }
            
        } else if (state === 'collecting_inn' || (scenario === 'counterparty_check' && text)) {
            // Handle INN input
            const inn = text.replace(/\D/g, '');
            
            if (inn.length === 10 || inn.length === 12) {
                await sendMessage(chatId, '🔍 Проверяю контрагента...');
                
                const result = await performCounterpartyCheck(inn, userId);
                
                if (result.success) {
                    let responseText = `✅ <b>Проверка контрагента</b>\n\n📊 <b>ИНН:</b> ${inn}\n\n`;
                    
                    if (result.source === 'dadata') {
                        const org = result.data;
                        responseText += `🏢 <b>Наименование:</b> ${org.name}\n`;
                        responseText += `📍 <b>Адрес:</b> ${org.address}\n`;
                        responseText += `📊 <b>Статус:</b> ${org.status}\n`;
                        if (org.director) responseText += `👤 <b>Руководитель:</b> ${org.director}\n`;
                        if (org.score !== undefined) responseText += `⭐ <b>Скоринг:</b> ${org.score}/100\n`;
                    } else {
                        responseText += result.data.analysis;
                    }
                    
                    await sendMessage(chatId, responseText, MAIN_MENU);
                } else {
                    await sendMessage(chatId, `❌ ${result.error}`);
                }
                
                fsm.clearState(userId);
            } else {
                await sendMessage(chatId, '❌ Некорректный ИНН. Введите 10 или 12 цифр.');
            }
            
        } else if (text) {
            // Handle text input for other scenarios
            await sendMessage(chatId, '🤖 Обрабатываю запрос...');
            
            const aiResponse = await getAIResponse('', text, scenario);
            await sendMessage(chatId, aiResponse, MAIN_MENU);
            fsm.clearState(userId);
        }
        
    } catch (error) {
        console.error('State message error:', error);
        await sendMessage(chatId, 'Произошла ошибка. Попробуйте снова.');
        fsm.clearState(userId);
    }
}

// Handle general messages
async function handleGeneralMessage(chatId, text, userId) {
    try {
        // Check if it's an INN
        const innMatch = text.match(/\b\d{10,12}\b/);
        if (innMatch) {
            const inn = innMatch[0];
            await sendMessage(chatId, '🔍 Обнаружен ИНН. Проверяю контрагента...');
            
            const result = await performCounterpartyCheck(inn, userId);
            
            if (result.success) {
                let responseText = `✅ <b>Проверка контрагента</b>\n\n📊 <b>ИНН:</b> ${inn}\n\n`;
                
                if (result.source === 'dadata') {
                    const org = result.data;
                    responseText += `🏢 <b>Наименование:</b> ${org.name}\n`;
                    responseText += `📍 <b>Адрес:</b> ${org.address}\n`;
                    responseText += `📊 <b>Статус:</b> ${org.status}\n`;
                    if (org.director) responseText += `👤 <b>Руководитель:</b> ${org.director}\n`;
                    if (org.score !== undefined) responseText += `⭐ <b>Скоринг:</b> ${org.score}/100\n`;
                } else {
                    responseText += result.data.analysis;
                }
                
                await sendMessage(chatId, responseText, MAIN_MENU);
            } else {
                await sendMessage(chatId, `❌ ${result.error}`);
            }
            
            return;
        }
        
        // General AI consultation
        await sendMessage(chatId, '🤖 Консультирую...');
        const aiResponse = await getAIResponse('', text);
        await sendMessage(chatId, aiResponse, MAIN_MENU);
        
    } catch (error) {
        console.error('General message error:', error);
        await sendMessage(chatId, 'Произошла ошибка. Попробуйте снова.');
    }
}

