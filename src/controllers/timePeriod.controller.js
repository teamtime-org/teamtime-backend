const TimePeriodRepository = require('../repositories/timePeriod.repository');
const { timePeriodValidator } = require('../validators/timePeriod.validator');
const logger = require('../utils/logger');
const { USER_ROLES, ERROR_MESSAGES } = require('../utils/constants');

class TimePeriodController {
    constructor() {
        this.timePeriodRepository = new TimePeriodRepository();
    }

    /**
     * Obtener todos los períodos de tiempo
     */
    async getAll(req, res) {
        try {
            const { page = 1, limit = 50, ...filters } = req.query;
            
            const pagination = {
                skip: (parseInt(page) - 1) * parseInt(limit),
                limit: parseInt(limit)
            };

            const result = await this.timePeriodRepository.findMany(filters, pagination);
            
            res.json({
                success: true,
                message: 'Períodos de tiempo obtenidos exitosamente',
                data: result
            });

        } catch (error) {
            logger.error('Error al obtener períodos de tiempo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener período por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            
            const period = await this.timePeriodRepository.findById(id);
            
            if (!period) {
                return res.status(404).json({
                    success: false,
                    message: 'Período de tiempo no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Período de tiempo obtenido exitosamente',
                data: period
            });

        } catch (error) {
            logger.error('Error al obtener período de tiempo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Crear un nuevo período de tiempo
     */
    async create(req, res) {
        try {
            // Solo administradores pueden crear períodos
            if (req.user.role !== USER_ROLES.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: ERROR_MESSAGES.FORBIDDEN
                });
            }

            const { error, value } = timePeriodValidator.create.validate(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación en los datos enviados',
                    errors: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message
                    }))
                });
            }

            const period = await this.timePeriodRepository.create(value);
            
            logger.info(`Período de tiempo creado: ${period.id}`, {
                userId: req.user.userId,
                periodId: period.id
            });

            res.status(201).json({
                success: true,
                message: 'Período de tiempo creado exitosamente',
                data: period
            });

        } catch (error) {
            logger.error('Error al crear período de tiempo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Crear múltiples períodos de tiempo
     */
    async createBulk(req, res) {
        try {
            // Solo administradores pueden crear períodos
            if (req.user.role !== USER_ROLES.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: ERROR_MESSAGES.FORBIDDEN
                });
            }

            const { periods } = req.body;

            if (!Array.isArray(periods) || periods.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de períodos'
                });
            }

            // Validar cada período
            for (const period of periods) {
                const { error } = timePeriodValidator.create.validate(period);
                if (error) {
                    return res.status(400).json({
                        success: false,
                        message: 'Error de validación en uno de los períodos',
                        errors: error.details.map(detail => ({
                            field: detail.path.join('.'),
                            message: detail.message
                        }))
                    });
                }
            }

            const result = await this.timePeriodRepository.createMany(periods);
            
            logger.info(`Períodos creados masivamente: ${result.created.length} creados, ${result.skipped.length} omitidos, ${result.errors.length} errores`, {
                userId: req.user.userId
            });

            res.status(201).json({
                success: true,
                message: `${result.created.length} períodos creados exitosamente`,
                data: result
            });

        } catch (error) {
            logger.error('Error al crear períodos masivamente:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Actualizar período de tiempo
     */
    async update(req, res) {
        try {
            // Solo administradores pueden actualizar períodos
            if (req.user.role !== USER_ROLES.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: ERROR_MESSAGES.FORBIDDEN
                });
            }

            const { id } = req.params;
            const { error, value } = timePeriodValidator.update.validate(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación en los datos enviados',
                    errors: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message
                    }))
                });
            }

            const period = await this.timePeriodRepository.update(id, value);
            
            logger.info(`Período de tiempo actualizado: ${id}`, {
                userId: req.user.userId,
                periodId: id
            });

            res.json({
                success: true,
                message: 'Período de tiempo actualizado exitosamente',
                data: period
            });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    message: 'Período de tiempo no encontrado'
                });
            }

            logger.error('Error al actualizar período de tiempo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Eliminar período de tiempo
     */
    async delete(req, res) {
        try {
            // Solo administradores pueden eliminar períodos
            if (req.user.role !== USER_ROLES.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: ERROR_MESSAGES.FORBIDDEN
                });
            }

            const { id } = req.params;
            
            await this.timePeriodRepository.delete(id);
            
            logger.info(`Período de tiempo eliminado: ${id}`, {
                userId: req.user.userId,
                periodId: id
            });

            res.json({
                success: true,
                message: 'Período de tiempo eliminado exitosamente'
            });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    message: 'Período de tiempo no encontrado'
                });
            }

            logger.error('Error al eliminar período de tiempo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener período actual
     */
    async getCurrent(req, res) {
        try {
            const period = await this.timePeriodRepository.getCurrentPeriod();
            
            if (!period) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay período activo actualmente'
                });
            }

            res.json({
                success: true,
                message: 'Período actual obtenido exitosamente',
                data: period
            });

        } catch (error) {
            logger.error('Error al obtener período actual:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener períodos por rango de fecha
     */
    async getByDateRange(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren las fechas de inicio y fin'
                });
            }

            const periods = await this.timePeriodRepository.findByDateRange(
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                message: 'Períodos obtenidos exitosamente',
                data: periods
            });

        } catch (error) {
            logger.error('Error al obtener períodos por rango:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener estadísticas de un período
     */
    async getStatistics(req, res) {
        try {
            const { id } = req.params;
            
            const statistics = await this.timePeriodRepository.getStatistics(id);

            res.json({
                success: true,
                message: 'Estadísticas del período obtenidas exitosamente',
                data: statistics
            });

        } catch (error) {
            if (error.message === 'Período no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            logger.error('Error al obtener estadísticas del período:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Comparar horas trabajadas vs referencia
     */
    async getComparison(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.query;
            
            const comparison = await this.timePeriodRepository.getComparison(id, userId);

            res.json({
                success: true,
                message: 'Comparación obtenida exitosamente',
                data: comparison
            });

        } catch (error) {
            if (error.message === 'Período no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            logger.error('Error al obtener comparación:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

const controller = new TimePeriodController();

module.exports = {
    getAll: controller.getAll.bind(controller),
    getById: controller.getById.bind(controller),
    create: controller.create.bind(controller),
    createBulk: controller.createBulk.bind(controller),
    update: controller.update.bind(controller),
    delete: controller.delete.bind(controller),
    getCurrent: controller.getCurrent.bind(controller),
    getByDateRange: controller.getByDateRange.bind(controller),
    getStatistics: controller.getStatistics.bind(controller),
    getComparison: controller.getComparison.bind(controller)
};