const Joi = require('joi');
const { USER_ROLES } = require('../utils/constants');

/**
 * Esquemas de validación para autenticación
 */

// Esquema para registro de usuario
const registerSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Debe ser un email válido',
            'any.required': 'El email es requerido',
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.max': 'La contraseña no puede tener más de 128 caracteres',
            'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
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
        .valid(USER_ROLES.COORDINADOR, USER_ROLES.COLABORADOR)
        .required()
        .messages({
            'any.only': 'El rol debe ser COORDINADOR o COLABORADOR',
            'any.required': 'El rol es requerido',
        }),

    areaId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'El ID del área debe ser un UUID válido',
            'any.required': 'El área es requerida',
        }),
});

// Esquema para login
const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Debe ser un email válido',
            'any.required': 'El email es requerido',
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'La contraseña es requerida',
        }),
});

// Esquema para cambio de contraseña
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'La contraseña actual es requerida',
        }),

    newPassword: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .required()
        .messages({
            'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
            'string.max': 'La nueva contraseña no puede tener más de 128 caracteres',
            'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número',
            'any.required': 'La nueva contraseña es requerida',
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'La confirmación de contraseña debe coincidir con la nueva contraseña',
            'any.required': 'La confirmación de contraseña es requerida',
        }),
});

// Esquema para recuperación de contraseña
const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Debe ser un email válido',
            'any.required': 'El email es requerido',
        }),
});

// Esquema para reset de contraseña
const resetPasswordSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': 'El token de recuperación es requerido',
        }),

    newPassword: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.max': 'La contraseña no puede tener más de 128 caracteres',
            'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
            'any.required': 'La contraseña es requerida',
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'La confirmación debe coincidir con la nueva contraseña',
            'any.required': 'La confirmación de contraseña es requerida',
        }),
});

module.exports = {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
