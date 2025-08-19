// File Manager for Eva Lawyer Bot
// Advanced file handling, storage, and management system

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileManager {
    constructor() {
        this.storageDir = '/tmp/eva-storage';
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = new Set([
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'application/rtf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]);
        
        this.files = new Map(); // fileId -> file metadata
        this.userFiles = new Map(); // userId -> Set of fileIds
        this.downloadQueue = [];
        this.isProcessingQueue = false;
        
        this.initializeStorage();
        this.startQueueProcessor();
    }

    // Инициализация хранилища
    async initializeStorage() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            await fs.mkdir(path.join(this.storageDir, 'documents'), { recursive: true });
            await fs.mkdir(path.join(this.storageDir, 'images'), { recursive: true });
            await fs.mkdir(path.join(this.storageDir, 'temp'), { recursive: true });
            await fs.mkdir(path.join(this.storageDir, 'exports'), { recursive: true });
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    // Загрузка файла из Telegram
    async downloadFromTelegram(fileId, userId, botToken) {
        try {
            // Получаем информацию о файле
            const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const fileInfo = await fileInfoResponse.json();
            
            if (!fileInfo.ok) {
                throw new Error(`Failed to get file info: ${fileInfo.description}`);
            }

            const file = fileInfo.result;
            
            // Проверяем размер файла
            if (file.file_size > this.maxFileSize) {
                throw new Error(`File too large: ${file.file_size} bytes (max: ${this.maxFileSize})`);
            }

            // Скачиваем файл
            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
            const fileResponse = await fetch(fileUrl);
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to download file: ${fileResponse.statusText}`);
            }

            const fileBuffer = await fileResponse.arrayBuffer();
            const buffer = Buffer.from(fileBuffer);

            // Определяем тип файла
            const mimeType = this.detectMimeType(buffer, file.file_path);
            
            if (!this.allowedTypes.has(mimeType)) {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }

            // Сохраняем файл
            const savedFile = await this.saveFile(buffer, {
                originalName: path.basename(file.file_path),
                mimeType,
                userId,
                telegramFileId: fileId,
                size: file.file_size
            });

            return {
                success: true,
                file: savedFile
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Сохранение файла
    async saveFile(buffer, metadata) {
        const fileId = this.generateFileId();
        const hash = this.calculateHash(buffer);
        const extension = this.getExtensionFromMimeType(metadata.mimeType);
        const fileName = `${fileId}${extension}`;
        
        // Определяем подпапку по типу файла
        const subfolder = this.getSubfolderByMimeType(metadata.mimeType);
        const filePath = path.join(this.storageDir, subfolder, fileName);

        try {
            // Сохраняем файл
            await fs.writeFile(filePath, buffer);

            // Создаем метаданные
            const fileMetadata = {
                id: fileId,
                originalName: metadata.originalName,
                fileName,
                filePath,
                mimeType: metadata.mimeType,
                size: buffer.length,
                hash,
                userId: metadata.userId,
                telegramFileId: metadata.telegramFileId,
                uploaded_at: Date.now(),
                accessed_at: Date.now(),
                access_count: 0,
                tags: [],
                description: '',
                status: 'stored'
            };

            // Сохраняем метаданные
            this.files.set(fileId, fileMetadata);

            // Добавляем в список файлов пользователя
            if (!this.userFiles.has(metadata.userId)) {
                this.userFiles.set(metadata.userId, new Set());
            }
            this.userFiles.get(metadata.userId).add(fileId);

            return fileMetadata;

        } catch (error) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    // Получение файла
    async getFile(fileId, updateAccess = true) {
        const fileMetadata = this.files.get(fileId);
        if (!fileMetadata) {
            throw new Error(`File ${fileId} not found`);
        }

        if (updateAccess) {
            fileMetadata.accessed_at = Date.now();
            fileMetadata.access_count++;
        }

        try {
            const buffer = await fs.readFile(fileMetadata.filePath);
            return {
                metadata: fileMetadata,
                buffer
            };
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    // Получение метаданных файла
    getFileMetadata(fileId) {
        return this.files.get(fileId);
    }

    // Получение файлов пользователя
    getUserFiles(userId, options = {}) {
        const userFileIds = this.userFiles.get(userId);
        if (!userFileIds) {
            return [];
        }

        let files = Array.from(userFileIds).map(fileId => this.files.get(fileId)).filter(Boolean);

        // Фильтрация по типу
        if (options.mimeType) {
            files = files.filter(file => file.mimeType === options.mimeType);
        }

        // Фильтрация по тегам
        if (options.tags && options.tags.length > 0) {
            files = files.filter(file => 
                options.tags.some(tag => file.tags.includes(tag))
            );
        }

        // Сортировка
        if (options.sortBy) {
            files.sort((a, b) => {
                if (options.sortBy === 'date') {
                    return b.uploaded_at - a.uploaded_at;
                } else if (options.sortBy === 'size') {
                    return b.size - a.size;
                } else if (options.sortBy === 'name') {
                    return a.originalName.localeCompare(b.originalName);
                }
                return 0;
            });
        }

        // Пагинация
        if (options.limit) {
            const offset = options.offset || 0;
            files = files.slice(offset, offset + options.limit);
        }

        return files;
    }

    // Удаление файла
    async deleteFile(fileId, userId = null) {
        const fileMetadata = this.files.get(fileId);
        if (!fileMetadata) {
            return false;
        }

        // Проверяем права доступа
        if (userId && fileMetadata.userId !== userId) {
            throw new Error('Access denied');
        }

        try {
            // Удаляем физический файл
            await fs.unlink(fileMetadata.filePath);

            // Удаляем метаданные
            this.files.delete(fileId);

            // Удаляем из списка пользователя
            const userFileIds = this.userFiles.get(fileMetadata.userId);
            if (userFileIds) {
                userFileIds.delete(fileId);
                if (userFileIds.size === 0) {
                    this.userFiles.delete(fileMetadata.userId);
                }
            }

            return true;

        } catch (error) {
            console.error(`Failed to delete file ${fileId}:`, error);
            return false;
        }
    }

    // Обновление метаданных файла
    updateFileMetadata(fileId, updates, userId = null) {
        const fileMetadata = this.files.get(fileId);
        if (!fileMetadata) {
            throw new Error(`File ${fileId} not found`);
        }

        // Проверяем права доступа
        if (userId && fileMetadata.userId !== userId) {
            throw new Error('Access denied');
        }

        // Обновляем разрешенные поля
        const allowedFields = ['description', 'tags'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                fileMetadata[field] = updates[field];
            }
        });

        fileMetadata.updated_at = Date.now();
        return fileMetadata;
    }

    // Создание копии файла
    async copyFile(fileId, userId, newName = null) {
        const originalFile = await this.getFile(fileId, false);
        
        const newMetadata = {
            ...originalFile.metadata,
            originalName: newName || `Copy of ${originalFile.metadata.originalName}`,
            userId,
            telegramFileId: null
        };

        return await this.saveFile(originalFile.buffer, newMetadata);
    }

    // Создание архива файлов
    async createArchive(fileIds, userId, archiveName = 'archive.zip') {
        // Здесь будет реализация создания ZIP архива
        // Пока возвращаем заглушку
        return {
            success: true,
            archiveId: this.generateFileId(),
            fileName: archiveName,
            size: 0
        };
    }

    // Поиск файлов
    searchFiles(userId, query, options = {}) {
        const userFiles = this.getUserFiles(userId);
        const lowerQuery = query.toLowerCase();

        return userFiles.filter(file => {
            // Поиск по имени файла
            if (file.originalName.toLowerCase().includes(lowerQuery)) {
                return true;
            }

            // Поиск по описанию
            if (file.description && file.description.toLowerCase().includes(lowerQuery)) {
                return true;
            }

            // Поиск по тегам
            if (file.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                return true;
            }

            return false;
        });
    }

    // Получение статистики файлов
    getFileStats(userId = null) {
        let files;
        
        if (userId) {
            files = this.getUserFiles(userId);
        } else {
            files = Array.from(this.files.values());
        }

        const stats = {
            total_files: files.length,
            total_size: files.reduce((sum, file) => sum + file.size, 0),
            by_type: {},
            by_date: {},
            most_accessed: files.sort((a, b) => b.access_count - a.access_count).slice(0, 5)
        };

        // Статистика по типам
        files.forEach(file => {
            const type = file.mimeType;
            if (!stats.by_type[type]) {
                stats.by_type[type] = { count: 0, size: 0 };
            }
            stats.by_type[type].count++;
            stats.by_type[type].size += file.size;
        });

        // Статистика по датам (по дням)
        files.forEach(file => {
            const date = new Date(file.uploaded_at).toISOString().split('T')[0];
            if (!stats.by_date[date]) {
                stats.by_date[date] = 0;
            }
            stats.by_date[date]++;
        });

        return stats;
    }

    // Очистка старых файлов
    async cleanupOldFiles(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 дней
        const cutoff = Date.now() - maxAge;
        let cleaned = 0;

        for (const [fileId, fileMetadata] of this.files.entries()) {
            if (fileMetadata.uploaded_at < cutoff && fileMetadata.access_count === 0) {
                const deleted = await this.deleteFile(fileId);
                if (deleted) {
                    cleaned++;
                }
            }
        }

        return cleaned;
    }

    // Экспорт файлов пользователя
    async exportUserFiles(userId, format = 'json') {
        const userFiles = this.getUserFiles(userId);
        
        if (format === 'json') {
            const exportData = {
                user_id: userId,
                exported_at: new Date().toISOString(),
                files: userFiles.map(file => ({
                    id: file.id,
                    name: file.originalName,
                    type: file.mimeType,
                    size: file.size,
                    uploaded_at: new Date(file.uploaded_at).toISOString(),
                    description: file.description,
                    tags: file.tags
                }))
            };

            const exportFileName = `user_files_${userId}_${Date.now()}.json`;
            const exportPath = path.join(this.storageDir, 'exports', exportFileName);
            
            await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
            
            return {
                success: true,
                filePath: exportPath,
                fileName: exportFileName
            };
        }

        throw new Error(`Unsupported export format: ${format}`);
    }

    // Обработка очереди загрузок
    startQueueProcessor() {
        setInterval(async () => {
            if (!this.isProcessingQueue && this.downloadQueue.length > 0) {
                this.isProcessingQueue = true;
                await this.processDownloadQueue();
                this.isProcessingQueue = false;
            }
        }, 1000);
    }

    async processDownloadQueue() {
        while (this.downloadQueue.length > 0) {
            const downloadTask = this.downloadQueue.shift();
            
            try {
                const result = await this.downloadFromTelegram(
                    downloadTask.fileId,
                    downloadTask.userId,
                    downloadTask.botToken
                );
                
                if (downloadTask.callback) {
                    downloadTask.callback(result);
                }
                
            } catch (error) {
                console.error('Download queue processing error:', error);
                if (downloadTask.callback) {
                    downloadTask.callback({ success: false, error: error.message });
                }
            }
            
            // Небольшая задержка между загрузками
            await this.sleep(100);
        }
    }

    // Добавление в очередь загрузки
    addToDownloadQueue(fileId, userId, botToken, callback = null) {
        this.downloadQueue.push({
            fileId,
            userId,
            botToken,
            callback,
            queued_at: Date.now()
        });
    }

    // Определение MIME типа
    detectMimeType(buffer, fileName) {
        const ext = path.extname(fileName).toLowerCase();
        
        // Проверяем по сигнатуре файла
        if (buffer.length >= 4) {
            const signature = buffer.slice(0, 4);
            
            // PDF
            if (signature.toString() === '%PDF') {
                return 'application/pdf';
            }
            
            // DOCX/XLSX (ZIP signature)
            if (signature[0] === 0x50 && signature[1] === 0x4B) {
                if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }
            
            // JPEG
            if (signature[0] === 0xFF && signature[1] === 0xD8) {
                return 'image/jpeg';
            }
            
            // PNG
            if (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47) {
                return 'image/png';
            }
        }

        // Определяем по расширению
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.txt': 'text/plain',
            '.rtf': 'application/rtf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    // Получение расширения по MIME типу
    getExtensionFromMimeType(mimeType) {
        const extensions = {
            'application/pdf': '.pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/msword': '.doc',
            'text/plain': '.txt',
            'application/rtf': '.rtf',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
        };

        return extensions[mimeType] || '.bin';
    }

    // Получение подпапки по MIME типу
    getSubfolderByMimeType(mimeType) {
        if (mimeType.startsWith('image/')) {
            return 'images';
        } else if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) {
            return 'documents';
        } else {
            return 'temp';
        }
    }

    // Вычисление хеша файла
    calculateHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    // Генерация ID файла
    generateFileId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Утилита для задержки
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Форматирование размера файла
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Проверка доступного места
    async getStorageInfo() {
        try {
            const stats = await fs.stat(this.storageDir);
            const files = Array.from(this.files.values());
            
            return {
                total_files: files.length,
                total_size: files.reduce((sum, file) => sum + file.size, 0),
                storage_path: this.storageDir,
                max_file_size: this.maxFileSize,
                allowed_types: Array.from(this.allowedTypes)
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }
}

module.exports = FileManager;

