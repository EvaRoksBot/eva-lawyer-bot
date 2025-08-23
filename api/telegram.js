export default async function handler(req, res) {
        if (req.method !== 'POST') {
                  return res.status(405).json({ error: 'Method not allowed' });
        }

  try {
            const update = req.body;
            console.log('Webhook received:', JSON.stringify(update, null, 2));

          const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_NEW;

          if (!token) {
                      console.error('No bot token found');
                      return res.status(500).json({ error: 'Bot token not configured' });
          }

          if (update.message) {
                      const chatId = update.message.chat.id;
                      const text = update.message.text;
                      const userName = update.message.from.first_name || 'User';

              let responseText = '';

              if (text === '/start') {
                            responseText = `Hello ${userName}! I am Eva Lawyer Bot. Send me /help for commands.`;
              } else if (text === '/help') {
                            responseText = `Available commands:
                            /start - Start bot
                            /help - Show help
                            /inn [number] - Check company by INN

                            Just send me any message!`;
              } else {
                            responseText = `Thank you for your message: "${text}". I'm working!`;
              }

              const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
                      await fetch(telegramUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                                    chat_id: chatId,
                                                    text: responseText
                                    })
                      });
          }

          return res.status(200).json({ ok: true });
  } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
  }
}
