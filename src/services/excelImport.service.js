const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { USER_ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para importación de proyectos desde Excel
 */
class ExcelImportService {
    constructor() {
        this.columnMapping = {
            'ID': 'excelId',
            'Title': 'title',
            'Descripcion Servicio': 'serviceDescription',
            'Estatus General': 'generalStatus',
            'Proximos Pasos': 'nextSteps',
            'Mentor': 'mentor',
            'Fecha Asignacion': 'assignmentDate',
            'Etapa de Proyecto': 'projectStage',
            'Riesgo': 'risk',
            'Tipo de Proyecto': 'projectType',
            'Tabla Resumen': 'summaryTable',
            'Coordinador': 'coordinator',
            'Linea de Negocios': 'businessLine',
            'Tipo de Oportunidad': 'opportunityType',
            '¿Proyecto Estrategico?': 'isStrategicProject',
            'Tipo de Riesgo': 'riskTypes',
            'Fecha Termino Estimada': 'estimatedEndDate',
            'Actualizacion Fecha Termino Estimada': 'updatedEstimatedEndDate',
            'Fecha de Termino Real': 'actualEndDate',
            'Control Presupuestal': 'budgetControl',
            'Monto Total del Contrato MXN': 'totalContractAmountMXN',
            'Ingreso': 'income',
            'Periodo Contratacion (Meses)': 'contractPeriodMonths',
            'Facturacion Mensual MXN': 'monthlyBillingMXN',
            'Penalizacion': 'penalty',
            'Proveedores Involucrados': 'suppliers',
            'Fecha Fallo/Adjudicacion': 'awardDate',
            'Fecha Transferencia Diseño': 'designTransferDate',
            'Fecha de entrega por Licitacion': 'tenderDeliveryDate',
            'Segmento': 'segment',
            'Gerencia de Ventas': 'salesManagement',
            'Ejecutivo Ventas': 'salesExecutive',
            'Diseñador': 'designer',
            'Orden de Siebel/Numero de Proceso': 'siebelOrderNumber',
            'Orden en Progreso': 'orderInProgress',
            'Ordenes Relacionadas (Siebel)': 'relatedOrders',
            '¿Aplica Control de Cambios?': 'appliesChangeControl',
            'Justificación': 'justification',
            'SharePoint Documentacion': 'sharePointDocumentation',
            'Respositorio Estratel': 'estratelRepository'
        };

        this.statusMapping = {
            'Ejecución': 'ACTIVE',
            'Completado': 'COMPLETED',
            'Cancelada': 'CANCELLED',
            'Detenido': 'ON_HOLD',
            'Ganada': 'AWARDED'
        };
    }

    /**
     * Importar proyectos desde archivo Excel
     * @param {string} filePath - Ruta del archivo Excel
     * @param {Object} requestingUser - Usuario que realiza la importación
     * @param {string} areaId - ID del área donde se asignarán los proyectos
     * @param {boolean} isIncremental - Si es carga incremental (solo nuevos) o actualización completa
     * @returns {Promise<Object>} - Resultado de la importación
     */
    async importFromExcel(filePath, requestingUser, areaId, isIncremental = false) {
        try {
            // Validar parámetros de entrada
            if (!requestingUser || !requestingUser.userId) {
                throw new Error('Usuario solicitante requerido para importación');
            }

            if (!areaId) {
                throw new Error('ID de área requerido para importación');
            }

            // Verificar que el usuario existe en la base de datos y actualizar ID si es necesario
            let userExists = await prisma.user.findUnique({
                where: { id: requestingUser.userId },
                select: { id: true, email: true, firstName: true, lastName: true, role: true }
            });

            // Si el usuario no existe por ID, intentar buscarlo por email (útil después de reseeding)
            if (!userExists && requestingUser.email) {
                logger.warn(`Usuario con ID ${requestingUser.userId} no encontrado, buscando por email: ${requestingUser.email}`);
                userExists = await prisma.user.findUnique({
                    where: { email: requestingUser.email },
                    select: { id: true, email: true, firstName: true, lastName: true, role: true }
                });
                
                if (userExists) {
                    logger.info(`Usuario encontrado por email: ${userExists.email} (ID actualizado de ${requestingUser.userId} a ${userExists.id})`);
                    // Actualizar el usuario solicitante con el ID correcto
                    requestingUser.userId = userExists.id;
                }
            }

            if (!userExists) {
                throw new Error(`Usuario con ID ${requestingUser.userId} no existe en la base de datos. Email del token: ${requestingUser.email}`);
            }

            // Verificar permisos
            if (userExists.role !== USER_ROLES.ADMINISTRADOR) {
                throw new Error('Solo los administradores pueden importar proyectos');
            }

            logger.info(`Iniciando importación de Excel: ${filePath} por usuario ${requestingUser.email} (ID: ${requestingUser.userId})`);

            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                throw new Error('El archivo Excel no contiene hojas de trabajo');
            }

            const headers = this.extractHeaders(worksheet);
            const data = this.extractData(worksheet, headers);

            logger.info(`Procesando ${data.length} filas del Excel`);

            const result = await this.processData(data, requestingUser, areaId, isIncremental);

            logger.info(`Importación completada: ${result.success} exitosos, ${result.errors.length} errores`);
            return result;

        } catch (error) {
            logger.error('Error en importación de Excel:', error);
            throw error;
        }
    }

    /**
     * Extraer headers del Excel
     * @param {Object} worksheet 
     * @returns {Array}
     */
    extractHeaders(worksheet) {
        const headers = [];
        const headerRow = worksheet.getRow(1);

        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value;
        });

        return headers;
    }

    /**
     * Extraer datos del Excel
     * @param {Object} worksheet 
     * @param {Array} headers 
     * @returns {Array}
     */
    extractData(worksheet, headers) {
        const data = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header && this.columnMapping[header]) {
                    rowData[this.columnMapping[header]] = cell.value;
                }
            });

            if (Object.keys(rowData).length > 0) {
                data.push(rowData);
            }
        });

        return data;
    }

    /**
     * Procesar datos del Excel
     * @param {Array} data 
     * @param {Object} requestingUser 
     * @param {string} areaId - ID del área donde se asignarán los proyectos
     * @param {boolean} isIncremental - Si es carga incremental
     * @returns {Promise<Object>}
     */
    async processData(data, requestingUser, areaId, isIncremental = false) {
        const result = {
            success: 0,
            errors: [],
            created: [],
            updated: [],
            warnings: []
        };

        // Validar que el usuario solicitante esté definido
        if (!requestingUser || !requestingUser.userId) {
            throw new Error('Usuario solicitante no definido para procesar datos');
        }

        // Verificar que el usuario existe en la base de datos y actualizar ID si es necesario
        let userExists = await prisma.user.findUnique({
            where: { id: requestingUser.userId },
            select: { id: true, email: true, firstName: true, lastName: true }
        });

        // Si el usuario no existe por ID, intentar buscarlo por email (útil después de reseeding)
        if (!userExists && requestingUser.email) {
            logger.warn(`Usuario con ID ${requestingUser.userId} no encontrado, buscando por email: ${requestingUser.email}`);
            userExists = await prisma.user.findUnique({
                where: { email: requestingUser.email },
                select: { id: true, email: true, firstName: true, lastName: true }
            });
            
            if (userExists) {
                logger.info(`Usuario encontrado por email: ${userExists.email} (ID actualizado de ${requestingUser.userId} a ${userExists.id})`);
                // Actualizar el usuario solicitante con el ID correcto
                requestingUser.userId = userExists.id;
            }
        }

        if (!userExists) {
            throw new Error(`Usuario con ID ${requestingUser.userId} no existe en la base de datos. Email del token: ${requestingUser.email}`);
        }

        // Guardar el usuario solicitante y areaId para usar en saveProject y creación de usuarios
        this.requestingUser = requestingUser;
        this.projectAreaId = areaId;

        logger.info(`Procesando datos con usuario: ${requestingUser.email} (ID: ${requestingUser.userId}) - Área del proyecto: ${areaId}`);
        
        // Crear un cache de usuarios para evitar duplicados
        this.userCache = new Map();
        this.emailCounter = new Map(); // Cache para contadores de emails

        try {
            // Pre-cargar usuarios existentes en cache para optimizar búsquedas
            await this.preloadExistingUsers(data);

            // Pre-crear todos los usuarios necesarios de forma secuencial para evitar condiciones de carrera
            await this.preCreateUsers(data);

            // Pre-crear catálogos necesarios
            await this.preCreateCatalogs(data);

            logger.info(`Procesando ${data.length} filas en lotes para mejor rendimiento...`);

            // Procesar en lotes de 10 para mejor rendimiento (sin creación de usuarios concurrente)
            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, Math.min(i + batchSize, data.length));

                // Usar Promise.allSettled para que los errores no detengan el procesamiento
                const batchResults = await Promise.allSettled(batch.map(async (rowData, batchIndex) => {
                    const actualRow = i + batchIndex + 2; // +2 because row 1 is header and array is 0-indexed
                    return await this.processRowWithDetailedErrors(rowData, actualRow, areaId, isIncremental);
                }));

                // Procesar resultados del lote
                batchResults.forEach((batchResult, batchIndex) => {
                    const actualRow = i + batchIndex + 2;

                    if (batchResult.status === 'fulfilled') {
                        const rowResult = batchResult.value;
                        if (rowResult.success) {
                            if (rowResult.skipped) {
                                // Proyecto omitido en carga incremental
                                result.warnings.push({
                                    row: actualRow,
                                    warning: 'Proyecto omitido en carga incremental',
                                    data: batch[batchIndex]
                                });
                            } else if (rowResult.isUpdate) {
                                result.updated.push(rowResult.project);
                                result.success++;
                            } else {
                                result.created.push(rowResult.project);
                                result.success++;
                            }

                            // Agregar warnings si los hay
                            if (rowResult.warnings && rowResult.warnings.length > 0) {
                                rowResult.warnings.forEach(warning => {
                                    result.warnings.push({
                                        row: actualRow,
                                        warning: warning,
                                        data: rowResult.originalData
                                    });
                                });
                            }
                        } else {
                            // Error controlado durante el procesamiento
                            result.errors.push({
                                row: actualRow,
                                data: rowResult.originalData,
                                error: rowResult.error,
                                errorType: rowResult.errorType || 'PROCESSING_ERROR',
                                details: rowResult.details || {}
                            });
                        }
                    } else {
                        // Error no controlado (Promise rechazado)
                        const originalData = batch[batchIndex];
                        logger.error(`Error no controlado procesando fila ${actualRow}:`, batchResult.reason);
                        result.errors.push({
                            row: actualRow,
                            data: originalData,
                            error: batchResult.reason?.message || 'Error inesperado durante el procesamiento',
                            errorType: 'UNEXPECTED_ERROR',
                            details: {
                                stack: batchResult.reason?.stack,
                                originalError: batchResult.reason
                            }
                        });
                    }
                });                // Log progreso cada lote
                logger.info(`Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} - ${result.success} exitosos, ${result.errors.length} errores, ${result.warnings.length} warnings`);
            }

        } catch (error) {
            logger.error('Error crítico durante el procesamiento:', error);
            throw new Error(`Error crítico durante la importación: ${error.message}`);
        } finally {
            // Limpiar cache
            this.userCache.clear();
            this.emailCounter.clear();
        }

        // Generar reporte de errores si hay fallos
        if (result.errors.length > 0) {
            result.errorReport = await this.generateErrorReport(result.errors);
        }

        return result;
    }

    /**
     * Procesar una fila con manejo detallado de errores
     * @param {Object} rowData 
     * @param {number} rowNumber 
     * @param {string} areaId
     * @param {boolean} isIncremental
     * @returns {Promise<Object>}
     */
    async processRowWithDetailedErrors(rowData, rowNumber, areaId, isIncremental = false) {
        const rowResult = {
            success: false,
            project: null,
            isUpdate: false,
            originalData: rowData,
            error: null,
            errorType: null,
            details: {},
            warnings: []
        };

        try {
            // Validar datos requeridos
            const validation = this.validateRequiredFields(rowData, rowNumber);
            if (!validation.isValid) {
                rowResult.error = validation.error;
                rowResult.errorType = 'VALIDATION_ERROR';
                rowResult.details = validation.details;
                return rowResult;
            }

            // Procesar fila con manejo de warnings
            const processResult = await this.processRowWithWarnings(rowData, rowNumber, areaId, isIncremental);

            // Intentar guardar el proyecto
            const savedProject = await this.saveProject(processResult.projectData, this.requestingUser);

            rowResult.success = true;
            rowResult.project = savedProject;
            rowResult.isUpdate = processResult.isUpdate;
            rowResult.warnings = processResult.warnings;

            return rowResult;

        } catch (error) {
            logger.error(`Error procesando fila ${rowNumber}:`, error);

            rowResult.error = error.message;
            rowResult.errorType = this.categorizeError(error);
            rowResult.details = {
                errorCode: error.code,
                constraint: error.meta?.target,
                originalError: error.name
            };

            return rowResult;
        }
    }

    /**
     * Validar campos requeridos de una fila
     * @param {Object} rowData 
     * @param {number} rowNumber 
     * @returns {Object}
     */
    validateRequiredFields(rowData, rowNumber) {
        const requiredFields = ['title'];
        const missingFields = [];
        const invalidFields = [];

        // Verificar campos requeridos
        requiredFields.forEach(field => {
            if (!rowData[field] || String(rowData[field]).trim() === '') {
                missingFields.push(field);
            }
        });

        // Validaciones específicas
        if (rowData.excelId && (isNaN(parseInt(rowData.excelId)) || parseInt(rowData.excelId) <= 0)) {
            invalidFields.push({ field: 'excelId', reason: 'Debe ser un número entero positivo' });
        }

        if (rowData.assignmentDate && !this.isValidDate(rowData.assignmentDate)) {
            invalidFields.push({ field: 'assignmentDate', reason: 'Formato de fecha inválido' });
        }

        if (rowData.estimatedEndDate && !this.isValidDate(rowData.estimatedEndDate)) {
            invalidFields.push({ field: 'estimatedEndDate', reason: 'Formato de fecha inválido' });
        }

        if (missingFields.length > 0 || invalidFields.length > 0) {
            return {
                isValid: false,
                error: `Datos inválidos en fila ${rowNumber}`,
                details: {
                    missingFields,
                    invalidFields
                }
            };
        }

        return { isValid: true };
    }

    /**
     * Verificar si una fecha es válida
     * @param {*} dateValue 
     * @returns {boolean}
     */
    isValidDate(dateValue) {
        if (!dateValue) return true; // null/undefined son válidos
        if (dateValue instanceof Date) return !isNaN(dateValue.getTime());

        try {
            const date = new Date(dateValue);
            return !isNaN(date.getTime());
        } catch {
            return false;
        }
    }

    /**
     * Procesar fila con manejo de warnings
     * @param {Object} rowData 
     * @param {number} rowNumber 
     * @param {string} areaId 
     * @param {boolean} isIncremental
     * @returns {Promise<Object>}
     */
    async processRowWithWarnings(rowData, rowNumber, areaId, isIncremental = false) {
        const warnings = [];
        let isUpdate = false;

        // Verificar si es actualización o carga incremental
        if (rowData.excelId) {
            const existingProject = await prisma.project.findFirst({
                where: {
                    excelDetails: {
                        excelId: String(rowData.excelId)
                    }
                },
                include: { excelDetails: true }
            });

            if (existingProject) {
                if (isIncremental) {
                    // En modo incremental, saltar proyectos existentes
                    warnings.push(`Proyecto con ID ${rowData.excelId} ya existe, se omite en carga incremental`);
                    return { projectData: null, isUpdate: false, warnings, skipped: true };
                } else {
                    isUpdate = true;
                    warnings.push(`Proyecto con ID ${rowData.excelId} será actualizado`);
                }
            }
        }

        // Procesar datos normalmente
        const projectData = await this.processRow(rowData, rowNumber, areaId, isUpdate);

        // Si el proyecto fue omitido, retornar resultado especial
        if (!projectData) {
            return { projectData: null, isUpdate: false, warnings, skipped: true };
        }

        // Verificar si algunos usuarios no se pudieron crear/encontrar
        if (projectData && projectData.excelProject) {
            if (rowData.mentor && !projectData.excelProject.mentorId) {
                warnings.push(`No se pudo crear/encontrar el mentor: ${rowData.mentor}`);
            }
            if (rowData.coordinator && !projectData.excelProject.coordinatorId) {
                warnings.push(`No se pudo crear/encontrar el coordinador: ${rowData.coordinator}`);
            }
        }

        return {
            projectData,
            isUpdate,
            warnings
        };
    }

    /**
     * Categorizar el tipo de error
     * @param {Error} error 
     * @returns {string}
     */
    categorizeError(error) {
        if (error.code === 'P2002') return 'DUPLICATE_ERROR';
        if (error.code === 'P2025') return 'NOT_FOUND_ERROR';
        if (error.code === 'P2003') return 'FOREIGN_KEY_ERROR';
        if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
        if (error.message.includes('timeout')) return 'TIMEOUT_ERROR';
        if (error.message.includes('connection')) return 'CONNECTION_ERROR';
        return 'UNKNOWN_ERROR';
    }

    /**
     * Generar reporte de errores en formato Excel
     * @param {Array} errors 
     * @returns {Promise<Object>}
     */
    async generateErrorReport(errors) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Errores de Importación');

            // Configurar headers del reporte de errores
            const headers = [
                'Fila',
                'Tipo de Error',
                'Descripción del Error',
                'Campos Faltantes',
                'Campos Inválidos',
                'ID Excel',
                'Título',
                'Mentor',
                'Coordinador',
                'Fecha Asignación',
                'Estado General',
                'Detalles Técnicos'
            ];

            worksheet.addRow(headers);

            // Aplicar estilo a los headers
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            // Agregar datos de errores
            errors.forEach(errorInfo => {
                const row = [
                    errorInfo.row,
                    errorInfo.errorType || 'ERROR_GENERAL',
                    errorInfo.error,
                    errorInfo.details?.missingFields?.join(', ') || '',
                    errorInfo.details?.invalidFields?.map(f => `${f.field}: ${f.reason}`).join('; ') || '',
                    errorInfo.data?.excelId || '',
                    errorInfo.data?.title || '',
                    errorInfo.data?.mentor || '',
                    errorInfo.data?.coordinator || '',
                    errorInfo.data?.assignmentDate || '',
                    errorInfo.data?.generalStatus || '',
                    JSON.stringify(errorInfo.details || {})
                ];
                worksheet.addRow(row);
            });

            // Ajustar ancho de columnas
            worksheet.columns.forEach((column, index) => {
                if (index === headers.length - 1) { // Detalles técnicos
                    column.width = 30;
                } else if (index === 2) { // Descripción del error
                    column.width = 40;
                } else {
                    column.width = 15;
                }
            });

            // Crear segunda hoja con datos originales para corrección
            const dataWorksheet = workbook.addWorksheet('Datos para Corrección');

            // Headers originales
            const originalHeaders = Object.keys(this.columnMapping);
            dataWorksheet.addRow(originalHeaders);

            // Aplicar estilo a headers de datos
            const dataHeaderRow = dataWorksheet.getRow(1);
            dataHeaderRow.font = { bold: true };
            dataHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEFD5' }
            };

            // Agregar solo los datos que fallaron para su corrección
            errors.forEach(errorInfo => {
                const originalRow = [];
                originalHeaders.forEach(header => {
                    const mappedField = this.columnMapping[header];
                    originalRow.push(errorInfo.data[mappedField] || '');
                });
                dataWorksheet.addRow(originalRow);
            });

            // Ajustar ancho de columnas en la hoja de datos
            dataWorksheet.columns.forEach(column => {
                column.width = 20;
            });

            // Generar buffer del archivo
            const buffer = await workbook.xlsx.writeBuffer();

            return {
                filename: `errores_importacion_${new Date().toISOString().split('T')[0]}.xlsx`,
                buffer: buffer,
                totalErrors: errors.length
            };

        } catch (error) {
            logger.error('Error generando reporte de errores:', error);
            return {
                filename: null,
                buffer: null,
                totalErrors: errors.length,
                reportError: error.message
            };
        }
    }

    /**
     * Procesar una fila del Excel
     * @param {Object} rowData 
     * @param {number} rowNumber 
     * @param {string} areaId - ID del área donde se asignará el proyecto
     * @param {boolean} isUpdate - Si es actualización de proyecto existente
     * @returns {Promise<Object>}
     */
    async processRow(rowData, rowNumber, areaId, isUpdate = false) {
        // Datos del proyecto principal
        const projectData = {
            name: this.parseString(rowData.title),
            description: this.parseString(rowData.serviceDescription),
            status: this.mapStatus(rowData.projectStage),
            startDate: this.parseDate(rowData.assignmentDate),
            endDate: this.parseDate(rowData.estimatedEndDate),
            areaId: areaId
        };

        // Datos del proyecto Excel (detalles extendidos)
        const excelProjectData = {
            excelId: this.parseString(rowData.excelId),
            title: this.parseString(rowData.title),
            serviceDescription: this.parseString(rowData.serviceDescription),
            generalStatus: this.parseString(rowData.generalStatus),
            nextSteps: this.parseString(rowData.nextSteps),
            assignmentDate: this.parseDate(rowData.assignmentDate),
            isStrategicProject: this.parseBoolean(rowData.isStrategicProject),
            riskTypes: this.parseArray(rowData.riskTypes),
            estimatedEndDate: this.parseDate(rowData.estimatedEndDate),
            updatedEstimatedEndDate: this.parseDate(rowData.updatedEstimatedEndDate),
            actualEndDate: this.parseDate(rowData.actualEndDate),
            budgetControl: this.parseString(rowData.budgetControl),
            totalContractAmountMXN: this.parseDecimal(rowData.totalContractAmountMXN),
            income: this.parseDecimal(rowData.income),
            contractPeriodMonths: this.parseDecimal(rowData.contractPeriodMonths, 99999.9),
            monthlyBillingMXN: this.parseDecimal(rowData.monthlyBillingMXN),
            penalty: this.parseString(rowData.penalty),
            providersInvolved: this.parseString(rowData.suppliers),
            awardDate: this.parseDate(rowData.awardDate),
            designTransferDate: this.parseDate(rowData.designTransferDate),
            tenderDeliveryDate: this.parseDate(rowData.tenderDeliveryDate),
            siebelOrderNumber: this.parseString(rowData.siebelOrderNumber),
            orderInProgress: this.parseString(rowData.orderInProgress),
            relatedOrders: this.parseString(rowData.relatedOrders),
            appliesChangeControl: this.parseBoolean(rowData.appliesChangeControl),
            justification: this.parseString(rowData.justification),
            sharePointDocumentation: this.parseString(rowData.sharePointDocumentation),
            estratelRepository: this.parseString(rowData.estratelRepository),
            areaId: areaId
        };

        // Procesar relaciones con usuarios
        if (rowData.mentor) {
            excelProjectData.mentorId = await this.findOrCreateUser(rowData.mentor, USER_ROLES.COLABORADOR);
        }

        if (rowData.coordinator) {
            excelProjectData.coordinatorId = await this.findOrCreateUser(rowData.coordinator, USER_ROLES.COORDINADOR);
        }

        // Procesar relaciones con catálogos
        if (rowData.risk) {
            excelProjectData.riskLevelId = await this.findOrCreateCatalog('RISK_LEVEL', rowData.risk);
        }

        if (rowData.projectType) {
            excelProjectData.projectTypeId = await this.findOrCreateCatalog('PROJECT_TYPE', rowData.projectType);
        }

        if (rowData.businessLine) {
            excelProjectData.businessLineId = await this.findOrCreateCatalog('BUSINESS_LINE', rowData.businessLine);
        }

        if (rowData.opportunityType) {
            excelProjectData.opportunityTypeId = await this.findOrCreateCatalog('OPPORTUNITY_TYPE', rowData.opportunityType);
        }

        if (rowData.segment) {
            excelProjectData.segmentId = await this.findOrCreateCatalog('SEGMENT', rowData.segment);
        }

        if (rowData.salesManagement) {
            excelProjectData.salesManagementId = await this.findOrCreateCatalog('SALES_MANAGEMENT', rowData.salesManagement);
        }

        if (rowData.salesExecutive) {
            excelProjectData.salesExecutiveId = await this.findOrCreateCatalog('SALES_EXECUTIVE', rowData.salesExecutive);
        }

        if (rowData.designer) {
            excelProjectData.designerId = await this.findOrCreateCatalog('DESIGNER', rowData.designer);
        }

        // Procesar proveedores
        let suppliers = [];
        if (rowData.suppliers) {
            suppliers = await this.processSuppliersString(rowData.suppliers);
        }

        return { projectData, excelProjectData, suppliers };
    }

    /**
     * Guardar proyecto en la base de datos
     * @param {Object} data - Datos procesados del proyecto 
     * @param {Object} requestingUser - Usuario que realiza la importación
     * @returns {Promise<Object>}
     */
    async saveProject(data, requestingUser) {
        const { projectData, excelProjectData, suppliers = [] } = data;

        // Validar que el usuario solicitante esté definido
        const effectiveUser = requestingUser || this.requestingUser;
        if (!effectiveUser || !effectiveUser.userId) {
            throw new Error('Usuario solicitante no definido para crear proyecto');
        }

        // Verificar que el usuario existe en la base de datos
        let userExists = await prisma.user.findUnique({
            where: { id: effectiveUser.userId },
            select: { id: true, email: true, firstName: true, lastName: true }
        });

        // Si el usuario no existe por ID, intentar buscarlo por email (útil después de reseeding)
        if (!userExists && effectiveUser.email) {
            logger.warn(`Usuario con ID ${effectiveUser.userId} no encontrado, buscando por email: ${effectiveUser.email}`);
            userExists = await prisma.user.findUnique({
                where: { email: effectiveUser.email },
                select: { id: true, email: true, firstName: true, lastName: true }
            });
            
            if (userExists) {
                logger.info(`Usuario encontrado por email: ${userExists.email} (ID actualizado de ${effectiveUser.userId} a ${userExists.id})`);
                // Actualizar el usuario efectivo con el ID correcto
                effectiveUser.userId = userExists.id;
            }
        }

        if (!userExists) {
            throw new Error(`Usuario con ID ${effectiveUser.userId} no existe en la base de datos. Email del token: ${effectiveUser.email}`);
        }

        logger.debug(`Usuario validado para crear proyecto: ${userExists.email} (${userExists.firstName} ${userExists.lastName})`);

        // Crear o actualizar proyecto principal
        let project;
        let excelProject;
        let existingProject = null;
        let isNewProject = true;

        if (excelProjectData.excelId) {
            // Buscar proyecto existente por excelId
            existingProject = await prisma.project.findFirst({
                where: {
                    excelDetails: {
                        excelId: excelProjectData.excelId
                    }
                },
                include: { excelDetails: true }
            });

            if (existingProject) {
                isNewProject = false;
                // Actualizar proyecto existente
                project = await prisma.project.update({
                    where: { id: existingProject.id },
                    data: projectData
                });

                // Actualizar detalles Excel
                excelProject = await prisma.excelProject.update({
                    where: { projectId: existingProject.id },
                    data: { ...excelProjectData, projectId: existingProject.id }
                });
            } else {
                // Crear nuevo proyecto
                project = await prisma.project.create({
                    data: {
                        ...projectData,
                        createdBy: effectiveUser.userId
                    }
                });

                // Crear detalles Excel
                excelProject = await prisma.excelProject.create({
                    data: { ...excelProjectData, projectId: project.id }
                });
            }
        } else {
            // Crear nuevo proyecto sin excelId
            project = await prisma.project.create({
                data: {
                    ...projectData,
                    createdBy: effectiveUser.userId
                }
            });

            excelProject = await prisma.excelProject.create({
                data: { ...excelProjectData, projectId: project.id }
            });
        }

        // Procesar proveedores
        if (suppliers.length > 0) {
            // Eliminar relaciones existentes
            await prisma.excelProjectSupplier.deleteMany({
                where: { excelProjectId: excelProject.id }
            });

            // Crear nuevas relaciones
            for (const supplier of suppliers) {
                await prisma.excelProjectSupplier.create({
                    data: {
                        excelProjectId: excelProject.id,
                        supplierId: supplier.id,
                        role: supplier.role
                    }
                });
            }
        }

        // Crear tarea por defecto para proyectos nuevos (no actualizaciones)
        if (isNewProject) {
            await this.createDefaultTask(project.id, effectiveUser.userId);
        }

        // Crear asignaciones de proyecto para coordinador y mentor
        await this.createProjectAssignments(project.id, excelProject, effectiveUser.userId);

        return { project, excelProject };
    }

    /**
     * Crear asignaciones de proyecto para coordinador y mentor
     * @param {string} projectId - ID del proyecto
     * @param {Object} excelProject - Datos del proyecto Excel
     * @param {string} assignedByUserId - ID del usuario que asigna
     * @returns {Promise<Array>}
     */
    async createProjectAssignments(projectId, excelProject, assignedByUserId) {
        const assignments = [];
        
        try {
            // Eliminar asignaciones existentes para el proyecto
            await prisma.projectAssignment.updateMany({
                where: { 
                    projectId: projectId,
                    isActive: true 
                },
                data: { isActive: false }
            });

            // Asignar coordinador si existe
            if (excelProject.coordinatorId) {
                const coordinatorAssignment = await prisma.projectAssignment.create({
                    data: {
                        projectId: projectId,
                        userId: excelProject.coordinatorId,
                        assignedById: assignedByUserId,
                        isActive: true
                    }
                });
                assignments.push(coordinatorAssignment);
                logger.info(`Coordinador asignado al proyecto ${projectId}: ${excelProject.coordinatorId}`);
            }

            // Asignar mentor si existe
            if (excelProject.mentorId) {
                const mentorAssignment = await prisma.projectAssignment.create({
                    data: {
                        projectId: projectId,
                        userId: excelProject.mentorId,
                        assignedById: assignedByUserId,
                        isActive: true
                    }
                });
                assignments.push(mentorAssignment);
                logger.info(`Mentor asignado al proyecto ${projectId}: ${excelProject.mentorId}`);
            }

            return assignments;
        } catch (error) {
            logger.error(`Error creando asignaciones para proyecto ${projectId}:`, error);
            // No lanzar error para no interrumpir la importación del proyecto
            return [];
        }
    }

    /**
     * Buscar usuario (ya debe estar pre-creado)
     * @param {string} userString - String con nombre y ID del usuario del Excel
     * @param {string} defaultRole - Rol por defecto del usuario
     * @returns {Promise<string>} - ID del usuario
     */
    async findOrCreateUser(userString, defaultRole) {
        if (!userString) return null;

        // Usar cache para búsquedas (todos los usuarios ya están pre-creados)
        const cacheKey = `${userString}-${defaultRole}`;
        if (this.userCache && this.userCache.has(cacheKey)) {
            return this.userCache.get(cacheKey);
        }

        // Extraer nombre para cache alternativo
        const match = userString.match(/^(.+);#(\d+)$/);
        const name = match ? match[1].trim() : userString.trim();
        const nameCacheKey = `${name}-${defaultRole}`;

        if (this.userCache && this.userCache.has(nameCacheKey)) {
            return this.userCache.get(nameCacheKey);
        }

        // Si llegamos aquí, significa que no se pre-creó el usuario (error de lógica)
        logger.error(`CRÍTICO: Usuario no encontrado en cache después de pre-creación: ${userString} (${defaultRole})`);
        logger.error(`Cache keys disponibles: ${Array.from(this.userCache.keys()).slice(0, 10).join(', ')}...`);

        // Como fallback, intentar encontrar en BD
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const user = await prisma.user.findFirst({
            where: {
                AND: [
                    { firstName: { equals: firstName, mode: 'insensitive' } },
                    { lastName: { equals: lastName, mode: 'insensitive' } }
                ]
            }
        });

        if (user) {
            logger.warn(`Usuario encontrado en BD como fallback: ${user.id} - ${user.email}`);
            // Guardar en cache para próximas búsquedas
            this.userCache.set(cacheKey, user.id);
            this.userCache.set(nameCacheKey, user.id);
            return user.id;
        }

        // NO CREAR USUARIO AQUÍ - Solo reportar error
        logger.error(`FALLO DEFINITIVO: No se puede encontrar usuario: ${userString} (${defaultRole})`);
        return null; // Retornar null en lugar de hacer throw para evitar fallar todo el procesamiento
    }

    /**
     * Pre-cargar usuarios existentes en cache para optimizar búsquedas
     * @param {Array} data - Datos del Excel
     */
    async preloadExistingUsers(data) {
        try {
            // Extraer todos los nombres de usuarios únicos del Excel
            const userNames = new Set();

            data.forEach(row => {
                if (row.mentor) userNames.add(row.mentor);
                if (row.coordinator) userNames.add(row.coordinator);
                if (row.salesExecutive) userNames.add(row.salesExecutive);
                if (row.designer) userNames.add(row.designer);
            });

            logger.info(`Pre-cargando ${userNames.size} usuarios únicos...`);

            // Obtener todos los usuarios existentes de una vez
            const existingUsers = await prisma.user.findMany({
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true
                }
            });

            // Crear índices para búsqueda rápida
            for (const user of existingUsers) {
                const fullName = `${user.firstName} ${user.lastName}`;
                this.userCache.set(`${fullName}-${user.role}`, user.id);

                // También por email base para contadores
                const emailBase = user.email.split('@')[0];
                if (emailBase.includes('.')) {
                    const baseWithoutNumber = emailBase.replace(/\d+$/, '');
                    const match = emailBase.match(/(\d+)$/);
                    const number = match ? parseInt(match[1]) : 0;

                    const currentMax = this.emailCounter.get(baseWithoutNumber) || 0;
                    if (number >= currentMax) {
                        this.emailCounter.set(baseWithoutNumber, number + 1);
                    }
                }
            }

            logger.info(`Cache de usuarios pre-cargado con ${existingUsers.length} usuarios existentes`);
        } catch (error) {
            logger.error('Error pre-cargando usuarios:', error);
        }
    }

    /**
     * Pre-crear todos los usuarios necesarios de forma secuencial
     * @param {Array} data - Datos del Excel
     */
    async preCreateUsers(data) {
        try {
            // Extraer todos los usuarios únicos con sus roles del Excel
            const usersToCreate = new Map(); // userString -> {role, name}

            data.forEach(row => {
                if (row.mentor) usersToCreate.set(`${row.mentor}-${USER_ROLES.COLABORADOR}`, {
                    userString: row.mentor,
                    role: USER_ROLES.COLABORADOR
                });
                if (row.coordinator) usersToCreate.set(`${row.coordinator}-${USER_ROLES.COORDINADOR}`, {
                    userString: row.coordinator,
                    role: USER_ROLES.COORDINADOR
                });
                if (row.salesExecutive) usersToCreate.set(`${row.salesExecutive}-${USER_ROLES.COLABORADOR}`, {
                    userString: row.salesExecutive,
                    role: USER_ROLES.COLABORADOR
                });
                if (row.designer) usersToCreate.set(`${row.designer}-${USER_ROLES.COLABORADOR}`, {
                    userString: row.designer,
                    role: USER_ROLES.COLABORADOR
                });
            });

            logger.info(`Pre-creando ${usersToCreate.size} usuarios únicos de forma secuencial...`);

            let created = 0;
            let existing = 0;
            let errors = 0;

            // Procesar cada usuario de forma secuencial para evitar condiciones de carrera
            for (const [key, userInfo] of usersToCreate) {
                const cacheKey = `${userInfo.userString}-${userInfo.role}`;

                logger.info(`Procesando usuario ${created + existing + errors + 1}/${usersToCreate.size}: ${userInfo.userString} (${userInfo.role})`);

                // Si ya está en cache, skip
                if (this.userCache.has(cacheKey)) {
                    existing++;
                    logger.info(`  → Ya existe en cache`);
                    continue;
                }

                try {
                    const userId = await this.createUserSequentially(userInfo.userString, userInfo.role);
                    if (userId) {
                        created++;
                        logger.info(`  → Creado exitosamente con ID: ${userId}`);
                    } else {
                        logger.warn(`  → No se pudo crear, pero no hay error`);
                    }
                } catch (error) {
                    errors++;
                    logger.error(`  → Error pre-creando usuario ${userInfo.userString}:`, error.message);
                }
            }

            logger.info(`Pre-creación completada: ${created} usuarios creados, ${existing} ya existían, ${errors} errores`);
        } catch (error) {
            logger.error('Error en pre-creación de usuarios:', error);
        }
    }

    /**
     * Crear usuario de forma secuencial (sin concurrencia)
     * @param {string} userString 
     * @param {string} defaultRole 
     * @returns {Promise<string|null>}
     */
    async createUserSequentially(userString, defaultRole) {
        if (!userString) return null;

        // Extraer nombre e ID del formato "Nombre Apellido;#ID"
        const match = userString.match(/^(.+);#(\d+)$/);
        let name;

        if (match) {
            name = match[1].trim();
        } else {
            name = userString.trim();
        }

        const cacheKey = `${userString}-${defaultRole}`;
        const nameCacheKey = `${name}-${defaultRole}`;

        // Verificar cache una vez más
        if (this.userCache.has(cacheKey)) {
            logger.info(`    Cache hit para ${cacheKey}`);
            return this.userCache.get(cacheKey);
        }

        // Buscar usuario existente con lógica mejorada
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        logger.info(`    Buscando usuario existente: ${firstName} ${lastName}`);

        let user = await this.findExistingUserByName(firstName, lastName);

        if (user) {
            logger.info(`    Usuario encontrado en BD: ${user.id} - ${user.email}`);
            
            // Si el usuario existe pero no tiene área asignada, asignarle el área del proyecto
            if (!user.areaId && this.projectAreaId) {
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { areaId: this.projectAreaId }
                    });
                    logger.info(`    Área asignada al usuario existente: ${user.email} -> Área: ${this.projectAreaId}`);
                    user.areaId = this.projectAreaId; // Actualizar objeto local
                } catch (error) {
                    logger.warn(`    No se pudo asignar área a usuario ${user.id}: ${error.message}`);
                }
            }
            
            // Verificar si necesita actualizar email (si está usando email genérico importado)
            if (user.email.includes('@imported.com')) {
                // Generar email más específico usando el proyecto actual
                let baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                let newEmail = `${baseEmail}@teamtime.com`;
                
                // Verificar que el nuevo email no exista
                const emailExists = await prisma.user.findUnique({ where: { email: newEmail } });
                if (!emailExists && newEmail !== user.email) {
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { email: newEmail }
                        });
                        logger.info(`    Email actualizado: ${user.email} -> ${newEmail}`);
                        user.email = newEmail; // Actualizar objeto local
                    } catch (error) {
                        logger.warn(`    No se pudo actualizar email para ${user.id}: ${error.message}`);
                    }
                }
            }
        } else {
            logger.info(`    Usuario no existe, se creará nuevo`);
        }

        if (!user) {
            // Generar email único
            let baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            let counter = this.emailCounter.get(baseEmail) || 0;
            let email = counter === 0 ? `${baseEmail}@teamtime.com` : `${baseEmail}${counter}@teamtime.com`;

            logger.info(`    Generando email base: ${baseEmail}, contador inicial: ${counter}, email: ${email}`);

            // Verificar email único en BD
            let emailExists = await prisma.user.findUnique({ where: { email } });
            while (emailExists) {
                logger.info(`    Email ${email} ya existe (${emailExists.id}), incrementando contador`);
                counter++;
                email = `${baseEmail}${counter}@teamtime.com`;
                emailExists = await prisma.user.findUnique({ where: { email } });
            }

            logger.info(`    Email final único: ${email} (contador: ${counter})`);
            this.emailCounter.set(baseEmail, counter + 1);

            try {
                const hashedPassword = await bcrypt.hash('temp_password123', 10);
                user = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        role: defaultRole,
                        areaId: this.projectAreaId, // Asignar al área del proyecto
                        isActive: true
                    }
                });

                logger.info(`Usuario creado secuencialmente: ${user.firstName} ${user.lastName} (${user.role}) - ${user.email} - Área: ${this.projectAreaId}`);
            } catch (error) {
                // Si aún hay error de duplicado, usar timestamp
                if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                    const timestamp = Date.now();
                    const timestampEmail = `${baseEmail}.${timestamp}@teamtime.com`;

                    const hashedPassword = await bcrypt.hash('temp_password123', 10);
                    user = await prisma.user.create({
                        data: {
                            email: timestampEmail,
                            password: hashedPassword,
                            firstName,
                            lastName,
                            role: defaultRole,
                            areaId: this.projectAreaId, // Asignar al área del proyecto
                            isActive: true
                        }
                    });

                    logger.info(`Usuario creado con timestamp: ${user.firstName} ${user.lastName} (${user.role}) - ${user.email} - Área: ${this.projectAreaId}`);
                } else {
                    throw error;
                }
            }
        }

        // Guardar en cache
        this.userCache.set(cacheKey, user.id);
        this.userCache.set(nameCacheKey, user.id);

        return user.id;
    }

    /**
     * Pre-crear catálogos necesarios
     * @param {Array} data - Datos del Excel
     */
    async preCreateCatalogs(data) {
        try {
            // Extraer todos los valores únicos de cada tipo de catálogo
            const catalogValues = {
                'RISK_LEVEL': new Set(),
                'PROJECT_TYPE': new Set(),
                'BUSINESS_LINE': new Set(),
                'OPPORTUNITY_TYPE': new Set(),
                'SEGMENT': new Set(),
                'SALES_MANAGEMENT': new Set(),
                'SALES_EXECUTIVE': new Set(),
                'DESIGNER': new Set()
            };

            data.forEach(row => {
                if (row.risk) catalogValues['RISK_LEVEL'].add(row.risk);
                if (row.projectType) catalogValues['PROJECT_TYPE'].add(row.projectType);
                if (row.businessLine) catalogValues['BUSINESS_LINE'].add(row.businessLine);
                if (row.opportunityType) catalogValues['OPPORTUNITY_TYPE'].add(row.opportunityType);
                if (row.segment) catalogValues['SEGMENT'].add(row.segment);
                if (row.salesManagement) catalogValues['SALES_MANAGEMENT'].add(row.salesManagement);
                if (row.salesExecutive) catalogValues['SALES_EXECUTIVE'].add(row.salesExecutive);
                if (row.designer) catalogValues['DESIGNER'].add(row.designer);
            });

            logger.info('Pre-creando catálogos necesarios...');

            // Crear catálogos de forma secuencial
            for (const [type, values] of Object.entries(catalogValues)) {
                for (const value of values) {
                    await this.findOrCreateCatalog(type, value);
                }
            }

            logger.info('Catálogos pre-creados exitosamente');
        } catch (error) {
            logger.error('Error pre-creando catálogos:', error);
        }
    }

    /**
     * Buscar o crear entrada de catálogo
     * @param {string} type - Tipo de catálogo
     * @param {string} name - Nombre del valor
     * @returns {Promise<string>} - ID del catálogo
     */
    async findOrCreateCatalog(type, name) {
        if (!name) return null;

        // Limpiar y extraer nombre para catálogos que pueden tener formato "Nombre;#ID"
        let cleanName = name;
        let externalId = null;

        const match = String(name).match(/^(.+);#(\d+)$/);
        if (match) {
            cleanName = match[1].trim();
            externalId = match[2];
        } else {
            cleanName = String(name).trim();
        }

        let catalog = await prisma.catalog.findFirst({
            where: {
                type: type,
                name: { equals: cleanName, mode: 'insensitive' }
            }
        });

        if (!catalog) {
            catalog = await prisma.catalog.create({
                data: {
                    type: type,
                    name: cleanName,
                    externalId: externalId
                }
            });
        }

        return catalog.id;
    }

    /**
     * Procesar string de proveedores
     * @param {string} suppliersString 
     * @returns {Promise<Array>}
     */
    async processSuppliersString(suppliersString) {
        if (!suppliersString) return [];

        const supplierNames = suppliersString.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
        const suppliers = [];

        for (const supplierName of supplierNames) {
            let supplier = await prisma.supplier.findFirst({
                where: { name: { equals: supplierName, mode: 'insensitive' } }
            });

            if (!supplier) {
                supplier = await prisma.supplier.create({
                    data: { name: supplierName }
                });
            }

            suppliers.push({ id: supplier.id, role: null });
        }

        return suppliers;
    }

    // Métodos de parsing y validación
    parseString(value) {
        if (value === null || value === undefined) return null;
        return String(value).trim() || null;
    }

    parseInteger(value) {
        if (value === null || value === undefined) return null;
        const parsed = parseInt(value);
        return isNaN(parsed) ? null : parsed;
    }

    parseDecimal(value, maxValue = null) {
        if (value === null || value === undefined) return null;
        const parsed = parseFloat(value);
        if (isNaN(parsed)) return null;

        // Validar rango si se especifica
        if (maxValue !== null && Math.abs(parsed) > maxValue) {
            logger.warn(`Valor decimal ${parsed} excede el máximo permitido ${maxValue}, será truncado`);
            return parsed > 0 ? maxValue : -maxValue;
        }

        return parsed;
    }

    parseDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;

        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
        } catch {
            return null;
        }
    }

    /**
     * Mapear estatus del Excel a ProjectStatus
     * @param {string} value 
     * @returns {string}
     */
    mapStatus(value) {
        if (!value) return 'ACTIVE';
        const statusStr = String(value).trim();
        return this.statusMapping[statusStr] || 'ACTIVE';
    }

    parseBoolean(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;

        const str = String(value).toLowerCase().trim();
        return ['si', 'sí', 'yes', 'true', '1'].includes(str);
    }

    parseArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;

        return String(value).split(/[;,]/).map(s => s.trim()).filter(s => s.length > 0);
    }

    /**
     * Crear tarea por defecto para proyecto importado
     * @param {string} projectId - ID del proyecto
     * @param {string} createdByUserId - ID del usuario que crea la tarea (opcional)
     * @returns {Promise<Object>}
     */
    async createDefaultTask(projectId, createdByUserId = null) {
        try {
            // Verificar si el proyecto ya tiene tareas
            const existingTasks = await prisma.task.findMany({
                where: { 
                    projectId: projectId,
                    isActive: true
                }
            });

            // Solo crear la tarea si no tiene ninguna tarea existente
            if (existingTasks.length === 0) {
                const defaultTask = await prisma.task.create({
                    data: {
                        title: 'Seguimiento de proyecto',
                        description: 'Tarea para el seguimiento general del proyecto importado desde Excel',
                        projectId: projectId,
                        status: 'TODO',
                        priority: 'MEDIUM',
                        createdBy: createdByUserId,
                        tags: ['importado', 'seguimiento']
                    }
                });

                logger.info(`Tarea de seguimiento creada para proyecto ${projectId}: ${defaultTask.id}`);
                return defaultTask;
            } else {
                logger.info(`Proyecto ${projectId} ya tiene ${existingTasks.length} tareas, no se crea tarea de seguimiento`);
                return null;
            }
        } catch (error) {
            logger.error(`Error creando tarea de seguimiento para proyecto ${projectId}:`, error);
            // No lanzar error para no interrumpir la importación del proyecto
            return null;
        }
    }

    /**
     * Crear múltiples tareas predeterminadas para un proyecto
     * @param {string} projectId - ID del proyecto
     * @param {string} createdByUserId - ID del usuario que crea las tareas (opcional)
     * @param {Array} taskTemplates - Array de plantillas de tareas
     * @returns {Promise<Array>}
     */
    async createProjectTasks(projectId, createdByUserId = null, taskTemplates = []) {
        const defaultTemplates = [
            {
                title: 'Actividades del proyecto',
                description: 'Tarea general para actividades del proyecto',
                priority: 'MEDIUM',
                tags: ['general']
            },
            {
                title: 'Revisión de requerimientos',
                description: 'Validar y documentar requerimientos del proyecto',
                priority: 'HIGH',
                tags: ['análisis', 'requerimientos']
            },
            {
                title: 'Seguimiento de avances',
                description: 'Monitoreo periódico del progreso del proyecto',
                priority: 'MEDIUM',
                tags: ['seguimiento', 'monitoreo']
            }
        ];

        const templates = taskTemplates.length > 0 ? taskTemplates : [defaultTemplates[0]]; // Solo la primera por defecto
        const createdTasks = [];

        for (const template of templates) {
            try {
                const task = await prisma.task.create({
                    data: {
                        title: template.title,
                        description: template.description || null,
                        projectId: projectId,
                        status: template.status || 'TODO',
                        priority: template.priority || 'MEDIUM',
                        createdBy: createdByUserId,
                        tags: template.tags || ['importado'],
                        estimatedHours: template.estimatedHours || null,
                        dueDate: template.dueDate || null
                    }
                });

                createdTasks.push(task);
                logger.info(`Tarea creada: ${task.title} para proyecto ${projectId}`);
            } catch (error) {
                logger.error(`Error creando tarea "${template.title}" para proyecto ${projectId}:`, error);
            }
        }

        return createdTasks;
    }

    /**
     * Buscar usuario existente por nombre con lógica mejorada para evitar duplicados
     * @param {string} firstName 
     * @param {string} lastName 
     * @returns {Promise<Object|null>}
     */
    async findExistingUserByName(firstName, lastName) {
        // Estrategia 1: Búsqueda exacta (case insensitive)
        let user = await prisma.user.findFirst({
            where: {
                AND: [
                    { firstName: { equals: firstName, mode: 'insensitive' } },
                    { lastName: { equals: lastName, mode: 'insensitive' } }
                ]
            }
        });

        if (user) {
            logger.info(`    Encontrado con búsqueda exacta: ${user.firstName} ${user.lastName}`);
            return user;
        }

        // Estrategia 2: Búsqueda por email generado (para usuarios ya importados)
        const baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const possibleEmails = [
            `${baseEmail}@teamtime.com`,
            `${baseEmail}@imported.com`,
            `${baseEmail}1@teamtime.com`,
            `${baseEmail}2@teamtime.com`
        ];

        user = await prisma.user.findFirst({
            where: {
                email: { in: possibleEmails }
            }
        });

        if (user) {
            logger.info(`    Encontrado por email generado: ${user.firstName} ${user.lastName} (${user.email})`);
            return user;
        }

        // Estrategia 3: Búsqueda parcial para variaciones de nombres
        const firstNameVariations = [
            firstName,
            firstName.split(' ')[0], // Solo el primer nombre si tiene espacios
        ];

        const lastNameVariations = [
            lastName,
            lastName.split(' ').slice(0, 2).join(' '), // Solo los primeros dos apellidos
        ];

        for (const fName of firstNameVariations) {
            for (const lName of lastNameVariations) {
                if (fName && lName) {
                    user = await prisma.user.findFirst({
                        where: {
                            AND: [
                                { firstName: { contains: fName, mode: 'insensitive' } },
                                { lastName: { contains: lName, mode: 'insensitive' } }
                            ]
                        }
                    });

                    if (user) {
                        logger.info(`    Encontrado con búsqueda parcial: ${user.firstName} ${user.lastName} (variación de "${firstName} ${lastName}")`);
                        return user;
                    }
                }
            }
        }

        logger.info(`    No se encontró usuario existente para: ${firstName} ${lastName}`);
        return null;
    }
}

module.exports = ExcelImportService;