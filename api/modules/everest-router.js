// Everest Router - Handles all callback queries and routing
const {
    getMainMenu,
    getContractsMenu,
    getEverestPackageMenu,
    getINNMenu,
    getBillingMenu,
    getReportsMenu,
    getSettingsMenu,
    getHelpMenu,
    validateINN,
    routeCallback
} = require('./everest-menu');
const CounterpartyService = require('./counterparty-service');

class EverestRouter {
    constructor(bot) {
        this.bot = bot;
        this.userStates = new Map(); // Simple in-memory state storage
        this.counterpartyService = new CounterpartyService({ logger: console });
    }

    // Main routing handler
    async handleCallback(callbackQuery) {
        const { data } = callbackQuery;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        try {
            const route = routeCallback(data);
            if (!route) {
                await this.bot.answerCallbackQuery(callbackQuery.id, { text: "Неизвестная команда" });
                return;
            }

            const { module, action, params } = route;
            
            // Route to appropriate handler
            switch (module) {
                case 'home':
                    await this.handleHome(chatId, messageId);
                    break;
                case 'contracts':
                    await this.handleContracts(chatId, messageId, action, params);
                    break;
                case 'pkg':
                    await this.handlePackage(chatId, messageId, action, params);
                    break;
                case 'inn':
                    await this.handleINN(chatId, messageId, action, params);
                    break;
                case 'docs':
                    await this.handleDocs(chatId, messageId, action, params);
                    break;
                case 'reports':
                    await this.handleReports(chatId, messageId, action, params);
                    break;
                case 'settings':
                    await this.handleSettings(chatId, messageId, action, params);
                    break;
                case 'help':
                    await this.handleHelp(chatId, messageId, action, params);
                    break;
                case 'bill':
                    await this.handleBilling(chatId, messageId, action, params);
                    break;
                case 'act':
                    await this.handleActs(chatId, messageId, action, params);
                    break;
                default:
                    await this.bot.answerCallbackQuery(callbackQuery.id, { text: "Модуль в разработке" });
                    return;
            }

            await this.bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Router error:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, { text: "Произошла ошибка" });
        }
    }

    // Home handler
    async handleHome(chatId, messageId) {
        await this.bot.editMessageText(
            "Главное меню «Ева — Эверест»",
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: getMainMenu()
            }
        );
    }

    // Contracts handlers
    async handleContracts(chatId, messageId, action, params) {
        switch (action) {
            case 'menu':
                await this.bot.editMessageText(
                    "🧾 Договоры",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getContractsMenu()
                    }
                );
                break;
            case 'analyze':
                await this.bot.editMessageText(
                    "📄 Анализ договора\n\nПришлите файл договора (DOCX/PDF). Я извлеку параметры и проанализирую риски.",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:contracts:menu" }]] }
                    }
                );
                this.userStates.set(chatId, { state: 'awaiting_contract_file', action: 'analyze' });
                break;
            case 'redline':
                await this.bot.editMessageText(
                    "✏️ Редактирование договора\n\nПришлите файл договора для внесения правок.",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:contracts:menu" }]] }
                    }
                );
                this.userStates.set(chatId, { state: 'awaiting_contract_file', action: 'redline' });
                break;
            case 'protocol':
                await this.bot.editMessageText(
                    "📝 Протокол разногласий\n\nПришлите файл договора для формирования протокола разногласий.",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:contracts:menu" }]] }
                    }
                );
                this.userStates.set(chatId, { state: 'awaiting_contract_file', action: 'protocol' });
                break;
            case 'extract':
                await this.bot.editMessageText(
                    "🔍 Извлечение параметров\n\nПришлите файл договора для извлечения ключевых параметров и рисков.",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:contracts:menu" }]] }
                    }
                );
                this.userStates.set(chatId, { state: 'awaiting_contract_file', action: 'extract' });
                break;
        }
    }

    // Package handlers
    async handlePackage(chatId, messageId, action, params) {
        switch (action) {
            case 'menu':
                await this.bot.editMessageText(
                    "📚 Пакет «Эверест»",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getEverestPackageMenu()
                    }
                );
                break;
            case 'supply':
                await this.bot.editMessageText(
                    "📄 Договор поставки\n\nГенерирую шаблон договора поставки по стандартам «Эверест»...",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:pkg:menu" }]] }
                    }
                );
                // TODO: Generate supply contract
                break;
            case 'spec':
                await this.bot.editMessageText(
                    "📋 Спецификация\n\nСоздаю спецификацию к договору поставки...",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:pkg:menu" }]] }
                    }
                );
                // TODO: Generate specification
                break;
            case 'prot':
                await this.bot.editMessageText(
                    "📝 Протокол разногласий\n\nФормирую протокол разногласий...",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:pkg:menu" }]] }
                    }
                );
                // TODO: Generate protocol
                break;
            case 'wizard':
                await this.bot.editMessageText(
                    "🧙‍♂️ Мастер сборки комплекта\n\nСоберу полный пакет документов: Договор + Спецификация + Протокол разногласий.\n\nВведите основные параметры сделки:",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:pkg:menu" }]] }
                    }
                );
                this.userStates.set(chatId, { state: 'pkg_wizard_step1' });
                break;
        }
    }

    // INN handlers
    async handleINN(chatId, messageId, action, params) {
        switch (action) {
            case 'prompt':
                await this.bot.editMessageText(
                    "🔎 Проверка контрагента",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getINNMenu()
                    }
                );
                break;
            case 'input':
                await this.bot.editMessageText(
                    "🔢 Ввод ИНН\n\nВведите ИНН контрагента (10 или 12 цифр):",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:inn:prompt" }]] }
                    }
                );
                this.userStates.set(chatId, { state: 'awaiting_inn' });
                break;
            case 'history':
                await this.bot.editMessageText(
                    "📊 История проверок\n\nПоследние проверки контрагентов:\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:inn:prompt" }]] }
                    }
                );
                break;
            case 'to_crm':
                await this.bot.editMessageText(
                    "💾 Сохранение в CRM\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:inn:prompt" }]] }
                    }
                );
                break;
        }
    }

    // Docs handlers
    async handleDocs(chatId, messageId, action, params) {
        switch (action) {
            case 'billing':
                await this.bot.editMessageText(
                    "💳 Счёт/акты",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getBillingMenu()
                    }
                );
                break;
        }
    }

    // Billing handlers
    async handleBilling(chatId, messageId, action, params) {
        switch (action) {
            case 'new':
                await this.bot.editMessageText(
                    "🧾 Новый счёт\n\nВведите данные для выставления счёта:\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:docs:billing" }]] }
                    }
                );
                break;
            case 'send':
                await this.bot.editMessageText(
                    "📧 Отправка счёта\n\nВведите email для отправки:\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:docs:billing" }]] }
                    }
                );
                break;
        }
    }

    // Acts handlers
    async handleActs(chatId, messageId, action, params) {
        switch (action) {
            case 'new':
                await this.bot.editMessageText(
                    "📋 Новый акт\n\nВведите данные для формирования акта:\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:docs:billing" }]] }
                    }
                );
                break;
        }
    }

    // Reports handlers
    async handleReports(chatId, messageId, action, params) {
        switch (action) {
            case 'menu':
                await this.bot.editMessageText(
                    "📈 Статусы и отчёты",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getReportsMenu()
                    }
                );
                break;
            case 'open':
                await this.bot.editMessageText(
                    "🔄 Задачи в работе\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:reports:menu" }]] }
                    }
                );
                break;
            case 'done':
                await this.bot.editMessageText(
                    "✅ Завершённые задачи\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:reports:menu" }]] }
                    }
                );
                break;
            case 'errors':
                await this.bot.editMessageText(
                    "❌ Ошибки и исключения\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:reports:menu" }]] }
                    }
                );
                break;
        }
    }

    // Settings handlers
    async handleSettings(chatId, messageId, action, params) {
        switch (action) {
            case 'menu':
                await this.bot.editMessageText(
                    "⚙️ Настройки",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getSettingsMenu()
                    }
                );
                break;
            case 'fmt':
                await this.bot.editMessageText(
                    "📄 Формат документов\n\nТекущий формат: DOCX\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:settings:menu" }]] }
                    }
                );
                break;
            case 'sign':
                await this.bot.editMessageText(
                    "✍️ Подписи и реквизиты\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:settings:menu" }]] }
                    }
                );
                break;
            case 'int': {
                const status = await this.counterpartyService.getIntegrationStatus();
                await this.bot.editMessageText(
                    this.formatIntegrationStatus(status),
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:settings:menu" }]] },
                        parse_mode: 'Markdown'
                    }
                );
                break;
            }
            case 'notif':
                await this.bot.editMessageText(
                    "🔔 Уведомления\n\n(Функция в разработке)",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:settings:menu" }]] }
                    }
                );
                break;
        }
    }

    // Help handlers
    async handleHelp(chatId, messageId, action, params) {
        switch (action) {
            case 'menu':
                await this.bot.editMessageText(
                    "🆘 Помощь",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: getHelpMenu()
                    }
                );
                break;
            case 'upload':
                await this.bot.editMessageText(
                    "📤 Как загрузить договор\n\n1. Выберите раздел 'Договоры'\n2. Нажмите нужное действие\n3. Отправьте файл в формате DOCX или PDF\n4. Дождитесь обработки",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:help:menu" }]] }
                    }
                );
                break;
            case 'cmds':
                await this.bot.editMessageText(
                    "🏷️ Команды и теги\n\n/start - Главное меню\n/help - Помощь\n\nДля проверки ИНН просто отправьте 10 или 12 цифр",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [[{ text: "← Назад", callback_data: "eva:help:menu" }]] }
                    }
                );
                break;
        }
    }

    // Handle text messages (INN, etc.)
    async handleTextMessage(message) {
        const chatId = message.chat.id;
        const text = message.text;
        const userState = this.userStates.get(chatId);

        // Check if it's an INN
        if (/^\d{10}(\d{2})?$/.test(text)) {
            const validation = validateINN(text);
            if (!validation.valid) {
                await this.bot.sendMessage(chatId, `❌ ИНН некорректен: ${validation.error}\n\nПовторите ввод (10 или 12 цифр).`);
                return;
            }

            await this.bot.sendMessage(chatId, `✅ ИНН принят: \`${text}\`\n\n🔍 Запускаю проверку контрагента...`, { parse_mode: 'Markdown' });

            try {
                const result = await this.counterpartyService.lookupByInn(text);
                await this.bot.sendMessage(
                    chatId,
                    this.counterpartyService.formatReport(result),
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'eva:home' }]]
                        }
                    }
                );
            } catch (error) {
                console.error('INN lookup failed:', error);
                await this.bot.sendMessage(chatId, '❌ Не удалось получить данные по контрагенту. Попробуйте позже.', {
                    reply_markup: {
                        inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'eva:home' }]]
                    }
                });
            }

            return;
        }

        // Handle other states
        if (userState) {
            switch (userState.state) {
                case 'awaiting_inn':
                    const validation = validateINN(text);
                    if (!validation.valid) {
                        await this.bot.sendMessage(chatId, `❌ ИНН некорректен: ${validation.error}\n\nПовторите ввод (10 или 12 цифр).`);
                        return;
                    }
                    // Process INN as above
                    break;
                default:
                    await this.bot.sendMessage(chatId, "Используйте меню для навигации.", {
                        reply_markup: { inline_keyboard: [[{ text: "🏠 Главное меню", callback_data: "eva:home" }]] }
                    });
            }
        }
    }

    // Get user state
    getUserState(chatId) {
        return this.userStates.get(chatId);
    }

    // Set user state
    setUserState(chatId, state) {
        this.userStates.set(chatId, state);
    }

    // Clear user state
    clearUserState(chatId) {
        this.userStates.delete(chatId);
}

    formatIntegrationStatus(status) {
        const bitrix = status.bitrix || {};
        const dadata = status.dadata || {};
        const lines = [
            '🔗 *Интеграции*',
            '',
            `Bitrix24: ${bitrix.connected ? '✅ Подключен' : '⚠️ Не подключен'}`
        ];

        if (bitrix.details) {
            lines.push(`• ${bitrix.details}`);
        }
        if (bitrix.lastSync) {
            lines.push(`• Последняя синхронизация: ${new Date(bitrix.lastSync).toLocaleString('ru-RU')}`);
        }

        lines.push('', `DaData: ${dadata.connected ? '✅ Подключена' : '⚠️ Не подключена'}`);
        if (dadata.details) {
            lines.push(`• ${dadata.details}`);
        }
        if (dadata.balance !== undefined && dadata.balance !== null) {
            lines.push(`• Баланс: ${dadata.balance}`);
        }
        if (dadata.lastSuccess) {
            lines.push(`• Последний успешный запрос: ${new Date(dadata.lastSuccess).toLocaleString('ru-RU')}`);
        }

        lines.push('', `_Источник: ${status.source === 'mcp' ? 'MCP сервер' : 'Локальная конфигурация'}_`);
        return lines.join('\n');
    }
}

module.exports = EverestRouter;

