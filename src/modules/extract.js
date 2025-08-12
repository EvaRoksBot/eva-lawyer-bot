const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');

/**
 * Extract plaintext from a document buffer based on its MIME type.
 * Supports PDFs and DOCX files. Returns a string with the extracted
 * text or throws an error for unsupported types.
 *
 * @param {Buffer} buffer The file contents.
 * @param {string} mimeType The MIME type (e.g. application/pdf).
 * @returns {Promise<string>} Extracted plaintext.
 */
async function extractText(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

/**
 * Extract text from an image using OpenAI's GPT‑4o vision capabilities.
 * The image is encoded as a base64 data URL and sent to the model
 * along with a simple extraction prompt. Returns the extracted text.
 *
 * @param {Buffer} buffer The image contents.
 * @param {string} apiKey Your OpenAI API key.
 * @returns {Promise<string>} Extracted text.
 */
async function extractTextFromImage(buffer, apiKey) {
  const base64 = buffer.toString('base64');
  const openai = new OpenAI({ apiKey });
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Извлеки текст из изображения.' },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64}` },
        },
      ],
    },
  ];
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 500,
    temperature: 0,
  });
  return response.choices[0]?.message?.content || '';
}

module.exports = { extractText, extractTextFromImage };
