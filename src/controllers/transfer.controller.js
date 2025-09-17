const { PrismaClient } = require('@prisma/client');
const transferService = require('../services/transfer.service');
const enhancedProjectService = require('../services/project.enhanced.service');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Controlador para gestión de transferencias de proyectos
 */
class TransferController {
    /**
     * Transferir proyecto entre áreas
     */
    async transferProject(req, res) {
        try {
            const { projectId, toAreaId, notes } = req.body;

            if (!projectId || !toAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren projectId y toAreaId'
                });
            }

            const result = await transferService.transferProjectBetweenAreas(
                projectId,
                toAreaId,
                req.user.userId,
                notes
            );

            res.status(200).json({
                success: true,
                message: result.requiresApproval
                    ? 'Transferencia enviada para aprobación'
                    : 'Proyecto transferido exitosamente',
                data: result
            });

        } catch (error) {
            logger.error('Error transfiriendo proyecto:', error);
            res.status(500).json({
                success: false,
                message: 'Error transfiriendo proyecto',
                error: error.message
            });
        }
    }

    /**
     * Obtener próximos pasos disponibles para un proyecto
     */
    async getAvailableNextSteps(req, res) {
        try {
            const { projectId } = req.params;

            const nextSteps = await transferService.getAvailableNextSteps(projectId);

            res.status(200).json({
                success: true,
                data: nextSteps
            });

        } catch (error) {
            logger.error('Error obteniendo próximos pasos:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo próximos pasos',
                error: error.message
            });
        }
    }

    /**
     * Obtener historial de transferencias de un proyecto
     */
    async getProjectTransferHistory(req, res) {
        try {
            const { projectId } = req.params;

            const history = await transferService.getProjectTransferHistory(projectId);

            res.status(200).json({
                success: true,
                data: history
            });

        } catch (error) {
            logger.error('Error obteniendo historial:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo historial de transferencias',
                error: error.message
            });
        }
    }

    /**
     * Obtener transferencias pendientes para un área
     */
    async getPendingTransfersForArea(req, res) {
        try {
            const { areaId } = req.params;

            const pendingTransfers = await transferService.getPendingTransfersForArea(areaId);

            res.status(200).json({
                success: true,
                data: pendingTransfers
            });

        } catch (error) {
            logger.error('Error obteniendo transferencias pendientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo transferencias pendientes',
                error: error.message
            });
        }
    }

    /**
     * Procesar aprobación de transferencia
     */
    async processTransferApproval(req, res) {
        try {
            const { transferId } = req.params;
            const { approved, comments } = req.body;

            if (typeof approved !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere campo "approved" como boolean'
                });
            }

            const result = await transferService.processTransferApproval(
                transferId,
                approved,
                req.user.userId,
                comments
            );

            res.status(200).json({
                success: true,
                message: approved
                    ? 'Transferencia aprobada exitosamente'
                    : 'Transferencia rechazada',
                data: result
            });

        } catch (error) {
            logger.error('Error procesando aprobación:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando aprobación de transferencia',
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas de transferencias
     */
    async getTransferStatistics(req, res) {
        try {
            const { areaId, dateFrom, dateTo } = req.query;

            const stats = await transferService.getTransferStatistics(
                areaId,
                dateFrom,
                dateTo
            );

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas de transferencias',
                error: error.message
            });
        }
    }

    /**
     * Validar si un proyecto puede ser transferido
     */
    async validateTransfer(req, res) {
        try {
            const { projectId, toAreaId } = req.body;

            if (!projectId || !toAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren projectId y toAreaId'
                });
            }

            const validation = await enhancedProjectService.validateProjectAdvancement(
                projectId,
                toAreaId
            );

            res.status(200).json({
                success: true,
                data: validation
            });

        } catch (error) {
            logger.error('Error validando transferencia:', error);
            res.status(500).json({
                success: false,
                message: 'Error validando transferencia',
                error: error.message
            });
        }
    }

    /**
     * Obtener transferencias por filtros
     */
    async getTransfers(req, res) {
        try {
            const {
                areaId,
                projectId,
                status,
                transferType,
                dateFrom,
                dateTo,
                page = 1,
                limit = 20
            } = req.query;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const where = {};

            if (areaId) {
                where.OR = [
                    { fromAreaId: areaId },
                    { toAreaId: areaId }
                ];
            }
            if (projectId) where.projectId = projectId;
            if (status) where.status = status;
            if (transferType) where.transferType = transferType;

            if (dateFrom || dateTo) {
                where.transferDate = {};
                if (dateFrom) where.transferDate.gte = new Date(dateFrom);
                if (dateTo) where.transferDate.lte = new Date(dateTo);
            }

            const [transfers, total] = await Promise.all([
                prisma.transferLog.findMany({
                    where,
                    include: {
                        project: {
                            include: {
                                client: true
                            }
                        },
                        fromArea: true,
                        toArea: true,
                        approvedByUser: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { transferDate: 'desc' },
                    take: parseInt(limit),
                    skip: (parseInt(page) - 1) * parseInt(limit)
                }),
                prisma.transferLog.count({ where })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    transfers,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo transferencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo transferencias',
                error: error.message
            });
        }
    }

    /**
     * Obtener detalles de una transferencia específica
     */
    async getTransferDetails(req, res) {
        try {
            const { transferId } = req.params;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const transfer = await prisma.transferLog.findUnique({
                where: { id: transferId },
                include: {
                    project: {
                        include: {
                            client: true,
                            projectStage: true
                        }
                    },
                    fromArea: true,
                    toArea: true,
                    approvedByUser: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    stagingProject: true
                }
            });

            if (!transfer) {
                return res.status(404).json({
                    success: false,
                    message: 'Transferencia no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                data: transfer
            });

        } catch (error) {
            logger.error('Error obteniendo detalles de transferencia:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo detalles de transferencia',
                error: error.message
            });
        }
    }

    /**
     * Obtener resumen de actividad de transferencias
     */
    async getTransferActivitySummary(req, res) {
        try {
            const { areaId, days = 30 } = req.query;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - parseInt(days));

            const where = {
                transferDate: {
                    gte: dateFrom
                }
            };

            if (areaId) {
                where.OR = [
                    { fromAreaId: areaId },
                    { toAreaId: areaId }
                ];
            }

            const [
                totalTransfers,
                pendingApprovals,
                recentTransfers,
                topAreas
            ] = await Promise.all([
                // Total de transferencias
                prisma.transferLog.count({ where }),

                // Transferencias pendientes
                prisma.transferLog.count({
                    where: {
                        ...where,
                        status: 'PENDING_APPROVAL'
                    }
                }),

                // Transferencias recientes
                prisma.transferLog.findMany({
                    where,
                    include: {
                        project: {
                            include: {
                                client: true
                            }
                        },
                        fromArea: true,
                        toArea: true
                    },
                    orderBy: { transferDate: 'desc' },
                    take: 10
                }),

                // Áreas más activas
                prisma.transferLog.groupBy({
                    by: ['toAreaId'],
                    where,
                    _count: true,
                    orderBy: {
                        _count: {
                            toAreaId: 'desc'
                        }
                    },
                    take: 5
                })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalTransfers,
                        pendingApprovals,
                        period: `${days} días`
                    },
                    recentActivity: recentTransfers,
                    topDestinationAreas: topAreas
                }
            });

        } catch (error) {
            logger.error('Error obteniendo resumen de actividad:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo resumen de actividad',
                error: error.message
            });
        }
    }
}

module.exports = TransferController;