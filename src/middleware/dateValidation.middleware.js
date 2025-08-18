const SystemConfigService = require('../services/systemConfig.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Middleware para validar fechas futuras basado en configuración del sistema
 */
const validateFutureDate = async (req, res, next) => {
    try {
        const { date } = req.body;
        
        if (!date) {
            return next(); // Si no hay fecha, continuar (será validado por Joi)
        }

        const systemConfigService = new SystemConfigService();
        const futureDaysAllowed = await systemConfigService.getFutureDaysAllowed();
        
        const requestDate = new Date(date);
        const maxDate = new Date(Date.now() + futureDaysAllowed * 24 * 60 * 60 * 1000);
        
        if (requestDate > maxDate) {
            const error = [{
                field: 'date',
                message: `La fecha no puede ser más de ${futureDaysAllowed} días en el futuro`,
                value: date
            }];
            
            logger.warn('Fecha futura no permitida', {
                requestedDate: date,
                futureDaysAllowed,
                maxAllowedDate: maxDate.toISOString().split('T')[0],
                userId: req.user?.userId
            });
            
            return ApiResponse.validationError(res, error, 'Fecha no permitida');
        }
        
        next();
    } catch (error) {
        logger.error('Error al validar fecha futura:', error);
        return ApiResponse.error(res, 'Error al validar fecha', 500);
    }
};

module.exports = {
    validateFutureDate
};