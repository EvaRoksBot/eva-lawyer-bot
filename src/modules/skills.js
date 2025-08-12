const OpenAI = require('openai');

/**
 * Generate a roadmap of hard skills for a legal professional.
 * Given a target specialisation (e.g. договорное право, судебная практика),
 * this function asks the model to outline key competencies, recommended
 * learning resources and a suggested timeline. The output can be
 * post‑processed into a table or checklist in the bot.
 *
 * @param {string} specialization Area of law to build skills for.
 * @param {string} apiKey OpenAI API key.
 * @returns {Promise<string>} A roadmap description.
 */
async function generateSkillsRoadmap(specialization, apiKey) {
  const openai = new OpenAI({ apiKey });
  const messages = [
    {
      role: 'system',
      content: 'Ты — карьерный консультант для юристов. Составь подробную карту hard‑скиллов по запросу.',
    },
    {
      role: 'user',
      content: `Какие навыки и ресурсы нужны для специализации: ${specialization}? Оформи как список шагов.`,
    },
  ];
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 800,
    temperature: 0.5,
  });
  return completion.choices[0]?.message?.content || '';
}

module.exports = { generateSkillsRoadmap };
