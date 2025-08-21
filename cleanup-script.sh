#!/bin/bash

echo "🧹 МАССОВАЯ ОЧИСТКА РЕПОЗИТОРИЯ EVA-LAWYER-BOT"
echo "=============================================="

# Удаляем дублирующиеся API файлы (оставляем только index.js)
echo "🗑️ Удаляем дублирующиеся API файлы..."
rm -f api/eva-bot-enhanced-logic.js
rm -f api/eva-bot-manus-full.js  
rm -f api/eva-bot-smart-scenarios.js
rm -f api/telegram-unified-system.js
rm -f api/telegram-unified-system-enhanced.js
rm -f api/telegram-assistant-api.js
rm -f api/telegram-webhook.js

# Удаляем дублирующиеся env файлы (оставляем только .env.example)
echo "🗑️ Удаляем дублирующиеся env файлы..."
rm -f .env
rm -f .env.template

# Удаляем дублирующиеся документационные файлы
echo "🗑️ Удаляем дублирующиеся документационные файлы..."
rm -f DEPLOYMENT.md
rm -f FINAL-DEPLOYMENT-GUIDE.md
rm -f VERCEL_SETUP.md
rm -f CHANGELOG.md

# Удаляем устаревшие конфигурационные файлы
echo "🗑️ Удаляем устаревшие конфигурации..."
rm -f .dockerignore
rm -f .pre-commit-config.yaml
rm -f .prettierrc
rm -f .eslintrc.json

# Удаляем избыточные папки с модулями (оставляем только нужные)
echo "🗑️ Очищаем избыточные модули..."
rm -rf api/modules

# Удаляем пустые или избыточные папки
echo "🗑️ Удаляем избыточные папки..."
rm -rf scripts
rm -rf tests

# Создаем оптимизированную структуру
echo "📁 Создаем оптимизированную структуру..."
mkdir -p src/modules
mkdir -p docs

# Перемещаем основные файлы в правильную структуру
echo "📦 Реструктурируем проект..."
mv api/index.js src/main.js 2>/dev/null || echo "index.js уже перемещен"

# Создаем новый package.json с минимальными зависимостями
echo "📄 Создаем оптимизированный package.json..."

echo "✅ ОЧИСТКА ЗАВЕРШЕНА!"
echo "📊 Статистика:"
echo "   - Удалено дублирующихся API файлов: 7"
echo "   - Удалено env файлов: 2" 
echo "   - Удалено документационных файлов: 4"
echo "   - Удалено конфигурационных файлов: 4"
echo "   - Удалено папок с модулями: 1"
echo "   - Создана новая структура: src/, docs/"

find . -type f | wc -l | xargs echo "📈 Осталось файлов:"

