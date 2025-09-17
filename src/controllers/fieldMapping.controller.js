const fieldMappingService = require('../services/fieldMapping.service');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de mapeos de campos
 */
class FieldMappingController {
    /**
     * Obtener mapeos de campos para un área
     */
    async getFieldMappings(req, res) {
        try {
            const { sourceAreaId } = req.params;

            const mappings = await fieldMappingService.getFieldMappings(sourceAreaId);

            res.status(200).json({
                success: true,
                data: mappings
            });

        } catch (error) {
            logger.error('Error obteniendo mapeos:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo mapeos de campos',
                error: error.message
            });
        }
    }

    /**
     * Crear nuevo mapeo de campo
     */
    async createFieldMapping(req, res) {
        try {
            const mappingData = req.body;

            // Validaciones básicas
            const requiredFields = ['sourceAreaId', 'sourceField', 'targetField'];
            const missing = requiredFields.filter(field => !mappingData[field]);

            if (missing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Campos requeridos faltantes: ${missing.join(', ')}`
                });
            }

            const mapping = await fieldMappingService.createFieldMapping(mappingData);

            res.status(201).json({
                success: true,
                message: 'Mapeo de campo creado exitosamente',
                data: mapping
            });

        } catch (error) {
            logger.error('Error creando mapeo:', error);
            res.status(500).json({
                success: false,
                message: 'Error creando mapeo de campo',
                error: error.message
            });
        }
    }

    /**
     * Actualizar mapeo de campo
     */
    async updateFieldMapping(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const mapping = await fieldMappingService.updateFieldMapping(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Mapeo de campo actualizado exitosamente',
                data: mapping
            });

        } catch (error) {
            logger.error('Error actualizando mapeo:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando mapeo de campo',
                error: error.message
            });
        }
    }

    /**
     * Eliminar mapeo de campo (desactivar)
     */
    async deleteFieldMapping(req, res) {
        try {
            const { id } = req.params;

            await fieldMappingService.updateFieldMapping(id, { isActive: false });

            res.status(200).json({
                success: true,
                message: 'Mapeo de campo eliminado exitosamente'
            });

        } catch (error) {
            logger.error('Error eliminando mapeo:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando mapeo de campo',
                error: error.message
            });
        }
    }

    /**
     * Actualizar orden de mapeos
     */
    async updateMappingOrder(req, res) {
        try {
            const { mappings } = req.body;

            if (!Array.isArray(mappings)) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de mapeos con IDs y orderIndex'
                });
            }

            const results = [];
            for (const item of mappings) {
                if (item.id && typeof item.orderIndex === 'number') {
                    const updated = await fieldMappingService.updateFieldMapping(
                        item.id,
                        { orderIndex: item.orderIndex }
                    );
                    results.push(updated);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Orden de mapeos actualizado exitosamente',
                data: results
            });

        } catch (error) {
            logger.error('Error actualizando orden:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando orden de mapeos',
                error: error.message
            });
        }
    }

    /**
     * Clonar mapeos de un área a otra
     */
    async cloneMappings(req, res) {
        try {
            const { sourceAreaId, targetAreaId } = req.body;

            if (!sourceAreaId || !targetAreaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren sourceAreaId y targetAreaId'
                });
            }

            // Obtener mapeos del área origen
            const sourceMappings = await fieldMappingService.getFieldMappings(sourceAreaId);

            if (sourceMappings.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay mapeos en el área de origen'
                });
            }

            // Clonar cada mapeo
            const clonedMappings = [];
            for (const mapping of sourceMappings) {
                const clonedData = {
                    ...mapping,
                    sourceAreaId: targetAreaId,
                    id: undefined,
                    createdAt: undefined,
                    updatedAt: undefined
                };

                const cloned = await fieldMappingService.createFieldMapping(clonedData);
                clonedMappings.push(cloned);
            }

            res.status(201).json({
                success: true,
                message: `${clonedMappings.length} mapeos clonados exitosamente`,
                data: clonedMappings
            });

        } catch (error) {
            logger.error('Error clonando mapeos:', error);
            res.status(500).json({
                success: false,
                message: 'Error clonando mapeos',
                error: error.message
            });
        }
    }

    /**
     * Probar mapeo con datos de ejemplo
     */
    async testMapping(req, res) {
        try {
            const { sourceAreaId, testData } = req.body;

            if (!sourceAreaId || !testData) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren sourceAreaId y testData'
                });
            }

            const result = await fieldMappingService.mapExcelData(testData, sourceAreaId);

            res.status(200).json({
                success: true,
                message: result.isValid
                    ? 'Mapeo probado exitosamente'
                    : 'Mapeo con errores de validación',
                data: result
            });

        } catch (error) {
            logger.error('Error probando mapeo:', error);
            res.status(500).json({
                success: false,
                message: 'Error probando mapeo',
                error: error.message
            });
        }
    }

    /**
     * Obtener transformaciones disponibles
     */
    async getAvailableTransformations(req, res) {
        try {
            const transformations = [
                {
                    code: 'UPPERCASE',
                    name: 'Mayúsculas',
                    description: 'Convierte el texto a mayúsculas'
                },
                {
                    code: 'LOWERCASE',
                    name: 'Minúsculas',
                    description: 'Convierte el texto a minúsculas'
                },
                {
                    code: 'DATE_FORMAT',
                    name: 'Formato de fecha',
                    description: 'Convierte el valor a formato de fecha'
                },
                {
                    code: 'CURRENCY_TO_NUMBER',
                    name: 'Moneda a número',
                    description: 'Convierte valores de moneda a número'
                },
                {
                    code: 'USER_LOOKUP',
                    name: 'Búsqueda de usuario',
                    description: 'Busca usuario por nombre'
                },
                {
                    code: 'CLIENT_LOOKUP',
                    name: 'Búsqueda de cliente',
                    description: 'Busca cliente por siglas o nombre'
                },
                {
                    code: 'CATALOG_LOOKUP',
                    name: 'Búsqueda en catálogo',
                    description: 'Busca en catálogos del sistema'
                },
                {
                    code: 'STAGE_LOOKUP',
                    name: 'Búsqueda de etapa',
                    description: 'Busca etapa de proyecto'
                }
            ];

            res.status(200).json({
                success: true,
                data: transformations
            });

        } catch (error) {
            logger.error('Error obteniendo transformaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo transformaciones disponibles',
                error: error.message
            });
        }
    }

    /**
     * Obtener reglas de validación disponibles
     */
    async getAvailableValidationRules(req, res) {
        try {
            const validationRules = [
                {
                    code: 'EMAIL',
                    name: 'Email válido',
                    description: 'Valida formato de email'
                },
                {
                    code: 'PHONE',
                    name: 'Teléfono válido',
                    description: 'Valida formato de teléfono'
                },
                {
                    code: 'POSITIVE_NUMBER',
                    name: 'Número positivo',
                    description: 'Valida que sea un número mayor a 0'
                },
                {
                    code: 'NOT_EMPTY',
                    name: 'No vacío',
                    description: 'Valida que el campo tenga valor'
                },
                {
                    code: 'CUSTOM_REGEX',
                    name: 'Expresión regular personalizada',
                    description: 'Validación con regex personalizado'
                }
            ];

            res.status(200).json({
                success: true,
                data: validationRules
            });

        } catch (error) {
            logger.error('Error obteniendo reglas de validación:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo reglas de validación disponibles',
                error: error.message
            });
        }
    }

    /**
     * Exportar configuración de mapeos
     */
    async exportMappings(req, res) {
        try {
            const { sourceAreaId } = req.params;

            const mappings = await fieldMappingService.getFieldMappings(sourceAreaId);

            // Preparar datos para exportar
            const exportData = mappings.map(m => ({
                sourceField: m.sourceField,
                targetField: m.targetField,
                description: m.description,
                isRequired: m.isRequired,
                transformation: m.transformation,
                validationRule: m.validationRule,
                defaultValue: m.defaultValue,
                orderIndex: m.orderIndex
            }));

            res.status(200).json({
                success: true,
                data: {
                    sourceAreaId,
                    sourceArea: mappings[0]?.sourceArea?.name || 'Desconocida',
                    exportDate: new Date(),
                    mappings: exportData
                }
            });

        } catch (error) {
            logger.error('Error exportando mapeos:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando configuración de mapeos',
                error: error.message
            });
        }
    }

    /**
     * Importar configuración de mapeos
     */
    async importMappings(req, res) {
        try {
            const { sourceAreaId, mappings } = req.body;

            if (!sourceAreaId || !Array.isArray(mappings)) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren sourceAreaId y un array de mappings'
                });
            }

            const importedMappings = [];
            const errors = [];

            for (const mapping of mappings) {
                try {
                    const created = await fieldMappingService.createFieldMapping({
                        ...mapping,
                        sourceAreaId
                    });
                    importedMappings.push(created);
                } catch (error) {
                    errors.push({
                        mapping,
                        error: error.message
                    });
                }
            }

            res.status(200).json({
                success: true,
                message: `Importación completada: ${importedMappings.length} exitosos, ${errors.length} errores`,
                data: {
                    imported: importedMappings,
                    errors
                }
            });

        } catch (error) {
            logger.error('Error importando mapeos:', error);
            res.status(500).json({
                success: false,
                message: 'Error importando configuración de mapeos',
                error: error.message
            });
        }
    }
}

module.exports = FieldMappingController;