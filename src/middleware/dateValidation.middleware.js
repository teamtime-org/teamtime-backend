const SystemConfigService = require('../services/systemConfig.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Middleware para validar fechas futuras basado en configuración del sistema
 */
const validateFutureDate = async (req, res, next) => {
    try {
        const { date, year, month, day } = req.body;
        
        let requestDate;
        let dateValue;
        
        // Manejar tanto el formato antiguo (date) como el nuevo (year, month, day)
        if (date) {
            requestDate = new Date(date);
            dateValue = date;
        } else if (year && month && day) {
            // Crear fecha usando UTC para evitar problemas de timezone
            requestDate = new Date(Date.UTC(year, month - 1, day));
            dateValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
            return next(); // Si no hay fecha, continuar (será validado por Joi)
        }

        const systemConfigService = new SystemConfigService();
        const futureDaysAllowed = await systemConfigService.getFutureDaysAllowed();
        
        const maxDate = new Date(Date.now() + futureDaysAllowed * 24 * 60 * 60 * 1000);
        
        if (requestDate > maxDate) {
            const error = [{
                field: date ? 'date' : 'year',
                message: `La fecha no puede ser más de ${futureDaysAllowed} días en el futuro`,
                value: dateValue
            }];
            
            logger.warn('Fecha futura no permitida', {
                requestedDate: dateValue,
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