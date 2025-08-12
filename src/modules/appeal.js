const OpenAI = require('openai');

/**
 * Compose a formal appeal or complaint addressed to a government
 * authority or organisation. This helper takes structured details
 * about the issue and uses OpenAI to draft a well‑formed document
 * with introduction, description of facts, legal grounds and a
 * resolution request. Adjust the system prompt to tailor style.
 *
 * @param {Object} details Fields like authority, applicant, facts, demands.
 * @param {string} apiKey Your OpenAI API key.
 * @returns {Promise<string>} A drafted appeal letter.
 */
async function generateAppeal(details, apiKey) {
  const openai = new OpenAI({ apiKey });
  const systemPrompt =
    'Ты — юрист, готовящий обращения в государственные органы. Пиши официальным, вежливым стилем, ' +
    'ссылайся на нормы права и формулируй требования ясно.';
  const userPrompt =
    Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1000,
    temperature: 0.5,
  });
  return completion.choices[0]?.message?.content || '';
}

module.exports = { generateAppeal };
