# Eva Lawyer Bot

Телеграм-бот для юридических консультаций и анализа документов на базе ChatGPT.

## Функциональность

- Проверка договоров
- Создание таблицы рисков
- Подготовка юридических заключений
- Анализ судебной практики
- Генерация документов по шаблонам
- Проверка контрагентов
- Интеграция с MCP сервером (Bitrix24 + DaData)

## Технический стек

- Node.js + Express
- Telegram Bot API
- OpenAI API
- DaData API (опционально)
- MCP сервер для Bitrix24/DaData
- Vercel (хостинг)
- Эндпоинт /metrics с Prometheus-совместимыми метриками без `prom-client`

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
# Заполните .env необходимыми значениями

# Запуск в режиме разработки
npm run dev
```

## Деплой

Бот настроен на автоматический деплой через Vercel при пуше в main ветку.

### Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен бота Telegram |
| `OPENAI_API_KEY` | API-ключ OpenAI |
| `BASE_URL` | URL вашего приложения (для вебхуков) |
| `DADATA_API_KEY` | API-ключ DaData (опционально) |
| `DADATA_SECRET` | Секрет DaData (опционально) |
| `MCP_SERVER_URL` | URL MCP сервера (Bitrix24 + DaData) |
| `MCP_API_KEY` | Токен доступа к MCP (если требуется) |
| `MCP_TIMEOUT` | Таймаут запросов к MCP (мс, по умолчанию 10000) |
| `MCP_ENDPOINT_BITRIX_STATUS` | (Опционально) Кастомный путь статуса интеграции Bitrix |
| `MCP_ENDPOINT_BITRIX_SYNC` | (Опционально) Кастомный путь синхронизации Bitrix |
| `MCP_ENDPOINT_DADATA_STATUS` | (Опционально) Кастомный путь статуса DaData |
| `MCP_ENDPOINT_DADATA_LOOKUP` | (Опционально) Кастомный путь запроса DaData |
| `LOG_LEVEL` | Уровень логирования (info, debug, error) |

## Структура проекта

```
eva-lawyer-bot/
├─ src/            # Исходный код
├─ prompts/        # Промпты для OpenAI
├─ templates/      # Шаблоны документов
├─ tests/          # Тесты
├─ scripts/        # Вспомогательные скрипты
```
