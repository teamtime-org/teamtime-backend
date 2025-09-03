const Joi = require('joi');

const timePeriodValidator = {
    create: Joi.object({
        year: Joi.number()
            .integer()
            .min(2020)
            .max(2050)
            .required()
            .messages({
                'number.base': 'El año debe ser un número',
                'number.integer': 'El año debe ser un número entero',
                'number.min': 'El año debe ser mayor a 2020',
                'number.max': 'El año debe ser menor a 2050',
                'any.required': 'El año es requerido'
            }),

        month: Joi.number()
            .integer()
            .min(1)
            .max(12)
            .required()
            .messages({
                'number.base': 'El mes debe ser un número',
                'number.integer': 'El mes debe ser un número entero',
                'number.min': 'El mes debe estar entre 1 y 12',
                'number.max': 'El mes debe estar entre 1 y 12',
                'any.required': 'El mes es requerido'
            }),

        periodNumber: Joi.number()
            .integer()
            .min(1)
            .required()
            .messages({
                'number.base': 'El número de período debe ser un número',
                'number.integer': 'El número de período debe ser un número entero',
                'number.min': 'El número de período debe ser mayor a 0',
                'any.required': 'El número de período es requerido'
            }),

        startDate: Joi.alternatives()
            .try(
                Joi.date(),
                Joi.string().isoDate(),
                Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
            )
            .required()
            .messages({
                'any.required': 'La fecha de inicio es requerida',
                'date.base': 'La fecha de inicio debe ser una fecha válida',
                'string.isoDate': 'La fecha de inicio debe estar en formato ISO',
                'string.pattern.base': 'La fecha de inicio debe estar en formato YYYY-MM-DD'
            }),

        endDate: Joi.alternatives()
            .try(
                Joi.date(),
                Joi.string().isoDate(),
                Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
            )
            .required()
            .messages({
                'any.required': 'La fecha de fin es requerida',
                'date.base': 'La fecha de fin debe ser una fecha válida',
                'string.isoDate': 'La fecha de fin debe estar en formato ISO',
                'string.pattern.base': 'La fecha de fin debe estar en formato YYYY-MM-DD'
            }),

        referenceHours: Joi.number()
            .positive()
            .max(168) // Máximo horas en una semana
            .optional()
            .messages({
                'number.base': 'Las horas de referencia deben ser un número',
                'number.positive': 'Las horas de referencia deben ser un número positivo',
                'number.max': 'Las horas de referencia no pueden ser más de 168 (horas en una semana)'
            }),

        type: Joi.string()
            .valid('weekly', 'biweekly')
            .optional()
            .default('weekly')
            .messages({
                'string.base': 'El tipo debe ser una cadena de texto',
                'any.only': 'El tipo debe ser "weekly" o "biweekly"'
            }),

        description: Joi.string()
            .max(255)
            .optional()
            .messages({
                'string.base': 'La descripción debe ser una cadena de texto',
                'string.max': 'La descripción no puede exceder 255 caracteres'
            }),

        isActive: Joi.boolean()
            .optional()
            .default(true)
            .messages({
                'boolean.base': 'El estado activo debe ser verdadero o falso'
            })
    }),

    update: Joi.object({
        year: Joi.number()
            .integer()
            .min(2020)
            .max(2050)
            .optional()
            .messages({
                'number.base': 'El año debe ser un número',
                'number.integer': 'El año debe ser un número entero',
                'number.min': 'El año debe ser mayor a 2020',
                'number.max': 'El año debe ser menor a 2050'
            }),

        month: Joi.number()
            .integer()
            .min(1)
            .max(12)
            .optional()
            .messages({
                'number.base': 'El mes debe ser un número',
                'number.integer': 'El mes debe ser un número entero',
                'number.min': 'El mes debe estar entre 1 y 12',
                'number.max': 'El mes debe estar entre 1 y 12'
            }),

        periodNumber: Joi.number()
            .integer()
            .min(1)
            .optional()
            .messages({
                'number.base': 'El número de período debe ser un número',
                'number.integer': 'El número de período debe ser un número entero',
                'number.min': 'El número de período debe ser mayor a 0'
            }),

        startDate: Joi.alternatives()
            .try(
                Joi.date(),
                Joi.string().isoDate(),
                Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
            )
            .optional()
            .messages({
                'date.base': 'La fecha de inicio debe ser una fecha válida',
                'string.isoDate': 'La fecha de inicio debe estar en formato ISO',
                'string.pattern.base': 'La fecha de inicio debe estar en formato YYYY-MM-DD'
            }),

        endDate: Joi.alternatives()
            .try(
                Joi.date(),
                Joi.string().isoDate(),
                Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
            )
            .optional()
            .messages({
                'date.base': 'La fecha de fin debe ser una fecha válida',
                'string.isoDate': 'La fecha de fin debe estar en formato ISO',
                'string.pattern.base': 'La fecha de fin debe estar en formato YYYY-MM-DD'
            }),

        referenceHours: Joi.number()
            .positive()
            .max(168)
            .optional()
            .messages({
                'number.base': 'Las horas de referencia deben ser un número',
                'number.positive': 'Las horas de referencia deben ser un número positivo',
                'number.max': 'Las horas de referencia no pueden ser más de 168'
            }),

        type: Joi.string()
            .valid('weekly', 'biweekly')
            .optional()
            .messages({
                'string.base': 'El tipo debe ser una cadena de texto',
                'any.only': 'El tipo debe ser "weekly" o "biweekly"'
            }),

        description: Joi.string()
            .max(255)
            .optional()
            .messages({
                'string.base': 'La descripción debe ser una cadena de texto',
                'string.max': 'La descripción no puede exceder 255 caracteres'
            }),

        isActive: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'El estado activo debe ser verdadero o falso'
            })
    })
};

module.exports = { timePeriodValidator };