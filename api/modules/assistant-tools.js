// Advanced tools for OpenAI Assistant API
// Specialized legal tools and integrations

class AssistantTools {
    constructor(dadataApi = null, documentEngine = null) {
        this.dadataApi = dadataApi;
        this.documentEngine = documentEngine;
        
        // Tool definitions for OpenAI Assistant
        this.toolDefinitions = [
            {
                type: "function",
                function: {
                    name: "check_company_inn",
                    description: "Проверить информацию о компании по ИНН через DaData API",
                    parameters: {
                        type: "object",
                        properties: {
                            inn: {
                                type: "string",
                                description: "ИНН компании (10 или 12 цифр)",
                                pattern: "^[0-9]{10,12}$"
                            }
                        },
                        required: ["inn"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "analyze_contract_risks",
                    description: "Анализировать договор на предмет юридических рисков",
                    parameters: {
                        type: "object",
                        properties: {
                            contract_text: {
                                type: "string",
                                description: "Текст договора для анализа"
                            },
                            contract_type: {
                                type: "string",
                                description: "Тип договора",
                                enum: ["купли-продажи", "аренды", "подряда", "оказания услуг", "трудовой", "поставки", "другой"]
                            },
                            focus_areas: {
                                type: "array",
                                items: {
                                    type: "string",
                                    enum: ["ответственность", "сроки", "оплата", "форс-мажор", "расторжение", "гарантии"]
                                },
                                description: "Области для особого внимания при анализе"
                            }
                        },
                        required: ["contract_text"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "check_legal_compliance",
                    description: "Проверить соответствие документа российскому законодательству",
                    parameters: {
                        type: "object",
                        properties: {
                            document_text: {
                                type: "string",
                                description: "Текст документа для проверки"
                            },
                            legal_area: {
                                type: "string",
                                description: "Область права",
                                enum: ["гражданское", "трудовое", "налоговое", "корпоративное", "административное", "семейное"]
                            },
                            check_type: {
                                type: "string",
                                description: "Тип проверки",
                                enum: ["полная", "быстрая", "критические_риски"]
                            }
                        },
                        required: ["document_text"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "generate_legal_document",
                    description: "Сгенерировать шаблон юридического документа",
                    parameters: {
                        type: "object",
                        properties: {
                            document_type: {
                                type: "string",
                                description: "Тип документа",
                                enum: ["договор", "заявление", "жалоба", "претензия", "доверенность", "уведомление"]
                            },
                            parties: {
                                type: "object",
                                properties: {
                                    party1: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            type: { type: "string", enum: ["физлицо", "юрлицо", "ИП"] },
                                            inn: { type: "string" },
                                            address: { type: "string" }
                                        }
                                    },
                                    party2: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            type: { type: "string", enum: ["физлицо", "юрлицо", "ИП"] },
                                            inn: { type: "string" },
                                            address: { type: "string" }
                                        }
                                    }
                                }
                            },
                            subject: {
                                type: "string",
                                description: "Предмет договора или суть документа"
                            },
                            amount: {
                                type: "number",
                                description: "Сумма (если применимо)"
                            },
                            special_conditions: {
                                type: "array",
                                items: { type: "string" },
                                description: "Особые условия"
                            }
                        },
                        required: ["document_type", "subject"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "calculate_legal_deadlines",
                    description: "Рассчитать юридические сроки и дедлайны",
                    parameters: {
                        type: "object",
                        properties: {
                            event_type: {
                                type: "string",
                                description: "Тип события",
                                enum: ["исковая_давность", "срок_обжалования", "срок_ответа", "срок_исполнения", "регистрация_ооо", "подача_отчетности"]
                            },
                            start_date: {
                                type: "string",
                                format: "date",
                                description: "Дата начала отсчета"
                            },
                            legal_area: {
                                type: "string",
                                description: "Область права",
                                enum: ["гражданское", "административное", "налоговое", "трудовое", "корпоративное"]
                            },
                            additional_info: {
                                type: "string",
                                description: "Дополнительная информация для расчета"
                            }
                        },
                        required: ["event_type", "start_date"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_legal_precedents",
                    description: "Найти судебные прецеденты и практику по вопросу",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "Поисковый запрос"
                            },
                            court_level: {
                                type: "string",
                                description: "Уровень суда",
                                enum: ["все", "верховный", "арбитражный", "общей_юрисдикции", "мировой"]
                            },
                            date_range: {
                                type: "string",
                                description: "Период поиска",
                                enum: ["последний_год", "последние_3_года", "последние_5_лет", "все_время"]
                            },
                            legal_area: {
                                type: "string",
                                description: "Область права"
                            }
                        },
                        required: ["query"]
                    }
                }
            }
        ];
    }

    // Execute tool function
    async executeTool(toolName, parameters) {
        try {
            switch (toolName) {
                case 'check_company_inn':
                    return await this.checkCompanyInn(parameters.inn);
                    
                case 'analyze_contract_risks':
                    return await this.analyzeContractRisks(
                        parameters.contract_text,
                        parameters.contract_type,
                        parameters.focus_areas
                    );
                    
                case 'check_legal_compliance':
                    return await this.checkLegalCompliance(
                        parameters.document_text,
                        parameters.legal_area,
                        parameters.check_type
                    );
                    
                case 'generate_legal_document':
                    return await this.generateLegalDocument(
                        parameters.document_type,
                        parameters.parties,
                        parameters.subject,
                        parameters.amount,
                        parameters.special_conditions
                    );
                    
                case 'calculate_legal_deadlines':
                    return await this.calculateLegalDeadlines(
                        parameters.event_type,
                        parameters.start_date,
                        parameters.legal_area,
                        parameters.additional_info
                    );
                    
                case 'search_legal_precedents':
                    return await this.searchLegalPrecedents(
                        parameters.query,
                        parameters.court_level,
                        parameters.date_range,
                        parameters.legal_area
                    );
                    
                default:
                    return { error: `Неизвестная функция: ${toolName}` };
            }
        } catch (error) {
            console.error(`Tool execution error (${toolName}):`, error);
            return { error: error.message };
        }
    }

    // Check company by INN
    async checkCompanyInn(inn) {
        try {
            if (!this.dadataApi) {
                return {
                    error: "DaData API недоступен",
                    suggestion: "Проверьте настройки API ключей"
                };
            }

            // Validate INN format
            if (!/^[0-9]{10,12}$/.test(inn)) {
                return {
                    error: "Неверный формат ИНН",
                    suggestion: "ИНН должен содержать 10 или 12 цифр"
                };
            }

            // Check if dadataApi has the required method
            if (typeof this.dadataApi.checkINN !== 'function') {
                return {
                    error: "Метод checkINN недоступен в DaData API",
                    suggestion: "Обновите модуль DaData"
                };
            }

            const result = await this.dadataApi.checkINN(inn);
            
            if (result.success) {
                return {
                    success: true,
                    company_info: {
                        name: result.data.name,
                        inn: result.data.inn,
                        kpp: result.data.kpp,
                        ogrn: result.data.ogrn,
                        address: result.data.address,
                        status: result.data.status,
                        director: result.data.director,
                        registration_date: result.data.registration_date,
                        authorized_capital: result.data.authorized_capital
                    },
                    legal_analysis: this.analyzeLegalStatus(result.data)
                };
            } else {
                return {
                    error: result.error,
                    suggestion: "Проверьте правильность ИНН или попробуйте позже"
                };
            }
        } catch (error) {
            return {
                error: `Ошибка проверки ИНН: ${error.message}`
            };
        }
    }

    // Analyze legal status of company
    analyzeLegalStatus(companyData) {
        const analysis = {
            risks: [],
            recommendations: [],
            status_assessment: "normal"
        };

        // Check company status
        if (companyData.status && companyData.status.toLowerCase().includes('ликвид')) {
            analysis.risks.push("Компания находится в процессе ликвидации");
            analysis.status_assessment = "high_risk";
        }

        if (companyData.status && companyData.status.toLowerCase().includes('банкрот')) {
            analysis.risks.push("Компания признана банкротом");
            analysis.status_assessment = "critical";
        }

        // Check registration date
        if (companyData.registration_date) {
            const regDate = new Date(companyData.registration_date);
            const monthsOld = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            
            if (monthsOld < 6) {
                analysis.risks.push("Компания зарегистрирована менее 6 месяцев назад");
                analysis.recommendations.push("Рекомендуется дополнительная проверка надежности");
            }
        }

        // Check authorized capital
        if (companyData.authorized_capital && companyData.authorized_capital < 10000) {
            analysis.risks.push("Минимальный уставный капитал");
            analysis.recommendations.push("Рассмотрите возможность требования предоплаты или гарантий");
        }

        return analysis;
    }

    // Analyze contract risks
    async analyzeContractRisks(contractText, contractType = 'другой', focusAreas = []) {
        try {
            const analysis = {
                contract_type: contractType,
                total_risks: 0,
                critical_risks: [],
                moderate_risks: [],
                low_risks: [],
                recommendations: [],
                compliance_issues: []
            };

            // Define risk patterns
            const riskPatterns = {
                critical: [
                    { pattern: /без\s+гарантий/gi, description: "Отсутствие гарантий" },
                    { pattern: /не\s+несет\s+ответственности/gi, description: "Исключение ответственности" },
                    { pattern: /односторонний\s+отказ/gi, description: "Право одностороннего отказа" },
                    { pattern: /безотзывный/gi, description: "Безотзывные обязательства" },
                    { pattern: /штраф.*неустойка.*пени/gi, description: "Множественные санкции" }
                ],
                moderate: [
                    { pattern: /форс-мажор/gi, description: "Условия форс-мажора" },
                    { pattern: /предоплата\s+100%/gi, description: "Полная предоплата" },
                    { pattern: /срок.*не\s+ограничен/gi, description: "Неограниченные сроки" },
                    { pattern: /по\s+требованию/gi, description: "Исполнение по требованию" }
                ],
                low: [
                    { pattern: /устно/gi, description: "Устные договоренности" },
                    { pattern: /приблизительно/gi, description: "Неточные формулировки" },
                    { pattern: /возможно/gi, description: "Неопределенные обязательства" }
                ]
            };

            // Analyze risks
            for (const [level, patterns] of Object.entries(riskPatterns)) {
                for (const { pattern, description } of patterns) {
                    const matches = contractText.match(pattern);
                    if (matches) {
                        const risk = {
                            description,
                            level,
                            occurrences: matches.length,
                            recommendation: this.getRiskRecommendation(description, level)
                        };
                        
                        analysis[`${level}_risks`].push(risk);
                        analysis.total_risks++;
                    }
                }
            }

            // Focus area analysis
            if (focusAreas.length > 0) {
                analysis.focus_analysis = {};
                for (const area of focusAreas) {
                    analysis.focus_analysis[area] = this.analyzeFocusArea(contractText, area);
                }
            }

            // Contract type specific analysis
            analysis.type_specific_analysis = this.analyzeByContractType(contractText, contractType);

            // Generate recommendations
            analysis.recommendations = this.generateContractRecommendations(analysis);

            return analysis;

        } catch (error) {
            return {
                error: `Ошибка анализа договора: ${error.message}`
            };
        }
    }

    // Get risk recommendation
    getRiskRecommendation(riskDescription, level) {
        const recommendations = {
            'Отсутствие гарантий': 'Добавьте гарантийные обязательства и условия их исполнения',
            'Исключение ответственности': 'Пересмотрите условия ответственности сторон',
            'Право одностороннего отказа': 'Установите справедливые условия расторжения для обеих сторон',
            'Безотзывные обязательства': 'Предусмотрите возможность изменения условий при форс-мажоре',
            'Множественные санкции': 'Упростите систему санкций, избегайте дублирования',
            'Условия форс-мажора': 'Детализируйте перечень обстоятельств непреодолимой силы',
            'Полная предоплата': 'Рассмотрите поэтапную оплату или банковские гарантии',
            'Неограниченные сроки': 'Установите конкретные сроки исполнения обязательств',
            'Исполнение по требованию': 'Определите разумные сроки для исполнения требований'
        };

        return recommendations[riskDescription] || 'Требуется дополнительный анализ';
    }

    // Analyze focus area
    analyzeFocusArea(contractText, area) {
        const areaPatterns = {
            'ответственность': /ответственность|штраф|неустойка|пени|возмещение|ущерб/gi,
            'сроки': /срок|период|дата|время|день|месяц|год/gi,
            'оплата': /оплата|платеж|стоимость|цена|сумма|деньги/gi,
            'форс-мажор': /форс-мажор|непреодолимая\s+сила|обстоятельства/gi,
            'расторжение': /расторжение|прекращение|отказ|аннулирование/gi,
            'гарантии': /гарантия|обеспечение|поручительство|залог/gi
        };

        const pattern = areaPatterns[area];
        if (!pattern) return { found: false };

        const matches = contractText.match(pattern);
        return {
            found: !!matches,
            occurrences: matches ? matches.length : 0,
            coverage: matches ? 'достаточное' : 'недостаточное'
        };
    }

    // Analyze by contract type
    analyzeByContractType(contractText, contractType) {
        const typeSpecificChecks = {
            'купли-продажи': [
                'предмет договора',
                'цена товара',
                'порядок передачи',
                'право собственности'
            ],
            'аренды': [
                'арендная плата',
                'срок аренды',
                'состояние имущества',
                'коммунальные услуги'
            ],
            'подряда': [
                'техническое задание',
                'сроки выполнения',
                'приемка работ',
                'гарантии качества'
            ],
            'оказания услуг': [
                'перечень услуг',
                'порядок оказания',
                'результат услуг',
                'конфиденциальность'
            ]
        };

        const checks = typeSpecificChecks[contractType] || [];
        const analysis = { required_elements: [], missing_elements: [] };

        for (const element of checks) {
            const found = contractText.toLowerCase().includes(element.toLowerCase());
            if (found) {
                analysis.required_elements.push(element);
            } else {
                analysis.missing_elements.push(element);
            }
        }

        return analysis;
    }

    // Generate contract recommendations
    generateContractRecommendations(analysis) {
        const recommendations = [];

        if (analysis.critical_risks.length > 0) {
            recommendations.push("Критически важно: устраните выявленные критические риски перед подписанием");
        }

        if (analysis.total_risks > 10) {
            recommendations.push("Договор содержит множество рисков, рекомендуется комплексная доработка");
        }

        if (analysis.type_specific_analysis?.missing_elements?.length > 0) {
            recommendations.push(`Добавьте отсутствующие элементы: ${analysis.type_specific_analysis.missing_elements.join(', ')}`);
        }

        if (recommendations.length === 0) {
            recommendations.push("Договор соответствует базовым требованиям, рекомендуется финальная проверка юристом");
        }

        return recommendations;
    }

    // Check legal compliance
    async checkLegalCompliance(documentText, legalArea = 'гражданское', checkType = 'полная') {
        try {
            const compliance = {
                legal_area: legalArea,
                check_type: checkType,
                compliance_score: 0,
                violations: [],
                warnings: [],
                recommendations: []
            };

            // Define compliance rules by legal area
            const complianceRules = this.getComplianceRules(legalArea);
            
            // Check document against rules
            for (const rule of complianceRules) {
                const checkResult = this.checkRule(documentText, rule);
                if (checkResult.violation) {
                    compliance.violations.push(checkResult);
                } else if (checkResult.warning) {
                    compliance.warnings.push(checkResult);
                }
            }

            // Calculate compliance score
            const totalChecks = complianceRules.length;
            const violations = compliance.violations.length;
            compliance.compliance_score = Math.max(0, ((totalChecks - violations) / totalChecks) * 100);

            // Generate recommendations
            compliance.recommendations = this.generateComplianceRecommendations(compliance);

            return compliance;

        } catch (error) {
            return {
                error: `Ошибка проверки соответствия: ${error.message}`
            };
        }
    }

    // Get compliance rules by legal area
    getComplianceRules(legalArea) {
        const rules = {
            'гражданское': [
                {
                    name: 'Указание сторон договора',
                    pattern: /сторон[ыа]|договаривающиеся\s+стороны/gi,
                    required: true,
                    description: 'Договор должен содержать указание на стороны'
                },
                {
                    name: 'Предмет договора',
                    pattern: /предмет\s+договора|предметом\s+настоящего/gi,
                    required: true,
                    description: 'Обязательное указание предмета договора'
                }
            ],
            'трудовое': [
                {
                    name: 'Трудовая функция',
                    pattern: /трудов[ая|ые]\s+функци[я|и]|должностные\s+обязанности/gi,
                    required: true,
                    description: 'Обязательное указание трудовой функции'
                },
                {
                    name: 'Оплата труда',
                    pattern: /заработная\s+плата|оплата\s+труда|размер\s+оклада/gi,
                    required: true,
                    description: 'Обязательное указание размера оплаты труда'
                }
            ]
        };

        return rules[legalArea] || rules['гражданское'];
    }

    // Check individual rule
    checkRule(documentText, rule) {
        const found = rule.pattern.test(documentText);
        
        if (rule.required && !found) {
            return {
                violation: true,
                rule_name: rule.name,
                description: rule.description,
                severity: 'high'
            };
        } else if (!rule.required && !found) {
            return {
                warning: true,
                rule_name: rule.name,
                description: rule.description,
                severity: 'medium'
            };
        }

        return { compliant: true };
    }

    // Generate compliance recommendations
    generateComplianceRecommendations(compliance) {
        const recommendations = [];

        if (compliance.compliance_score < 50) {
            recommendations.push("Документ требует существенной доработки для соответствия законодательству");
        } else if (compliance.compliance_score < 80) {
            recommendations.push("Документ нуждается в доработке отдельных положений");
        } else {
            recommendations.push("Документ в целом соответствует требованиям законодательства");
        }

        for (const violation of compliance.violations) {
            recommendations.push(`Устраните нарушение: ${violation.description}`);
        }

        return recommendations;
    }

    // Generate legal document
    async generateLegalDocument(documentType, parties, subject, amount, specialConditions = []) {
        try {
            const templates = {
                'договор': this.generateContractTemplate,
                'заявление': this.generateApplicationTemplate,
                'жалоба': this.generateComplaintTemplate,
                'претензия': this.generateClaimTemplate,
                'доверенность': this.generatePowerOfAttorneyTemplate,
                'уведомление': this.generateNotificationTemplate
            };

            const generator = templates[documentType];
            if (!generator) {
                return {
                    error: `Неподдерживаемый тип документа: ${documentType}`
                };
            }

            const document = await generator.call(this, parties, subject, amount, specialConditions);
            
            return {
                success: true,
                document_type: documentType,
                content: document.content,
                recommendations: document.recommendations || [],
                required_fields: document.required_fields || []
            };

        } catch (error) {
            return {
                error: `Ошибка генерации документа: ${error.message}`
            };
        }
    }

    // Generate contract template
    generateContractTemplate(parties, subject, amount, specialConditions) {
        const date = new Date().toLocaleDateString('ru-RU');
        
        let content = `ДОГОВОР\n\n`;
        content += `г. _________, ${date}\n\n`;
        
        if (parties?.party1 && parties?.party2) {
            content += `${parties.party1.name}, именуемый в дальнейшем "Сторона 1", с одной стороны, `;
            content += `и ${parties.party2.name}, именуемый в дальнейшем "Сторона 2", с другой стороны, `;
            content += `заключили настоящий договор о нижеследующем:\n\n`;
        } else {
            content += `[СТОРОНА 1], именуемая в дальнейшем "Сторона 1", с одной стороны, `;
            content += `и [СТОРОНА 2], именуемая в дальнейшем "Сторона 2", с другой стороны, `;
            content += `заключили настоящий договор о нижеследующем:\n\n`;
        }

        content += `1. ПРЕДМЕТ ДОГОВОРА\n`;
        content += `1.1. ${subject}\n\n`;

        if (amount) {
            content += `2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ\n`;
            content += `2.1. Стоимость составляет ${amount} рублей.\n`;
            content += `2.2. Оплата производится [УКАЗАТЬ ПОРЯДОК ОПЛАТЫ].\n\n`;
        }

        content += `3. ПРАВА И ОБЯЗАННОСТИ СТОРОН\n`;
        content += `3.1. Сторона 1 обязуется:\n`;
        content += `- [УКАЗАТЬ ОБЯЗАННОСТИ СТОРОНЫ 1]\n`;
        content += `3.2. Сторона 2 обязуется:\n`;
        content += `- [УКАЗАТЬ ОБЯЗАННОСТИ СТОРОНЫ 2]\n\n`;

        if (specialConditions && specialConditions.length > 0) {
            content += `4. ОСОБЫЕ УСЛОВИЯ\n`;
            specialConditions.forEach((condition, index) => {
                content += `4.${index + 1}. ${condition}\n`;
            });
            content += `\n`;
        }

        content += `5. ОТВЕТСТВЕННОСТЬ СТОРОН\n`;
        content += `5.1. За неисполнение или ненадлежащее исполнение обязательств стороны несут ответственность в соответствии с действующим законодательством.\n\n`;

        content += `6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ\n`;
        content += `6.1. Настоящий договор вступает в силу с момента подписания.\n`;
        content += `6.2. Споры разрешаются путем переговоров, а при недостижении соглашения - в судебном порядке.\n\n`;

        content += `7. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН\n\n`;
        content += `Сторона 1:                    Сторона 2:\n`;
        content += `_________________            _________________\n`;
        content += `(подпись)                    (подпись)\n`;

        return {
            content,
            recommendations: [
                "Заполните все поля, отмеченные [УКАЗАТЬ...]",
                "Проверьте правильность реквизитов сторон",
                "Убедитесь в соответствии условий договора действующему законодательству"
            ],
            required_fields: ["стороны договора", "порядок оплаты", "конкретные обязанности сторон"]
        };
    }

    // Calculate legal deadlines
    async calculateLegalDeadlines(eventType, startDate, legalArea, additionalInfo) {
        try {
            const deadlines = {
                event_type: eventType,
                start_date: startDate,
                legal_area: legalArea,
                calculated_deadlines: [],
                important_notes: []
            };

            const startDateObj = new Date(startDate);
            
            // Define deadline rules
            const deadlineRules = {
                'исковая_давность': {
                    'гражданское': { years: 3, description: 'Общий срок исковой давности' },
                    'трудовое': { months: 3, description: 'Срок обращения в суд по трудовым спорам' }
                },
                'срок_обжалования': {
                    'административное': { days: 10, description: 'Срок обжалования административного акта' },
                    'гражданское': { months: 1, description: 'Срок подачи апелляционной жалобы' }
                },
                'срок_ответа': {
                    'административное': { days: 30, description: 'Срок рассмотрения обращения' },
                    'гражданское': { days: 30, description: 'Срок ответа на претензию' }
                }
            };

            const rule = deadlineRules[eventType]?.[legalArea] || deadlineRules[eventType]?.['гражданское'];
            
            if (rule) {
                const deadline = new Date(startDateObj);
                
                if (rule.years) deadline.setFullYear(deadline.getFullYear() + rule.years);
                if (rule.months) deadline.setMonth(deadline.getMonth() + rule.months);
                if (rule.days) deadline.setDate(deadline.getDate() + rule.days);

                deadlines.calculated_deadlines.push({
                    description: rule.description,
                    deadline_date: deadline.toLocaleDateString('ru-RU'),
                    days_remaining: Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)),
                    urgency: this.calculateUrgency(deadline)
                });
            }

            // Add important notes
            deadlines.important_notes = this.getDeadlineNotes(eventType, legalArea);

            return deadlines;

        } catch (error) {
            return {
                error: `Ошибка расчета сроков: ${error.message}`
            };
        }
    }

    // Calculate urgency level
    calculateUrgency(deadline) {
        const daysRemaining = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < 0) return 'просрочен';
        if (daysRemaining <= 7) return 'критический';
        if (daysRemaining <= 30) return 'высокий';
        if (daysRemaining <= 90) return 'средний';
        return 'низкий';
    }

    // Get deadline notes
    getDeadlineNotes(eventType, legalArea) {
        const notes = {
            'исковая_давность': [
                'Срок исковой давности может быть восстановлен судом при наличии уважительных причин',
                'Течение срока приостанавливается в случаях, предусмотренных законом'
            ],
            'срок_обжалования': [
                'Пропущенный срок может быть восстановлен при наличии уважительных причин',
                'Срок исчисляется с момента получения копии решения'
            ]
        };

        return notes[eventType] || ['Обратитесь к специалисту для уточнения деталей'];
    }

    // Search legal precedents (mock implementation)
    async searchLegalPrecedents(query, courtLevel = 'все', dateRange = 'последние_3_года', legalArea) {
        try {
            // This is a mock implementation
            // In real implementation, this would connect to legal databases
            
            const mockResults = [
                {
                    case_number: "А40-123456/2023",
                    court: "Арбитражный суд г. Москвы",
                    date: "2023-06-15",
                    summary: `Дело по вопросу: ${query}`,
                    relevance: "высокая",
                    key_points: [
                        "Суд признал правомерность требований истца",
                        "Установлена обязанность ответчика возместить ущерб",
                        "Применена статья 393 ГК РФ"
                    ]
                },
                {
                    case_number: "2-456/2023",
                    court: "Мировой судья участка №123",
                    date: "2023-08-20",
                    summary: `Аналогичное дело: ${query}`,
                    relevance: "средняя",
                    key_points: [
                        "Иск удовлетворен частично",
                        "Взысканы судебные расходы",
                        "Применена статья 15 ГК РФ"
                    ]
                }
            ];

            return {
                success: true,
                query: query,
                total_found: mockResults.length,
                results: mockResults,
                search_parameters: {
                    court_level: courtLevel,
                    date_range: dateRange,
                    legal_area: legalArea
                },
                note: "Результаты носят справочный характер. Для получения актуальной судебной практики обратитесь к специализированным правовым базам данных."
            };

        } catch (error) {
            return {
                error: `Ошибка поиска прецедентов: ${error.message}`
            };
        }
    }

    // Get all tool definitions
    getToolDefinitions() {
        return this.toolDefinitions;
    }
}

module.exports = AssistantTools;

