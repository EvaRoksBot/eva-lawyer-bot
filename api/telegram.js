// Telegram Bot API Handler for Vercel
export default async function handler(req, res) {
      // Разрешаем только POST запросы
  if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
          const update = req.body;
          console.log('📨 Webhook received:', JSON.stringify(update, null, 2));

        // Получаем токен из переменных окружения
        const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_NEW;

        if (!token) {
                  console.error('❌ No bot token found');
                  return res.status(500).json({ error: 'Bot token not configured' });
        }

        // Обработка сообщений
        if (update.message) {
                  const chatId = update.message.chat.id;
                  const text = update.message.text;
                  const userId = update.message.from.id;
                  const userName = update.message.from.first_name || 'Пользователь';

            console.log(`💬 Message from ${userName} (${userId}): ${text}`);

            let responseText = '';

            if (text === '/start') {
                        responseText = `🤖 Добро пожаловать, ${userName}!

                        Я Юрист Ева - ваш AI-помощник по юридическим вопросам.

                        📋 Доступные команды:
                        • /start - Начать работу
                        • /help - Показать справку
                        • /inn [номер] - Проверить компанию по ИНН

                        💬 Просто напишите мне любой вопрос, и я постараюсь помочь!`;
            } 
            else if (text === '/help') {
                        responseText = `📋 Справка по командам:

                        🔹 /start - Начать работу с ботом
                        🔹 /help - Показать эту справку
                        🔹 /inn [номер] - Проверить компанию по ИНН

                        💡 Примеры вопросов:
                        • "Как составить договор?"
                        • "Что делать при увольнении?"
                        • "Права потребителей"

                        Просто напишите ваш вопрос!`;
            } 
            else if (text && text.startsWith('/inn')) {
                        const innMatch = text.match(/\/inn\s+(\d+)/);
                        if (innMatch) {
                                      const inn = innMatch[1];
                                      responseText = `🔍 Проверяю компанию с ИНН: ${inn}

                                      ⚠️ Функция проверки ИНН временно недоступна. 
                                      Попробуйте позже или обратитесь к администратору.`;
                        } else {
                                      responseText = `❌ Неверный формат команды.

                                      Используйте: /inn [номер ИНН]
                                      Пример: /inn 7707083893`;
                        }
            }
                  else if (text) {
                              // Обычное сообщение - отвечаем как AI помощник
                    responseText = `Привет, ${userName}! 👋

                    Спасибо за ваш вопрос: "${text}"

                    🤖 Я Юрист Ева, ваш AI-помощник. К сожалению, полная интеграция с OpenAI временно недоступна, но я готова помочь с базовыми юридическими вопросами.

                    Используйте команды:
                    • /help - для справки
                    • /inn [номер] - для проверки компаний

                    Скоро я стану еще умнее! 🚀`;
                  }
                  else {
                              responseText = `Привет! Я не понял ваше сообщение. Попробуйте /help для получения справки.`;
                  }

            // Отправляем ответ через Telegram API
            const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
                  const response = await fetch(telegramUrl, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                            chat_id: chatId,
                                            text: responseText,
                                            parse_mode: 'HTML'
                              })
                  });

            if (!response.ok) {
                        const errorText = await response.text();
                        console.error('❌ Failed to send message:', errorText);
                        return res.status(500).json({ error: 'Failed to send message' });
            }

            console.log('✅ Message sent successfully');
        }

        // Обработка callback запросов (кнопки)
        if (update.callback_query) {
                  console.log('🔘 Callback query received:', update.callback_query.data);

            const callbackQuery = update.callback_query;
                  const chatId = callbackQuery.message.chat.id;

            // Отвечаем на callback
            const answerUrl = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
                  await fetch(answerUrl, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                            callback_query_id: callbackQuery.id,
                                            text: 'Функция в разработке'
                              })
                  });
        }

        return res.status(200).json({ ok: true });
  } catch (error) {
          console.error('❌ Webhook error:', error);
          return res.status(500).json({ error: 'Internal server error' });
  }
}
