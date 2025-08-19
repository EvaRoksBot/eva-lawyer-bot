// Everest Menu Framework for Eva Lawyer Bot
// Adapted from aiogram specification to Node.js

// Callback data helper (max 64 bytes)
function cb(route) {
    return route.slice(0, 64);
}

// Main Everest menu structure
function getMainMenu() {
    return {
        inline_keyboard: [
            [
                { text: "🧾 Договоры", callback_data: cb("eva:contracts:menu") },
                { text: "📚 Пакет «Эверест»", callback_data: cb("eva:pkg:menu") }
            ],
            [
                { text: "🔎 Проверка контрагента (ИНН)", callback_data: cb("eva:inn:prompt") }
            ],
            [
                { text: "💳 Счёт/акты", callback_data: cb("eva:docs:billing") },
                { text: "📈 Статусы и отчёты", callback_data: cb("eva:reports:menu") }
            ],
            [
                { text: "⚙️ Настройки", callback_data: cb("eva:settings:menu") },
                { text: "🆘 Помощь", callback_data: cb("eva:help:menu") }
            ]
        ]
    };
}

// Contracts submenu
function getContractsMenu() {
    return {
        inline_keyboard: [
            [
                { text: "Загрузить и проанализировать", callback_data: cb("eva:contracts:analyze") }
            ],
            [
                { text: "Вставить правки (редлайн)", callback_data: cb("eva:contracts:redline") }
            ],
            [
                { text: "Сформировать протокол разногласий", callback_data: cb("eva:contracts:protocol") }
            ],
            [
                { text: "Вытащить параметры/риски", callback_data: cb("eva:contracts:extract") }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Everest package submenu
function getEverestPackageMenu() {
    return {
        inline_keyboard: [
            [
                { text: "Договор поставки (шаблон)", callback_data: cb("eva:pkg:supply") }
            ],
            [
                { text: "Спецификация", callback_data: cb("eva:pkg:spec") }
            ],
            [
                { text: "Протокол разногласий", callback_data: cb("eva:pkg:prot") }
            ],
            [
                { text: "Сборка комплекта (3 в 1)", callback_data: cb("eva:pkg:wizard") }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// INN check submenu
function getINNMenu() {
    return {
        inline_keyboard: [
            [
                { text: "Ввести ИНН", callback_data: cb("eva:inn:input") }
            ],
            [
                { text: "История проверок", callback_data: cb("eva:inn:history") }
            ],
            [
                { text: "Сохранить в CRM", callback_data: cb("eva:inn:to_crm") }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Billing submenu
function getBillingMenu() {
    return {
        inline_keyboard: [
            [
                { text: "Выставить счёт", callback_data: cb("eva:bill:new") }
            ],
            [
                { text: "Сформировать акт", callback_data: cb("eva:act:new") }
            ],
            [
                { text: "Отправить на e-mail", callback_data: cb("eva:bill:send") }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Reports submenu
function getReportsMenu() {
    return {
        inline_keyboard: [
            [
                { text: "В работе", callback_data: cb("eva:reports:open") }
            ],
            [
                { text: "Завершено", callback_data: cb("eva:reports:done") }
            ],
            [
                { text: "Ошибки/исключения", callback_data: cb("eva:reports:errors") }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Settings submenu
function getSettingsMenu() {
    return {
        inline_keyboard: [
            [
                { text: "Формат документов (DOCX/PDF)", callback_data: cb("eva:settings:fmt") }
            ],
            [
                { text: "Подписи/реквизиты", callback_data: cb("eva:settings:sign") }
            ],
            [
                { text: "Интеграции (Bitrix24, DaData)", callback_data: cb("eva:settings:int") }
            ],
            [
                { text: "Уведомления", callback_data: cb("eva:settings:notif") }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// Help submenu
function getHelpMenu() {
    return {
        inline_keyboard: [
            [
                { text: "Как загрузить договор", callback_data: cb("eva:help:upload") }
            ],
            [
                { text: "Теги и команды", callback_data: cb("eva:help:cmds") }
            ],
            [
                { text: "Поддержка", url: "https://t.me/everest_support" }
            ],
            [
                { text: "← Назад", callback_data: cb("eva:home") }
            ]
        ]
    };
}

// INN validation (official algorithm)
function validateINN(inn) {
    if (!inn || typeof inn !== 'string' || !/^\d+$/.test(inn)) {
        return { valid: false, error: "только цифры" };
    }

    if (inn.length === 10) {
        // Legal entity: one control digit
        const coeff = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        const ctrl = coeff.reduce((sum, c, i) => sum + parseInt(inn[i]) * c, 0) % 11 % 10;
        const valid = ctrl === parseInt(inn[9]);
        return { valid, error: valid ? null : "ошибка контрольного числа (10)" };
    } else if (inn.length === 12) {
        // Individual: two control digits
        const coeff1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
        const coeff2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
        
        const n11 = coeff1.reduce((sum, c, i) => sum + parseInt(inn[i]) * c, 0) % 11 % 10;
        const n12 = coeff2.reduce((sum, c, i) => sum + parseInt(inn[i]) * c, 0) % 11 % 10;
        
        const valid = n11 === parseInt(inn[10]) && n12 === parseInt(inn[11]);
        return { valid, error: valid ? null : "ошибка контрольных чисел (12)" };
    } else {
        return { valid: false, error: "длина должна быть 10 (юрлицо) или 12 (ФЛ/ИП)" };
    }
}

// Deep linking support
function parseDeepLink(startParam) {
    if (!startParam) return null;
    
    try {
        // Handle base64url encoded payloads
        const decoded = Buffer.from(startParam, 'base64url').toString('utf-8');
        return decoded;
    } catch {
        // Handle plain text payloads
        return startParam;
    }
}

function handleDeepLink(payload) {
    if (payload.startsWith('inn_')) {
        const inn = payload.replace('inn_', '');
        return { action: 'inn_check', data: inn };
    }
    
    if (payload === 'pkg_wizard') {
        return { action: 'pkg_wizard', data: null };
    }
    
    return null;
}

// Router for callback queries
function routeCallback(callbackData) {
    const parts = callbackData.split(':');
    if (parts.length < 3 || parts[0] !== 'eva') {
        return null;
    }
    
    const [prefix, module, action, ...params] = parts;
    return { module, action, params: params.join(':') };
}

module.exports = {
    cb,
    getMainMenu,
    getContractsMenu,
    getEverestPackageMenu,
    getINNMenu,
    getBillingMenu,
    getReportsMenu,
    getSettingsMenu,
    getHelpMenu,
    validateINN,
    parseDeepLink,
    handleDeepLink,
    routeCallback
};

