#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не задан в .env');
  process.exit(1);
}

async function setupDevEnvironment() {
  try {
    try {
      execSync('ngrok --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('❌ ngrok не установлен. Установите его: npm install -g ngrok');
      process.exit(1);
    }

    console.log(`🚀 Запуск ngrok на порту ${PORT}...`);
    const ngrokProcess = spawn('ngrok', ['http', PORT.toString()]);

    let ngrokUrl;
    const ngrokUrlPromise = new Promise((resolve) => {
      ngrokProcess.stdout.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[a-zA-Z0-9]+\.ngrok\.io/);
        if (match && !ngrokUrl) {
          ngrokUrl = match[0];
          resolve(ngrokUrl);
        }
      });
    });

    console.log('🚀 Запуск локального сервера...');
    const serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`📋 Server: ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`❌ Server Error: ${data.toString().trim()}`);
    });

    const url = await Promise.race([
      ngrokUrlPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('ngrok timeout')), 10000)),
    ]);

    console.log(`✅ ngrok запущен: ${url}`);

    console.log('🔄 Настройка вебхука Telegram...');
    const webhookUrl = `${url}/telegram/webhook`;

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        url: webhookUrl,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
      }
    );

    if (response.data.ok) {
      console.log(`✅ Вебхук установлен на: ${webhookUrl}`);
      console.log('🎉 Среда разработки готова! Нажмите Ctrl+C для завершения.');
    } else {
      throw new Error(`Ошибка установки вебхука: ${response.data.description}`);
    }

    process.on('SIGINT', async () => {
      console.log('\n🛑 Завершение работы...');

      try {
        await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
        console.log('✅ Вебхук удален');
      } catch (error) {
        console.error('❌ Ошибка удаления вебхука:', error.message);
      }

      ngrokProcess.kill();
      serverProcess.kill();
      console.log('👋 Bye!');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

setupDevEnvironment();
