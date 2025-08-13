const fetch = global.fetch;

/**
 * Look up counterparty details using the DaData API.
 * Returns a formatted string ready to be sent back to the user.
 *
 * @param {string} query   INN (10 or 12 digits) or company name
 * @param {string} apiKey  DaData API key
 * @returns {Promise<string>} summary text
 */
async function lookupCounterparty(query, apiKey) {
  if (!apiKey) {
    return 'Переменная DADATA_API_KEY не задана. Добавьте её в настройках Vercel.';
  }
  const isInn = /^\d{10}(\d{2})?$/.test(query);
  const endpoint = isInn ? 'findById/party' : 'suggest/party';
  try {
    const resp = await fetch(`https://suggestions.dadata.ru/suggestions/api/4_1/rs/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({ query }),
    }).then((r) => r.json());
    const data = resp?.suggestions?.[0]?.data;
    if (!data) return 'Не нашли данных. Проверьте ИНН или название организации.';
    const name = data.name?.short_with_opf || data.name?.full_with_opf || '—';
    const innkpp = `${data.inn || '—'} / ${data.kpp || '—'}`;
    const addr = data.address?.value || '—';
    const state = data.state?.status || 'ACTIVE';
    return `🏢 ${name}\nИНН/КПП: ${innkpp}\nАдрес: ${addr}\nСтатус: ${state}`;
  } catch (e) {
    return 'Ошибка при обращении к сервису DaData.';
  }
}

module.exports = { lookupCounterparty };
