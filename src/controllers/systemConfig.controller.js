const SystemConfigService = require('../services/systemConfig.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de configuraciones del sistema
 */
class SystemConfigController {
    constructor() {
        this.systemConfigService = new SystemConfigService();
    }

    /**
     * Obtener todas las configuraciones del sistema
     */
    getSystemConfigs = async (req, res) => {
        try {
            const configs = await this.systemConfigService.getAllConfigs();
            return ApiResponse.success(res, configs, 'Configuraciones obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener configuraciones:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener una configuración específica por clave
     */
    getSystemConfig = async (req, res) => {
        try {
            const { key } = req.params;
            const config = await this.systemConfigService.getConfig(key);
            
            if (!config) {
                return ApiResponse.error(res, 'Configuración no encontrada', 404);
            }

            return ApiResponse.success(res, config, 'Configuración obtenida exitosamente');
        } catch (error) {
            logger.error('Error al obtener configuración:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Crear o actualizar una configuración
     */
    setSystemConfig = async (req, res) => {
        try {
            const { key, value, description } = req.body;
            
            // Solo administradores pueden modificar configuraciones
            if (req.user.role !== 'ADMINISTRADOR') {
                return ApiResponse.error(res, 'Acceso denegado. Solo administradores pueden modificar configuraciones del sistema.', 403);
            }

            const config = await this.systemConfigService.setConfig(key, value, description, req.user.userId);
            
            logger.info(`Configuración ${key} actualizada por ${req.user.email}`);
            return ApiResponse.success(res, config, 'Configuración actualizada exitosamente', 201);
        } catch (error) {
            logger.error('Error al actualizar configuración:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Eliminar una configuración
     */
    deleteSystemConfig = async (req, res) => {
        try {
            const { key } = req.params;
            
            // Solo administradores pueden eliminar configuraciones
            if (req.user.role !== 'ADMINISTRADOR') {
                return ApiResponse.error(res, 'Acceso denegado. Solo administradores pueden eliminar configuraciones del sistema.', 403);
            }

            const deleted = await this.systemConfigService.deleteConfig(key);
            
            if (!deleted) {
                return ApiResponse.error(res, 'Configuración no encontrada', 404);
            }

            logger.info(`Configuración ${key} eliminada por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Configuración eliminada exitosamente');
        } catch (error) {
            logger.error('Error al eliminar configuración:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener configuración de días futuros permitidos
     */
    getFutureDaysConfig = async (req, res) => {
        try {
            const days = await this.systemConfigService.getFutureDaysAllowed();
            return ApiResponse.success(res, { futureDaysAllowed: days }, 'Configuración de días futuros obtenida exitosamente');
        } catch (error) {
            logger.error('Error al obtener configuración de días futuros:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Configurar días futuros permitidos para registro de tiempo
     */
    setFutureDaysConfig = async (req, res) => {
        try {
            const { days } = req.body;
            
            // Solo administradores pueden modificar esta configuración
            if (req.user.role !== 'ADMINISTRADOR') {
                return ApiResponse.error(res, 'Acceso denegado. Solo administradores pueden modificar esta configuración.', 403);
            }

            // Validar que sea un número válido
            const futureDays = parseInt(days, 10);
            if (isNaN(futureDays) || futureDays < 0 || futureDays > 365) {
                return ApiResponse.error(res, 'Número de días debe ser un entero entre 0 y 365', 400);
            }

            const config = await this.systemConfigService.setFutureDaysAllowed(futureDays, req.user.userId);
            
            logger.info(`Días futuros configurados a ${futureDays} por ${req.user.email}`);
            return ApiResponse.success(res, config, 'Configuración de días futuros actualizada exitosamente');
        } catch (error) {
            logger.error('Error al configurar días futuros:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener configuraciones completas de restricciones de fecha
     */
    getDateRestrictionConfigs = async (req, res) => {
        try {
            const configs = await this.systemConfigService.getDateRestrictionConfigs();
            return ApiResponse.success(res, configs, 'Configuraciones de restricción de fecha obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener configuraciones de restricción de fecha:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Configurar restricciones de fecha para timesheet
     */
    setDateRestrictionConfigs = async (req, res) => {
        try {
            const { enabled, futureDaysAllowed, pastDaysAllowed } = req.body;
            
            // Solo administradores pueden modificar esta configuración
            if (req.user.role !== 'ADMINISTRADOR') {
                return ApiResponse.error(res, 'Acceso denegado. Solo administradores pueden modificar esta configuración.', 403);
            }

            // Validar datos de entrada
            if (typeof enabled !== 'boolean') {
                return ApiResponse.error(res, 'El campo "enabled" debe ser un valor booleano', 400);
            }

            if (enabled) {
                // Validar días futuros
                const futureDays = parseInt(futureDaysAllowed, 10);
                if (isNaN(futureDays) || futureDays < 0 || futureDays > 365) {
                    return ApiResponse.error(res, 'Días futuros debe ser un entero entre 0 y 365', 400);
                }

                // Validar días pasados
                const pastDays = parseInt(pastDaysAllowed, 10);
                if (isNaN(pastDays) || pastDays < 0 || pastDays > 365) {
                    return ApiResponse.error(res, 'Días pasados debe ser un entero entre 0 y 365', 400);
                }

                // Actualizar configuraciones
                await Promise.all([
                    this.systemConfigService.setDateRestrictionsEnabled(enabled, req.user.userId),
                    this.systemConfigService.setFutureDaysAllowed(futureDays, req.user.userId),
                    this.systemConfigService.setPastDaysAllowed(pastDays, req.user.userId)
                ]);
            } else {
                // Solo deshabilitar restricciones
                await this.systemConfigService.setDateRestrictionsEnabled(enabled, req.user.userId);
            }
            
            const updatedConfigs = await this.systemConfigService.getDateRestrictionConfigs();
            
            logger.info(`Configuraciones de restricción de fecha actualizadas por ${req.user.email}`);
            return ApiResponse.success(res, updatedConfigs, 'Configuraciones de restricción de fecha actualizadas exitosamente');
        } catch (error) {
            logger.error('Error al configurar restricciones de fecha:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Validar si una fecha es permitida para registro de tiempo
     */
    validateDateForTimeEntry = async (req, res) => {
        try {
            const { date } = req.query;
            
            if (!date) {
                return ApiResponse.error(res, 'La fecha es requerida', 400);
            }

            const targetDate = new Date(date);
            if (isNaN(targetDate.getTime())) {
                return ApiResponse.error(res, 'Fecha inválida', 400);
            }

            const validation = await this.systemConfigService.validateDateForTimeEntry(targetDate);
            
            return ApiResponse.success(res, validation, 'Validación de fecha completada');
        } catch (error) {
            logger.error('Error al validar fecha:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Inicializar configuraciones por defecto (solo para desarrollo/setup)
     */
    initializeDefaults = async (req, res) => {
        try {
            // Solo administradores pueden inicializar configuraciones
            if (req.user.role !== 'ADMINISTRADOR') {
                return ApiResponse.error(res, 'Acceso denegado. Solo administradores pueden inicializar configuraciones.', 403);
            }

            await this.systemConfigService.initializeDefaultConfigs(req.user.userId);
            
            logger.info(`Configuraciones por defecto inicializadas por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Configuraciones por defecto inicializadas exitosamente');
        } catch (error) {
            logger.error('Error al inicializar configuraciones por defecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new SystemConfigController();