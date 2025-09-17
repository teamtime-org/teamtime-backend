const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class DocumentGenerationService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.outputPath = path.join(__dirname, '../generated-documents');

    // Asegurar que las carpetas existen
    this.ensureDirectories();
  }

  /**
   * Asegura que las carpetas necesarias existen
   */
  async ensureDirectories() {
    try {
      await fs.access(this.templatesPath);
    } catch {
      await fs.mkdir(this.templatesPath, { recursive: true });
    }

    try {
      await fs.access(this.outputPath);
    } catch {
      await fs.mkdir(this.outputPath, { recursive: true });
    }
  }

  /**
   * Genera documento basado en plantilla y datos del proyecto
   */
  async generateDocument(templateName, projectId, templateType = 'transfer') {
    try {
      // Obtener datos del proyecto
      const projectData = await this.getProjectData(projectId);

      // Obtener plantilla
      const template = await this.getTemplate(templateName, templateType);

      // Generar contenido del documento
      const documentContent = await this.processTemplate(template, projectData);

      // Crear nombre único para el archivo
      const filename = this.generateFilename(templateName, projectData, templateType);

      // Guardar documento
      const filePath = await this.saveDocument(filename, documentContent, template.format);

      // Registrar documento generado
      const documentLog = await this.logGeneratedDocument({
        projectId,
        templateName,
        templateType,
        filename,
        filePath,
        generatedBy: projectData.lastTransferredBy || 'system'
      });

      return {
        documentLog,
        filePath,
        filename,
        content: documentContent
      };

    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos completos del proyecto para generación de documentos
   */
  async getProjectData(projectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: {
            include: {
              segment: true
            }
          },
          area: true,
          projectStage: true,
          assignedTo: true,
          transferLogs: {
            include: {
              fromArea: true,
              toArea: true
            },
            orderBy: { transferDate: 'desc' },
            take: 1
          }
        }
      });

      if (!project) {
        throw new Error(`Proyecto ${projectId} no encontrado`);
      }

      // Enriquecer datos con información adicional
      const enrichedData = {
        ...project,
        formattedDates: {
          startDate: this.formatDate(project.startDate),
          estimatedEndDate: this.formatDate(project.estimatedEndDate),
          actualEndDate: this.formatDate(project.actualEndDate),
          createdAt: this.formatDate(project.createdAt)
        },
        formattedAmounts: {
          tcvMXN: this.formatCurrency(project.tcvMXN),
          monthlyMXN: this.formatCurrency(project.monthlyMXN)
        },
        lastTransfer: project.transferLogs[0] || null,
        lastTransferredBy: project.transferLogs[0]?.transferredBy || null,
        generationDate: this.formatDate(new Date()),
        generationTime: new Date().toLocaleTimeString('es-MX')
      };

      return enrichedData;

    } catch (error) {
      console.error('Error getting project data:', error);
      throw error;
    }
  }

  /**
   * Obtiene plantilla de documento
   */
  async getTemplate(templateName, templateType) {
    try {
      // Buscar plantilla en base de datos
      const dbTemplate = await prisma.documentTemplate.findFirst({
        where: {
          name: templateName,
          type: templateType,
          isActive: true
        }
      });

      if (dbTemplate) {
        return {
          content: dbTemplate.content,
          format: dbTemplate.format,
          variables: dbTemplate.variables || [],
          metadata: dbTemplate.metadata || {}
        };
      }

      // Si no existe en BD, buscar archivo físico
      const templateFile = path.join(
        this.templatesPath,
        templateType,
        `${templateName}.template`
      );

      try {
        const content = await fs.readFile(templateFile, 'utf8');

        // Detectar formato por extensión o contenido
        const format = this.detectTemplateFormat(content);

        return {
          content,
          format,
          variables: this.extractTemplateVariables(content),
          metadata: { source: 'file' }
        };
      } catch (fileError) {
        throw new Error(`Plantilla '${templateName}' no encontrada`);
      }

    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * Procesa plantilla con datos del proyecto
   */
  async processTemplate(template, projectData) {
    try {
      let content = template.content;

      // Procesar variables básicas
      content = this.replaceTemplateVariables(content, projectData);

      // Procesar estructuras condicionales
      content = this.processConditionals(content, projectData);

      // Procesar loops/iteraciones
      content = this.processLoops(content, projectData);

      return content;

    } catch (error) {
      console.error('Error processing template:', error);
      throw error;
    }
  }

  /**
   * Reemplaza variables en la plantilla
   */
  replaceTemplateVariables(content, data) {
    // Reemplazar variables simples: {{variable}}
    return content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = this.getNestedValue(data, variable.trim());
      return value !== undefined ? value : match;
    });
  }

  /**
   * Procesa condicionales en plantilla
   */
  processConditionals(content, data) {
    // Procesar: {{#if condition}} content {{/if}}
    return content.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, innerContent) => {
        const conditionValue = this.evaluateCondition(condition.trim(), data);
        return conditionValue ? innerContent : '';
      }
    );
  }

  /**
   * Procesa loops en plantilla
   */
  processLoops(content, data) {
    // Procesar: {{#each array}} content {{/each}}
    return content.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayPath, innerContent) => {
        const array = this.getNestedValue(data, arrayPath.trim());
        if (!Array.isArray(array)) return '';

        return array.map((item, index) => {
          return this.replaceTemplateVariables(innerContent, {
            ...data,
            this: item,
            index: index,
            '@index': index,
            '@first': index === 0,
            '@last': index === array.length - 1
          });
        }).join('');
      }
    );
  }

  /**
   * Obtiene valor anidado de un objeto
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Evalúa condición simple
   */
  evaluateCondition(condition, data) {
    // Implementación básica - se puede extender
    const value = this.getNestedValue(data, condition);
    return Boolean(value);
  }

  /**
   * Genera nombre único para el documento
   */
  generateFilename(templateName, projectData, templateType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectId = projectData.internalId || projectData.id;
    return `${templateType}-${templateName}-${projectId}-${timestamp}`;
  }

  /**
   * Guarda documento generado
   */
  async saveDocument(filename, content, format = 'html') {
    const extension = this.getFileExtension(format);
    const fullFilename = `${filename}.${extension}`;
    const filePath = path.join(this.outputPath, fullFilename);

    await fs.writeFile(filePath, content, 'utf8');

    return filePath;
  }

  /**
   * Registra documento generado en la base de datos
   */
  async logGeneratedDocument({
    projectId,
    templateName,
    templateType,
    filename,
    filePath,
    generatedBy
  }) {
    try {
      return await prisma.generatedDocument.create({
        data: {
          projectId,
          templateName,
          templateType,
          filename,
          filePath,
          generatedBy,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error logging generated document:', error);
      throw error;
    }
  }

  /**
   * Obtiene documentos generados para un proyecto
   */
  async getProjectDocuments(projectId) {
    try {
      return await prisma.generatedDocument.findMany({
        where: { projectId },
        orderBy: { generatedAt: 'desc' }
      });

    } catch (error) {
      console.error('Error getting project documents:', error);
      throw error;
    }
  }

  /**
   * Crea o actualiza plantilla
   */
  async saveTemplate(templateData) {
    try {
      const { name, type, content, format, variables, metadata, isActive = true } = templateData;

      const template = await prisma.documentTemplate.upsert({
        where: {
          name_type: {
            name,
            type
          }
        },
        update: {
          content,
          format,
          variables,
          metadata,
          isActive,
          updatedAt: new Date()
        },
        create: {
          name,
          type,
          content,
          format,
          variables,
          metadata,
          isActive,
          createdAt: new Date()
        }
      });

      return template;

    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las plantillas disponibles
   */
  async getAvailableTemplates(templateType = null) {
    try {
      // TODO: Schema v2 no incluye DocumentTemplate - implementar cuando esté disponible
      console.log('getAvailableTemplates called - returning mock data for Schema v2 compatibility');

      // Retornar plantillas estándar mientras se migra a Schema v2
      const mockTemplates = [
        {
          id: 'transfer-template',
          name: 'Plantilla de Transferencia',
          type: 'transfer',
          format: 'html',
          isActive: true,
          description: 'Plantilla estándar para transferencias entre áreas'
        },
        {
          id: 'project-summary-template',
          name: 'Resumen de Proyecto',
          type: 'summary',
          format: 'html',
          isActive: true,
          description: 'Plantilla para generar resúmenes de proyecto'
        }
      ];

      // Filtrar por tipo si se especifica
      if (templateType) {
        return mockTemplates.filter(template => template.type === templateType);
      }

      return mockTemplates;

    } catch (error) {
      console.error('Error getting available templates:', error);
      throw error;
    }
  }

  /**
   * Utilidades de formato
   */
  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX');
  }

  formatCurrency(amount) {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  detectTemplateFormat(content) {
    if (content.includes('<!DOCTYPE html') || content.includes('<html')) return 'html';
    if (content.includes('\\documentclass')) return 'latex';
    return 'text';
  }

  extractTemplateVariables(content) {
    const variables = [];
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const variable = match.replace(/[{}]/g, '').trim();
        if (!variable.startsWith('#') && !variable.startsWith('/') && !variables.includes(variable)) {
          variables.push(variable);
        }
      });
    }
    return variables;
  }

  getFileExtension(format) {
    const extensions = {
      html: 'html',
      latex: 'tex',
      text: 'txt',
      markdown: 'md',
      pdf: 'pdf'
    };
    return extensions[format] || 'txt';
  }
}

module.exports = new DocumentGenerationService();