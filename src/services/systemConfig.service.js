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