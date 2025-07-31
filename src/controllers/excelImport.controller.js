const ExcelImportService = require('../services/excelImport.service');
const logger = require('../utils/logger');
const prisma = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const extension = path.extname(file.originalname);
        cb(null, `excel-import-${timestamp}${extension}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite
    }
});

/**
 * Controlador para importación de proyectos desde Excel
 */
class ExcelImportController {
    constructor() {
        this.excelImportService = new ExcelImportService();
        this.upload = upload.single('excelFile');
    }

    /**
     * Importar proyectos desde Excel
     * @param {Object} req 
     * @param {Object} res 
     * @returns {Promise<void>}
     */
    async importProjects(req, res) {
        try {
            // Manejar subida de archivo
            this.upload(req, res, async (err) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return res.status(400).json({
                                success: false,
                                message: 'El archivo es demasiado grande. Máximo 10MB permitido.'
                            });
                        }
                    }
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }

                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: 'No se proporcionó archivo Excel'
                    });
                }

                // Validar área seleccionada e importación incremental
                const { areaId, isIncremental } = req.body;
                if (!areaId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debe seleccionar un área para los proyectos'
                    });
                }

                const incrementalMode = isIncremental === 'true' || isIncremental === true;

                // Verificar que el área existe
                try {
                    const area = await prisma.area.findUnique({
                        where: { id: areaId, isActive: true }
                    });

                    if (!area) {
                        return res.status(400).json({
                            success: false,
                            message: 'El área seleccionada no existe'
                        });
                    }
                } catch (areaError) {
                    return res.status(400).json({
                        success: false,
                        message: 'Error validando área seleccionada'
                    });
                }

                try {
                    logger.info(`Iniciando importación de Excel: ${req.file.filename} por usuario ${req.user?.email || 'USUARIO_NO_DEFINIDO'} en área ${areaId} (incremental: ${incrementalMode})`);

                    if (!req.user) {
                        return res.status(401).json({
                            success: false,
                            message: 'Usuario no autenticado'
                        });
                    }

                    const result = await this.excelImportService.importFromExcel(
                        req.file.path,
                        req.user,
                        areaId,
                        incrementalMode
                    );

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) {
                            logger.warn('Error eliminando archivo temporal:', unlinkErr);
                        }
                    });

                    // Preparar respuesta con información detallada
                    const response = {
                        success: true,
                        message: this.generateImportMessage(result),
                        data: {
                            processed: result.success,
                            errors: result.errors.length,
                            warnings: result.warnings?.length || 0,
                            created: result.created.length,
                            updated: result.updated.length,
                            summary: {
                                totalRows: result.success + result.errors.length,
                                successRate: ((result.success / (result.success + result.errors.length)) * 100).toFixed(2) + '%'
                            }
                        }
                    };

                    // Incluir detalles de errores si hay fallos
                    if (result.errors.length > 0) {
                        response.data.errorDetails = result.errors.map(error => ({
                            row: error.row,
                            errorType: error.errorType,
                            message: error.error,
                            missingFields: error.details?.missingFields || [],
                            invalidFields: error.details?.invalidFields || []
                        }));

                        // Si hay reporte de errores generado, incluir información
                        if (result.errorReport) {
                            response.data.errorReport = {
                                available: true,
                                filename: result.errorReport.filename,
                                totalErrors: result.errorReport.totalErrors
                            };

                            // Almacenar temporalmente el buffer para descarga
                            if (result.errorReport.buffer) {
                                // En un entorno de producción, esto se almacenaría en un storage más persistente
                                req.session = req.session || {};
                                req.session.errorReportBuffer = result.errorReport.buffer;
                                req.session.errorReportFilename = result.errorReport.filename;
                            }
                        }
                    }

                    // Incluir warnings si los hay
                    if (result.warnings && result.warnings.length > 0) {
                        response.data.warnings = result.warnings.map(warning => ({
                            row: warning.row,
                            message: warning.warning
                        }));
                    }

                    res.status(200).json(response);

                } catch (importError) {
                    logger.error('Error en importación:', importError);

                    // Limpiar archivo temporal en caso de error
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) {
                            logger.warn('Error eliminando archivo temporal:', unlinkErr);
                        }
                    });

                    res.status(500).json({
                        success: false,
                        message: 'Error interno del servidor durante la importación',
                        error: importError.message
                    });
                }
            });

        } catch (error) {
            logger.error('Error en controlador de importación:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtener plantilla de Excel para importación
     * @param {Object} req 
     * @param {Object} res 
     * @returns {Promise<void>}
     */
    async downloadTemplate(req, res) {
        try {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Proyectos');

            // Definir headers basados en el mapeo de columnas
            const headers = [
                'ID',
                'Title',
                'Descripcion Servicio',
                'Estatus General',
                'Proximos Pasos',
                'Mentor',
                'Fecha Asignacion',
                'Etapa de Proyecto',
                'Riesgo',
                'Tipo de Proyecto',
                'Tabla Resumen',
                'Coordinador',
                'Linea de Negocios',
                'Tipo de Oportunidad',
                '¿Proyecto Estrategico?',
                'Tipo de Riesgo',
                'Fecha Termino Estimada',
                'Actualizacion Fecha Termino Estimada',
                'Fecha de Termino Real',
                'Control Presupuestal',
                'Monto Total del Contrato MXN',
                'Ingreso',
                'Periodo Contratacion (Meses)',
                'Facturacion Mensual MXN',
                'Penalizacion',
                'Proveedores Involucrados',
                'Fecha Fallo/Adjudicacion',
                'Fecha Transferencia Diseño',
                'Fecha de entrega por Licitacion',
                'Segmento',
                'Gerencia de Ventas',
                'Ejecutivo Ventas',
                'Diseñador',
                'Orden de Siebel/Numero de Proceso',
                'Orden en Progreso',
                'Ordenes Relacionadas (Siebel)',
                '¿Aplica Control de Cambios?',
                'Justificación',
                'SharePoint Documentacion',
                'Respositorio Estratel'
            ];

            // Agregar headers
            worksheet.addRow(headers);

            // Estilizar headers
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Ajustar ancho de columnas
            worksheet.columns.forEach((column, index) => {
                column.width = Math.max(headers[index].length + 2, 15);
            });

            // Agregar fila de ejemplo
            const exampleRow = [
                1,
                'Proyecto Ejemplo',
                'Descripción del servicio ejemplo',
                'En progreso',
                'Definir próximos pasos',
                'Juan Pérez;#123',
                '2025-07-30',
                'Implementación',
                'Medio',
                'PROYECTO',
                'Tabla de resumen del proyecto',
                'María García;#456',
                'TELCO',
                'Renovacion',
                'NO',
                'Operativo;Tiempo',
                '2025-12-31',
                '2025-12-31',
                '',
                'Estándar',
                1500000.00,
                1500000.00,
                12,
                125000.00,
                '5% por día de retraso',
                'Proveedor A, Proveedor B',
                '2025-06-15',
                '2025-07-01',
                '2025-12-31',
                'Federal',
                'Gerencia Norte',
                'Carlos López;#789',
                'Ana Martínez;#101',
                '1-2EXAMPLE',
                'NO',
                '1-2RELATED',
                'SI',
                'Proyecto crítico',
                'https://sharepoint.com/docs',
                'https://estratel.com/repo'
            ];

            worksheet.addRow(exampleRow);

            // Configurar respuesta
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="plantilla-importacion-proyectos.xlsx"');

            // Enviar archivo
            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            logger.error('Error generando plantilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando plantilla de Excel',
                error: error.message
            });
        }
    }

    /**
     * Obtener proyectos Excel importados
     * @param {Object} req 
     * @param {Object} res 
     * @returns {Promise<void>}
     */
    async getImportedProjects(req, res) {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = {
                isActive: true,
                ...(search && {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { serviceDescription: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [projects, total] = await Promise.all([
                prisma.excelProject.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        mentor: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        },
                        coordinator: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        },
                        salesExecutive: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        },
                        designer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        },
                        businessLine: true,
                        opportunityType: true,
                        marketSegment: true,
                        salesManagement: true,
                        suppliers: {
                            include: {
                                supplier: true
                            }
                        }
                    }
                }),
                prisma.excelProject.count({ where })
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
            logger.error('Error obteniendo proyectos importados:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas de importación
     * @param {Object} req 
     * @param {Object} res 
     * @returns {Promise<void>}
     */
    async getImportStats(req, res) {
        try {
            const [
                totalProjects,
                projectsByRisk,
                projectsByStage,
                projectsByBusinessLine
            ] = await Promise.all([
                prisma.excelProject.count({ where: { isActive: true } }),
                prisma.excelProject.findMany({
                    where: { isActive: true, riskLevelId: { not: null } },
                    select: {
                        riskLevel: {
                            select: { name: true }
                        }
                    }
                }),
                prisma.excelProject.findMany({
                    where: { isActive: true, generalStatus: { not: null } },
                    select: {
                        generalStatus: true
                    }
                }),
                prisma.excelProject.findMany({
                    where: { isActive: true, businessLineId: { not: null } },
                    select: {
                        businessLine: {
                            select: { name: true }
                        }
                    }
                })
            ]);

            // Procesar datos de líneas de negocio
            const businessLineStats = projectsByBusinessLine.reduce((acc, project) => {
                const name = project.businessLine?.name || 'Sin asignar';
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {});

            // Procesar datos de riesgo
            const riskStats = projectsByRisk.reduce((acc, project) => {
                const name = project.riskLevel?.name || 'Sin asignar';
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {});

            // Procesar datos de etapa
            const stageStats = projectsByStage.reduce((acc, project) => {
                const name = project.generalStatus || 'Sin asignar';
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {});

            res.status(200).json({
                success: true,
                data: {
                    totalProjects,
                    projectsByRisk: riskStats,
                    projectsByStage: stageStats,
                    projectsByBusinessLine: businessLineStats
                }
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Generar mensaje de importación basado en resultados
     * @param {Object} result 
     * @returns {string}
     */
    generateImportMessage(result) {
        const totalProcessed = result.success + result.errors.length;
        const successRate = ((result.success / totalProcessed) * 100).toFixed(1);

        let message = `Importación completada: ${result.success}/${totalProcessed} proyectos procesados exitosamente (${successRate}%)`;

        if (result.errors.length > 0) {
            message += `. ${result.errors.length} registros fallaron`;
        }

        if (result.warnings && result.warnings.length > 0) {
            message += `. ${result.warnings.length} warnings generados`;
        }

        return message;
    }

    /**
     * Descargar reporte de errores
     * @param {Object} req 
     * @param {Object} res 
     * @returns {Promise<void>}
     */
    async downloadErrorReport(req, res) {
        try {
            // Verificar si hay un reporte disponible en sesión
            if (!req.session || !req.session.errorReportBuffer) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay reporte de errores disponible para descargar'
                });
            }

            const buffer = req.session.errorReportBuffer;
            const filename = req.session.errorReportFilename || 'errores_importacion.xlsx';

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);

            // Limpiar sesión
            delete req.session.errorReportBuffer;
            delete req.session.errorReportFilename;

            // Enviar archivo
            res.send(buffer);

        } catch (error) {
            logger.error('Error descargando reporte de errores:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = ExcelImportController;