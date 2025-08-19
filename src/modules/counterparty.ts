/**
 * Module for counterparty verification using DaData API
 */

export interface CounterpartyInfo {
  name: string;
  inn: string;
  ogrn?: string;
  status: string;
  address: string;
  management?: string;
  isActive: boolean;
}

export interface CounterpartyResult {
  success: boolean;
  data?: CounterpartyInfo;
  error?: string;
  message: string;
}

/**
 * Look up counterparty information using DaData API
 */
export async function lookupCounterparty(
  query: string,
  apiKey?: string,
  secretKey?: string
): Promise<CounterpartyResult> {
  if (!apiKey || !secretKey) {
    return {
      success: false,
      error: 'API keys not configured',
      message: 'Сервис проверки контрагентов временно недоступен.'
    };
  }

  try {
    const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
        'X-Secret': secretKey,
      },
      body: JSON.stringify({ 
        query: query.trim(), 
        count: 1 
      }),
    });

    if (!response.ok) {
      throw new Error(`DaData API error: ${response.status}`);
    }

    const data: any = await response.json();
    
    if (!data.suggestions || data.suggestions.length === 0) {
      return {
        success: false,
        message: `По запросу "${query}" информация не найдена.`
      };
    }

    const company = data.suggestions[0];
    const companyData = company.data;
    
    const counterpartyInfo: CounterpartyInfo = {
      name: companyData.name?.full_with_opf || 'Название не указано',
      inn: companyData.inn || 'Не указан',
      ogrn: companyData.ogrn || undefined,
      status: companyData.state?.status || 'Неизвестен',
      address: companyData.address?.unrestricted_value || 'Не указан',
      management: companyData.management?.name || undefined,
      isActive: companyData.state?.status === 'ACTIVE'
    };

    const message = formatCounterpartyInfo(counterpartyInfo);

    return {
      success: true,
      data: counterpartyInfo,
      message
    };
    
  } catch (error) {
    console.error('Error looking up counterparty:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Произошла ошибка при поиске информации о контрагенте. Попробуйте позже.'
    };
  }
}

/**
 * Format counterparty information for display
 */
function formatCounterpartyInfo(info: CounterpartyInfo): string {
  let message = `**${info.name}**\n\n`;
  message += `**ИНН:** ${info.inn}\n`;
  
  if (info.ogrn) {
    message += `**ОГРН:** ${info.ogrn}\n`;
  }
  
  message += `**Статус:** ${info.status}\n`;
  message += `**Адрес:** ${info.address}\n`;
  
  if (info.management) {
    message += `**Руководитель:** ${info.management}\n`;
  }
  
  message += `\n${info.isActive ? '✅ Организация активна' : '⚠️ Проверьте статус организации'}`;
  
  return message;
}

/**
 * Check if text looks like INN
 */
export function isINN(text: string): boolean {
  const cleaned = text.trim().replace(/\s/g, '');
  return /^\d{10}$|^\d{12}$/.test(cleaned);
}

/**
 * Check if text looks like OGRN
 */
export function isOGRN(text: string): boolean {
  const cleaned = text.trim().replace(/\s/g, '');
  return /^\d{13}$|^\d{15}$/.test(cleaned);
}

/**
 * Check if text contains company keywords
 */
export function containsCompanyKeywords(text: string): boolean {
  const companyKeywords = [
    'ооо', 'оао', 'зао', 'ип', 'пао', 'ао', 'тов', 'ltd', 'llc',
    'общество', 'предприятие', 'компания', 'фирма', 'организация'
  ];
  
  const lowerText = text.toLowerCase();
  return companyKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Determine if query is likely a counterparty search
 */
export function isCounterpartyQuery(text: string): boolean {
  return isINN(text) || isOGRN(text) || containsCompanyKeywords(text);
}

