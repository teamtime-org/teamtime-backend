const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiResponse = require('../utils/response');
const { ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Middleware para validar token JWT
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            logger.warn('Intento de acceso sin token', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            return ApiResponse.error(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
        }

        jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
            if (err) {
                logger.warn('Token inválido utilizado', {
                    error: err.message,
                    ip: req.ip,
                    path: req.path
                });
                return ApiResponse.error(res, ERROR_MESSAGES.INVALID_TOKEN, 401);
            }

            // Agregar información del usuario al request
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                areaId: decoded.areaId,
            };

            logger.debug('Usuario autenticado', {
                userId: req.user.userId,
                role: req.user.role,
                path: req.path
            });

            next();
        });
    } catch (error) {
        logger.error('Error en autenticación', { error: error.message, stack: error.stack });
        return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
};

/**
 * Middleware opcional para autenticación (no falla si no hay token)
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
        if (!err) {
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                areaId: decoded.areaId,
            };
        }
        next();
    });
};

/**
 * Middleware para requerir roles específicos
 * @param {Array|string} roles - Roles permitidos
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return ApiResponse.error(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            }

            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(req.user.role)) {
                logger.warn('Acceso denegado por rol insuficiente', {
                    userId: req.user.userId,
                    userRole: req.user.role,
                    requiredRoles: allowedRoles,
                    path: req.path,
                });
                return ApiResponse.error(res, ERROR_MESSAGES.FORBIDDEN, 403);
            }

            next();
        } catch (error) {
            logger.error('Error en verificación de rol', { error: error.message, stack: error.stack });
            return ApiResponse.error(res, 'Error interno del servidor', 500);
        }
    };
};

/**
 * Middleware para verificar permisos de área
 * Solo permite acceso si el usuario pertenece a la misma área o es administrador
 */
const requireSameArea = (req, res, next) => {
    try {
        if (!req.user) {
            return ApiResponse.error(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
        }

        // Los administradores tienen acceso a todo
        if (req.user.role === 'ADMINISTRADOR') {
            return next();
        }

        // Para otros roles, verificar área específica según el contexto
        // Esta lógica se puede extender según las necesidades específicas
        next();
    } catch (error) {
        logger.error('Error en verificación de área', { error: error.message, stack: error.stack });
        return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
};

/**
 * Middleware para verificar propiedad del recurso
 * Verifica que el usuario puede acceder al recurso según su rol y área
 */
const checkResourceAccess = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return ApiResponse.error(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
            }

            // Los administradores tienen acceso a todo
            if (req.user.role === 'ADMINISTRADOR') {
                return next();
            }

            // La lógica específica de acceso se implementará en cada controlador
            // según el tipo de recurso y las reglas de negocio
            next();
        } catch (error) {
            logger.error('Error en verificación de acceso a recurso', {
                error: error.message,
                stack: error.stack,
                resourceType
            });
            return ApiResponse.error(res, 'Error interno del servidor', 500);
        }
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireSameArea,
    checkResourceAccess,
};
