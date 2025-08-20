const { OpenAI } = require('openai');

async function generateContractAnalysis(text) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a legal expert analyzing contracts.' },
        { role: 'user', content: text },
      ],
    });
    return response.choices[0].message.content;
  } catch (error) {
    throw new Error(`Не удалось выполнить анализ: ${error.message}`);
  }
}

module.exports = { generateContractAnalysis };
