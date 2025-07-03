const Joi = require('joi');

/**
 * Esquemas de validación para áreas
 */

// Esquema para creación de área
const createAreaSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_]+$/)
        .required()
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 100 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras, números, espacios, guiones y guiones bajos',
            'any.required': 'El nombre es requerido',
        }),

    description: Joi.string()
        .max(500)
        .allow('')
        .trim()
        .messages({
            'string.max': 'La descripción no puede tener más de 500 caracteres',
        }),

    color: Joi.string()
        .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .default('#2563EB')
        .messages({
            'string.pattern.base': 'El color debe ser un código hexadecimal válido (ej: #2563EB)',
        }),
});

// Esquema para actualización de área
const updateAreaSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_]+$/)
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 100 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras, números, espacios, guiones y guiones bajos',
        }),

    description: Joi.string()
        .max(500)
        .allow('')
        .trim()
        .messages({
            'string.max': 'La descripción no puede tener más de 500 caracteres',
        }),

    color: Joi.string()
        .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .messages({
            'string.pattern.base': 'El color debe ser un código hexadecimal válido (ej: #2563EB)',
        }),

    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),
});

// Esquema para filtros de búsqueda de áreas
const areaFiltersSchema = Joi.object({
    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),

    search: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .messages({
            'string.min': 'La búsqueda debe tener al menos 2 caracteres',
            'string.max': 'La búsqueda no puede tener más de 100 caracteres',
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

// Esquema para validación de ID de área
const areaIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
            'any.required': 'El ID del área es requerido',
        }),
});

// Esquema para estadísticas de área
const areaStatsSchema = Joi.object({
    includeProjects: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'includeProjects debe ser verdadero o falso',
        }),

    includeUsers: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'includeUsers debe ser verdadero o falso',
        }),

    includeTimeEntries: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'includeTimeEntries debe ser verdadero o falso',
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
    createAreaSchema,
    updateAreaSchema,
    areaFiltersSchema,
    areaIdSchema,
    areaStatsSchema,
};
