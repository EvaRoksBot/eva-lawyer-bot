.PHONY: install dev start build lint test webhook docker-build docker-up docker-down clean release help

# Переменные
NODE_ENV ?= development

# Установка зависимостей
install:
	npm ci

# Запуск в режиме разработки
dev:
	NODE_ENV=$(NODE_ENV) npm run dev

# Запуск
start:
	NODE_ENV=production npm start

# Сборка
build:
	NODE_ENV=production npm run build

# Линтинг
lint:
	npm run lint

# Тестирование
test:
	npm test

# Управление вебхуками
webhook-set:
	npm run webhook:set

webhook-delete:
	npm run webhook:delete

webhook-info:
	npm run webhook:info

# Docker
docker-build:
	docker build -t eva-lawyer-bot .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# Очистка временных файлов
clean:
	npm run clean

# Создание релиза
release:
	@echo "Введите версию (например 1.0.0):"
	@read VERSION; \
	git checkout main && \
	git pull && \
	git tag -a v$$VERSION -m "Release v$$VERSION" && \
	git push origin v$$VERSION

# Помощь
help:
	@echo "Доступные команды:"
	@echo "  make install         - Установка зависимостей"
	@echo "  make dev             - Запуск в режиме разработки"
	@echo "  make start           - Запуск в production режиме"
	@echo "  make build           - Сборка проекта"
	@echo "  make lint            - Проверка кода линтером"
	@echo "  make test            - Запуск тестов"
	@echo "  make webhook-set     - Установка вебхука"
	@echo "  make webhook-delete  - Удаление вебхука"
	@echo "  make webhook-info    - Информация о вебхуке"
	@echo "  make docker-build    - Сборка Docker образа"
	@echo "  make docker-up       - Запуск в Docker"
	@echo "  make docker-down     - Остановка Docker контейнеров"
	@echo "  make clean           - Очистка временных файлов"
	@echo "  make release         - Создание нового релиза"
