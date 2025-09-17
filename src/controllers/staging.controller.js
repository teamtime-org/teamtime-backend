const stagingService = require('../services/staging.service');
const excelImportService = require('../services/excelImport.service');
const transferService = require('../services/transfer.service');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de proyectos en staging area
 */
class StagingController {
    /**
     * Obtener proyectos en staging por área
     */
    async getStagingProjectsByArea(req, res) {
        try {
            const { sourceAreaId, status, page = 1, limit = 20 } = req.query;

            // Usar el nuevo servicio de staging para obtener proyectos
            const result = await stagingService.getAllStagingProjects({
                sourceAreaId,
                status,
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.status(200).json({
                success: true,
                data: {
                    projects: result.projects,
                    pagination: result.pagination
                }
            });

        } catch (error) {
            logger.error('Error obteniendo staging projects:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo proyectos en staging',
                error: error.message
            });
        }
    }

    /**
     * Obtener proyecto staging específico
     */
    async getStagingProject(req, res) {
        try {
            const { id } = req.params;
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const stagingProject = await prisma.stagingProject.findUnique({
                where: { id },
                include: {
                    sourceArea: true,
                    client: true,
                    projectStage: true,
                    importLog: true
                }
            });

            if (!stagingProject) {
                return res.status(404).json({
                    success: false,
                    message: 'Proyecto staging no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                data: stagingProject
            });

        } catch (error) {
            logger.error('Error obteniendo staging project:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo proyecto staging',
                error: error.message
            });
        }
    }

    /**
     * Actualizar estado de proyecto staging
     */
    async updateStagingProjectStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CORRECTION'];

            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Estados válidos: ' + validStatuses.join(', ')
                });
            }

            const updatedProject = await excelImportService.updateStagingProjectStatus(
                id,
                status,
                notes
            );

            res.status(200).json({
                success: true,
                message: `Estado actualizado a: ${status}`,
                data: updatedProject
            });

        } catch (error) {
            logger.error('Error actualizando estado staging:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando estado del proyecto',
                error: error.message
            });
        }
    }

    /**
     * Transferir proyecto staging a proyecto activo
     */
    async transferToActive(req, res) {
        try {
            const { id } = req.params;

            const activeProject = await transferService.transferStagingToActive(
                id,
                req.user.userId
            );

            res.status(201).json({
                success: true,
                message: `Proyecto transferido exitosamente. ID interno: ${activeProject.internalId}`,
                data: activeProject
            });

        } catch (error) {
            logger.error('Error transfiriendo staging a activo:', error);
            res.status(500).json({
                success: false,
                message: 'Error transfiriendo proyecto a activo',
                error: error.message
            });
        }
    }

    /**
     * Transferir múltiples proyectos staging a activos
     */
    async batchTransferToActive(req, res) {
        try {
            const { stagingProjectIds } = req.body;

            if (!Array.isArray(stagingProjectIds) || stagingProjectIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de IDs de staging projects'
                });
            }

            const results = [];
            const errors = [];

            for (const stagingId of stagingProjectIds) {
                try {
                    const activeProject = await transferService.transferStagingToActive(
                        stagingId,
                        req.user.userId
                    );
                    results.push({
                        stagingId,
                        activeProject: activeProject,
                        success: true
                    });
                } catch (error) {
                    errors.push({
                        stagingId,
                        error: error.message,
                        success: false
                    });
                }
            }

            res.status(200).json({
                success: true,
                message: `Transferencia masiva completada: ${results.length} exitosos, ${errors.length} errores`,
                data: {
                    successful: results,
                    errors: errors,
                    summary: {
                        total: stagingProjectIds.length,
                        successful: results.length,
                        failed: errors.length
                    }
                }
            });

        } catch (error) {
            logger.error('Error en transferencia masiva:', error);
            res.status(500).json({
                success: false,
                message: 'Error en transferencia masiva',
                error: error.message
            });
        }
    }

    /**
     * Eliminar proyecto staging
     */
    async deleteStagingProject(req, res) {
        try {
            const { id } = req.params;

            await excelImportService.deleteStagingProject(id);

            res.status(200).json({
                success: true,
                message: 'Proyecto staging eliminado exitosamente'
            });

        } catch (error) {
            logger.error('Error eliminando staging project:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando proyecto staging',
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas de staging por área
     */
    async getStagingStatistics(req, res) {
        try {
            const { sourceAreaId } = req.query;

            if (!sourceAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Área de origen requerida'
                });
            }

            const projects = await excelImportService.getStagingProjectsByArea(sourceAreaId);

            const stats = {
                total: projects.length,
                byStatus: {
                    PENDING_REVIEW: projects.filter(p => p.status === 'PENDING_REVIEW').length,
                    APPROVED: projects.filter(p => p.status === 'APPROVED').length,
                    REJECTED: projects.filter(p => p.status === 'REJECTED').length,
                    NEEDS_CORRECTION: projects.filter(p => p.status === 'NEEDS_CORRECTION').length
                },
                readyForTransfer: projects.filter(p => p.status === 'APPROVED').length,
                recentImports: projects
                    .filter(p => {
                        const daysSinceImport = (new Date() - new Date(p.createdAt)) / (1000 * 60 * 60 * 24);
                        return daysSinceImport <= 7;
                    })
                    .length
            };

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas staging:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas',
                error: error.message
            });
        }
    }

    /**
     * Actualizar datos de proyecto staging
     */
    async updateStagingProject(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            // Validar que el proyecto existe
            const existingProject = await prisma.stagingProject.findUnique({
                where: { id }
            });

            if (!existingProject) {
                return res.status(404).json({
                    success: false,
                    message: 'Proyecto staging no encontrado'
                });
            }

            // Filtrar campos que se pueden actualizar
            const allowedFields = [
                'title', 'description', 'clientId', 'projectStageId',
                'assignedToId', 'startDate', 'estimatedEndDate',
                'tcvMXN', 'monthlyMXN', 'siebelId'
            ];

            const filteredData = Object.keys(updateData)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = updateData[key];
                    return obj;
                }, {});

            // Actualizar proyecto
            const updatedProject = await prisma.stagingProject.update({
                where: { id },
                data: {
                    ...filteredData,
                    updatedAt: new Date()
                },
                include: {
                    sourceArea: true,
                    client: true,
                    projectStage: true
                }
            });

            res.status(200).json({
                success: true,
                message: 'Proyecto staging actualizado exitosamente',
                data: updatedProject
            });

        } catch (error) {
            logger.error('Error actualizando staging project:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando proyecto staging',
                error: error.message
            });
        }
    }

    /**
     * Buscar proyectos staging
     */
    async searchStagingProjects(req, res) {
        try {
            const {
                query,
                sourceAreaId,
                status,
                clientId,
                dateFrom,
                dateTo,
                page = 1,
                limit = 20
            } = req.query;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const where = {};

            if (sourceAreaId) where.sourceAreaId = sourceAreaId;
            if (status) where.status = status;
            if (clientId) where.clientId = clientId;

            if (query) {
                where.OR = [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { siebelId: { contains: query, mode: 'insensitive' } }
                ];
            }

            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) where.createdAt.gte = new Date(dateFrom);
                if (dateTo) where.createdAt.lte = new Date(dateTo);
            }

            const [projects, total] = await Promise.all([
                prisma.stagingProject.findMany({
                    where,
                    include: {
                        sourceArea: true,
                        client: true,
                        projectStage: true,
                        importLog: {
                            select: {
                                fileName: true,
                                importDate: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: parseInt(limit),
                    skip: (parseInt(page) - 1) * parseInt(limit)
                }),
                prisma.stagingProject.count({ where })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    projects,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error buscando staging projects:', error);
            res.status(500).json({
                success: false,
                message: 'Error buscando proyectos staging',
                error: error.message
            });
        }
    }
}

module.exports = StagingController;