FROM node:20-alpine as base

WORKDIR /app

# Установка зависимостей
FROM base as deps
COPY package*.json ./
RUN npm ci --only=production

# Сборка с минимальным образом
FROM base

# Создаем пользователя и группу с низкими привилегиями
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodeuser

# Копируем только необходимые файлы
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

# Создаем и настраиваем временные директории
RUN mkdir -p /app/tmp && \
    chown -R nodeuser:nodejs /app

# Переключаемся на пользователя с низкими привилегиями
USER nodeuser

ENV NODE_ENV=production

# Проверка работоспособности
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

EXPOSE 3000

CMD ["node", "src/index.js"]
