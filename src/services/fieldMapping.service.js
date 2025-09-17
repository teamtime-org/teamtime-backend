const { PrismaClient } = require('@prisma/client');
const userAutoCreationService = require('./userAutoCreation.service');

const prisma = new PrismaClient();

class FieldMappingService {
  /**
   * Mapea datos del Excel según configuración del área
   */
  async mapExcelData(rawData, sourceAreaId) {
    try {
      // Obtener configuración de mapeo para el área
      const mappings = await prisma.fieldMapping.findMany({
        where: {
          sourceAreaId,
          isActive: true
        },
        orderBy: { orderIndex: 'asc' }
      });


      const mappedData = {};
      const validationErrors = [];

      for (const mapping of mappings) {
        const sourceValue = rawData[mapping.sourceField];

        // Validar campo requerido
        if (mapping.isRequired && !sourceValue) {
          validationErrors.push({
            field: mapping.sourceField,
            error: 'Campo requerido',
            description: mapping.description
          });
          continue;
        }

        // Aplicar transformación si existe
        let targetValue = sourceValue;
        if (mapping.transformation && sourceValue) {
          try {
            targetValue = await this.applyTransformation(
              sourceValue,
              mapping.transformation,
              sourceAreaId
            );
          } catch (error) {
            validationErrors.push({
              field: mapping.sourceField,
              error: `Error en transformación: ${error.message}`,
              transformation: mapping.transformation
            });
            continue;
          }
        }

        // Aplicar valor por defecto si no hay valor y está configurado
        if (!targetValue && mapping.defaultValue) {
          targetValue = mapping.defaultValue;
        }

        // Validar regla si existe
        if (mapping.validationRule && targetValue) {
          const isValid = await this.validateField(
            targetValue,
            mapping.validationRule
          );
          if (!isValid) {
            validationErrors.push({
              field: mapping.sourceField,
              error: 'No cumple regla de validación',
              rule: mapping.validationRule
            });
          }
        }

        // Conversión especial para externalId (debe ser string)
        if (mapping.targetField === 'externalId' && targetValue !== null && targetValue !== undefined) {
          targetValue = targetValue.toString();
        }

        mappedData[mapping.targetField] = targetValue;
      }

      // Mapear estado del proyecto si existe
      if (rawData['Etapa de Proyecto']) {
        const statusMapping = await this.mapProjectStatus(
          rawData['Etapa de Proyecto'],
          sourceAreaId
        );

        if (statusMapping) {
          mappedData.projectStageId = statusMapping.projectStageId;
          mappedData.projectStatus = statusMapping.projectStatus;
        }
      }


      return {
        mappedData,
        validationErrors,
        isValid: validationErrors.length === 0
      };

    } catch (error) {
      console.error('Error mapping Excel data:', error);
      throw error;
    }
  }

  /**
   * Aplica transformaciones a los valores
   */
  async applyTransformation(value, transformation, sourceAreaId) {
    switch (transformation) {
      case 'UPPERCASE':
        return value?.toString().toUpperCase();

      case 'LOWERCASE':
        return value?.toString().toLowerCase();

      case 'DATE_FORMAT':
        return this.parseDate(value);

      case 'CURRENCY_TO_NUMBER':
        return this.parseCurrency(value);

      case 'USER_LOOKUP':
        return await this.lookupUser(value);

      case 'USER_LOOKUP_OR_CREATE':
        return await this.lookupOrCreateUser(value, transformation, sourceAreaId);

      case 'CLIENT_LOOKUP':
        return await this.lookupClient(value);

      case 'CATALOG_LOOKUP':
        return await this.lookupCatalog(value);

      case 'STAGE_LOOKUP':
        return await this.lookupProjectStage(value, sourceAreaId);

      case 'TO_STRING':
        return value ? value.toString() : null;

      case 'TO_INTEGER':
        return this.parseInteger(value);

      case 'TO_DECIMAL':
        return this.parseDecimal(value);

      case 'SPLIT_SEMICOLON':
        return this.splitBySemicolon(value);

      case 'CLIENT_NAME_LOOKUP':
        return await this.lookupClientByName(value);

      case 'PROJECT_STAGE_LOOKUP':
        return await this.lookupProjectStage(value, sourceAreaId);

      case 'CATALOG_LOOKUP_SERVICE_TYPE':
        return await this.lookupCatalog(value, 'SERVICE_TYPE');

      case 'CATALOG_LOOKUP_CONTRACT_TYPE':
        return await this.lookupCatalog(value, 'CONTRACT_TYPE');

      case 'CATALOG_LOOKUP_BUSINESS_LINE':
        return await this.lookupCatalog(value, 'BUSINESS_LINE');

      default:
        // Transformación personalizada
        return await this.evaluateCustomTransformation(value, transformation);
    }
  }

  /**
   * Convierte fechas desde Excel
   */
  parseDate(value) {
    if (!value) return null;

    // Si ya es una fecha
    if (value instanceof Date) {
      return value;
    }

    // Intentar parsear diferentes formatos
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/     // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = value.toString().match(format);
      if (match) {
        // Determinar orden según formato
        let day, month, year;
        if (format.source.includes('YYYY') && format.source.indexOf('YYYY') === 1) {
          // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // DD/MM/YYYY o DD-MM-YYYY
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }

        return new Date(year, month - 1, day);
      }
    }

    throw new Error(`Formato de fecha no reconocido: ${value}`);
  }

  /**
   * Convierte valores de moneda a número
   */
  parseCurrency(value) {
    if (!value) return null;

    // Remover caracteres de moneda y comas
    const cleanValue = value.toString()
      .replace(/[$,\s]/g, '')
      .replace(/[^\d.-]/g, '');

    const number = parseFloat(cleanValue);

    if (isNaN(number)) {
      throw new Error(`Valor de moneda inválido: ${value}`);
    }

    return number;
  }

  /**
   * Busca usuario por nombre
   */
  async lookupUser(name) {
    if (!name) return null;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } },
          {
            AND: [
              { firstName: { contains: name.split(' ')[0], mode: 'insensitive' } },
              { lastName: { contains: name.split(' ').slice(1).join(' '), mode: 'insensitive' } }
            ]
          }
        ],
        isActive: true
      }
    });

    return user?.id || null;
  }

  /**
   * Busca o crea usuario según el contexto del campo
   */
  async lookupOrCreateUser(name, transformation, sourceAreaId) {
    if (!name) return null;

    // Determinar contexto según el campo de destino
    const context = this.determineUserContext(transformation);

    return await userAutoCreationService.findOrCreateUser(name, context, sourceAreaId);
  }

  /**
   * Determina el contexto del usuario según la transformación
   */
  determineUserContext(transformation) {
    // El transformation puede incluir el contexto después de ':'
    // Ejemplo: "USER_LOOKUP_OR_CREATE:sales_manager"
    if (transformation.includes(':')) {
      return transformation.split(':')[1];
    }

    // Contexto por defecto
    return 'default';
  }

  /**
   * Busca cliente por siglas o nombre
   */
  async lookupClient(identifier) {
    if (!identifier) return null;

    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { acronym: { equals: identifier.toUpperCase() } },
          { name: { contains: identifier, mode: 'insensitive' } }
        ],
        isActive: true
      }
    });

    return client?.id || null;
  }

  /**
   * Busca en catálogos
   */
  async lookupCatalog(value, catalogType = null) {
    if (!value) return null;

    const whereClause = {
      OR: [
        { name: { contains: value, mode: 'insensitive' } },
        { code: { equals: value.toUpperCase() } }
      ],
      isActive: true
    };

    if (catalogType) {
      whereClause.type = catalogType;
    }

    const catalog = await prisma.catalog.findFirst({
      where: whereClause
    });

    return catalog?.id || null;
  }

  /**
   * Busca etapa de proyecto
   */
  async lookupProjectStage(value, sourceAreaId) {
    if (!value) return null;

    // Buscar mapeo de estado específico del área
    const statusMapping = await prisma.statusMapping.findFirst({
      where: {
        sourceAreaId,
        sourceStatus: value,
        isActive: true
      }
    });

    if (statusMapping) {
      return statusMapping.projectStageId;
    }

    // Buscar directamente en project stages
    const stage = await prisma.projectStage.findFirst({
      where: {
        OR: [
          { name: { contains: value, mode: 'insensitive' } },
          { code: { equals: value.toUpperCase() } }
        ],
        isActive: true
      }
    });

    return stage?.id || null;
  }

  /**
   * Mapea estado del proyecto
   */
  async mapProjectStatus(sourceStatus, sourceAreaId) {
    const statusMapping = await prisma.statusMapping.findFirst({
      where: {
        sourceAreaId,
        sourceStatus,
        isActive: true
      },
      include: {
        projectStage: true
      }
    });

    return statusMapping || null;
  }

  /**
   * Valida campo según regla
   */
  async validateField(value, validationRule) {
    try {
      // Si es una expresión regular
      if (validationRule.startsWith('/') && validationRule.endsWith('/')) {
        const regex = new RegExp(validationRule.slice(1, -1));
        return regex.test(value.toString());
      }

      // Validaciones predefinidas
      switch (validationRule) {
        case 'EMAIL':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);

        case 'PHONE':
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          return phoneRegex.test(value);

        case 'POSITIVE_NUMBER':
          return parseFloat(value) > 0;

        case 'NOT_EMPTY':
          return value && value.toString().trim().length > 0;

        default:
          return true;
      }
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Convierte valor a entero
   */
  parseInteger(value) {
    if (!value) return null;

    const cleanValue = value.toString().replace(/[^\d-]/g, '');
    const number = parseInt(cleanValue);

    if (isNaN(number)) {
      throw new Error(`Valor entero inválido: ${value}`);
    }

    return number;
  }

  /**
   * Convierte valor a decimal
   */
  parseDecimal(value) {
    if (!value) return null;

    const cleanValue = value.toString()
      .replace(/[$,\s]/g, '')
      .replace(/[^\d.-]/g, '');

    const number = parseFloat(cleanValue);

    if (isNaN(number)) {
      throw new Error(`Valor decimal inválido: ${value}`);
    }

    return number;
  }

  /**
   * Divide texto por punto y coma
   */
  splitBySemicolon(value) {
    if (!value) return null;

    return value.toString()
      .split(';')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .join(';#');
  }

  /**
   * Busca cliente por nombre completo
   */
  async lookupClientByName(name) {
    if (!name) return null;

    const client = await prisma.client.findFirst({
      where: {
        name: { contains: name, mode: 'insensitive' },
        isActive: true
      }
    });

    return client?.id || null;
  }

  /**
   * Evalúa transformación personalizada
   */
  async evaluateCustomTransformation(value, transformation) {
    // Implementar evaluación segura de transformaciones personalizadas
    // Por seguridad, solo permitir transformaciones predefinidas por ahora
    console.warn(`Custom transformation not implemented: ${transformation}`);
    return value;
  }

  /**
   * Obtiene mapeos para un área específica
   */
  async getFieldMappings(sourceAreaId) {
    return await prisma.fieldMapping.findMany({
      where: {
        sourceAreaId,
        isActive: true
      },
      orderBy: { orderIndex: 'asc' },
      include: {
        sourceArea: true
      }
    });
  }

  /**
   * Crea nuevo mapeo de campo
   */
  async createFieldMapping(mappingData) {
    return await prisma.fieldMapping.create({
      data: mappingData
    });
  }

  /**
   * Actualiza mapeo de campo
   */
  async updateFieldMapping(id, mappingData) {
    return await prisma.fieldMapping.update({
      where: { id },
      data: mappingData
    });
  }
}

module.exports = new FieldMappingService();