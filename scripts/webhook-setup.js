#!/usr/bin/env node

/**
 * Скрипт для управления вебхуками Telegram
 * Использование:
 *   node scripts/webhook-setup.js set    - установить вебхук
 *   node scripts/webhook-setup.js delete - удалить вебхук
 *   node scripts/webhook-setup.js info   - получить информацию о вебхуке
 */

require('dotenv').config();
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.BASE_URL;
const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || '';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не задан в .env');
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function setWebhook() {
  if (!BASE_URL) {
    console.error('❌ Ошибка: BASE_URL не задан в .env');
    process.exit(1);
  }

  try {
    const webhookUrl = `${BASE_URL}/telegram/webhook`;
    const params = {
      url: webhookUrl,
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'],
    };

    if (SECRET_TOKEN) {
      params.secret_token = SECRET_TOKEN;
    }

    const response = await axios.post(`${API_BASE}/setWebhook`, params);
    
    if (response.data.ok) {
      console.info('✅ Вебхук успешно установлен');
      console.info(`URL: ${webhookUrl}`);
      if (SECRET_TOKEN) {
        console.info('✅ Включена дополнительная защита с secret_token');
      } else {
        console.warn('⚠️ Рекомендуется установить TELEGRAM_SECRET_TOKEN для безопасности');
      }
    } else {
      console.error('❌ Ошибка при установке вебхука:', response.data.description);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

async function deleteWebhook() {
  try {
    const response = await axios.get(`${API_BASE}/deleteWebhook`);
    
    if (response.data.ok) {
      console.info('✅ Вебхук успешно удален');
    } else {
      console.error('❌ Ошибка при удалении вебхука:', response.data.description);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

async function getWebhookInfo() {
  try {
    const response = await axios.get(`${API_BASE}/getWebhookInfo`);
    
    if (response.data.ok) {
      console.info('ℹ️ Информация о вебхуке:');
      const info = response.data.result;
      console.info(`URL: ${info.url || 'не установлен'}`);
      console.info(`Последняя ошибка: ${info.last_error_message || 'нет'}`);
      console.info(`Ожидающие обновления: ${info.pending_update_count}`);
      console.info(`Максимальные подключения: ${info.max_connections}`);
      console.info(`Разрешенные обновления: ${info.allowed_updates?.join(', ') || 'все'}`);
      console.info(`Защита secret_token: ${info.has_custom_certificate ? 'да' : 'нет'}`);
    } else {
      console.error('❌ Ошибка при получении информации:', response.data.description);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

const command = process.argv[2]?.toLowerCase();

switch (command) {
  case 'set':
    setWebhook();
    break;
  case 'delete':
    deleteWebhook();
    break;
  case 'info':
    getWebhookInfo();
    break;
  default:
    console.info('Использование:');
    console.info('  node scripts/webhook-setup.js set    - установить вебхук');
    console.info('  node scripts/webhook-setup.js delete - удалить вебхук');
    console.info('  node scripts/webhook-setup.js info   - получить информацию о вебхуке');
    process.exit(1);
}
