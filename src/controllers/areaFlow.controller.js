const areaFlowService = require('../services/areaFlow.service');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de flujos entre áreas
 */
class AreaFlowController {
    /**
     * Obtener todos los flujos de áreas
     */
    async getAreaFlows(req, res) {
        try {
            const { fromAreaId, toAreaId } = req.query;

            const flows = await areaFlowService.getAllAreaFlows({
                fromAreaId,
                toAreaId
            });

            res.status(200).json({
                success: true,
                data: flows
            });

        } catch (error) {
            logger.error('Error obteniendo flujos de áreas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo flujos de áreas',
                error: error.message
            });
        }
    }

    /**
     * Obtener flujos disponibles desde un área
     */
    async getAvailableFlowsFromArea(req, res) {
        try {
            const { fromAreaId } = req.params;

            const flows = await areaFlowService.getAvailableFlowsFromArea(fromAreaId);

            res.status(200).json({
                success: true,
                data: flows
            });

        } catch (error) {
            logger.error('Error obteniendo flujos:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo flujos disponibles',
                error: error.message
            });
        }
    }

    /**
     * Obtener flujo específico entre dos áreas
     */
    async getFlowBetweenAreas(req, res) {
        try {
            const { fromAreaId, toAreaId } = req.query;

            if (!fromAreaId || !toAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren fromAreaId y toAreaId'
                });
            }

            const flow = await areaFlowService.getFlowBetweenAreas(fromAreaId, toAreaId);

            if (!flow) {
                return res.status(404).json({
                    success: false,
                    message: 'No existe flujo configurado entre estas áreas'
                });
            }

            res.status(200).json({
                success: true,
                data: flow
            });

        } catch (error) {
            logger.error('Error obteniendo flujo:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo flujo entre áreas',
                error: error.message
            });
        }
    }

    /**
     * Obtener configuración completa de flujos
     */
    async getFlowConfiguration(req, res) {
        try {
            const configuration = await areaFlowService.getFlowConfiguration();

            res.status(200).json({
                success: true,
                data: configuration
            });

        } catch (error) {
            logger.error('Error obteniendo configuración:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo configuración de flujos',
                error: error.message
            });
        }
    }

    /**
     * Crear nuevo flujo entre áreas
     */
    async createAreaFlow(req, res) {
        try {
            const flowData = req.body;

            // Validaciones básicas
            const requiredFields = ['fromAreaId', 'toAreaId'];
            const missing = requiredFields.filter(field => !flowData[field]);

            if (missing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Campos requeridos faltantes: ${missing.join(', ')}`
                });
            }

            // Verificar que no existe un flujo duplicado
            const existingFlow = await areaFlowService.getFlowBetweenAreas(
                flowData.fromAreaId,
                flowData.toAreaId
            );

            if (existingFlow) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un flujo configurado entre estas áreas'
                });
            }

            const flow = await areaFlowService.createAreaFlow(flowData);

            res.status(201).json({
                success: true,
                message: 'Flujo creado exitosamente',
                data: flow
            });

        } catch (error) {
            logger.error('Error creando flujo:', error);
            res.status(500).json({
                success: false,
                message: 'Error creando flujo entre áreas',
                error: error.message
            });
        }
    }

    /**
     * Actualizar flujo existente
     */
    async updateAreaFlow(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const flow = await areaFlowService.updateAreaFlow(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Flujo actualizado exitosamente',
                data: flow
            });

        } catch (error) {
            logger.error('Error actualizando flujo:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando flujo',
                error: error.message
            });
        }
    }

    /**
     * Eliminar flujo (desactivar)
     */
    async deleteAreaFlow(req, res) {
        try {
            const { id } = req.params;

            await areaFlowService.updateAreaFlow(id, { isActive: false });

            res.status(200).json({
                success: true,
                message: 'Flujo eliminado exitosamente'
            });

        } catch (error) {
            logger.error('Error eliminando flujo:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando flujo',
                error: error.message
            });
        }
    }

    /**
     * Obtener siguiente paso obligatorio en el flujo
     */
    async getNextFlowStep(req, res) {
        try {
            const { fromAreaId } = req.params;

            const nextFlow = await areaFlowService.getNextFlowStep(fromAreaId);

            if (!nextFlow) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay siguiente paso obligatorio desde esta área'
                });
            }

            res.status(200).json({
                success: true,
                data: nextFlow
            });

        } catch (error) {
            logger.error('Error obteniendo siguiente paso:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo siguiente paso en el flujo',
                error: error.message
            });
        }
    }

    /**
     * Obtener flujos alternativos (opcionales)
     */
    async getAlternativeFlows(req, res) {
        try {
            const { fromAreaId } = req.params;

            const alternativeFlows = await areaFlowService.getAlternativeFlows(fromAreaId);

            res.status(200).json({
                success: true,
                data: alternativeFlows
            });

        } catch (error) {
            logger.error('Error obteniendo flujos alternativos:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo flujos alternativos',
                error: error.message
            });
        }
    }

    /**
     * Validar transferencia según flujo configurado
     */
    async validateTransfer(req, res) {
        try {
            const { projectId, fromAreaId, toAreaId } = req.body;

            if (!projectId || !fromAreaId || !toAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren projectId, fromAreaId y toAreaId'
                });
            }

            const validation = await areaFlowService.validateTransfer(
                projectId,
                fromAreaId,
                toAreaId
            );

            res.status(200).json({
                success: true,
                message: validation.isValid
                    ? 'Transferencia válida'
                    : 'Transferencia inválida',
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
     * Obtener estadísticas de flujos
     */
    async getFlowStatistics(req, res) {
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const [
                totalFlows,
                activeFlows,
                requiredFlows,
                approvalFlows,
                flowsByArea
            ] = await Promise.all([
                // Total de flujos
                prisma.areaFlow.count(),

                // Flujos activos
                prisma.areaFlow.count({
                    where: { isActive: true }
                }),

                // Flujos obligatorios
                prisma.areaFlow.count({
                    where: {
                        isActive: true,
                        isRequired: true
                    }
                }),

                // Flujos que requieren aprobación
                prisma.areaFlow.count({
                    where: {
                        isActive: true,
                        requiresApproval: true
                    }
                }),

                // Flujos por área de origen
                prisma.areaFlow.groupBy({
                    by: ['fromAreaId'],
                    where: { isActive: true },
                    _count: true
                })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    summary: {
                        total: totalFlows,
                        active: activeFlows,
                        required: requiredFlows,
                        withApproval: approvalFlows
                    },
                    byArea: flowsByArea
                }
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas de flujos',
                error: error.message
            });
        }
    }

    /**
     * Exportar configuración de flujos
     */
    async exportFlowConfiguration(req, res) {
        try {
            const configuration = await areaFlowService.getFlowConfiguration();

            const exportData = {
                exportDate: new Date(),
                version: '1.0',
                areas: configuration.map(area => ({
                    id: area.id,
                    name: area.name,
                    code: area.code,
                    flows: area.areaFlowFrom.map(flow => ({
                        toAreaId: flow.toAreaId,
                        toAreaName: flow.toArea.name,
                        flowOrder: flow.flowOrder,
                        isRequired: flow.isRequired,
                        requiresApproval: flow.requiresApproval,
                        canSkip: flow.canSkip,
                        conditions: flow.conditions
                    }))
                }))
            };

            res.status(200).json({
                success: true,
                data: exportData
            });

        } catch (error) {
            logger.error('Error exportando configuración:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando configuración de flujos',
                error: error.message
            });
        }
    }

    /**
     * Importar configuración de flujos
     */
    async importFlowConfiguration(req, res) {
        try {
            const { areas } = req.body;

            if (!Array.isArray(areas)) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de áreas con sus flujos'
                });
            }

            const importedFlows = [];
            const errors = [];

            for (const area of areas) {
                if (!area.flows || !Array.isArray(area.flows)) continue;

                for (const flow of area.flows) {
                    try {
                        const flowData = {
                            fromAreaId: area.id,
                            toAreaId: flow.toAreaId,
                            flowOrder: flow.flowOrder,
                            isRequired: flow.isRequired,
                            requiresApproval: flow.requiresApproval,
                            canSkip: flow.canSkip,
                            conditions: flow.conditions,
                            isActive: true
                        };

                        const created = await areaFlowService.createAreaFlow(flowData);
                        importedFlows.push(created);
                    } catch (error) {
                        errors.push({
                            flow: `${area.name} -> ${flow.toAreaName}`,
                            error: error.message
                        });
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: `Importación completada: ${importedFlows.length} flujos creados, ${errors.length} errores`,
                data: {
                    imported: importedFlows,
                    errors
                }
            });

        } catch (error) {
            logger.error('Error importando configuración:', error);
            res.status(500).json({
                success: false,
                message: 'Error importando configuración de flujos',
                error: error.message
            });
        }
    }

    /**
     * Visualizar flujo como diagrama de datos
     */
    async getFlowDiagram(req, res) {
        try {
            const configuration = await areaFlowService.getFlowConfiguration();

            // Generar nodos y conexiones para visualización
            const nodes = configuration.map(area => ({
                id: area.id,
                label: area.name,
                type: 'area',
                level: area.orderIndex
            }));

            const edges = [];
            configuration.forEach(area => {
                area.areaFlowFrom.forEach(flow => {
                    edges.push({
                        from: area.id,
                        to: flow.toAreaId,
                        label: flow.isRequired ? 'Requerido' : 'Opcional',
                        style: {
                            color: flow.requiresApproval ? '#ff9800' : '#4caf50',
                            dashed: !flow.isRequired
                        }
                    });
                });
            });

            res.status(200).json({
                success: true,
                data: {
                    nodes,
                    edges
                }
            });

        } catch (error) {
            logger.error('Error generando diagrama:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando diagrama de flujo',
                error: error.message
            });
        }
    }
}

module.exports = AreaFlowController;