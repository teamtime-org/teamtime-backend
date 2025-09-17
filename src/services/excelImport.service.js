const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const fieldMappingService = require('./fieldMapping.service');

const prisma = new PrismaClient();

class ExcelImportService {
  /**
   * Importa proyectos desde Excel a staging area
   */
  async importExcelToStaging(filePath, sourceAreaId, importedBy) {
    try {
      // Leer archivo Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      // Obtener headers
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value;
      });

      const results = {
        total: 0,
        imported: 0,
        errors: [],
        stagingProjects: []
      };

      // Crear registro de importación
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validar que el usuario existe, sino usar el admin por defecto
      let validImportedBy = importedBy;
      if (importedBy) {
        const userExists = await prisma.user.findUnique({
          where: { id: importedBy }
        });
        if (!userExists) {
          // Buscar usuario admin por defecto
          const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMINISTRADOR' }
          });
          validImportedBy = adminUser ? adminUser.id : null;
        }
      }

      const importLog = await prisma.importLog.create({
        data: {
          batchId,
          fileName: filePath.split('/').pop(),
          sourceAreaId,
          totalRecords: worksheet.rowCount - 1,
          processedRecords: 0,
          successRecords: 0,
          errorRecords: 0,
          skippedRecords: 0,
          importedBy: validImportedBy,
          startedAt: new Date()
        }
      });

      // Procesar cada fila (saltar header)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rawData = {};

        // Extraer datos de la fila
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rawData[header] = cell.value;
          }
        });

        results.total++;

        try {
          // Mapear datos usando fieldMappingService
          const mappingResult = await fieldMappingService.mapExcelData(
            rawData,
            sourceAreaId
          );

          if (!mappingResult.isValid) {
            results.errors.push({
              row: rowNumber,
              errors: mappingResult.validationErrors,
              data: rawData
            });
            continue;
          }

          // Crear staging project
          const stagingProject = await this.createStagingProject(
            mappingResult.mappedData,
            sourceAreaId,
            importLog.id,
            rowNumber,
            batchId
          );

          results.imported++;
          results.stagingProjects.push(stagingProject);

        } catch (error) {
          results.errors.push({
            row: rowNumber,
            error: error.message,
            data: rawData
          });
        }
      }

      // Actualizar log de importación
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          processedRecords: results.total,
          successRecords: results.imported,
          errorRecords: results.errors.length,
          skippedRecords: results.total - results.imported - results.errors.length,
          errors: results.errors,
          summary: {
            total: results.total,
            imported: results.imported,
            errors: results.errors.length
          },
          completedAt: new Date()
        }
      });

      return {
        ...results,
        importLogId: importLog.id
      };

    } catch (error) {
      console.error('Error importing Excel:', error);
      throw error;
    }
  }

  /**
   * Crea proyecto en staging area
   */
  async createStagingProject(mappedData, sourceAreaId, importLogId, rowNumber, batchId) {
    try {
      // Asegurar que batchId siempre esté presente
      const projectBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stagingProject = await prisma.stagingProject.create({
        data: {
          ...mappedData,
          sourceAreaId,
          importLogId,
          rowNumber,
          batchId: projectBatchId,
          status: 'PENDING_REVIEW',
          createdAt: new Date()
        },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true
        }
      });

      return stagingProject;

    } catch (error) {
      console.error('Error creating staging project:', error);
      throw error;
    }
  }

  /**
   * Obtiene proyectos en staging por área
   */
  async getStagingProjectsByArea(sourceAreaId, status = null) {
    try {
      const where = { sourceAreaId };
      if (status) {
        where.status = status;
      }

      return await prisma.stagingProject.findMany({
        where,
        include: {
          sourceArea: true,
          client: true,
          projectStage: true,
          transferredToProject: true,
          architect: true,
          designManager: true,
          designCoordinator: true,
          salesManager: true,
          salesLeader: true,
          salesExecutive: true,
          transferredByUser: true,
          serviceType: true,
          contractType: true,
          businessLine: true
        },
        orderBy: { createdAt: 'desc' }
      });

    } catch (error) {
      console.error('Error getting staging projects:', error);
      throw error;
    }
  }

  /**
   * Actualiza estado de proyecto staging
   */
  async updateStagingProjectStatus(stagingProjectId, status, notes = null) {
    try {
      return await prisma.stagingProject.update({
        where: { id: stagingProjectId },
        data: {
          status,
          reviewNotes: notes,
          reviewedAt: new Date()
        },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true
        }
      });

    } catch (error) {
      console.error('Error updating staging project status:', error);
      throw error;
    }
  }

  /**
   * Elimina proyecto staging
   */
  async deleteStagingProject(stagingProjectId) {
    try {
      return await prisma.stagingProject.delete({
        where: { id: stagingProjectId }
      });

    } catch (error) {
      console.error('Error deleting staging project:', error);
      throw error;
    }
  }

  /**
   * Obtiene logs de importación
   */
  async getImportLogs(sourceAreaId = null) {
    try {
      const where = sourceAreaId ? { sourceAreaId } : {};

      return await prisma.importLog.findMany({
        where,
        include: {
          sourceArea: true
        },
        orderBy: { startedAt: 'desc' }
      });

    } catch (error) {
      console.error('Error getting import logs:', error);
      throw error;
    }
  }

  /**
   * Valida estructura de Excel
   */
  async validateExcelStructure(filePath, sourceAreaId) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('El archivo Excel debe tener al menos una hoja');
      }

      // Obtener headers
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          headers.push(cell.value.toString().trim());
        }
      });

      // Obtener mapeos esperados para el área
      const expectedMappings = await fieldMappingService.getFieldMappings(sourceAreaId);
      const expectedHeaders = expectedMappings.map(m => m.sourceField);
      const requiredHeaders = expectedMappings
        .filter(m => m.isRequired)
        .map(m => m.sourceField);

      // Validar headers requeridos
      const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
      const extraHeaders = headers.filter(h => !expectedHeaders.includes(h));

      return {
        isValid: missingRequired.length === 0,
        headers,
        expectedHeaders,
        missingRequired,
        extraHeaders,
        rowCount: worksheet.rowCount - 1
      };

    } catch (error) {
      console.error('Error validating Excel structure:', error);
      throw error;
    }
  }

  /**
   * Previsualiza datos del Excel con mapeo de campos aplicado
   */
  async previewExcelData(filePath, sourceAreaId, maxRows = 10) {
    try {
      // Leer archivo Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      // Obtener headers del Excel
      const headerRow = worksheet.getRow(1);
      const excelHeaders = [];
      headerRow.eachCell((cell, colNumber) => {
        excelHeaders[colNumber] = cell.value?.toString().trim();
      });

      // Obtener field mappings para el área
      const fieldMappings = await fieldMappingService.getFieldMappings(sourceAreaId);

      // Crear mapa de headers Excel a campos target
      const headerMapping = {};
      let mappedFields = 0;

      fieldMappings.forEach(mapping => {
        const excelIndex = excelHeaders.findIndex(h => h === mapping.sourceField);
        if (excelIndex !== -1) {
          headerMapping[excelIndex] = {
            sourceField: mapping.sourceField,
            targetField: mapping.targetField,
            transformation: mapping.transformation,
            description: mapping.description
          };
          mappedFields++;
        }
      });

      // Leer datos de previsualización
      const previewRows = [];
      const totalRows = worksheet.rowCount - 1; // Excluir header
      const rowsToRead = Math.min(maxRows, totalRows);

      for (let rowNumber = 2; rowNumber <= rowsToRead + 1; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const mappedRow = {};

        // Mapear cada celda según los field mappings
        Object.keys(headerMapping).forEach(colIndex => {
          const cell = row.getCell(parseInt(colIndex));
          const mapping = headerMapping[colIndex];
          let value = null;

          if (cell.value !== null && cell.value !== undefined) {
            value = cell.value;

            // Para preview, mantener valores originales sin transformar completamente
            if (mapping.transformation) {
              switch (mapping.transformation) {
                case 'DATE_FORMAT':
                  if (cell.value instanceof Date) {
                    value = cell.value.toISOString().split('T')[0];
                  } else {
                    value = value.toString();
                  }
                  break;
                case 'TO_DECIMAL':
                case 'CURRENCY_TO_NUMBER':
                  // Para preview, mantener como string pero mostrar que es numérico
                  value = `${value} (numérico)`;
                  break;
                case 'TO_INTEGER':
                  // Para preview, mantener como string pero mostrar que es entero
                  value = `${value} (entero)`;
                  break;
                case 'TO_STRING':
                  value = value.toString();
                  break;
                case 'UPPERCASE':
                  value = value.toString().toUpperCase();
                  break;
                case 'SPLIT_SEMICOLON':
                  // Para preview, mostrar como array sin procesar completamente
                  const splitValues = value.toString().split(';').map(s => s.trim());
                  value = `[${splitValues.join(', ')}]`;
                  break;
                case 'USER_LOOKUP':
                  value = `${value} (lookup usuario)`;
                  break;
                case 'CLIENT_LOOKUP':
                case 'CLIENT_NAME_LOOKUP':
                  value = `${value} (lookup cliente)`;
                  break;
                case 'PROJECT_STAGE_LOOKUP':
                  value = `${value} (lookup etapa)`;
                  break;
                case 'CATALOG_LOOKUP':
                case 'CATALOG_LOOKUP_SERVICE_TYPE':
                case 'CATALOG_LOOKUP_CONTRACT_TYPE':
                case 'CATALOG_LOOKUP_BUSINESS_LINE':
                  value = `${value} (lookup catálogo)`;
                  break;
                default:
                  value = value.toString();
              }
            } else {
              value = value.toString();
            }
          }

          mappedRow[mapping.targetField] = value;
        });

        // Solo agregar la fila si tiene al menos un campo con valor
        if (Object.values(mappedRow).some(v => v !== null && v !== undefined && v !== '')) {
          previewRows.push(mappedRow);
        }
      }

      // Análisis de mapeo
      const recognizedFields = Object.values(headerMapping).map(m => m.sourceField);
      const unmappedHeaders = excelHeaders.filter(h => h && !recognizedFields.includes(h));

      return {
        previewRows,
        totalRows,
        mappedFields,
        mappingResults: {
          recognized: recognizedFields.length,
          unmapped: unmappedHeaders.length,
          unmappedHeaders
        },
        fieldMappings: Object.values(headerMapping)
      };

    } catch (error) {
      console.error('Error previewing Excel data:', error);
      throw error;
    }
  }
}

module.exports = new ExcelImportService();