const Joi = require('joi');
const { PROJECT_STATUS, PRIORITY } = require('../utils/constants');

/**
 * Esquemas de validación para proyectos
 */

// Esquema para creación de proyecto
const createProjectSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(200)
        .required()
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 200 caracteres',
            'any.required': 'El nombre es requerido',
        }),

    description: Joi.string()
        .max(1000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'La descripción no puede tener más de 1000 caracteres',
        }),

    areaId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
            'any.required': 'El área es requerida',
        }),

    priority: Joi.string()
        .valid(...Object.values(PRIORITY))
        .default(PRIORITY.MEDIUM)
        .messages({
            'any.only': 'La prioridad debe ser LOW, MEDIUM, HIGH o URGENT',
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

    estimatedHours: Joi.number()
        .positive()
        .precision(2)
        .max(99999.99)
        .messages({
            'number.base': 'Las horas estimadas deben ser un número',
            'number.positive': 'Las horas estimadas deben ser positivas',
            'number.precision': 'Las horas estimadas pueden tener máximo 2 decimales',
            'number.max': 'Las horas estimadas no pueden ser mayores a 99999.99',
        }),
});

// Esquema para actualización de proyecto
const updateProjectSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(200)
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 200 caracteres',
        }),

    description: Joi.string()
        .max(1000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'La descripción no puede tener más de 1000 caracteres',
        }),

    status: Joi.string()
        .valid(...Object.values(PROJECT_STATUS))
        .messages({
            'any.only': 'El estado debe ser ACTIVE, ON_HOLD, COMPLETED o CANCELLED',
        }),

    priority: Joi.string()
        .valid(...Object.values(PRIORITY))
        .messages({
            'any.only': 'La prioridad debe ser LOW, MEDIUM, HIGH o URGENT',
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

    estimatedHours: Joi.number()
        .positive()
        .precision(2)
        .max(99999.99)
        .messages({
            'number.base': 'Las horas estimadas deben ser un número',
            'number.positive': 'Las horas estimadas deben ser positivas',
            'number.precision': 'Las horas estimadas pueden tener máximo 2 decimales',
            'number.max': 'Las horas estimadas no pueden ser mayores a 99999.99',
        }),

    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),
});

// Esquema para asignación de proyecto
const assignProjectSchema = Joi.object({
    userId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del usuario debe ser un UUID válido',
            'any.required': 'El ID del usuario es requerido',
        }),
});

// Esquema para filtros de búsqueda de proyectos
const projectFiltersSchema = Joi.object({
    areaId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
        }),

    status: Joi.string()
        .valid(...Object.values(PROJECT_STATUS))
        .messages({
            'any.only': 'El estado debe ser ACTIVE, ON_HOLD, COMPLETED o CANCELLED',
        }),

    priority: Joi.string()
        .valid(...Object.values(PRIORITY))
        .messages({
            'any.only': 'La prioridad debe ser LOW, MEDIUM, HIGH o URGENT',
        }),

    assignedToMe: Joi.boolean()
        .messages({
            'boolean.base': 'assignedToMe debe ser verdadero o falso',
        }),

    createdBy: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del creador debe ser un UUID válido',
        }),

    search: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .messages({
            'string.min': 'La búsqueda debe tener al menos 2 caracteres',
            'string.max': 'La búsqueda no puede tener más de 100 caracteres',
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
});

// Esquema para validación de ID de proyecto
const projectIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del proyecto debe ser un UUID válido',
            'any.required': 'El ID del proyecto es requerido',
        }),
});

// Esquema para estadísticas de proyecto
const projectStatsSchema = Joi.object({
    includeTasks: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'includeTasks debe ser verdadero o falso',
        }),

    includeTimeEntries: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'includeTimeEntries debe ser verdadero o falso',
        }),

    includeAssignments: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'includeAssignments debe ser verdadero o falso',
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
});

module.exports = {
    createProjectSchema,
    updateProjectSchema,
    assignProjectSchema,
    projectFiltersSchema,
    projectIdSchema,
    projectStatsSchema,
};
