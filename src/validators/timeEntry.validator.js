const Joi = require('joi');
const { LIMITS } = require('../utils/constants');

/**
 * Esquemas de validación para registros de tiempo
 */

// Esquema para creación de entrada de tiempo
const createTimeEntrySchema = Joi.object({
    projectId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del proyecto debe ser un UUID válido',
            'any.required': 'El proyecto es requerido',
        }),

    taskId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID de la tarea debe ser un UUID válido',
        }),

    date: Joi.date()
        .iso()
        .max('now')
        .required()
        .messages({
            'date.base': 'La fecha debe ser una fecha válida',
            'date.format': 'La fecha debe estar en formato ISO (YYYY-MM-DD)',
            'date.max': 'La fecha no puede ser futura',
            'any.required': 'La fecha es requerida',
        }),

    hours: Joi.number()
        .min(LIMITS.MIN_HOURS_PER_ENTRY)
        .max(LIMITS.MAX_HOURS_PER_DAY)
        .precision(2)
        .required()
        .messages({
            'number.base': 'Las horas deben ser un número',
            'number.min': `Las horas mínimas son ${LIMITS.MIN_HOURS_PER_ENTRY}`,
            'number.max': `Las horas máximas por día son ${LIMITS.MAX_HOURS_PER_DAY}`,
            'number.precision': 'Las horas pueden tener máximo 2 decimales',
            'any.required': 'Las horas son requeridas',
        }),

    description: Joi.string()
        .min(5)
        .max(LIMITS.MAX_DESCRIPTION_LENGTH)
        .required()
        .trim()
        .messages({
            'string.min': 'La descripción debe tener al menos 5 caracteres',
            'string.max': `La descripción no puede tener más de ${LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`,
            'any.required': 'La descripción es requerida',
        }),
});

// Esquema para actualización de entrada de tiempo
const updateTimeEntrySchema = Joi.object({
    projectId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del proyecto debe ser un UUID válido',
        }),

    taskId: Joi.string()
        .uuid()
        .allow(null)
        .messages({
            'string.uuid': 'El ID de la tarea debe ser un UUID válido',
        }),

    date: Joi.date()
        .iso()
        .max('now')
        .messages({
            'date.base': 'La fecha debe ser una fecha válida',
            'date.format': 'La fecha debe estar en formato ISO (YYYY-MM-DD)',
            'date.max': 'La fecha no puede ser futura',
        }),

    hours: Joi.number()
        .min(LIMITS.MIN_HOURS_PER_ENTRY)
        .max(LIMITS.MAX_HOURS_PER_DAY)
        .precision(2)
        .messages({
            'number.base': 'Las horas deben ser un número',
            'number.min': `Las horas mínimas son ${LIMITS.MIN_HOURS_PER_ENTRY}`,
            'number.max': `Las horas máximas por día son ${LIMITS.MAX_HOURS_PER_DAY}`,
            'number.precision': 'Las horas pueden tener máximo 2 decimales',
        }),

    description: Joi.string()
        .min(5)
        .max(LIMITS.MAX_DESCRIPTION_LENGTH)
        .trim()
        .messages({
            'string.min': 'La descripción debe tener al menos 5 caracteres',
            'string.max': `La descripción no puede tener más de ${LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`,
        }),
});

// Esquema para aprobación de entradas de tiempo
const approveTimeEntrySchema = Joi.object({
    isApproved: Joi.boolean()
        .required()
        .messages({
            'boolean.base': 'El estado de aprobación debe ser verdadero o falso',
            'any.required': 'El estado de aprobación es requerido',
        }),

    comments: Joi.string()
        .max(500)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Los comentarios no pueden tener más de 500 caracteres',
        }),
});

// Esquema para filtros de búsqueda de entradas de tiempo
const timeEntryFiltersSchema = Joi.object({
    userId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del usuario debe ser un UUID válido',
        }),

    projectId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del proyecto debe ser un UUID válido',
        }),

    taskId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID de la tarea debe ser un UUID válido',
        }),

    timePeriodId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del período debe ser un UUID válido',
        }),

    startDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'La fecha de inicio debe ser una fecha válida',
            'date.format': 'La fecha de inicio debe estar en formato ISO (YYYY-MM-DD)',
        }),

    endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .messages({
            'date.base': 'La fecha de fin debe ser una fecha válida',
            'date.format': 'La fecha de fin debe estar en formato ISO (YYYY-MM-DD)',
            'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio',
        }),

    isApproved: Joi.boolean()
        .messages({
            'boolean.base': 'El estado de aprobación debe ser verdadero o falso',
        }),

    pendingApproval: Joi.boolean()
        .messages({
            'boolean.base': 'pendingApproval debe ser verdadero o falso',
        }),

    myEntries: Joi.boolean()
        .messages({
            'boolean.base': 'myEntries debe ser verdadero o falso',
        }),

    minHours: Joi.number()
        .min(0)
        .precision(2)
        .messages({
            'number.base': 'Las horas mínimas deben ser un número',
            'number.min': 'Las horas mínimas deben ser mayor o igual a 0',
            'number.precision': 'Las horas pueden tener máximo 2 decimales',
        }),

    maxHours: Joi.number()
        .min(Joi.ref('minHours'))
        .max(LIMITS.MAX_HOURS_PER_DAY)
        .precision(2)
        .messages({
            'number.base': 'Las horas máximas deben ser un número',
            'number.min': 'Las horas máximas deben ser mayores a las mínimas',
            'number.max': `Las horas máximas no pueden exceder ${LIMITS.MAX_HOURS_PER_DAY}`,
            'number.precision': 'Las horas pueden tener máximo 2 decimales',
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'La página debe ser un número',
            'number.integer': 'La página debe ser un número entero',
            'number.min': 'La página debe ser mayor a 0',
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .messages({
            'number.base': 'El límite debe ser un número',
            'number.integer': 'El límite debe ser un número entero',
            'number.min': 'El límite debe ser mayor a 0',
            'number.max': 'El límite no puede ser mayor a 100',
        }),

    sortBy: Joi.string()
        .valid('date', 'hours', 'createdAt', 'project', 'user')
        .default('date')
        .messages({
            'any.only': 'El ordenamiento debe ser por date, hours, createdAt, project o user',
        }),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .messages({
            'any.only': 'El orden debe ser asc o desc',
        }),
});

// Esquema para validación de ID de entrada de tiempo
const timeEntryIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID de la entrada de tiempo debe ser un UUID válido',
            'any.required': 'El ID de la entrada de tiempo es requerido',
        }),
});

// Esquema para reporte de tiempo
const timeReportSchema = Joi.object({
    startDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'La fecha de inicio debe ser una fecha válida',
            'date.format': 'La fecha de inicio debe estar en formato ISO (YYYY-MM-DD)',
            'any.required': 'La fecha de inicio es requerida',
        }),

    endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .required()
        .messages({
            'date.base': 'La fecha de fin debe ser una fecha válida',
            'date.format': 'La fecha de fin debe estar en formato ISO (YYYY-MM-DD)',
            'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio',
            'any.required': 'La fecha de fin es requerida',
        }),

    groupBy: Joi.string()
        .valid('user', 'project', 'area', 'day', 'week', 'month')
        .default('user')
        .messages({
            'any.only': 'La agrupación debe ser por user, project, area, day, week o month',
        }),

    includeDetails: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'includeDetails debe ser verdadero o falso',
        }),

    includeApprovalStatus: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'includeApprovalStatus debe ser verdadero o falso',
        }),

    onlyApproved: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'onlyApproved debe ser verdadero o falso',
        }),

    userIds: Joi.array()
        .items(Joi.string().uuid())
        .messages({
            'array.base': 'userIds debe ser un array',
            'string.uuid': 'Cada ID de usuario debe ser un UUID válido',
        }),

    projectIds: Joi.array()
        .items(Joi.string().uuid())
        .messages({
            'array.base': 'projectIds debe ser un array',
            'string.uuid': 'Cada ID de proyecto debe ser un UUID válido',
        }),

    areaIds: Joi.array()
        .items(Joi.string().uuid())
        .messages({
            'array.base': 'areaIds debe ser un array',
            'string.uuid': 'Cada ID de área debe ser un UUID válido',
        }),
});

// Esquema para importación masiva de entradas de tiempo
const bulkImportTimeEntriesSchema = Joi.object({
    entries: Joi.array()
        .items(createTimeEntrySchema)
        .min(1)
        .max(100)
        .required()
        .messages({
            'array.base': 'Las entradas deben ser un array',
            'array.min': 'Debe haber al menos 1 entrada',
            'array.max': 'No se pueden importar más de 100 entradas a la vez',
            'any.required': 'Las entradas son requeridas',
        }),

    skipDuplicates: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'skipDuplicates debe ser verdadero o falso',
        }),

    validatePeriods: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'validatePeriods debe ser verdadero o falso',
        }),
});

module.exports = {
    createTimeEntrySchema,
    updateTimeEntrySchema,
    approveTimeEntrySchema,
    timeEntryFiltersSchema,
    timeEntryIdSchema,
    timeReportSchema,
    bulkImportTimeEntriesSchema,
};
