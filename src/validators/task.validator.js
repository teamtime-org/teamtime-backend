const Joi = require('joi');
const { TASK_STATUS, PRIORITY } = require('../utils/constants');

/**
 * Esquemas de validación para tareas
 */

// Esquema para creación de tarea
const createTaskSchema = Joi.object({
    title: Joi.string()
        .min(2)
        .max(200)
        .required()
        .trim()
        .messages({
            'string.min': 'El título debe tener al menos 2 caracteres',
            'string.max': 'El título no puede tener más de 200 caracteres',
            'any.required': 'El título es requerido',
        }),

    description: Joi.string()
        .max(1000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'La descripción no puede tener más de 1000 caracteres',
        }),

    projectId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del proyecto debe ser un UUID válido',
            'any.required': 'El proyecto es requerido',
        }),

    priority: Joi.string()
        .valid(...Object.values(PRIORITY))
        .default(PRIORITY.MEDIUM)
        .messages({
            'any.only': 'La prioridad debe ser LOW, MEDIUM, HIGH o URGENT',
        }),

    assignedTo: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del usuario asignado debe ser un UUID válido',
        }),

    estimatedHours: Joi.number()
        .positive()
        .precision(2)
        .max(9999.99)
        .messages({
            'number.base': 'Las horas estimadas deben ser un número',
            'number.positive': 'Las horas estimadas deben ser positivas',
            'number.precision': 'Las horas estimadas pueden tener máximo 2 decimales',
            'number.max': 'Las horas estimadas no pueden ser mayores a 9999.99',
        }),

    dueDate: Joi.date()
        .iso()
        .min(new Date().toISOString().split('T')[0])
        .messages({
            'date.base': 'La fecha límite debe ser una fecha válida',
            'date.format': 'La fecha límite debe estar en formato ISO (YYYY-MM-DD)',
            'date.min': 'La fecha límite no puede ser anterior a hoy',
        }),

    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .messages({
            'array.base': 'Los tags deben ser un array',
            'string.max': 'Cada tag no puede tener más de 50 caracteres',
            'array.max': 'No se permiten más de 10 tags',
        }),
});

// Esquema para actualización de tarea
const updateTaskSchema = Joi.object({
    title: Joi.string()
        .min(2)
        .max(200)
        .trim()
        .messages({
            'string.min': 'El título debe tener al menos 2 caracteres',
            'string.max': 'El título no puede tener más de 200 caracteres',
        }),

    description: Joi.string()
        .max(1000)
        .allow('')
        .trim()
        .messages({
            'string.max': 'La descripción no puede tener más de 1000 caracteres',
        }),

    status: Joi.string()
        .valid(...Object.values(TASK_STATUS))
        .messages({
            'any.only': 'El estado debe ser TODO, IN_PROGRESS, REVIEW o DONE',
        }),

    priority: Joi.string()
        .valid(...Object.values(PRIORITY))
        .messages({
            'any.only': 'La prioridad debe ser LOW, MEDIUM, HIGH o URGENT',
        }),

    assignedTo: Joi.string()
        .uuid()
        .allow(null)
        .messages({
            'string.uuid': 'El ID del usuario asignado debe ser un UUID válido',
        }),

    estimatedHours: Joi.number()
        .positive()
        .precision(2)
        .max(9999.99)
        .messages({
            'number.base': 'Las horas estimadas deben ser un número',
            'number.positive': 'Las horas estimadas deben ser positivas',
            'number.precision': 'Las horas estimadas pueden tener máximo 2 decimales',
            'number.max': 'Las horas estimadas no pueden ser mayores a 9999.99',
        }),

    dueDate: Joi.date()
        .iso()
        .min(new Date().toISOString().split('T')[0])
        .allow(null)
        .messages({
            'date.base': 'La fecha límite debe ser una fecha válida',
            'date.format': 'La fecha límite debe estar en formato ISO (YYYY-MM-DD)',
            'date.min': 'La fecha límite no puede ser anterior a hoy',
        }),

    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),

    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .messages({
            'array.base': 'Los tags deben ser un array',
            'string.max': 'Cada tag no puede tener más de 50 caracteres',
            'array.max': 'No se permiten más de 10 tags',
        }),
});

// Esquema para cambio de estado de tarea
const updateTaskStatusSchema = Joi.object({
    status: Joi.string()
        .valid(...Object.values(TASK_STATUS))
        .required()
        .messages({
            'any.only': 'El estado debe ser TODO, IN_PROGRESS, REVIEW o DONE',
            'any.required': 'El estado es requerido',
        }),

    notes: Joi.string()
        .max(500)
        .allow('')
        .trim()
        .messages({
            'string.max': 'Las notas no pueden tener más de 500 caracteres',
        }),
});

// Esquema para asignación de tarea
const assignTaskSchema = Joi.object({
    assignedTo: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del usuario debe ser un UUID válido',
            'any.required': 'El ID del usuario es requerido',
        }),
});

// Esquema para filtros de búsqueda de tareas
const taskFiltersSchema = Joi.object({
    projectId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del proyecto debe ser un UUID válido',
        }),

    status: Joi.string()
        .valid(...Object.values(TASK_STATUS))
        .messages({
            'any.only': 'El estado debe ser TODO, IN_PROGRESS, REVIEW o DONE',
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

    assignedTo: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del usuario asignado debe ser un UUID válido',
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

    dueDateStart: Joi.date()
        .iso()
        .messages({
            'date.base': 'La fecha de inicio debe ser una fecha válida',
            'date.format': 'La fecha de inicio debe estar en formato ISO (YYYY-MM-DD)',
        }),

    dueDateEnd: Joi.date()
        .iso()
        .min(Joi.ref('dueDateStart'))
        .messages({
            'date.base': 'La fecha de fin debe ser una fecha válida',
            'date.format': 'La fecha de fin debe estar en formato ISO (YYYY-MM-DD)',
            'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio',
        }),

    overdue: Joi.boolean()
        .messages({
            'boolean.base': 'overdue debe ser verdadero o falso',
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

// Esquema para validación de ID de tarea
const taskIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID de la tarea debe ser un UUID válido',
            'any.required': 'El ID de la tarea es requerido',
        }),
});

// Esquema para reporte de tiempo en tarea
const taskTimeReportSchema = Joi.object({
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

    includeSubtasks: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'includeSubtasks debe ser verdadero o falso',
        }),
});

module.exports = {
    createTaskSchema,
    updateTaskSchema,
    changeTaskStatusSchema: updateTaskStatusSchema,
    assignTaskSchema,
    taskFiltersSchema,
    taskIdSchema,
    taskTimeReportSchema,
};
