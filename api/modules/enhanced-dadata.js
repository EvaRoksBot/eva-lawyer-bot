// Enhanced DaData Integration for Eva Lawyer Bot
// Comprehensive API integration with advanced features and error handling

class EnhancedDaData {
    constructor() {
        this.apiKey = process.env.DADATA_API_KEY || 'ap6te7l4ub6sq1dwt608';
        this.secretKey = process.env.DADATA_SECRET_KEY || '8bf724e4ee6cc03ce6b6';
        this.baseUrl = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs';
        this.cleanUrl = 'https://cleaner.dadata.ru/api/v1/clean';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map(); // Кэш для часто запрашиваемых данных
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }

    // Основной метод для API запросов
    async makeRequest(endpoint, data, useCleanApi = false) {
        const url = useCleanApi ? this.cleanUrl : this.baseUrl;
        const fullUrl = `${url}/${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${this.apiKey}`
        };

        if (useCleanApi) {
            headers['X-Secret'] = this.secretKey;
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`DaData API error: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                return { success: true, data: result };

            } catch (error) {
                console.error(`DaData API attempt ${attempt} failed:`, error);
                
                if (attempt === this.retryAttempts) {
                    return { 
                        success: false, 
                        error: error.message,
                        fallback: true 
                    };
                }
                
                await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
            }
        }
    }

    // Проверка организации по ИНН
    async findByInn(inn) {
        // Проверяем кэш
        const cacheKey = `inn_${inn}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await this.makeRequest('findById/party', {
            query: inn,
            count: 1
        });

        if (result.success && result.data.suggestions && result.data.suggestions.length > 0) {
            const suggestion = result.data.suggestions[0];
            const enhancedData = this.enhanceCompanyData(suggestion);
            
            // Сохраняем в кэш
            this.setCache(cacheKey, enhancedData);
            
            return enhancedData;
        }

        return this.getFallbackCompanyData(inn);
    }

    // Поиск организаций по названию
    async findByName(name, count = 10) {
        const result = await this.makeRequest('suggest/party', {
            query: name,
            count
        });

        if (result.success && result.data.suggestions) {
            return {
                success: true,
                companies: result.data.suggestions.map(s => this.enhanceCompanyData(s))
            };
        }

        return { success: false, companies: [] };
    }

    // Поиск по адресу
    async findByAddress(address, count = 10) {
        const result = await this.makeRequest('suggest/address', {
            query: address,
            count
        });

        if (result.success && result.data.suggestions) {
            return {
                success: true,
                addresses: result.data.suggestions.map(s => ({
                    value: s.value,
                    unrestricted_value: s.unrestricted_value,
                    data: s.data
                }))
            };
        }

        return { success: false, addresses: [] };
    }

    // Поиск банков по БИК
    async findBankByBik(bik) {
        const result = await this.makeRequest('suggest/bank', {
            query: bik,
            count: 1
        });

        if (result.success && result.data.suggestions && result.data.suggestions.length > 0) {
            const bank = result.data.suggestions[0];
            return {
                success: true,
                bank: {
                    name: bank.value,
                    bik: bank.data.bic,
                    correspondent_account: bank.data.correspondent_account,
                    address: bank.data.address?.value,
                    phone: bank.data.phone,
                    status: bank.data.status
                }
            };
        }

        return { success: false, bank: null };
    }

    // Стандартизация адреса
    async cleanAddress(address) {
        const result = await this.makeRequest('address', [address], true);

        if (result.success && result.data && result.data.length > 0) {
            const cleaned = result.data[0];
            return {
                success: true,
                address: {
                    source: cleaned.source,
                    result: cleaned.result,
                    postal_code: cleaned.postal_code,
                    country: cleaned.country,
                    region: cleaned.region,
                    city: cleaned.city,
                    street: cleaned.street,
                    house: cleaned.house,
                    flat: cleaned.flat,
                    geo_lat: cleaned.geo_lat,
                    geo_lon: cleaned.geo_lon,
                    qc: cleaned.qc,
                    qc_complete: cleaned.qc_complete
                }
            };
        }

        return { success: false, address: null };
    }

    // Стандартизация ФИО
    async cleanName(fullName) {
        const result = await this.makeRequest('name', [fullName], true);

        if (result.success && result.data && result.data.length > 0) {
            const cleaned = result.data[0];
            return {
                success: true,
                name: {
                    source: cleaned.source,
                    result: cleaned.result,
                    surname: cleaned.surname,
                    name: cleaned.name,
                    patronymic: cleaned.patronymic,
                    gender: cleaned.gender,
                    qc: cleaned.qc
                }
            };
        }

        return { success: false, name: null };
    }

    // Стандартизация телефона
    async cleanPhone(phone) {
        const result = await this.makeRequest('phone', [phone], true);

        if (result.success && result.data && result.data.length > 0) {
            const cleaned = result.data[0];
            return {
                success: true,
                phone: {
                    source: cleaned.source,
                    result: cleaned.result,
                    country_code: cleaned.country_code,
                    city_code: cleaned.city_code,
                    number: cleaned.number,
                    extension: cleaned.extension,
                    provider: cleaned.provider,
                    region: cleaned.region,
                    timezone: cleaned.timezone,
                    qc_conflict: cleaned.qc_conflict,
                    qc: cleaned.qc
                }
            };
        }

        return { success: false, phone: null };
    }

    // Получение информации о компании по email
    async findByEmail(email) {
        const result = await this.makeRequest('suggest/email', {
            query: email,
            count: 1
        });

        if (result.success && result.data.suggestions && result.data.suggestions.length > 0) {
            const suggestion = result.data.suggestions[0];
            return {
                success: true,
                email_info: {
                    local: suggestion.data.local,
                    domain: suggestion.data.domain,
                    type: suggestion.data.type,
                    source: suggestion.data.source
                }
            };
        }

        return { success: false, email_info: null };
    }

    // Расширение данных компании
    enhanceCompanyData(suggestion) {
        const data = suggestion.data;
        
        return {
            success: true,
            company: {
                // Основная информация
                inn: data.inn,
                kpp: data.kpp,
                ogrn: data.ogrn,
                name: {
                    full: suggestion.value,
                    short: data.name?.short,
                    full_with_opf: data.name?.full_with_opf
                },
                
                // Статус и состояние
                status: data.state?.status,
                actuality_date: data.state?.actuality_date,
                registration_date: data.state?.registration_date,
                liquidation_date: data.state?.liquidation_date,
                
                // Адрес
                address: {
                    value: data.address?.value,
                    unrestricted_value: data.address?.unrestricted_value,
                    postal_code: data.address?.data?.postal_code,
                    region: data.address?.data?.region,
                    city: data.address?.data?.city,
                    street: data.address?.data?.street,
                    house: data.address?.data?.house
                },
                
                // Руководство
                management: data.management ? {
                    name: data.management.name,
                    post: data.management.post,
                    disqualified: data.management.disqualified
                } : null,
                
                // Финансовые показатели
                finance: {
                    revenue: data.finance?.revenue,
                    profit: data.finance?.profit,
                    assets: data.finance?.assets,
                    year: data.finance?.year
                },
                
                // Сотрудники
                employees: {
                    range: data.employee_count?.range,
                    value: data.employee_count?.value,
                    year: data.employee_count?.year
                },
                
                // ОКВЭД
                okved: data.okved,
                okved2: data.okved2,
                
                // Дополнительная информация
                opf: data.opf,
                authorities: data.authorities,
                documents: data.documents,
                licenses: data.licenses,
                
                // Оценка рисков
                risk_assessment: this.assessCompanyRisks(data),
                
                // Метаданные
                checked_at: new Date().toISOString(),
                source: 'dadata'
            }
        };
    }

    // Оценка рисков компании
    assessCompanyRisks(data) {
        let riskScore = 0;
        const risks = [];
        
        // Проверка статуса
        if (data.state?.status === 'LIQUIDATING') {
            riskScore += 50;
            risks.push('Компания находится в процессе ликвидации');
        } else if (data.state?.status === 'LIQUIDATED') {
            riskScore += 100;
            risks.push('Компания ликвидирована');
        } else if (data.state?.status === 'REORGANIZING') {
            riskScore += 30;
            risks.push('Компания находится в процессе реорганизации');
        }
        
        // Проверка даты регистрации
        if (data.state?.registration_date) {
            const regDate = new Date(data.state.registration_date);
            const monthsOld = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsOld < 6) {
                riskScore += 20;
                risks.push('Молодая компания (менее 6 месяцев)');
            }
        }
        
        // Проверка руководства
        if (data.management?.disqualified) {
            riskScore += 40;
            risks.push('Руководитель дисквалифицирован');
        }
        
        // Проверка финансовых показателей
        if (data.finance?.revenue === 0) {
            riskScore += 25;
            risks.push('Нулевая выручка');
        }
        
        // Проверка количества сотрудников
        if (data.employee_count?.value === 0) {
            riskScore += 15;
            risks.push('Нет сотрудников');
        }
        
        // Определение уровня риска
        let riskLevel = 'low';
        if (riskScore >= 70) {
            riskLevel = 'critical';
        } else if (riskScore >= 40) {
            riskLevel = 'high';
        } else if (riskScore >= 20) {
            riskLevel = 'medium';
        }
        
        return {
            score: Math.min(riskScore, 100),
            level: riskLevel,
            risks,
            recommendation: this.getRiskRecommendation(riskLevel, riskScore)
        };
    }

    // Рекомендации по рискам
    getRiskRecommendation(level, score) {
        switch (level) {
            case 'critical':
                return 'Крайне не рекомендуется сотрудничество. Высокий риск финансовых потерь.';
            case 'high':
                return 'Сотрудничество возможно только с предоплатой и дополнительными гарантиями.';
            case 'medium':
                return 'Рекомендуется дополнительная проверка и осторожность в расчетах.';
            default:
                return 'Компания выглядит надежной для сотрудничества.';
        }
    }

    // Fallback данные при недоступности API
    getFallbackCompanyData(inn) {
        return {
            success: false,
            fallback: true,
            company: {
                inn,
                name: { full: 'Данные недоступны' },
                status: 'unknown',
                risk_assessment: {
                    score: 50,
                    level: 'unknown',
                    risks: ['Невозможно проверить через API'],
                    recommendation: 'Рекомендуется проверить вручную через официальные источники'
                },
                checked_at: new Date().toISOString(),
                source: 'fallback'
            }
        };
    }

    // Кэширование
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    // Очистка кэша
    clearCache() {
        this.cache.clear();
    }

    // Утилита для задержки
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Валидация ИНН
    validateInn(inn) {
        if (!inn || typeof inn !== 'string') return false;
        
        const cleanInn = inn.replace(/\D/g, '');
        
        if (cleanInn.length !== 10 && cleanInn.length !== 12) {
            return false;
        }
        
        // Проверка контрольной суммы для 10-значного ИНН
        if (cleanInn.length === 10) {
            const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
            let sum = 0;
            
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cleanInn[i]) * coefficients[i];
            }
            
            const checkDigit = (sum % 11) % 10;
            return checkDigit === parseInt(cleanInn[9]);
        }
        
        // Проверка контрольной суммы для 12-значного ИНН
        if (cleanInn.length === 12) {
            const coefficients1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
            const coefficients2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
            
            let sum1 = 0;
            for (let i = 0; i < 10; i++) {
                sum1 += parseInt(cleanInn[i]) * coefficients1[i];
            }
            const checkDigit1 = (sum1 % 11) % 10;
            
            let sum2 = 0;
            for (let i = 0; i < 11; i++) {
                sum2 += parseInt(cleanInn[i]) * coefficients2[i];
            }
            const checkDigit2 = (sum2 % 11) % 10;
            
            return checkDigit1 === parseInt(cleanInn[10]) && checkDigit2 === parseInt(cleanInn[11]);
        }
        
        return false;
    }

    // Получение статистики использования API
    getApiStats() {
        return {
            cache_size: this.cache.size,
            cache_timeout: this.cacheTimeout,
            retry_attempts: this.retryAttempts,
            api_endpoints: [
                'findById/party',
                'suggest/party',
                'suggest/address',
                'suggest/bank',
                'suggest/email',
                'clean/address',
                'clean/name',
                'clean/phone'
            ]
        };
    }
}

module.exports = EnhancedDaData;

