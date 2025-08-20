#!/usr/bin/env node

/**
 * Скрипт для очистки временных файлов
 * Используется для удаления старых загруженных файлов
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const unlink = util.promisify(fs.unlink);

const TMP_DIR = path.join(__dirname, '..', 'tmp');
const MAX_AGE_HOURS = 24; // Файлы старше 24 часов будут удалены

async function cleanTmp() {
  try {
    // Создаем директорию, если она не существует
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
      console.info(`✅ Создана директория: ${TMP_DIR}`);
      return;
    }

    const now = new Date();
    const files = await readdir(TMP_DIR);
    
    if (files.length === 0) {
      console.info('ℹ️ Временная директория пуста');
      return;
    }

    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(TMP_DIR, file);
      const fileStat = await stat(filePath);
      
      if (!fileStat.isFile()) continue;
      
      const fileAge = (now - fileStat.mtime) / (1000 * 60 * 60); // возраст в часах
      
      if (fileAge > MAX_AGE_HOURS) {
        await unlink(filePath);
        deletedCount++;
      }
    }
    
    console.info(`✅ Удалено ${deletedCount} устаревших файлов`);
  } catch (error) {
    console.error('❌ Ошибка при очистке временных файлов:', error.message);
    process.exit(1);
  }
}

cleanTmp();
