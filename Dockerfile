FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

# Устанавливаем права
RUN chown -R appuser:appuser /app

# Переключаемся на непривилегированного пользователя
USER appuser

EXPOSE 3000

CMD ["node", "src/index.js"]
