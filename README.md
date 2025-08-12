# Eva Lawyer Bot

Telegram bot deployed on Vercel with an OpenAI-powered legal assistant.

## Features
- Contract review with risk table and suggested edits
- Counterparty lookup via DaData by INN or company name
- Document templates: invoice, supply contract, specification
- Free-form AI legal chat
- Quick FAQ

## Environment Variables
- `TELEGRAM_BOT_TOKEN` – Telegram bot token
- `OPENAI_API_KEY` – OpenAI API key
- `OPENAI_MODEL` – optional, model name (defaults to `gpt-4o-mini`)
- `DADATA_API_KEY` – DaData token for counterparty checks

Webhook must point to `/api/telegram` on Vercel.
