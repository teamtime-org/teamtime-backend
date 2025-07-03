const ApiResponse = require('../utils/response');
const { ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Middleware global para manejo de errores
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log del error
    logger.error('Error capturado por errorHandler', {
        error: error.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
    });

    // Errores de Prisma
    if (err.code) {
        switch (err.code) {
            case 'P2002':
                // Constraint de unicidad violada
                const field = err.meta?.target?.[0] || 'campo';
                error.message = `Ya existe un registro con este ${field}`;
                error.statusCode = 400;
                break;

            case 'P2003':
                // Foreign key constraint violation
                error.message = 'Referencia inválida a recurso relacionado';
                error.statusCode = 400;
                break;

            case 'P2025':
                // Record not found
                error.message = ERROR_MESSAGES.RESOURCE_NOT_FOUND;
                error.statusCode = 404;
                break;

            case 'P2014':
                // Required relation violation
                error.message = 'Falta información requerida relacionada';
                error.statusCode = 400;
                break;

            default:
                error.message = 'Error de base de datos';
                error.statusCode = 500;
                break;
        }
    }

    // Errores de JWT
    if (err.name === 'JsonWebTokenError') {
        error.message = ERROR_MESSAGES.INVALID_TOKEN;
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expirado';
        error.statusCode = 401;
    }

    // Errores de validación de Joi
    if (err.name === 'ValidationError') {
        error.message = ERROR_MESSAGES.VALIDATION_ERROR;
        error.statusCode = 400;
    }

    // Errores de cast de tipo
    if (err.name === 'CastError') {
        error.message = 'Formato de ID inválido';
        error.statusCode = 400;
    }

    // Error 11000 (duplicado en MongoDB - por compatibilidad)
    if (err.code === 11000) {
        error.message = ERROR_MESSAGES.DUPLICATE_RESOURCE;
        error.statusCode = 400;
    }

    // Errores de sintaxis JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        error.message = 'JSON malformado en el request';
        error.statusCode = 400;
    }

    // Errores de límite de tamaño de payload
    if (err.type === 'entity.too.large') {
        error.message = 'Payload demasiado grande';
        error.statusCode = 413;
    }

    // Retornar respuesta de error
    return ApiResponse.error(
        res,
        error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error.statusCode || 500,
        process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
    );
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
const notFoundHandler = (req, res) => {
    logger.warn('Ruta no encontrada', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
    });

    return ApiResponse.notFound(res, `Ruta ${req.originalUrl} no encontrada`);
};

/**
 * Wrapper para funciones async que automáticamente captura errores
 * @param {Function} fn - Función async a wrappear
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware para validar que los recursos existan antes de procesar
 */
const validateResourceExists = (model, paramName = 'id', errorMessage = null) => {
    return asyncHandler(async (req, res, next) => {
        const resourceId = req.params[paramName];

        if (!resourceId) {
            return ApiResponse.validationError(res, [
                { field: paramName, message: 'ID requerido' }
            ]);
        }

        const resource = await model.findUnique({
            where: { id: resourceId }
        });

        if (!resource) {
            return ApiResponse.notFound(res, errorMessage || ERROR_MESSAGES.RESOURCE_NOT_FOUND);
        }

        // Agregar el recurso al request para uso posterior
        req.resource = resource;
        next();
    });
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    validateResourceExists,
};
