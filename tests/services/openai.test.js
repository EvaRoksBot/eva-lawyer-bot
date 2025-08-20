jest.mock('openai', () => ({ OpenAI: jest.fn() }));

const { OpenAI } = require('openai');
const { generateContractAnalysis } = require('../../src/services/openai');

describe('OpenAI Service', () => {
  beforeEach(() => {
    OpenAI.mockClear();
  });

  it('should generate contract analysis correctly', async () => {
    const createMock = jest
      .fn()
      .mockResolvedValue({
        choices: [
          { message: { content: 'Анализ договора: Обнаружены риски в пунктах 1.2, 3.4' } },
        ],
      });

    OpenAI.mockImplementation(() => ({
      chat: { completions: { create: createMock } },
    }));

    const result = await generateContractAnalysis('Текст договора');

    expect(result).toContain('Обнаружены риски');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    const createMock = jest.fn().mockRejectedValue(new Error('API Error'));

    OpenAI.mockImplementation(() => ({
      chat: { completions: { create: createMock } },
    }));

    await expect(generateContractAnalysis('Текст договора')).rejects.toThrow(
      'Не удалось выполнить анализ'
    );
  });
});
