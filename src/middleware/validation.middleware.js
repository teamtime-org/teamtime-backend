const ApiResponse = require('../utils/response');
const { ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Middleware para validar datos usando esquemas Joi
 * @param {Object} schema - Esquema de validación Joi
 * @param {string} source - Fuente de datos ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = req[source];
            const { error, value } = schema.validate(data, {
                abortEarly: false, // Retornar todos los errores
                stripUnknown: true, // Remover campos no definidos en el schema
                convert: true, // Convertir tipos automáticamente
            });

            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value,
                }));

                logger.warn('Error de validación', {
                    source,
                    errors,
                    userId: req.user?.userId,
                    path: req.path,
                });

                return ApiResponse.validationError(res, errors, ERROR_MESSAGES.VALIDATION_ERROR);
            }

            // Reemplazar los datos originales con los datos validados y limpiados
            req[source] = value;
            next();
        } catch (err) {
            logger.error('Error en middleware de validación', {
                error: err.message,
                stack: err.stack,
                source
            });
            return ApiResponse.error(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
        }
    };
};

/**
 * Middleware para validar parámetros de paginación
 */
const validatePagination = (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Validar límites
        if (page < 1) {
            return ApiResponse.validationError(res, [
                { field: 'page', message: 'La página debe ser mayor a 0' }
            ]);
        }

        if (limit < 1 || limit > 100) {
            return ApiResponse.validationError(res, [
                { field: 'limit', message: 'El límite debe estar entre 1 y 100' }
            ]);
        }

        // Agregar paginación validada al request
        req.pagination = {
            page,
            limit,
            skip: (page - 1) * limit,
        };

        next();
    } catch (error) {
        logger.error('Error en validación de paginación', {
            error: error.message,
            stack: error.stack
        });
        return ApiResponse.error(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
    }
};

/**
 * Middleware para validar UUID en parámetros
 */
const validateUUID = (paramName) => {
    return (req, res, next) => {
        try {
            const uuid = req.params[paramName];
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            if (!uuid || !uuidRegex.test(uuid)) {
                return ApiResponse.validationError(res, [
                    { field: paramName, message: 'ID inválido' }
                ]);
            }

            next();
        } catch (error) {
            logger.error('Error en validación de UUID', {
                error: error.message,
                stack: error.stack,
                paramName
            });
            return ApiResponse.error(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
        }
    };
};

/**
 * Middleware para validar fechas
 */
const validateDateRange = (startDateField = 'startDate', endDateField = 'endDate') => {
    return (req, res, next) => {
        try {
            const startDate = req.body[startDateField] || req.query[startDateField];
            const endDate = req.body[endDateField] || req.query[endDateField];

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);

                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return ApiResponse.validationError(res, [
                        { field: 'dates', message: 'Formato de fecha inválido' }
                    ]);
                }

                if (start > end) {
                    return ApiResponse.validationError(res, [
                        { field: 'dates', message: ERROR_MESSAGES.INVALID_DATE_RANGE }
                    ]);
                }
            }

            next();
        } catch (error) {
            logger.error('Error en validación de rango de fechas', {
                error: error.message,
                stack: error.stack
            });
            return ApiResponse.error(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
        }
    };
};

/**
 * Middleware para sanitizar inputs de texto
 */
const sanitizeInput = (req, res, next) => {
    try {
        // Función recursiva para limpiar strings
        const sanitize = (obj) => {
            if (typeof obj === 'string') {
                return obj.trim();
            } else if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    obj[key] = sanitize(obj[key]);
                }
            }
            return obj;
        };

        // Sanitizar body, query y params
        if (req.body) req.body = sanitize({ ...req.body });
        if (req.query) req.query = sanitize({ ...req.query });
        if (req.params) req.params = sanitize({ ...req.params });

        next();
    } catch (error) {
        logger.error('Error en sanitización de inputs', {
            error: error.message,
            stack: error.stack
        });
        return ApiResponse.error(res, ERROR_MESSAGES.INTERNAL_ERROR, 500);
    }
};

module.exports = {
    validate,
    validatePagination,
    validateUUID,
    validateDateRange,
    sanitizeInput,
};
