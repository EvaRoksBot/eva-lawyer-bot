# Eva Lawyer Bot - Vercel Setup Guide

## 🚀 Quick Setup After Deploy

### 1. Set Environment Variables in Vercel

Go to Vercel Dashboard → Project → Settings → Environment Variables:

```bash
TELEGRAM_BOT_TOKEN = your_telegram_token
OPENAI_API_KEY = your_openai_key_here
BASE_URL = https://your-project-name.vercel.app
DADATA_API_KEY = your_dadata_key (optional)
DADATA_SECRET = your_dadata_secret (optional)
MCP_SERVER_URL = https://mcp.your-domain.com (optional)
MCP_API_KEY = your_mcp_token (optional)
```

### 2. Setup Telegram Webhook

```bash
# Delete old webhook
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"

# Set new webhook to Vercel
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://your-project-name.vercel.app/telegram/webhook" \
  -d "drop_pending_updates=true" \
  -d "allowed_updates[]=message" \
  -d "allowed_updates[]=callback_query"

# Check webhook status
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

### 3. Test Endpoints

```bash
# Health check
curl -s "https://your-project-name.vercel.app/healthz"

# Diagnostic info
curl -s "https://your-project-name.vercel.app/diag"

# Bot info
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
```

### 4. Test Bot Functions

In Telegram chat with @EvaRoksBot:

1. Send `/start` → Should show main menu with inline buttons
2. Click "🔍 Проверка договора" → Should ask for document and show side selection
3. Click "📚 Юр. заключение" → Should ask for legal topic
4. Click "🏢 Проверка контрагента (ИНН)" → Should ask for INN number

### 5. Available Endpoints

- `/` - Main info page
- `/healthz` - Health check
- `/diag` - Diagnostic info (shows masked tokens)
- `/telegram/webhook` - Telegram webhook endpoint

### 6. Troubleshooting

**401 Unauthorized**: Check TELEGRAM_BOT_TOKEN in Vercel env vars

**Webhook 404**: Ensure webhook URL is set to `/telegram/webhook`

**Buttons not working**: Check Vercel logs for callback processing

**OpenAI errors**: Verify OPENAI_API_KEY is set correctly

### 7. Vercel CLI Commands

```bash
# Deploy to production
vercel --prod

# Check logs
vercel logs --since 1h

# Set environment variables
vercel env add TELEGRAM_BOT_TOKEN production
vercel env add OPENAI_API_KEY production
vercel env add BASE_URL production
```

## 🧠 Bot Features

- **13 Legal Scenarios** with full prompts
- **Cross-links** between functions
- **INN Auto-fill** via DaData API
- **Document Export** DOCX/PDF ready
- **Smart Interface** with loading animations
- **Everest Branding** and professional messaging

## 📊 Available Scenarios

1. 🔍 Contract Review → Risk Table
2. 📑 Risk Table → Protocol Disputes
3. 📝 Supply Contract (INN auto-fill)
4. 💳 Invoice (INN auto-fill)
5. 📚 Legal Opinion
6. 📊 Case Law Analysis
7. ⚔️ Dispute Preparation
8. 🖋️ Client Letter
9. 📬 Claim Reply
10. 🏢 Counterparty Scoring (INN)

All scenarios include full Chain of Thoughts prompts and professional legal analysis.

