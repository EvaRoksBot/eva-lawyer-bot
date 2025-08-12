# Eva Legal Bot

Telegram bot skeleton for legal assistance and document generation, deployable on Vercel.

## Features
- Main menu with document templates, legal prompts and counterparty check
- Document generation: invoice, supply contract, specification
- Legal prompts powered by OpenAI
- Counterparty lookup via DaData

## Deployment
1. Install dependencies with `npm install`.
2. Set environment variables defined in `.env.example` on Vercel.
3. Deploy with `vercel` and set webhook via `api/setup` route.
