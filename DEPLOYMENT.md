# 🚀 Руководство по развертыванию Eva Lawyer Bot Ultimate v5.0

## 📋 Обзор

Это руководство поможет вам развернуть Eva Lawyer Bot Ultimate v5.0 на различных платформах с полной функциональностью.

## 🎯 Предварительные требования

### Системные требования
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Необходимые API ключи
1. **Telegram Bot Token** - получить у [@BotFather](https://t.me/BotFather)
2. **OpenAI API Key** - [platform.openai.com](https://platform.openai.com/api-keys)
3. **DaData API Keys** - [dadata.ru](https://dadata.ru/) (опционально)

## 🔧 Настройка переменных окружения

Создайте файл `.env` со следующими переменными:

```env
# Обязательные переменные
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here

# Опциональные переменные
DADATA_API_KEY=your_dadata_api_key_here
DADATA_SECRET_KEY=your_dadata_secret_key_here
TG_WEBHOOK_SECRET=your_webhook_secret_here

# Настройки производительности
NODE_ENV=production
LOG_LEVEL=info
```

## 🌐 Развертывание на Vercel (рекомендуется)

### Шаг 1: Подготовка проекта

```bash
# Клонирование репозитория
git clone https://github.com/your-username/eva-lawyer-bot-ultimate.git
cd eva-lawyer-bot-ultimate

# Установка зависимостей
npm install
```

### Шаг 2: Настройка Vercel

```bash
# Установка Vercel CLI
npm install -g vercel

# Вход в аккаунт Vercel
vercel login

# Инициализация проекта
vercel
```

### Шаг 3: Настройка переменных окружения в Vercel

1. Перейдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в Settings → Environment Variables
4. Добавьте все переменные из `.env` файла

### Шаг 4: Развертывание

```bash
# Развертывание в production
vercel --prod
```

### Шаг 5: Настройка webhook

После успешного развертывания настройте webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project-name.vercel.app/api/telegram-ultimate-v5",
    "secret_token": "your_webhook_secret"
  }'
```

### Шаг 6: Проверка работоспособности

Проверьте статус бота:
```bash
curl https://your-project-name.vercel.app/api/telegram-ultimate-v5
```

Ожидаемый ответ:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-19T09:00:00.000Z",
  "uptime": 0,
  "performance": {
    "avg_response_time": 0,
    "success_rate": "0",
    "total_requests": 0
  },
  "modules": {
    "ai_engine": true,
    "document_engine": true,
    "analytics_engine": true,
    "file_manager": true
  }
}
```

## 🐳 Развертывание с Docker

### Шаг 1: Создание Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]
```

### Шаг 2: Сборка и запуск

```bash
# Сборка образа
docker build -t eva-lawyer-bot-ultimate .

# Запуск контейнера
docker run -d \
  --name eva-bot \
  -p 3000:3000 \
  --env-file .env \
  eva-lawyer-bot-ultimate
```

### Шаг 3: Docker Compose (опционально)

Создайте `docker-compose.yml`:

```yaml
version: '3.8'

services:
  eva-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DADATA_API_KEY=${DADATA_API_KEY}
      - DADATA_SECRET_KEY=${DADATA_SECRET_KEY}
      - TG_WEBHOOK_SECRET=${TG_WEBHOOK_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/telegram-ultimate-v5"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Запуск:
```bash
docker-compose up -d
```

## ☁️ Развертывание на других платформах

### Heroku

```bash
# Создание приложения
heroku create your-app-name

# Настройка переменных окружения
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set OPENAI_API_KEY=your_key
heroku config:set DADATA_API_KEY=your_dadata_key
heroku config:set DADATA_SECRET_KEY=your_dadata_secret
heroku config:set TG_WEBHOOK_SECRET=your_webhook_secret

# Развертывание
git push heroku main

# Настройка webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-app-name.herokuapp.com/api/telegram-ultimate-v5"
```

### Railway

```bash
# Установка Railway CLI
npm install -g @railway/cli

# Вход в аккаунт
railway login

# Инициализация проекта
railway init

# Настройка переменных окружения
railway variables set TELEGRAM_BOT_TOKEN=your_token
railway variables set OPENAI_API_KEY=your_key

# Развертывание
railway up
```

### DigitalOcean App Platform

1. Создайте новое приложение в [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Подключите ваш GitHub репозиторий
3. Настройте переменные окружения
4. Развертывание произойдет автоматически

## 🔧 Настройка после развертывания

### 1. Проверка webhook

```bash
# Проверка текущего webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### 2. Тестирование функциональности

Отправьте боту команды:
- `/start` - проверка основного меню
- `/help` - проверка справки
- Отправьте любой текст - проверка AI ответов

### 3. Мониторинг логов

#### Vercel
```bash
vercel logs --follow
```

#### Docker
```bash
docker logs -f eva-bot
```

#### Heroku
```bash
heroku logs --tail
```

## 📊 Мониторинг и обслуживание

### Настройка алертов

1. **Vercel**: Настройте уведомления в Project Settings
2. **Heroku**: Используйте Heroku Metrics
3. **Docker**: Настройте мониторинг с Prometheus/Grafana

### Резервное копирование

Регулярно создавайте резервные копии:
- Переменных окружения
- Конфигурационных файлов
- Пользовательских данных (если сохраняются)

### Обновления

Для обновления бота:

1. **Vercel**: Просто push в main ветку
2. **Docker**: Пересоберите образ и перезапустите контейнер
3. **Heroku**: Push в heroku remote

## 🚨 Устранение неполадок

### Частые проблемы

#### Бот не отвечает
1. Проверьте webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
2. Проверьте логи приложения
3. Убедитесь, что все переменные окружения установлены

#### Ошибки 401 Unauthorized
1. Проверьте TELEGRAM_BOT_TOKEN
2. Проверьте TG_WEBHOOK_SECRET
3. Убедитесь, что webhook URL правильный

#### Ошибки OpenAI API
1. Проверьте OPENAI_API_KEY
2. Проверьте баланс аккаунта OpenAI
3. Проверьте лимиты API

#### Таймауты
1. Увеличьте timeout в настройках платформы
2. Оптимизируйте обработку больших файлов
3. Добавьте кеширование

### Диагностические команды

```bash
# Проверка статуса бота
curl https://your-domain.com/api/telegram-ultimate-v5

# Проверка webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Удаление webhook (для отладки)
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Установка webhook заново
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/telegram-ultimate-v5"
```

## 🔒 Безопасность

### Рекомендации по безопасности

1. **Никогда не коммитьте секреты** в репозиторий
2. **Используйте HTTPS** для всех webhook URL
3. **Регулярно ротируйте** API ключи
4. **Ограничьте доступ** к переменным окружения
5. **Мониторьте** подозрительную активность

### Настройка HTTPS

Все современные платформы (Vercel, Heroku, Railway) автоматически предоставляют HTTPS.

Для собственного сервера используйте Let's Encrypt:

```bash
# Установка certbot
sudo apt-get install certbot

# Получение сертификата
sudo certbot certonly --standalone -d your-domain.com
```

## 📈 Масштабирование

### Оптимизация производительности

1. **Кеширование**: Реализуйте кеширование частых запросов
2. **CDN**: Используйте CDN для статических ресурсов
3. **База данных**: Добавьте Redis для сессий
4. **Очереди**: Используйте очереди для тяжелых операций

### Горизонтальное масштабирование

Для высоких нагрузок рассмотрите:
- Несколько экземпляров бота
- Load balancer
- Микросервисную архитектуру

## 📞 Поддержка

При возникновении проблем:

1. Проверьте [FAQ](README.md#-faq)
2. Изучите логи приложения
3. Создайте [Issue](https://github.com/your-username/eva-lawyer-bot-ultimate/issues)
4. Обратитесь в поддержку: support@eva-lawyer-bot.com

---

**Успешного развертывания! 🚀**

