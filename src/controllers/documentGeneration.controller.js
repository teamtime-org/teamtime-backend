const documentGenerationService = require('../services/documentGeneration.service');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Controlador para generación de documentos
 */
class DocumentGenerationController {
    /**
     * Generar documento para proyecto
     */
    async generateDocument(req, res) {
        try {
            const { projectId, templateName, templateType = 'transfer' } = req.body;

            if (!projectId || !templateName) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren projectId y templateName'
                });
            }

            const result = await documentGenerationService.generateDocument(
                templateName,
                projectId,
                templateType
            );

            res.status(201).json({
                success: true,
                message: 'Documento generado exitosamente',
                data: {
                    documentId: result.documentLog.id,
                    filename: result.filename,
                    templateName,
                    templateType,
                    generatedAt: result.documentLog.generatedAt
                }
            });

        } catch (error) {
            logger.error('Error generando documento:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando documento',
                error: error.message
            });
        }
    }

    /**
     * Descargar documento generado
     */
    async downloadDocument(req, res) {
        try {
            const { documentId } = req.params;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const document = await prisma.generatedDocument.findUnique({
                where: { id: documentId }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento no encontrado'
                });
            }

            // Verificar que el archivo existe
            try {
                await fs.access(document.filePath);
            } catch {
                return res.status(404).json({
                    success: false,
                    message: 'Archivo de documento no encontrado'
                });
            }

            // Determinar content-type basado en extensión
            const extension = path.extname(document.filename).toLowerCase();
            const contentTypes = {
                '.pdf': 'application/pdf',
                '.html': 'text/html',
                '.txt': 'text/plain',
                '.md': 'text/markdown',
                '.tex': 'application/x-tex'
            };

            const contentType = contentTypes[extension] || 'application/octet-stream';

            // Configurar headers para descarga
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);

            // Leer y enviar archivo
            const fileContent = await fs.readFile(document.filePath);
            res.send(fileContent);

        } catch (error) {
            logger.error('Error descargando documento:', error);
            res.status(500).json({
                success: false,
                message: 'Error descargando documento',
                error: error.message
            });
        }
    }

    /**
     * Obtener documentos generados para un proyecto
     */
    async getProjectDocuments(req, res) {
        try {
            const { projectId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const documents = await documentGenerationService.getProjectDocuments(projectId);

            // Aplicar paginación
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);
            const paginatedDocs = documents.slice(startIndex, endIndex);

            res.status(200).json({
                success: true,
                data: {
                    documents: paginatedDocs,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: documents.length,
                        pages: Math.ceil(documents.length / limit)
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo documentos:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo documentos del proyecto',
                error: error.message
            });
        }
    }

    /**
     * Obtener plantillas disponibles
     */
    async getAvailableTemplates(req, res) {
        try {
            const { templateType } = req.query;

            const templates = await documentGenerationService.getAvailableTemplates(templateType);

            res.status(200).json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Error obteniendo plantillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo plantillas disponibles',
                error: error.message
            });
        }
    }

    /**
     * Crear o actualizar plantilla
     */
    async saveTemplate(req, res) {
        try {
            const {
                name,
                type,
                content,
                format = 'html',
                variables = [],
                metadata = {},
                isActive = true
            } = req.body;

            if (!name || !type || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren name, type y content'
                });
            }

            const template = await documentGenerationService.saveTemplate({
                name,
                type,
                content,
                format,
                variables,
                metadata,
                isActive
            });

            res.status(201).json({
                success: true,
                message: 'Plantilla guardada exitosamente',
                data: template
            });

        } catch (error) {
            logger.error('Error guardando plantilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error guardando plantilla',
                error: error.message
            });
        }
    }

    /**
     * Previsualizar documento sin generarlo
     */
    async previewDocument(req, res) {
        try {
            const { projectId, templateName, templateType = 'transfer' } = req.body;

            if (!projectId || !templateName) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren projectId y templateName'
                });
            }

            // Obtener datos del proyecto
            const projectData = await documentGenerationService.getProjectData(projectId);

            // Obtener plantilla
            const template = await documentGenerationService.getTemplate(templateName, templateType);

            // Procesar plantilla
            const content = await documentGenerationService.processTemplate(template, projectData);

            res.status(200).json({
                success: true,
                data: {
                    content,
                    format: template.format,
                    variables: template.variables,
                    projectData: {
                        title: projectData.title,
                        internalId: projectData.internalId,
                        client: projectData.client?.name,
                        area: projectData.area?.name
                    }
                }
            });

        } catch (error) {
            logger.error('Error previsualizando documento:', error);
            res.status(500).json({
                success: false,
                message: 'Error previsualizando documento',
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas de generación de documentos
     */
    async getDocumentStatistics(req, res) {
        try {
            const { templateType, dateFrom, dateTo } = req.query;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const where = {};

            if (templateType) where.templateType = templateType;
            if (dateFrom || dateTo) {
                where.generatedAt = {};
                if (dateFrom) where.generatedAt.gte = new Date(dateFrom);
                if (dateTo) where.generatedAt.lte = new Date(dateTo);
            }

            const [
                totalDocuments,
                documentsByType,
                documentsByTemplate,
                recentDocuments
            ] = await Promise.all([
                // Total de documentos
                prisma.generatedDocument.count({ where }),

                // Documentos por tipo
                prisma.generatedDocument.groupBy({
                    by: ['templateType'],
                    where,
                    _count: true
                }),

                // Documentos por plantilla
                prisma.generatedDocument.groupBy({
                    by: ['templateName'],
                    where,
                    _count: true,
                    orderBy: {
                        _count: {
                            templateName: 'desc'
                        }
                    },
                    take: 10
                }),

                // Documentos recientes
                prisma.generatedDocument.findMany({
                    where,
                    include: {
                        project: {
                            include: {
                                client: true
                            }
                        }
                    },
                    orderBy: { generatedAt: 'desc' },
                    take: 10
                })
            ]);

            const stats = {
                total: totalDocuments,
                byType: documentsByType.reduce((acc, item) => {
                    acc[item.templateType] = item._count;
                    return acc;
                }, {}),
                topTemplates: documentsByTemplate.map(item => ({
                    templateName: item.templateName,
                    count: item._count
                })),
                recent: recentDocuments
            };

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas de documentos',
                error: error.message
            });
        }
    }

    /**
     * Eliminar documento
     */
    async deleteDocument(req, res) {
        try {
            const { documentId } = req.params;

            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            // Obtener documento para eliminar archivo físico
            const document = await prisma.generatedDocument.findUnique({
                where: { id: documentId }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento no encontrado'
                });
            }

            // Eliminar archivo físico si existe
            try {
                await fs.unlink(document.filePath);
            } catch (fileError) {
                logger.warn('No se pudo eliminar archivo físico:', fileError.message);
            }

            // Eliminar registro de base de datos
            await prisma.generatedDocument.delete({
                where: { id: documentId }
            });

            res.status(200).json({
                success: true,
                message: 'Documento eliminado exitosamente'
            });

        } catch (error) {
            logger.error('Error eliminando documento:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando documento',
                error: error.message
            });
        }
    }

    /**
     * Generar documentos masivos para múltiples proyectos
     */
    async batchGenerateDocuments(req, res) {
        try {
            const { projectIds, templateName, templateType = 'transfer' } = req.body;

            if (!Array.isArray(projectIds) || projectIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de projectIds'
                });
            }

            if (!templateName) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere templateName'
                });
            }

            const results = [];
            const errors = [];

            for (const projectId of projectIds) {
                try {
                    const result = await documentGenerationService.generateDocument(
                        templateName,
                        projectId,
                        templateType
                    );

                    results.push({
                        projectId,
                        documentId: result.documentLog.id,
                        filename: result.filename,
                        success: true
                    });
                } catch (error) {
                    errors.push({
                        projectId,
                        error: error.message,
                        success: false
                    });
                }
            }

            res.status(200).json({
                success: true,
                message: `Generación masiva completada: ${results.length} exitosos, ${errors.length} errores`,
                data: {
                    successful: results,
                    errors: errors,
                    summary: {
                        total: projectIds.length,
                        successful: results.length,
                        failed: errors.length
                    }
                }
            });

        } catch (error) {
            logger.error('Error en generación masiva:', error);
            res.status(500).json({
                success: false,
                message: 'Error en generación masiva de documentos',
                error: error.message
            });
        }
    }
}

module.exports = DocumentGenerationController;