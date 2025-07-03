const Joi = require('joi');
const { USER_ROLES } = require('../utils/constants');

/**
 * Esquemas de validación para usuarios
 */

// Esquema para creación de usuario
const createUserSchema = Joi.object({
    email: Joi.string()
        .email()
        .max(100)
        .required()
        .trim()
        .lowercase()
        .messages({
            'string.email': 'El email debe tener un formato válido',
            'string.max': 'El email no puede tener más de 100 caracteres',
            'any.required': 'El email es requerido',
        }),

    password: Joi.string()
        .min(6)
        .max(50)
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 6 caracteres',
            'string.max': 'La contraseña no puede tener más de 50 caracteres',
            'any.required': 'La contraseña es requerida',
        }),

    firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .required()
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 50 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios',
            'any.required': 'El nombre es requerido',
        }),

    lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .required()
        .trim()
        .messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'string.max': 'El apellido no puede tener más de 50 caracteres',
            'string.pattern.base': 'El apellido solo puede contener letras y espacios',
            'any.required': 'El apellido es requerido',
        }),

    role: Joi.string()
        .valid(...Object.values(USER_ROLES))
        .default(USER_ROLES.COLABORADOR)
        .messages({
            'any.only': 'El rol debe ser ADMINISTRADOR, COORDINADOR o COLABORADOR',
        }),

    areaId: Joi.string()
        .uuid()
        .when('role', {
            is: Joi.valid(USER_ROLES.COORDINADOR, USER_ROLES.COLABORADOR),
            then: Joi.required(),
            otherwise: Joi.optional().allow(null),
        })
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
            'any.required': 'El área es requerida para coordinadores y colaboradores',
        }),
});

// Esquema para actualización de usuario
const updateUserSchema = Joi.object({
    firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 50 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios',
        }),

    lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .trim()
        .messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'string.max': 'El apellido no puede tener más de 50 caracteres',
            'string.pattern.base': 'El apellido solo puede contener letras y espacios',
        }),

    areaId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
        }),

    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),
});

// Esquema para cambio de rol (solo para administradores)
const changeRoleSchema = Joi.object({
    role: Joi.string()
        .valid(...Object.values(USER_ROLES))
        .required()
        .messages({
            'any.only': 'El rol debe ser ADMINISTRADOR, COORDINADOR o COLABORADOR',
            'any.required': 'El rol es requerido',
        }),

    areaId: Joi.string()
        .uuid()
        .when('role', {
            is: Joi.valid(USER_ROLES.COORDINADOR, USER_ROLES.COLABORADOR),
            then: Joi.required(),
            otherwise: Joi.optional().allow(null),
        })
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
            'any.required': 'El área es requerida para coordinadores y colaboradores',
        }),
});

// Esquema para filtros de búsqueda de usuarios
const userFiltersSchema = Joi.object({
    role: Joi.string()
        .valid(...Object.values(USER_ROLES))
        .messages({
            'any.only': 'El rol debe ser ADMINISTRADOR, COORDINADOR o COLABORADOR',
        }),

    areaId: Joi.string()
        .uuid()
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
        }),

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

// Esquema para actualización de perfil propio
const updateProfileSchema = Joi.object({
    firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .trim()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 50 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios',
        }),

    lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .trim()
        .messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'string.max': 'El apellido no puede tener más de 50 caracteres',
            'string.pattern.base': 'El apellido solo puede contener letras y espacios',
        }),
});

// Esquema para validación de ID de usuario
const userIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del usuario debe ser un UUID válido',
            'any.required': 'El ID del usuario es requerido',
        }),
});

// Esquema para cambio de estado (activar/desactivar usuario)
const toggleUserStatusSchema = Joi.object({
    isActive: Joi.boolean()
        .required()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
            'any.required': 'El estado activo es requerido',
        }),
});

module.exports = {
    createUserSchema,
    updateUserSchema,
    changeRoleSchema,
    userFiltersSchema,
    updateProfileSchema,
    userIdSchema,
    toggleUserStatusSchema,
};
