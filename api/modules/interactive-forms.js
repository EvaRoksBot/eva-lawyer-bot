// Interactive Forms Module for Eva Lawyer Bot
// Advanced form handling with validation, multi-step flows, and dynamic fields

class InteractiveForms {
    constructor() {
        this.forms = new Map(); // formId -> form config
        this.userForms = new Map(); // userId -> current form data
        this.formTemplates = new Map(); // templateId -> template
        this.validators = new Map(); // validatorId -> validator function
        this.fieldTypes = new Map(); // fieldType -> field handler
        
        this.initializeValidators();
        this.initializeFieldTypes();
        this.initializeFormTemplates();
    }

    // Инициализация валидаторов
    initializeValidators() {
        // Валидатор ИНН
        this.addValidator('inn', (value) => {
            const cleanInn = value.replace(/\D/g, '');
            if (cleanInn.length !== 10 && cleanInn.length !== 12) {
                return { valid: false, error: 'ИНН должен содержать 10 или 12 цифр' };
            }
            return { valid: true };
        });

        // Валидатор email
        this.addValidator('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { valid: false, error: 'Некорректный формат email' };
            }
            return { valid: true };
        });

        // Валидатор телефона
        this.addValidator('phone', (value) => {
            const phoneRegex = /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                return { valid: false, error: 'Некорректный формат телефона' };
            }
            return { valid: true };
        });

        // Валидатор даты
        this.addValidator('date', (value) => {
            const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
            const match = value.match(dateRegex);
            if (!match) {
                return { valid: false, error: 'Дата должна быть в формате ДД.ММ.ГГГГ' };
            }
            
            const [, day, month, year] = match;
            const date = new Date(year, month - 1, day);
            if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
                return { valid: false, error: 'Некорректная дата' };
            }
            
            return { valid: true };
        });

        // Валидатор суммы
        this.addValidator('amount', (value) => {
            const amount = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
            if (isNaN(amount) || amount < 0) {
                return { valid: false, error: 'Некорректная сумма' };
            }
            return { valid: true, value: amount };
        });

        // Валидатор обязательного поля
        this.addValidator('required', (value) => {
            if (!value || value.trim().length === 0) {
                return { valid: false, error: 'Поле обязательно для заполнения' };
            }
            return { valid: true };
        });

        // Валидатор длины
        this.addValidator('length', (value, min = 0, max = 1000) => {
            if (value.length < min) {
                return { valid: false, error: `Минимальная длина: ${min} символов` };
            }
            if (value.length > max) {
                return { valid: false, error: `Максимальная длина: ${max} символов` };
            }
            return { valid: true };
        });
    }

    // Инициализация типов полей
    initializeFieldTypes() {
        // Текстовое поле
        this.addFieldType('text', {
            render: (field) => this.renderTextField(field),
            process: (field, value) => this.processTextField(field, value)
        });

        // Поле выбора
        this.addFieldType('select', {
            render: (field) => this.renderSelectField(field),
            process: (field, value) => this.processSelectField(field, value)
        });

        // Множественный выбор
        this.addFieldType('multiselect', {
            render: (field) => this.renderMultiSelectField(field),
            process: (field, value) => this.processMultiSelectField(field, value)
        });

        // Поле даты
        this.addFieldType('date', {
            render: (field) => this.renderDateField(field),
            process: (field, value) => this.processDateField(field, value)
        });

        // Поле файла
        this.addFieldType('file', {
            render: (field) => this.renderFileField(field),
            process: (field, value) => this.processFileField(field, value)
        });

        // Поле подтверждения
        this.addFieldType('confirm', {
            render: (field) => this.renderConfirmField(field),
            process: (field, value) => this.processConfirmField(field, value)
        });
    }

    // Инициализация шаблонов форм
    initializeFormTemplates() {
        // Форма создания договора
        this.addFormTemplate('contract_creation', {
            title: '📄 Создание договора',
            description: 'Заполните основные параметры договора',
            steps: [
                {
                    title: 'Основная информация',
                    fields: [
                        {
                            id: 'contract_type',
                            label: 'Тип договора',
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'supply', label: 'Поставка товаров' },
                                { value: 'service', label: 'Оказание услуг' },
                                { value: 'work', label: 'Выполнение работ' },
                                { value: 'lease', label: 'Аренда' },
                                { value: 'other', label: 'Другое' }
                            ]
                        },
                        {
                            id: 'contract_subject',
                            label: 'Предмет договора',
                            type: 'text',
                            required: true,
                            validators: ['required', 'length:10:500'],
                            placeholder: 'Опишите предмет договора'
                        }
                    ]
                },
                {
                    title: 'Стороны договора',
                    fields: [
                        {
                            id: 'customer_name',
                            label: 'Наименование заказчика',
                            type: 'text',
                            required: true,
                            validators: ['required']
                        },
                        {
                            id: 'customer_inn',
                            label: 'ИНН заказчика',
                            type: 'text',
                            required: true,
                            validators: ['required', 'inn']
                        },
                        {
                            id: 'executor_name',
                            label: 'Наименование исполнителя',
                            type: 'text',
                            required: true,
                            validators: ['required']
                        },
                        {
                            id: 'executor_inn',
                            label: 'ИНН исполнителя',
                            type: 'text',
                            required: true,
                            validators: ['required', 'inn']
                        }
                    ]
                },
                {
                    title: 'Финансовые условия',
                    fields: [
                        {
                            id: 'contract_amount',
                            label: 'Сумма договора',
                            type: 'text',
                            required: true,
                            validators: ['required', 'amount'],
                            placeholder: '1 000 000.00'
                        },
                        {
                            id: 'payment_terms',
                            label: 'Условия оплаты',
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'prepayment', label: 'Предоплата 100%' },
                                { value: 'prepayment_50', label: 'Предоплата 50%' },
                                { value: 'postpayment', label: 'Постоплата' },
                                { value: 'installments', label: 'Рассрочка' }
                            ]
                        }
                    ]
                },
                {
                    title: 'Сроки и условия',
                    fields: [
                        {
                            id: 'start_date',
                            label: 'Дата начала',
                            type: 'date',
                            required: true,
                            validators: ['required', 'date']
                        },
                        {
                            id: 'end_date',
                            label: 'Дата окончания',
                            type: 'date',
                            required: true,
                            validators: ['required', 'date']
                        },
                        {
                            id: 'special_conditions',
                            label: 'Особые условия',
                            type: 'text',
                            required: false,
                            validators: ['length:0:1000'],
                            placeholder: 'Дополнительные условия договора'
                        }
                    ]
                }
            ]
        });

        // Форма проверки контрагента
        this.addFormTemplate('counterparty_check', {
            title: '🔍 Проверка контрагента',
            description: 'Введите данные для комплексной проверки',
            steps: [
                {
                    title: 'Основные данные',
                    fields: [
                        {
                            id: 'company_inn',
                            label: 'ИНН организации',
                            type: 'text',
                            required: true,
                            validators: ['required', 'inn'],
                            placeholder: '7707083893'
                        },
                        {
                            id: 'check_type',
                            label: 'Тип проверки',
                            type: 'multiselect',
                            required: true,
                            options: [
                                { value: 'basic', label: 'Базовая информация' },
                                { value: 'financial', label: 'Финансовое состояние' },
                                { value: 'legal', label: 'Судебные дела' },
                                { value: 'bankruptcy', label: 'Банкротство' },
                                { value: 'debts', label: 'Задолженности' }
                            ]
                        }
                    ]
                },
                {
                    title: 'Дополнительные параметры',
                    fields: [
                        {
                            id: 'check_depth',
                            label: 'Глубина проверки',
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'express', label: 'Экспресс (5 мин)' },
                                { value: 'standard', label: 'Стандартная (15 мин)' },
                                { value: 'detailed', label: 'Детальная (30 мин)' }
                            ]
                        },
                        {
                            id: 'include_affiliates',
                            label: 'Проверить связанные компании',
                            type: 'confirm',
                            required: false,
                            default: false
                        }
                    ]
                }
            ]
        });

        // Форма настроек уведомлений
        this.addFormTemplate('notification_settings', {
            title: '🔔 Настройки уведомлений',
            description: 'Настройте получение уведомлений',
            steps: [
                {
                    title: 'Типы уведомлений',
                    fields: [
                        {
                            id: 'contract_reminders',
                            label: 'Напоминания о договорах',
                            type: 'confirm',
                            required: false,
                            default: true
                        },
                        {
                            id: 'law_updates',
                            label: 'Обновления законодательства',
                            type: 'confirm',
                            required: false,
                            default: true
                        },
                        {
                            id: 'counterparty_alerts',
                            label: 'Уведомления о контрагентах',
                            type: 'confirm',
                            required: false,
                            default: false
                        }
                    ]
                },
                {
                    title: 'Расписание',
                    fields: [
                        {
                            id: 'quiet_hours_start',
                            label: 'Начало тихих часов',
                            type: 'select',
                            required: true,
                            options: Array.from({ length: 24 }, (_, i) => ({
                                value: i.toString(),
                                label: `${i.toString().padStart(2, '0')}:00`
                            }))
                        },
                        {
                            id: 'quiet_hours_end',
                            label: 'Конец тихих часов',
                            type: 'select',
                            required: true,
                            options: Array.from({ length: 24 }, (_, i) => ({
                                value: i.toString(),
                                label: `${i.toString().padStart(2, '0')}:00`
                            }))
                        }
                    ]
                }
            ]
        });
    }

    // Добавление валидатора
    addValidator(validatorId, validator) {
        this.validators.set(validatorId, validator);
    }

    // Добавление типа поля
    addFieldType(typeId, handler) {
        this.fieldTypes.set(typeId, handler);
    }

    // Добавление шаблона формы
    addFormTemplate(templateId, template) {
        this.formTemplates.set(templateId, template);
    }

    // Создание формы из шаблона
    createForm(userId, templateId, initialData = {}) {
        const template = this.formTemplates.get(templateId);
        if (!template) {
            throw new Error(`Form template ${templateId} not found`);
        }

        const formId = this.generateId();
        const form = {
            id: formId,
            templateId,
            userId,
            title: template.title,
            description: template.description,
            steps: template.steps,
            currentStep: 0,
            data: { ...initialData },
            errors: {},
            created_at: Date.now(),
            updated_at: Date.now(),
            status: 'active'
        };

        this.forms.set(formId, form);
        this.userForms.set(userId, formId);

        return form;
    }

    // Рендеринг формы
    renderForm(formId) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error(`Form ${formId} not found`);
        }

        const currentStep = form.steps[form.currentStep];
        if (!currentStep) {
            return this.renderFormComplete(form);
        }

        let message = `📝 **${form.title}**\n`;
        message += `_${form.description}_\n\n`;

        // Прогресс
        const progress = Math.round(((form.currentStep + 1) / form.steps.length) * 100);
        message += `📊 **Прогресс:** ${progress}% (${form.currentStep + 1}/${form.steps.length})\n\n`;

        // Заголовок шага
        message += `**${currentStep.title}**\n\n`;

        // Поля текущего шага
        currentStep.fields.forEach((field, index) => {
            message += this.renderField(field, form.data[field.id], form.errors[field.id]);
            if (index < currentStep.fields.length - 1) {
                message += '\n\n';
            }
        });

        // Кнопки
        const keyboard = this.renderFormKeyboard(form, currentStep);

        return {
            text: message,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        };
    }

    // Рендеринг поля
    renderField(field, value, error) {
        const fieldType = this.fieldTypes.get(field.type);
        if (!fieldType) {
            throw new Error(`Field type ${field.type} not found`);
        }

        let fieldText = fieldType.render(field);

        // Добавляем текущее значение
        if (value !== undefined && value !== null) {
            fieldText += `\n💡 **Текущее значение:** ${this.formatFieldValue(field, value)}`;
        }

        // Добавляем ошибку
        if (error) {
            fieldText += `\n❌ **Ошибка:** ${error}`;
        }

        return fieldText;
    }

    // Рендеринг текстового поля
    renderTextField(field) {
        let text = `${field.required ? '📝*' : '📝'} **${field.label}**`;
        
        if (field.placeholder) {
            text += `\n_Пример: ${field.placeholder}_`;
        }

        return text;
    }

    // Рендеринг поля выбора
    renderSelectField(field) {
        let text = `${field.required ? '📋*' : '📋'} **${field.label}**`;
        
        text += '\n\nВарианты:';
        field.options.forEach((option, index) => {
            text += `\n${index + 1}. ${option.label}`;
        });

        return text;
    }

    // Рендеринг поля множественного выбора
    renderMultiSelectField(field) {
        let text = `${field.required ? '☑️*' : '☑️'} **${field.label}**`;
        
        text += '\n\nВарианты (можно выбрать несколько):';
        field.options.forEach((option, index) => {
            text += `\n${index + 1}. ${option.label}`;
        });

        return text;
    }

    // Рендеринг поля даты
    renderDateField(field) {
        let text = `${field.required ? '📅*' : '📅'} **${field.label}**`;
        text += '\n_Формат: ДД.ММ.ГГГГ_';
        return text;
    }

    // Рендеринг поля файла
    renderFileField(field) {
        let text = `${field.required ? '📎*' : '📎'} **${field.label}**`;
        text += '\n_Отправьте файл в следующем сообщении_';
        return text;
    }

    // Рендеринг поля подтверждения
    renderConfirmField(field) {
        return `${field.required ? '✅*' : '✅'} **${field.label}**`;
    }

    // Рендеринг клавиатуры формы
    renderFormKeyboard(form, currentStep) {
        const keyboard = { inline_keyboard: [] };

        // Кнопки для заполнения полей
        currentStep.fields.forEach((field, index) => {
            const buttonText = `✏️ ${field.label}`;
            keyboard.inline_keyboard.push([{
                text: buttonText,
                callback_data: `eva:form:field:${form.id}:${index}`
            }]);
        });

        // Навигационные кнопки
        const navRow = [];
        
        if (form.currentStep > 0) {
            navRow.push({
                text: '◀️ Назад',
                callback_data: `eva:form:prev:${form.id}`
            });
        }

        if (this.isStepComplete(form, currentStep)) {
            if (form.currentStep < form.steps.length - 1) {
                navRow.push({
                    text: 'Далее ▶️',
                    callback_data: `eva:form:next:${form.id}`
                });
            } else {
                navRow.push({
                    text: '✅ Завершить',
                    callback_data: `eva:form:complete:${form.id}`
                });
            }
        }

        navRow.push({
            text: '❌ Отмена',
            callback_data: `eva:form:cancel:${form.id}`
        });

        if (navRow.length > 0) {
            keyboard.inline_keyboard.push(navRow);
        }

        return keyboard;
    }

    // Проверка завершенности шага
    isStepComplete(form, step) {
        return step.fields.every(field => {
            if (!field.required) return true;
            const value = form.data[field.id];
            return value !== undefined && value !== null && value !== '';
        });
    }

    // Обработка ввода поля
    async processFieldInput(formId, fieldIndex, value) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error(`Form ${formId} not found`);
        }

        const currentStep = form.steps[form.currentStep];
        const field = currentStep.fields[fieldIndex];
        
        if (!field) {
            throw new Error(`Field ${fieldIndex} not found`);
        }

        // Валидация
        const validation = this.validateField(field, value);
        
        if (validation.valid) {
            // Сохраняем значение
            form.data[field.id] = validation.value || value;
            delete form.errors[field.id];
            form.updated_at = Date.now();
            
            return { success: true };
        } else {
            // Сохраняем ошибку
            form.errors[field.id] = validation.error;
            
            return { 
                success: false, 
                error: validation.error 
            };
        }
    }

    // Валидация поля
    validateField(field, value) {
        if (!field.validators) {
            return { valid: true };
        }

        for (const validatorConfig of field.validators) {
            let validatorId, params = [];
            
            if (typeof validatorConfig === 'string') {
                if (validatorConfig.includes(':')) {
                    [validatorId, ...params] = validatorConfig.split(':');
                } else {
                    validatorId = validatorConfig;
                }
            }

            const validator = this.validators.get(validatorId);
            if (!validator) {
                continue;
            }

            const result = validator(value, ...params);
            if (!result.valid) {
                return result;
            }

            // Если валидатор возвращает преобразованное значение
            if (result.value !== undefined) {
                value = result.value;
            }
        }

        return { valid: true, value };
    }

    // Переход к следующему шагу
    nextStep(formId) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error(`Form ${formId} not found`);
        }

        if (form.currentStep < form.steps.length - 1) {
            form.currentStep++;
            form.updated_at = Date.now();
            return true;
        }

        return false;
    }

    // Переход к предыдущему шагу
    prevStep(formId) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error(`Form ${formId} not found`);
        }

        if (form.currentStep > 0) {
            form.currentStep--;
            form.updated_at = Date.now();
            return true;
        }

        return false;
    }

    // Завершение формы
    completeForm(formId) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error(`Form ${formId} not found`);
        }

        // Финальная валидация всех полей
        const errors = {};
        let hasErrors = false;

        form.steps.forEach(step => {
            step.fields.forEach(field => {
                if (field.required && !form.data[field.id]) {
                    errors[field.id] = 'Поле обязательно для заполнения';
                    hasErrors = true;
                }
            });
        });

        if (hasErrors) {
            form.errors = errors;
            return { success: false, errors };
        }

        form.status = 'completed';
        form.completed_at = Date.now();
        this.userForms.delete(form.userId);

        return { success: true, data: form.data };
    }

    // Отмена формы
    cancelForm(formId) {
        const form = this.forms.get(formId);
        if (!form) {
            return false;
        }

        form.status = 'cancelled';
        form.cancelled_at = Date.now();
        this.userForms.delete(form.userId);
        this.forms.delete(formId);

        return true;
    }

    // Получение формы пользователя
    getUserForm(userId) {
        const formId = this.userForms.get(userId);
        return formId ? this.forms.get(formId) : null;
    }

    // Форматирование значения поля
    formatFieldValue(field, value) {
        if (field.type === 'select') {
            const option = field.options.find(opt => opt.value === value);
            return option ? option.label : value;
        } else if (field.type === 'multiselect') {
            const selectedOptions = field.options.filter(opt => value.includes(opt.value));
            return selectedOptions.map(opt => opt.label).join(', ');
        } else if (field.type === 'confirm') {
            return value ? 'Да' : 'Нет';
        }
        
        return value;
    }

    // Рендеринг завершенной формы
    renderFormComplete(form) {
        let message = `✅ **Форма "${form.title}" завершена**\n\n`;
        
        message += '📋 **Введенные данные:**\n\n';
        
        form.steps.forEach((step, stepIndex) => {
            message += `**${stepIndex + 1}. ${step.title}**\n`;
            
            step.fields.forEach(field => {
                const value = form.data[field.id];
                if (value !== undefined && value !== null && value !== '') {
                    message += `• ${field.label}: ${this.formatFieldValue(field, value)}\n`;
                }
            });
            
            message += '\n';
        });

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📄 Экспорт данных', callback_data: `eva:form:export:${form.id}` },
                    { text: '✏️ Редактировать', callback_data: `eva:form:edit:${form.id}` }
                ],
                [
                    { text: '🏠 Главное меню', callback_data: 'eva:main' }
                ]
            ]
        };

        return {
            text: message,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        };
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Получение статистики форм
    getFormsStats() {
        const forms = Array.from(this.forms.values());
        
        return {
            total_forms: forms.length,
            active_forms: forms.filter(f => f.status === 'active').length,
            completed_forms: forms.filter(f => f.status === 'completed').length,
            cancelled_forms: forms.filter(f => f.status === 'cancelled').length,
            templates: this.formTemplates.size,
            validators: this.validators.size,
            field_types: this.fieldTypes.size
        };
    }
}

module.exports = InteractiveForms;

