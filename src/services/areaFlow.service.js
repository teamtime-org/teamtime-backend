const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AreaFlowService {
  /**
   * Obtiene todos los flujos de áreas con filtros opcionales
   */
  async getAllAreaFlows(filters = {}) {
    try {
      const { fromAreaId, toAreaId } = filters;
      const where = { isActive: true };

      if (fromAreaId) where.fromAreaId = fromAreaId;
      if (toAreaId) where.toAreaId = toAreaId;

      return await prisma.areaFlow.findMany({
        where,
        include: {
          fromArea: true,
          toArea: true
        },
        orderBy: [
          { fromAreaId: 'asc' },
          { flowOrder: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error getting all area flows:', error);
      throw error;
    }
  }

  /**
   * Obtiene flujos disponibles desde un área específica
   */
  async getAvailableFlowsFromArea(fromAreaId) {
    try {
      return await prisma.areaFlow.findMany({
        where: {
          fromAreaId,
          isActive: true
        },
        include: {
          toArea: true,
          fromArea: true
        },
        orderBy: { flowOrder: 'asc' }
      });
    } catch (error) {
      console.error('Error getting available flows:', error);
      throw error;
    }
  }

  /**
   * Obtiene flujo específico entre dos áreas
   */
  async getFlowBetweenAreas(fromAreaId, toAreaId) {
    try {
      return await prisma.areaFlow.findFirst({
        where: {
          fromAreaId,
          toAreaId,
          isActive: true
        },
        include: {
          fromArea: true,
          toArea: true
        }
      });
    } catch (error) {
      console.error('Error getting flow between areas:', error);
      throw error;
    }
  }

  /**
   * Valida si una transferencia es posible según el flujo configurado
   */
  async validateTransfer(projectId, fromAreaId, toAreaId, projectData = null) {
    try {
      // Obtener flujo configurado
      const flow = await this.getFlowBetweenAreas(fromAreaId, toAreaId);

      if (!flow) {
        return {
          isValid: false,
          error: 'No existe flujo configurado entre estas áreas',
          flow: null
        };
      }

      // Validar condiciones del flujo
      if (flow.conditions) {
        const conditionResult = await this.validateFlowConditions(
          projectData || await this.getProjectData(projectId),
          flow.conditions
        );

        if (!conditionResult.isValid) {
          return {
            isValid: false,
            error: `No cumple condiciones del flujo: ${conditionResult.error}`,
            flow,
            failedConditions: conditionResult.failedConditions
          };
        }
      }

      return {
        isValid: true,
        flow,
        requiresApproval: flow.requiresApproval
      };

    } catch (error) {
      console.error('Error validating transfer:', error);
      throw error;
    }
  }

  /**
   * Valida condiciones específicas del flujo
   */
  async validateFlowConditions(projectData, conditions) {
    const failedConditions = [];

    try {
      // Validar estados requeridos
      if (conditions.requiredStatus && projectData.status) {
        if (!conditions.requiredStatus.includes(projectData.status)) {
          failedConditions.push({
            condition: 'requiredStatus',
            expected: conditions.requiredStatus,
            actual: projectData.status
          });
        }
      }

      // Validar campos requeridos
      if (conditions.requiredFields) {
        for (const field of conditions.requiredFields) {
          if (!this.hasValidValue(projectData, field)) {
            failedConditions.push({
              condition: 'requiredFields',
              field,
              error: `Campo ${field} es requerido`
            });
          }
        }
      }

      // Validar TCV máximo
      if (conditions.maxTCV && projectData.tcvMXN) {
        if (parseFloat(projectData.tcvMXN) > conditions.maxTCV) {
          failedConditions.push({
            condition: 'maxTCV',
            expected: `<= ${conditions.maxTCV}`,
            actual: projectData.tcvMXN
          });
        }
      }

      // Validar TCV mínimo
      if (conditions.minTCV && projectData.tcvMXN) {
        if (parseFloat(projectData.tcvMXN) < conditions.minTCV) {
          failedConditions.push({
            condition: 'minTCV',
            expected: `>= ${conditions.minTCV}`,
            actual: projectData.tcvMXN
          });
        }
      }

      // Validar etapa mínima del proyecto
      if (conditions.minimumProjectStage && projectData.projectStage) {
        const isValidStage = await this.validateProjectStage(
          projectData.projectStage,
          conditions.minimumProjectStage
        );

        if (!isValidStage) {
          failedConditions.push({
            condition: 'minimumProjectStage',
            expected: conditions.minimumProjectStage,
            actual: projectData.projectStage
          });
        }
      }

      return {
        isValid: failedConditions.length === 0,
        failedConditions,
        error: failedConditions.length > 0
          ? `Falló ${failedConditions.length} condición(es)`
          : null
      };

    } catch (error) {
      console.error('Error validating flow conditions:', error);
      return {
        isValid: false,
        error: `Error validando condiciones: ${error.message}`,
        failedConditions
      };
    }
  }

  /**
   * Obtiene datos del proyecto para validación
   */
  async getProjectData(projectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: true,
          area: true
        }
      });

      if (!project) {
        throw new Error(`Proyecto ${projectId} no encontrado`);
      }

      // También obtener datos de staging si existen
      const stagingProject = await prisma.stagingProject.findFirst({
        where: { transferredToProjectId: projectId },
        include: {
          projectStage: true
        }
      });

      return {
        ...project,
        ...stagingProject,
        tcvMXN: stagingProject?.tcvMXN || 0,
        siebelId: stagingProject?.siebelId,
        projectStage: stagingProject?.projectStage?.code
      };

    } catch (error) {
      console.error('Error getting project data:', error);
      throw error;
    }
  }

  /**
   * Verifica si un campo tiene valor válido
   */
  hasValidValue(data, fieldPath) {
    const fields = fieldPath.split('.');
    let value = data;

    for (const field of fields) {
      value = value?.[field];
    }

    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Valida etapa mínima del proyecto
   */
  async validateProjectStage(currentStage, requiredStage) {
    try {
      const currentStageData = await prisma.projectStage.findFirst({
        where: { code: currentStage }
      });

      const requiredStageData = await prisma.projectStage.findFirst({
        where: { code: requiredStage }
      });

      if (!currentStageData || !requiredStageData) {
        return false;
      }

      return currentStageData.orderIndex >= requiredStageData.orderIndex;

    } catch (error) {
      console.error('Error validating project stage:', error);
      return false;
    }
  }

  /**
   * Obtiene el siguiente paso en el flujo desde un área
   */
  async getNextFlowStep(fromAreaId) {
    try {
      const nextFlow = await prisma.areaFlow.findFirst({
        where: {
          fromAreaId,
          isActive: true,
          isRequired: true
        },
        include: {
          toArea: true
        },
        orderBy: { flowOrder: 'asc' }
      });

      return nextFlow;

    } catch (error) {
      console.error('Error getting next flow step:', error);
      throw error;
    }
  }

  /**
   * Obtiene flujos alternativos (skip, return)
   */
  async getAlternativeFlows(fromAreaId) {
    try {
      return await prisma.areaFlow.findMany({
        where: {
          fromAreaId,
          isActive: true,
          OR: [
            { canSkip: true },
            { isRequired: false }
          ]
        },
        include: {
          toArea: true
        },
        orderBy: { flowOrder: 'asc' }
      });

    } catch (error) {
      console.error('Error getting alternative flows:', error);
      throw error;
    }
  }

  /**
   * Crea nuevo flujo entre áreas
   */
  async createAreaFlow(flowData) {
    try {
      return await prisma.areaFlow.create({
        data: flowData,
        include: {
          fromArea: true,
          toArea: true
        }
      });

    } catch (error) {
      console.error('Error creating area flow:', error);
      throw error;
    }
  }

  /**
   * Actualiza flujo existente
   */
  async updateAreaFlow(flowId, updateData) {
    try {
      return await prisma.areaFlow.update({
        where: { id: flowId },
        data: updateData,
        include: {
          fromArea: true,
          toArea: true
        }
      });

    } catch (error) {
      console.error('Error updating area flow:', error);
      throw error;
    }
  }

  /**
   * Obtiene configuración completa de flujos
   */
  async getFlowConfiguration() {
    try {
      const areas = await prisma.area.findMany({
        where: { isActive: true },
        include: {
          areaFlowFrom: {
            where: { isActive: true },
            include: { toArea: true },
            orderBy: { flowOrder: 'asc' }
          }
        },
        orderBy: { orderIndex: 'asc' }
      });

      return areas;

    } catch (error) {
      console.error('Error getting flow configuration:', error);
      throw error;
    }
  }
}

module.exports = new AreaFlowService();