# Eva Lawyer Bot

Telegram bot that leverages OpenAI to analyze legal documents.

## Setup

1. Copy `.env.example` to `.env` and populate the required values.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the bot:
   ```bash
   python src/bot.py
   ```

## Environment Variables

- `TELEGRAM_BOT_TOKEN` – Telegram bot token provided by BotFather.
- `WEBHOOK_SECRET` – secret used to validate webhook requests.
- `OPENAI_API_KEY` – OpenAI API key for model access.
- `OPENAI_MODEL` – (optional) model name, default `gpt-4o-mini`.

## License

This project is licensed under the terms of the MIT license.
