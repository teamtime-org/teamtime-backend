const excelImportService = require('../services/excelImport.service');
const fieldMappingService = require('../services/fieldMapping.service');
const logger = require('../utils/logger');
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
 * Controlador para importación de proyectos a staging area
 */
class ExcelImportController {
    constructor() {
        this.upload = upload.single('file');
    }

    /**
     * Importar proyectos desde Excel a staging area
     */
    async importToStaging(req, res) {
        try {
            this.upload(req, res, async (err) => {
                if (err) {
                    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            success: false,
                            message: 'El archivo es demasiado grande. Máximo 10MB permitido.'
                        });
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

                const { sourceAreaId } = req.body;
                if (!sourceAreaId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debe seleccionar el área de origen'
                    });
                }

                try {
                    const result = await excelImportService.importExcelToStaging(
                        req.file.path,
                        sourceAreaId,
                        req.user.userId
                    );

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) logger.warn('Error eliminando archivo temporal:', unlinkErr);
                    });

                    res.status(200).json({
                        success: true,
                        message: `Importación completada: ${result.imported}/${result.total} registros procesados`,
                        data: result
                    });

                } catch (importError) {
                    logger.error('Error en importación:', importError);

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) logger.warn('Error eliminando archivo temporal:', unlinkErr);
                    });

                    res.status(500).json({
                        success: false,
                        message: 'Error durante la importación',
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
     * Validar estructura de Excel antes de importar
     */
    async validateExcelStructure(req, res) {
        try {
            this.upload(req, res, async (err) => {
                if (err) {
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

                const { sourceAreaId } = req.body;
                if (!sourceAreaId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debe seleccionar el área de origen'
                    });
                }

                try {
                    const validation = await excelImportService.validateExcelStructure(
                        req.file.path,
                        sourceAreaId
                    );

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) logger.warn('Error eliminando archivo temporal:', unlinkErr);
                    });

                    res.status(200).json({
                        success: true,
                        message: validation.isValid ? 'Estructura válida' : 'Estructura inválida',
                        data: validation
                    });

                } catch (validationError) {
                    logger.error('Error validando estructura:', validationError);

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) logger.warn('Error eliminando archivo temporal:', unlinkErr);
                    });

                    res.status(500).json({
                        success: false,
                        message: 'Error validando estructura del archivo',
                        error: validationError.message
                    });
                }
            });

        } catch (error) {
            logger.error('Error en validación de estructura:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtener logs de importación
     */
    async getImportLogs(req, res) {
        try {
            const { sourceAreaId } = req.query;
            const logs = await excelImportService.getImportLogs(sourceAreaId);

            res.status(200).json({
                success: true,
                data: logs
            });

        } catch (error) {
            logger.error('Error obteniendo logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo historial de importaciones',
                error: error.message
            });
        }
    }

    /**
     * Previsualizar datos del Excel antes de importar
     */
    async previewExcelData(req, res) {
        try {
            this.upload(req, res, async (err) => {
                if (err) {
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

                const { sourceAreaId, maxRows = 10 } = req.body;
                if (!sourceAreaId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debe seleccionar el área de origen'
                    });
                }

                try {
                    const preview = await excelImportService.previewExcelData(
                        req.file.path,
                        sourceAreaId,
                        parseInt(maxRows)
                    );

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) logger.warn('Error eliminando archivo temporal:', unlinkErr);
                    });

                    res.status(200).json({
                        success: true,
                        message: 'Previsualización generada',
                        data: preview
                    });

                } catch (previewError) {
                    logger.error('Error previsualizando datos:', previewError);

                    // Limpiar archivo temporal
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) logger.warn('Error eliminando archivo temporal:', unlinkErr);
                    });

                    res.status(500).json({
                        success: false,
                        message: 'Error previsualizando datos del archivo',
                        error: previewError.message
                    });
                }
            });

        } catch (error) {
            logger.error('Error en previsualización:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Generar plantilla de Excel dinámica basada en field mappings
     */
    async generateTemplate(req, res) {
        try {
            const { sourceAreaId } = req.params;

            if (!sourceAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe especificar el área para generar la plantilla'
                });
            }

            // Obtener mapeos de campo para el área
            const fieldMappings = await fieldMappingService.getFieldMappings(sourceAreaId);

            if (fieldMappings.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay configuración de campos para el área especificada'
                });
            }

            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Proyectos');

            // Obtener headers desde field mappings
            const headers = fieldMappings
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(mapping => mapping.sourceField);

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
                const mapping = fieldMappings.find(m => m.sourceField === headers[index]);
                column.width = Math.max(headers[index].length + 2, 15);

                // Agregar comentarios con descripciones de campos
                if (mapping && mapping.description) {
                    const cell = headerRow.getCell(index + 1);
                    cell.note = mapping.description;
                }
            });

            // Agregar fila de ejemplo
            const exampleRow = fieldMappings
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(mapping => {
                    // Generar valores de ejemplo basados en el tipo de campo
                    switch (mapping.targetField) {
                        case 'title': return 'Proyecto Ejemplo';
                        case 'description': return 'Descripción del proyecto';
                        case 'tcvMXN': return '1500000.00';
                        case 'monthlyMXN': return '125000.00';
                        case 'startDate': return '2025-01-01';
                        case 'estimatedEndDate': return '2025-12-31';
                        case 'siebelId': return '1-EXAMPLE';
                        default: return mapping.defaultValue || 'Ejemplo';
                    }
                });

            worksheet.addRow(exampleRow);

            // Configurar respuesta
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="plantilla-importacion-staging.xlsx"');

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
     * Obtener estadísticas de importaciones
     */
    async getImportStatistics(req, res) {
        try {
            const { sourceAreaId, dateFrom, dateTo } = req.query;

            // Esta funcionalidad se puede extender con más estadísticas específicas
            const logs = await excelImportService.getImportLogs(sourceAreaId);

            const filteredLogs = logs.filter(log => {
                if (dateFrom && new Date(log.importDate) < new Date(dateFrom)) return false;
                if (dateTo && new Date(log.importDate) > new Date(dateTo)) return false;
                return true;
            });

            const stats = {
                totalImports: filteredLogs.length,
                successfulImports: filteredLogs.filter(log => log.status === 'COMPLETED').length,
                failedImports: filteredLogs.filter(log => log.status === 'FAILED').length,
                totalRowsProcessed: filteredLogs.reduce((sum, log) => sum + (log.processedRows || 0), 0),
                totalRowsWithErrors: filteredLogs.reduce((sum, log) => sum + (log.errorRows || 0), 0),
                averageSuccessRate: filteredLogs.length > 0
                    ? Math.round((filteredLogs.reduce((sum, log) => {
                        const total = log.totalRows || 1;
                        const processed = log.processedRows || 0;
                        return sum + (processed / total);
                    }, 0) / filteredLogs.length) * 100)
                    : 0
            };

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas de importación',
                error: error.message
            });
        }
    }
}

module.exports = ExcelImportController;