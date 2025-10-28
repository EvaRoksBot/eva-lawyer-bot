/**
 * DaData API Integration for Eva Lawyer Bot
 * Provides real counterparty checking functionality using DaData API
 */

const DADATA_API_KEY = process.env.DADATA_API_KEY;
const DADATA_SECRET = process.env.DADATA_SECRET;
const DADATA_BASE_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs';

/**
 * Check if DaData API keys are configured
 */
function isDaDataConfigured() {
  return DADATA_API_KEY && DADATA_SECRET &&
         DADATA_API_KEY !== 'placeholder_dadata_key' &&
         DADATA_SECRET !== 'placeholder_dadata_secret';
}

/**
 * Make request to DaData API
 */
async function makeDaDataRequest(endpoint, data) {
  try {
    const response = await fetch(`${DADATA_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${DADATA_API_KEY}`,
        'X-Secret': DADATA_SECRET
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`DaData API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ DaData API request failed:', error);
    throw error;
  }
}

/**
 * Find organization by INN
 */
async function findByInn(inn) {
  if (!isDaDataConfigured()) {
    throw new Error('DaData API keys not configured');
  }

  const data = {
    query: inn,
    count: 1
  };

  return await makeDaDataRequest('/findById/party', data);
}

/**
 * Get detailed organization info by INN
 */
async function getOrganizationInfo(inn) {
  try {
    const result = await findByInn(inn);
    
    if (!result.suggestions || result.suggestions.length === 0) {
      return {
        found: false,
        inn: inn,
        message: 'Организация с указанным ИНН не найдена'
      };
    }

    const org = result.suggestions[0];
    const data = org.data;

    return {
      found: true,
      inn: data.inn,
      kpp: data.kpp,
      name: {
        full: data.name.full_with_opf,
        short: data.name.short_with_opf
      },
      address: {
        full: data.address.value,
        region: data.address.data.region,
        city: data.address.data.city
      },
      management: data.management ? {
        name: data.management.name,
        post: data.management.post
      } : null,
      status: {
        value: data.state.status,
        date: data.state.registration_date,
        liquidation_date: data.state.liquidation_date
      },
      opf: {
        code: data.opf.code,
        full: data.opf.full,
        short: data.opf.short
      },
      okved: data.okved ? {
        main: data.okved,
        additional: data.okveds
      } : null,
      finance: data.finance ? {
        tax_system: data.finance.tax_system,
        income: data.finance.income,
        expense: data.finance.expense,
        debt: data.finance.debt
      } : null,
      employees: data.employee_count
    };
  } catch (error) {
    console.error('❌ Error getting organization info:', error);
    return {
      found: false,
      inn: inn,
      error: error.message,
      message: 'Ошибка при получении информации об организации'
    };
  }
}

/**
 * Analyze organization risks
 */
function analyzeRisks(orgInfo) {
  if (!orgInfo.found) {
    return {
      riskLevel: 'CRITICAL',
      score: 0,
      risks: ['Организация не найдена в базе данных'],
      recommendations: ['Не рекомендуется сотрудничество', 'Проверьте правильность ИНН']
    };
  }

  const risks = [];
  const recommendations = [];
  let score = 100;

  // Check liquidation status
  if (orgInfo.status.liquidation_date) {
    risks.push('Организация ликвидирована');
    recommendations.push('Сотрудничество невозможно');
    score -= 100;
  }

  // Check status
  if (orgInfo.status.value === 'LIQUIDATING') {
    risks.push('Организация находится в процессе ликвидации');
    recommendations.push('Высокий риск сотрудничества');
    score -= 80;
  } else if (orgInfo.status.value === 'REORGANIZING') {
    risks.push('Организация находится в процессе реорганизации');
    recommendations.push('Требуется дополнительная проверка');
    score -= 30;
  }

  // Check financial data
  if (orgInfo.finance) {
    if (orgInfo.finance.debt && orgInfo.finance.debt > 1000000) {
      risks.push('Высокая задолженность по налогам');
      recommendations.push('Требуется предоплата или банковская гарантия');
      score -= 25;
    }
    
    if (orgInfo.finance.income && orgInfo.finance.income < 1000000) {
      risks.push('Низкий уровень доходов');
      recommendations.push('Проверьте финансовую устойчивость');
      score -= 15;
    }
  }

  // Check registration date (new companies)
  if (orgInfo.status.date) {
    const regDate = new Date(orgInfo.status.date);
    const monthsOld = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsOld < 6) {
      risks.push('Молодая компания (менее 6 месяцев)');
      recommendations.push('Повышенное внимание к проверке');
      score -= 20;
    }
  }

  // Check employees
  if (orgInfo.employees !== null && orgInfo.employees < 5) {
    risks.push('Малое количество сотрудников');
    recommendations.push('Проверьте реальную деятельность компании');
    score -= 10;
  }

  // Determine risk level
  let riskLevel;
  if (score >= 80) {
    riskLevel = 'LOW';
  } else if (score >= 60) {
    riskLevel = 'MEDIUM';
  } else if (score >= 30) {
    riskLevel = 'HIGH';
  } else {
    riskLevel = 'CRITICAL';
  }

  // Add positive recommendations
  if (risks.length === 0) {
    recommendations.push('Организация выглядит надежной');
    recommendations.push('Можно рассматривать для сотрудничества');
  }

  return {
    riskLevel,
    score: Math.max(0, score),
    risks: risks.length > 0 ? risks : ['Серьезных рисков не выявлено'],
    recommendations
  };
}

/**
 * Format organization info for display
 */
function formatOrganizationInfo(orgInfo, risks) {
  if (!orgInfo.found) {
    return `❌ **Организация не найдена**\n\nИНН: ${orgInfo.inn}\n\n${orgInfo.message}`;
  }

  const riskEmoji = {
    'LOW': '🟢',
    'MEDIUM': '🟡', 
    'HIGH': '🟠',
    'CRITICAL': '🔴'
  };

  let result = `🏢 **${orgInfo.name.short}**\n\n`;
  
  // Basic info
  result += `📋 **Основная информация:**\n`;
  result += `• ИНН: ${orgInfo.inn}\n`;
  if (orgInfo.kpp) result += `• КПП: ${orgInfo.kpp}\n`;
  result += `• Полное наименование: ${orgInfo.name.full}\n`;
  result += `• Организационная форма: ${orgInfo.opf.full}\n`;
  result += `• Статус: ${orgInfo.status.value}\n`;
  if (orgInfo.status.date) result += `• Дата регистрации: ${new Date(orgInfo.status.date).toLocaleDateString('ru-RU')}\n`;
  
  // Address
  result += `\n📍 **Адрес:**\n${orgInfo.address.full}\n`;
  
  // Management
  if (orgInfo.management) {
    result += `\n👤 **Руководство:**\n`;
    result += `• ${orgInfo.management.post}: ${orgInfo.management.name}\n`;
  }
  
  // Financial info
  if (orgInfo.finance) {
    result += `\n💰 **Финансовая информация:**\n`;
    if (orgInfo.finance.income) result += `• Доходы: ${orgInfo.finance.income.toLocaleString('ru-RU')} руб.\n`;
    if (orgInfo.finance.expense) result += `• Расходы: ${orgInfo.finance.expense.toLocaleString('ru-RU')} руб.\n`;
    if (orgInfo.finance.debt) result += `• Задолженность: ${orgInfo.finance.debt.toLocaleString('ru-RU')} руб.\n`;
  }
  
  // Employees
  if (orgInfo.employees !== null) {
    result += `\n👥 **Сотрудники:** ${orgInfo.employees} чел.\n`;
  }
  
  // Risk analysis
  result += `\n${riskEmoji[risks.riskLevel]} **Оценка рисков: ${risks.riskLevel}**\n`;
  result += `📊 Скоринговая оценка: ${risks.score}/100\n\n`;
  
  // Risks
  if (risks.risks.length > 0) {
    result += `⚠️ **Выявленные риски:**\n`;
    risks.risks.forEach(risk => {
      result += `• ${risk}\n`;
    });
    result += `\n`;
  }
  
  // Recommendations
  result += `💡 **Рекомендации:**\n`;
  risks.recommendations.forEach(rec => {
    result += `• ${rec}\n`;
  });
  
  return result;
}

/**
 * Main function to check counterparty by INN
 */
async function checkCounterparty(inn) {
  try {
    console.log(`🔍 Checking counterparty with INN: ${inn}`);
    
    const orgInfo = await getOrganizationInfo(inn);
    const risks = analyzeRisks(orgInfo);
    const formattedInfo = formatOrganizationInfo(orgInfo, risks);
    
    return {
      success: true,
      inn,
      orgInfo,
      risks,
      formattedInfo
    };
  } catch (error) {
    console.error('❌ Counterparty check failed:', error);
    
    return {
      success: false,
      inn,
      error: error.message,
      formattedInfo: `❌ **Ошибка проверки контрагента**\n\nИНН: ${inn}\nОшибка: ${error.message}\n\nПопробуйте позже или обратитесь к администратору.`
    };
  }
}

module.exports = {
  isDaDataConfigured,
  checkCounterparty,
  getOrganizationInfo,
  analyzeRisks,
  formatOrganizationInfo
};

