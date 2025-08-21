# Eva Lawyer Bot v18.0 - Clean Version

Телеграм-бот для юридических консультаций и анализа документов на базе ChatGPT.

## 🚀 Особенности v18.0

- **Оптимизированная архитектура** - убраны все дубли и устаревшие файлы
- **Минимальные зависимости** - только необходимые пакеты
- **Чистая структура** - логичная организация кода
- **Готов к деплою** - настроен для Vercel

## 📋 Функциональность

- 📄 Анализ договоров и документов
- ⚠️ Создание таблиц рисков
- 📝 Подготовка юридических заключений
- 🔍 Проверка контрагентов
- 📋 Генерация документов

## 🛠 Технический стек

- **Node.js** + Express
- **Telegram Bot API** (Telegraf)
- **OpenAI API** (GPT-4)
- **Vercel** (хостинг)

## 📁 Структура проекта

```
eva-lawyer-bot/
├── src/
│   └── main.js          # Основной файл бота
├── prompts/             # Промпты для OpenAI
├── templates/           # Шаблоны документов
├── .env.example         # Пример переменных окружения
├── package.json         # Зависимости
├── vercel.json          # Конфигурация Vercel
└── README.md           # Документация
```

## ⚙️ Установка и запуск

### Локальная разработка

```bash
# Клонирование репозитория
git clone https://github.com/EvaRoksBot/eva-lawyer-bot.git
cd eva-lawyer-bot

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
# Заполните .env необходимыми значениями

# Запуск
npm start
```

### Деплой на Vercel

1. **Подключите репозиторий к Vercel**
2. **Добавьте переменные окружения:**
   - `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота
   - `OPENAI_API_KEY` - ключ OpenAI API
3. **Деплой произойдет автоматически**

### Настройка Telegram webhook

```bash
# Замените YOUR_DOMAIN на ваш домен Vercel
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://YOUR_DOMAIN.vercel.app/telegram/webhook"
```

## 🔧 Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | ✅ |
| `OPENAI_API_KEY` | API-ключ OpenAI | ✅ |
| `PORT` | Порт для локального запуска | ❌ (по умолчанию 3000) |

## 📊 API Endpoints

- `POST /telegram/webhook` - Webhook для Telegram
- `GET /health` - Проверка состояния сервиса
- `GET /` - Информация о боте

## 🧪 Тестирование

```bash
# Проверка health endpoint
curl https://your-domain.vercel.app/health

# Проверка webhook Telegram
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

## 📝 Лицензия

MIT License

## 🤝 Поддержка

Если у вас есть вопросы или предложения, создайте issue в репозитории.

---

**Eva Lawyer Bot v18.0** - Чистая, оптимизированная версия для продакшена 🚀
