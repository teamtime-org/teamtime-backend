/**
 * Clase helper para respuestas estandarizadas de la API
 */
class ApiResponse {
    /**
     * Respuesta exitosa
     * @param {Object} res - Objeto response de Express
     * @param {*} data - Datos a retornar
     * @param {string} message - Mensaje descriptivo
     * @param {number} statusCode - Código de estado HTTP
     */
    static success(res, data, message = 'Operación exitosa', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    /**
     * Respuesta de error
     * @param {Object} res - Objeto response de Express
     * @param {string} message - Mensaje de error
     * @param {number} statusCode - Código de estado HTTP
     * @param {Array|Object} errors - Errores específicos
     */
    static error(res, message = 'Error interno del servidor', statusCode = 500, errors = null) {
        const response = {
            success: false,
            message,
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Respuesta paginada
     * @param {Object} res - Objeto response de Express
     * @param {*} data - Datos a retornar
     * @param {Object} pagination - Información de paginación
     * @param {string} message - Mensaje descriptivo
     */
    static paginated(res, data, pagination, message = 'Datos obtenidos exitosamente') {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.limit),
                hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
                hasPrev: pagination.page > 1,
            },
        });
    }

    /**
     * Respuesta de creación exitosa
     * @param {Object} res - Objeto response de Express
     * @param {*} data - Datos del recurso creado
     * @param {string} message - Mensaje descriptivo
     */
    static created(res, data, message = 'Recurso creado exitosamente') {
        return this.success(res, data, message, 201);
    }

    /**
     * Respuesta sin contenido
     * @param {Object} res - Objeto response de Express
     * @param {string} message - Mensaje descriptivo
     */
    static noContent(res, message = 'Operación exitosa') {
        return res.status(204).json({
            success: true,
            message,
        });
    }

    /**
     * Respuesta de no autorizado
     * @param {Object} res - Objeto response de Express
     * @param {string} message - Mensaje de error
     */
    static unauthorized(res, message = 'No autorizado') {
        return this.error(res, message, 401);
    }

    /**
     * Respuesta de prohibido
     * @param {Object} res - Objeto response de Express
     * @param {string} message - Mensaje de error
     */
    static forbidden(res, message = 'Acceso prohibido') {
        return this.error(res, message, 403);
    }

    /**
     * Respuesta de no encontrado
     * @param {Object} res - Objeto response de Express
     * @param {string} message - Mensaje de error
     */
    static notFound(res, message = 'Recurso no encontrado') {
        return this.error(res, message, 404);
    }

    /**
     * Respuesta de validación fallida
     * @param {Object} res - Objeto response de Express
     * @param {Array|Object} errors - Errores de validación
     * @param {string} message - Mensaje de error
     */
    static validationError(res, errors, message = 'Datos de entrada inválidos') {
        return this.error(res, message, 400, errors);
    }
}

module.exports = ApiResponse;
