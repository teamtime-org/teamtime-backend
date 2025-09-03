const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

/**
 * Servicio para gestionar configuraciones del sistema
 */
class SystemConfigService {
    /**
     * Obtener una configuración por clave
     * @param {string} key - Clave de la configuración
     * @returns {Promise<Object|null>} - Configuración encontrada o null
     */
    async getConfig(key) {
        try {
            const config = await prisma.systemConfig.findUnique({
                where: { key }
            });
            return config;
        } catch (error) {
            logger.error(`Error al obtener configuración ${key}:`, error);
            throw new Error(`Error al obtener configuración del sistema`);
        }
    }

    /**
     * Obtener el valor de una configuración por clave
     * @param {string} key - Clave de la configuración
     * @param {string} defaultValue - Valor por defecto si no existe
     * @returns {Promise<string>} - Valor de la configuración
     */
    async getConfigValue(key, defaultValue = null) {
        try {
            const config = await this.getConfig(key);
            return config ? config.value : defaultValue;
        } catch (error) {
            logger.error(`Error al obtener valor de configuración ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Crear o actualizar una configuración
     * @param {string} key - Clave de la configuración
     * @param {string} value - Valor de la configuración
     * @param {string} description - Descripción de la configuración
     * @param {string} createdBy - ID del usuario que crea/actualiza
     * @returns {Promise<Object>} - Configuración creada/actualizada
     */
    async setConfig(key, value, description, createdBy) {
        try {
            const config = await prisma.systemConfig.upsert({
                where: { key },
                update: { 
                    value, 
                    description,
                    updatedAt: new Date()
                },
                create: {
                    key,
                    value,
                    description,
                    createdBy
                }
            });

            logger.info(`Configuración ${key} actualizada por usuario ${createdBy}`);
            return config;
        } catch (error) {
            logger.error(`Error al configurar ${key}:`, error);
            throw new Error(`Error al actualizar configuración del sistema`);
        }
    }

    /**
     * Obtener todas las configuraciones
     * @returns {Promise<Array>} - Lista de configuraciones
     */
    async getAllConfigs() {
        try {
            const configs = await prisma.systemConfig.findMany({
                orderBy: { key: 'asc' },
                include: {
                    creator: {
                        select: {
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            return configs;
        } catch (error) {
            logger.error('Error al obtener configuraciones:', error);
            throw new Error('Error al obtener configuraciones del sistema');
        }
    }

    /**
     * Eliminar una configuración
     * @param {string} key - Clave de la configuración
     * @returns {Promise<boolean>} - true si se eliminó correctamente
     */
    async deleteConfig(key) {
        try {
            await prisma.systemConfig.delete({
                where: { key }
            });
            logger.info(`Configuración ${key} eliminada`);
            return true;
        } catch (error) {
            if (error.code === 'P2025') { // Registro no encontrado
                return false;
            }
            logger.error(`Error al eliminar configuración ${key}:`, error);
            throw new Error('Error al eliminar configuración del sistema');
        }
    }

    /**
     * Obtener días futuros permitidos para registro de tiempo
     * @returns {Promise<number>} - Número de días permitidos
     */
    async getFutureDaysAllowed() {
        const value = await this.getConfigValue('TIME_ENTRY_FUTURE_DAYS', '7');
        return parseInt(value, 10) || 7; // Default 7 días
    }

    /**
     * Configurar días futuros permitidos para registro de tiempo
     * @param {number} days - Número de días a permitir
     * @param {string} createdBy - ID del usuario que configura
     * @returns {Promise<Object>} - Configuración actualizada
     */
    async setFutureDaysAllowed(days, createdBy) {
        return await this.setConfig(
            'TIME_ENTRY_FUTURE_DAYS',
            days.toString(),
            `Número de días en el futuro permitidos para registro de tiempo (configurado por administrador)`,
            createdBy
        );
    }

    /**
     * Obtener días pasados permitidos para registro de tiempo
     * @returns {Promise<number>} - Número de días permitidos
     */
    async getPastDaysAllowed() {
        const value = await this.getConfigValue('TIME_ENTRY_PAST_DAYS', '30');
        return parseInt(value, 10) || 30; // Default 30 días
    }

    /**
     * Configurar días pasados permitidos para registro de tiempo
     * @param {number} days - Número de días a permitir
     * @param {string} createdBy - ID del usuario que configura
     * @returns {Promise<Object>} - Configuración actualizada
     */
    async setPastDaysAllowed(days, createdBy) {
        return await this.setConfig(
            'TIME_ENTRY_PAST_DAYS',
            days.toString(),
            `Número de días en el pasado permitidos para registro de tiempo (configurado por administrador)`,
            createdBy
        );
    }

    /**
     * Verificar si las restricciones de fecha están habilitadas
     * @returns {Promise<boolean>} - true si las restricciones están habilitadas
     */
    async isDateRestrictionsEnabled() {
        const value = await this.getConfigValue('TIME_ENTRY_DATE_RESTRICTIONS_ENABLED', 'true');
        return value.toLowerCase() === 'true';
    }

    /**
     * Configurar si las restricciones de fecha están habilitadas
     * @param {boolean} enabled - Si las restricciones están habilitadas
     * @param {string} createdBy - ID del usuario que configura
     * @returns {Promise<Object>} - Configuración actualizada
     */
    async setDateRestrictionsEnabled(enabled, createdBy) {
        return await this.setConfig(
            'TIME_ENTRY_DATE_RESTRICTIONS_ENABLED',
            enabled.toString(),
            `Habilitar restricciones de fecha para registro de tiempo (configurado por administrador)`,
            createdBy
        );
    }

    /**
     * Obtener configuraciones completas de restricciones de fecha
     * @returns {Promise<Object>} - Configuraciones de fecha
     */
    async getDateRestrictionConfigs() {
        const [enabled, futureDays, pastDays] = await Promise.all([
            this.isDateRestrictionsEnabled(),
            this.getFutureDaysAllowed(),
            this.getPastDaysAllowed()
        ]);

        return {
            enabled,
            futureDaysAllowed: futureDays,
            pastDaysAllowed: pastDays
        };
    }

    /**
     * Validar si una fecha es permitida para registro de tiempo
     * @param {Date} targetDate - Fecha objetivo
     * @returns {Promise<{isValid: boolean, reason?: string}>} - Resultado de validación
     */
    async validateDateForTimeEntry(targetDate) {
        const config = await this.getDateRestrictionConfigs();
        
        // Si las restricciones están deshabilitadas, permitir cualquier fecha
        if (!config.enabled) {
            return { isValid: true };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Verificar fecha futura
        if (diffDays > config.futureDaysAllowed) {
            return {
                isValid: false,
                reason: `No se puede registrar tiempo más de ${config.futureDaysAllowed} días en el futuro`
            };
        }

        // Verificar fecha pasada
        if (diffDays < -config.pastDaysAllowed) {
            return {
                isValid: false,
                reason: `No se puede registrar tiempo más de ${config.pastDaysAllowed} días en el pasado`
            };
        }

        return { isValid: true };
    }

    /**
     * Inicializar configuraciones por defecto del sistema
     * @param {string} adminUserId - ID del usuario administrador
     */
    async initializeDefaultConfigs(adminUserId) {
        try {
            const defaultConfigs = [
                {
                    key: 'TIME_ENTRY_FUTURE_DAYS',
                    value: '7',
                    description: 'Número de días en el futuro permitidos para registro de tiempo'
                },
                {
                    key: 'TIME_ENTRY_PAST_DAYS',
                    value: '30',
                    description: 'Número de días en el pasado permitidos para registro de tiempo'
                },
                {
                    key: 'TIME_ENTRY_DATE_RESTRICTIONS_ENABLED',
                    value: 'true',
                    description: 'Habilitar restricciones de fecha para registro de tiempo'
                },
                {
                    key: 'TIME_ENTRY_MAX_HOURS_PER_DAY',
                    value: '24',
                    description: 'Máximo número de horas que se pueden registrar por día'
                },
                {
                    key: 'TIME_ENTRY_MIN_HOURS',
                    value: '0.25',
                    description: 'Mínimo número de horas que se pueden registrar en una entrada'
                }
            ];

            for (const config of defaultConfigs) {
                const existing = await this.getConfig(config.key);
                if (!existing) {
                    await this.setConfig(config.key, config.value, config.description, adminUserId);
                    logger.info(`Configuración por defecto ${config.key} inicializada`);
                }
            }
        } catch (error) {
            logger.error('Error al inicializar configuraciones por defecto:', error);
            throw new Error('Error al inicializar configuraciones del sistema');
        }
    }
}

module.exports = SystemConfigService;