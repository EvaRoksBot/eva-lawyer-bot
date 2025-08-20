#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.BASE_URL;

if (!TELEGRAM_BOT_TOKEN || !BASE_URL) {
  console.error('Error: TELEGRAM_BOT_TOKEN and BASE_URL must be set in .env file');
  process.exit(1);
}

async function setupWebhook() {
  try {
    // Удаление старого вебхука
    await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
    console.info('✅ Старый вебхук успешно удалён');
    
    // Установка нового вебхука
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        url: `${BASE_URL}/telegram/webhook`,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
      }
    );
    
    if (response.data.ok) {
      console.info('✅ Новый вебхук успешно установлен');
      console.info(`URL: ${BASE_URL}/telegram/webhook`);
    } else {
      console.error('❌ Ошибка при установке вебхука:', response.data);
    }
  } catch (error) {
    console.error('❌ Произошла ошибка:', error.message);
  }
}

async function getWebhookInfo() {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    
    console.info('ℹ️ Информация о текущем вебхуке:');
    console.info(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Ошибка при получении информации о вебхуке:', error.message);
  }
}

const command = process.argv[2];
if (command === 'setup') {
  setupWebhook();
} else if (command === 'info') {
  getWebhookInfo();
} else {
  console.info('Использование:');
  console.info('  npm run webhook setup - установить вебхук');
  console.info('  npm run webhook info - получить информацию о текущем вебхуке');
}
