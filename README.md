# Eva Lawyer Bot

Телеграм-бот юридического помощника на базе ChatGPT.

## Функциональность

- ✅ Проверка договоров
- 📑 Создание таблицы рисков
- 📝 Составление юридических заключений
- 📊 Анализ судебной практики
- ⚖️ Подготовка к спорам
- 📬 Ответы на претензии
- 🔍 Проверка контрагентов по ИНН
- 📄 Генерация документов по шаблонам (счета, договоры, протоколы)

## Технический стек

- Node.js + Express (REST API)
- Telegraf (Telegram Bot API)
- OpenAI API (GPT)
- DaData API (опционально, для получения данных по ИНН)
- Vercel (деплой и хостинг)

## Быстрый старт

### Предварительные требования

- Node.js 18+
- Зарегистрированный бот в Telegram (@BotFather)
- Аккаунт OpenAI с API ключом
- Аккаунт Vercel (для деплоя)

### Локальная разработка

1. Клонируйте репозиторий:

```bash
git clone https://github.com/EvaRoksBot/eva-lawyer-bot.git
cd eva-lawyer-bot
```

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` на основе примера:

```bash
cp .env.example .env
```

4. Заполните переменные окружения в файле `.env`:

```
TELEGRAM_BOT_TOKEN=your_telegram_token
OPENAI_API_KEY=your_openai_api_key
BASE_URL=http://localhost:3000
```

5. Запустите бот в режиме разработки:

```bash
npm run dev
```

6. Для локального тестирования вебхуков используйте ngrok:

```bash
ngrok http 3000
```

7. Установите вебхук с полученным URL:

```bash
TELEGRAM_BOT_TOKEN=your_token BASE_URL=https://your-ngrok-url npm run webhook:set
```

### Деплой на Vercel

1. Создайте новый проект в Vercel, связанный с GitHub репозиторием
2. Настройте переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `BASE_URL` (ваш Vercel домен)
   - `DADATA_API_KEY` и `DADATA_SECRET` (опционально)
3. После успешного деплоя, установите вебхук:

```bash
TELEGRAM_BOT_TOKEN=your_token BASE_URL=https://your-vercel-domain.vercel.app npm run webhook:set
```

## Структура проекта

```
eva-lawyer-bot/
├─ src/                   # Исходный код
│  ├─ index.js            # Главный файл приложения
│  ├─ telegram/           # Обработчики команд Telegram
│  └─ services/           # Сервисы (OpenAI, DaData, логирование)
├─ prompts/               # Промпты для OpenAI
├─ templates/             # Шаблоны документов
├─ scripts/               # Скрипты для управления
├─ tests/                 # Тесты
└─ .github/               # GitHub Actions
```

## Доступные команды

```bash
# Разработка
npm run dev                # Запуск в режиме разработки

# Управление вебхуками
npm run webhook:set        # Установить вебхук
npm run webhook:delete     # Удалить вебхук
npm run webhook:info       # Информация о вебхуке

# Код
npm run lint               # Проверка кода линтером
npm run format             # Форматирование кода

# Docker
npm run docker:build       # Сборка Docker образа
npm run docker:up          # Запуск в Docker
npm run docker:down        # Остановка Docker контейнеров
```

## Обновление и деплой

При пуше в ветку `main` происходит автоматический деплой на Vercel. 
Для разработки рекомендуется использовать ветки в формате `codex/feature-name`.

## Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Токен бота Telegram | Да |
| `OPENAI_API_KEY` | API-ключ OpenAI | Да |
| `BASE_URL` | URL для вебхука | Да |
| `DADATA_API_KEY` | API-ключ DaData | Нет |
| `DADATA_SECRET` | Секретный ключ DaData | Нет |
| `LOG_LEVEL` | Уровень логирования (`debug`, `info`, `warn`, `error`) | Нет |
| `TELEGRAM_SECRET_TOKEN` | Секретный токен для дополнительной защиты вебхука | Нет |
| `MAX_FILE_SIZE_MB` | Максимальный размер принимаемых файлов в МБ | Нет |

## Лицензия

MIT
