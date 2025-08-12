const OpenAI = require('openai');

/**
 * Generate a polished, legally sound response or document fragment
 * tailored to the user’s context. This function can be used as a
 * personal copywriter: you provide a brief and tone, and the model
 * returns a refined text. Feel free to adjust the system prompt to
 * enforce company style guidelines or specific legal phrasing.
 *
 * @param {string} brief The task description or raw draft.
 * @param {Object} options Additional options such as tone or audience.
 * @param {string} apiKey Your OpenAI API key.
 * @returns {Promise<string>} The edited or generated copy.
 */
async function generateCopy(brief, options, apiKey) {
  const openai = new OpenAI({ apiKey });
  const tone = options?.tone || 'деловой';
  const audience = options?.audience || 'контрагенты';
  const systemPrompt =
    `Ты — профессиональный юрист‑копирайтер. Пиши грамотно,\n` +
    `лаконично и понятным языком для аудитории: ${audience}.`; 
  const userPrompt =
    `Тон: ${tone}. Задача:\n${brief}`;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 800,
    temperature: 0.6,
  });
  return completion.choices[0]?.message?.content || '';
}

module.exports = { generateCopy };
