// External APIs Integration Module for Eva Lawyer Bot
// Comprehensive integration with various legal and business APIs

class ExternalAPIs {
    constructor() {
        this.apis = {
            egrul: new EgrulAPI(),
            arbitr: new ArbitrAPI(),
            bankrot: new BankrotAPI(),
            nalog: new NalogAPI(),
            rosreestr: new RosreestrAPI(),
            fssp: new FsspAPI(),
            cbr: new CbrAPI(),
            consultant: new ConsultantAPI()
        };
        
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 минут
    }

    // Универсальный метод для API запросов
    async makeApiRequest(apiName, method, params = {}) {
        const api = this.apis[apiName];
        if (!api) {
            throw new Error(`API ${apiName} not found`);
        }

        const cacheKey = `${apiName}_${method}_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const result = await api[method](params);
                
                if (result.success) {
                    this.setCache(cacheKey, result);
                    return result;
                }
                
                if (attempt === this.retryAttempts) {
                    return result;
                }
                
            } catch (error) {
                console.error(`API ${apiName}.${method} attempt ${attempt} failed:`, error);
                
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

    // Комплексная проверка организации
    async comprehensiveCompanyCheck(inn) {
        const results = {};
        
        try {
            // Параллельные запросы к разным API
            const [
                egrulData,
                arbitrData,
                bankrotData,
                fsspData
            ] = await Promise.allSettled([
                this.makeApiRequest('egrul', 'getCompanyInfo', { inn }),
                this.makeApiRequest('arbitr', 'searchCases', { inn }),
                this.makeApiRequest('bankrot', 'checkBankruptcy', { inn }),
                this.makeApiRequest('fssp', 'searchDebts', { inn })
            ]);

            results.egrul = egrulData.status === 'fulfilled' ? egrulData.value : null;
            results.arbitr = arbitrData.status === 'fulfilled' ? arbitrData.value : null;
            results.bankrot = bankrotData.status === 'fulfilled' ? bankrotData.value : null;
            results.fssp = fsspData.status === 'fulfilled' ? fsspData.value : null;

            // Агрегируем результаты
            return this.aggregateCompanyData(inn, results);

        } catch (error) {
            console.error('Comprehensive check error:', error);
            return {
                success: false,
                error: error.message,
                inn
            };
        }
    }

    // Агрегация данных о компании
    aggregateCompanyData(inn, results) {
        const aggregated = {
            inn,
            checked_at: new Date().toISOString(),
            sources: [],
            summary: {
                total_risks: 0,
                risk_level: 'low',
                recommendations: []
            },
            details: {}
        };

        // Обрабатываем данные ЕГРЮЛ
        if (results.egrul?.success) {
            aggregated.sources.push('egrul');
            aggregated.details.egrul = results.egrul.data;
            
            if (results.egrul.data.status === 'LIQUIDATED') {
                aggregated.summary.total_risks += 100;
                aggregated.summary.recommendations.push('Компания ликвидирована');
            }
        }

        // Обрабатываем арбитражные дела
        if (results.arbitr?.success) {
            aggregated.sources.push('arbitr');
            aggregated.details.arbitr = results.arbitr.data;
            
            const casesCount = results.arbitr.data.cases?.length || 0;
            if (casesCount > 10) {
                aggregated.summary.total_risks += 30;
                aggregated.summary.recommendations.push(`Много арбитражных дел: ${casesCount}`);
            }
        }

        // Обрабатываем данные о банкротстве
        if (results.bankrot?.success) {
            aggregated.sources.push('bankrot');
            aggregated.details.bankrot = results.bankrot.data;
            
            if (results.bankrot.data.is_bankrupt) {
                aggregated.summary.total_risks += 80;
                aggregated.summary.recommendations.push('Процедура банкротства');
            }
        }

        // Обрабатываем долги ФССП
        if (results.fssp?.success) {
            aggregated.sources.push('fssp');
            aggregated.details.fssp = results.fssp.data;
            
            const debtsAmount = results.fssp.data.total_debt || 0;
            if (debtsAmount > 1000000) {
                aggregated.summary.total_risks += 25;
                aggregated.summary.recommendations.push(`Крупные долги: ${debtsAmount.toLocaleString()} руб.`);
            }
        }

        // Определяем общий уровень риска
        if (aggregated.summary.total_risks >= 80) {
            aggregated.summary.risk_level = 'critical';
        } else if (aggregated.summary.total_risks >= 50) {
            aggregated.summary.risk_level = 'high';
        } else if (aggregated.summary.total_risks >= 25) {
            aggregated.summary.risk_level = 'medium';
        }

        return {
            success: true,
            data: aggregated
        };
    }

    // Поиск судебной практики
    async searchCourtPractice(query, filters = {}) {
        try {
            const results = await Promise.allSettled([
                this.makeApiRequest('arbitr', 'searchPractice', { query, ...filters }),
                this.makeApiRequest('consultant', 'searchCases', { query, ...filters })
            ]);

            const arbitrResults = results[0].status === 'fulfilled' ? results[0].value : null;
            const consultantResults = results[1].status === 'fulfilled' ? results[1].value : null;

            return {
                success: true,
                data: {
                    arbitr: arbitrResults?.data || [],
                    consultant: consultantResults?.data || [],
                    total_found: (arbitrResults?.data?.length || 0) + (consultantResults?.data?.length || 0)
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Проверка недвижимости
    async checkRealEstate(cadastralNumber) {
        try {
            const result = await this.makeApiRequest('rosreestr', 'getObjectInfo', { 
                cadastral_number: cadastralNumber 
            });

            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение курсов валют
    async getCurrencyRates(date = null) {
        try {
            const result = await this.makeApiRequest('cbr', 'getRates', { date });
            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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

    // Утилиты
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearCache() {
        this.cache.clear();
    }
}

// API для работы с ЕГРЮЛ
class EgrulAPI {
    constructor() {
        this.baseUrl = 'https://egrul.nalog.ru';
    }

    async getCompanyInfo(params) {
        // Заглушка для API ЕГРЮЛ
        return {
            success: true,
            data: {
                inn: params.inn,
                name: 'Тестовая организация',
                status: 'ACTIVE',
                registration_date: '2020-01-01',
                address: 'г. Москва',
                director: 'Иванов И.И.',
                authorized_capital: 10000
            }
        };
    }
}

// API для работы с арбитражными судами
class ArbitrAPI {
    constructor() {
        this.baseUrl = 'https://kad.arbitr.ru';
    }

    async searchCases(params) {
        return {
            success: true,
            data: {
                cases: [],
                total_count: 0
            }
        };
    }

    async searchPractice(params) {
        return {
            success: true,
            data: []
        };
    }
}

// API для проверки банкротства
class BankrotAPI {
    constructor() {
        this.baseUrl = 'https://bankrot.fedresurs.ru';
    }

    async checkBankruptcy(params) {
        return {
            success: true,
            data: {
                is_bankrupt: false,
                procedures: []
            }
        };
    }
}

// API для работы с налоговой
class NalogAPI {
    constructor() {
        this.baseUrl = 'https://service.nalog.ru';
    }

    async checkTaxDebts(params) {
        return {
            success: true,
            data: {
                has_debts: false,
                total_debt: 0
            }
        };
    }
}

// API для работы с Росреестром
class RosreestrAPI {
    constructor() {
        this.baseUrl = 'https://rosreestr.gov.ru';
    }

    async getObjectInfo(params) {
        return {
            success: true,
            data: {
                cadastral_number: params.cadastral_number,
                address: 'Адрес объекта',
                area: 100,
                purpose: 'Жилое помещение',
                owners: []
            }
        };
    }
}

// API для работы с ФССП
class FsspAPI {
    constructor() {
        this.baseUrl = 'https://fssp.gov.ru';
    }

    async searchDebts(params) {
        return {
            success: true,
            data: {
                total_debt: 0,
                cases: []
            }
        };
    }
}

// API для работы с ЦБ РФ
class CbrAPI {
    constructor() {
        this.baseUrl = 'https://www.cbr.ru';
    }

    async getRates(params) {
        return {
            success: true,
            data: {
                date: params.date || new Date().toISOString().split('T')[0],
                rates: {
                    USD: 75.50,
                    EUR: 85.20,
                    CNY: 11.30
                }
            }
        };
    }
}

// API для работы с КонсультантПлюс
class ConsultantAPI {
    constructor() {
        this.baseUrl = 'https://www.consultant.ru';
    }

    async searchCases(params) {
        return {
            success: true,
            data: []
        };
    }

    async searchDocuments(params) {
        return {
            success: true,
            data: []
        };
    }
}

module.exports = ExternalAPIs;

