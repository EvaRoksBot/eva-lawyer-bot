const OpenAI = require('openai');

/**
 * Generate a draft supply contract based on user‑provided details.
 * The function takes an object with high‑level fields (e.g. subject,
 * price, term, parties, governing law) and asks OpenAI to assemble
 * a structured contract. This is a starting point – you can extend
 * the prompt or post‑process the result to meet your template needs.
 *
 * @param {Object} details Key fields describing the contract.
 * @param {string} apiKey Your OpenAI API key.
 * @returns {Promise<string>} The generated contract text.
 */
async function generateContract(details, apiKey) {
  const openai = new OpenAI({ apiKey });
  const systemPrompt =
    'Ты — юрист по договорному праву. Составь черновик договора поставки на основе предоставленных данных. ' +
    'Структура: предмет, цена, сроки, права и обязанности сторон, ответственность, порядок разрешения споров, реквизиты.';
  const userPrompt =
    `Данные для договора:\n` +
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
    temperature: 0.4,
  });
  return completion.choices[0]?.message?.content || '';
}

module.exports = { generateContract };
