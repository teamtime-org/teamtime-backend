const { PrismaClient } = require('@prisma/client');
const internalIdService = require('./internalId.service');
const transferService = require('./transfer.service');
const documentGenerationService = require('./documentGeneration.service');

const prisma = new PrismaClient();

/**
 * Enhanced Project Service para schema v2
 * Extiende funcionalidad básica con nuevas capacidades
 */
class EnhancedProjectService {
  /**
   * Crea proyecto desde staging area
   */
  async createProjectFromStaging(stagingProjectId, createdBy) {
    try {
      return await transferService.transferStagingToActive(stagingProjectId, createdBy);
    } catch (error) {
      console.error('Error creating project from staging:', error);
      throw error;
    }
  }

  /**
   * Obtiene proyectos con información enriquecida
   */
  async getEnhancedProjectById(projectId) {
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
            take: 10
          },
          generatedDocuments: {
            orderBy: { generatedAt: 'desc' },
            take: 20
          }
        }
      });

      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      // Obtener próximos pasos disponibles
      const nextSteps = await transferService.getAvailableNextSteps(projectId);

      return {
        ...project,
        nextSteps
      };

    } catch (error) {
      console.error('Error getting enhanced project:', error);
      throw error;
    }
  }

  /**
   * Lista proyectos por área con filtros avanzados
   */
  async getProjectsByArea(areaId, filters = {}) {
    try {
      const where = {
        areaId,
        ...filters
      };

      return await prisma.project.findMany({
        where,
        include: {
          client: true,
          projectStage: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              transferLogs: true,
              generatedDocuments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

    } catch (error) {
      console.error('Error getting projects by area:', error);
      throw error;
    }
  }

  /**
   * Transfiere proyecto entre áreas
   */
  async transferProject(projectId, toAreaId, transferredBy, notes = null) {
    try {
      return await transferService.transferProjectBetweenAreas(
        projectId,
        toAreaId,
        transferredBy,
        notes
      );
    } catch (error) {
      console.error('Error transferring project:', error);
      throw error;
    }
  }

  /**
   * Genera documento para proyecto
   */
  async generateProjectDocument(projectId, templateName, templateType = 'transfer') {
    try {
      return await documentGenerationService.generateDocument(
        templateName,
        projectId,
        templateType
      );
    } catch (error) {
      console.error('Error generating project document:', error);
      throw error;
    }
  }

  /**
   * Actualiza etapa del proyecto
   */
  async updateProjectStage(projectId, projectStageId, updatedBy) {
    try {
      const project = await prisma.project.update({
        where: { id: projectId },
        data: {
          projectStageId,
          updatedAt: new Date()
        },
        include: {
          projectStage: true,
          client: true,
          area: true
        }
      });

      // Crear log de cambio de etapa
      await prisma.projectStageLog.create({
        data: {
          projectId,
          projectStageId,
          changedBy: updatedBy,
          changedAt: new Date()
        }
      });

      return project;

    } catch (error) {
      console.error('Error updating project stage:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de cambios de etapa
   */
  async getProjectStageHistory(projectId) {
    try {
      return await prisma.projectStageLog.findMany({
        where: { projectId },
        include: {
          projectStage: true,
          changedByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { changedAt: 'desc' }
      });

    } catch (error) {
      console.error('Error getting project stage history:', error);
      throw error;
    }
  }

  /**
   * Valida condiciones para avanzar proyecto
   */
  async validateProjectAdvancement(projectId, toAreaId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          area: true,
          client: true,
          projectStage: true
        }
      });

      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      // Usar areaFlowService para validar transferencia
      return await transferService.validateTransfer(
        projectId,
        project.areaId,
        toAreaId
      );

    } catch (error) {
      console.error('Error validating project advancement:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de proyecto
   */
  async getProjectStatistics(projectId) {
    try {
      const project = await this.getEnhancedProjectById(projectId);

      // Calcular días en área actual
      const lastTransfer = project.transferLogs[0];
      const daysInCurrentArea = lastTransfer
        ? Math.floor((new Date() - new Date(lastTransfer.transferDate)) / (1000 * 60 * 60 * 24))
        : Math.floor((new Date() - new Date(project.createdAt)) / (1000 * 60 * 60 * 24));

      // Calcular progreso del proyecto
      const totalStages = await prisma.projectStage.count({ where: { isActive: true } });
      const currentStageOrder = project.projectStage?.orderIndex || 0;
      const progressPercentage = totalStages > 0 ? (currentStageOrder / totalStages) * 100 : 0;

      return {
        projectId,
        daysInCurrentArea,
        totalTransfers: project.transferLogs.length,
        documentsGenerated: project.generatedDocuments.length,
        progressPercentage: Math.round(progressPercentage),
        currentStage: project.projectStage?.name || 'Sin etapa',
        nextStepsAvailable: project.nextSteps?.length || 0,
        lastActivity: lastTransfer?.transferDate || project.createdAt
      };

    } catch (error) {
      console.error('Error getting project statistics:', error);
      throw error;
    }
  }

  /**
   * Busca proyectos por múltiples criterios
   */
  async searchProjects(searchCriteria) {
    try {
      const {
        query,
        areaId,
        clientId,
        projectStageId,
        status,
        assignedToId,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0
      } = searchCriteria;

      const where = {};

      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { internalId: { contains: query, mode: 'insensitive' } }
        ];
      }

      if (areaId) where.areaId = areaId;
      if (clientId) where.clientId = clientId;
      if (projectStageId) where.projectStageId = projectStageId;
      if (status) where.status = status;
      if (assignedToId) where.assignedToId = assignedToId;

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            client: true,
            area: true,
            projectStage: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.project.count({ where })
      ]);

      return {
        projects,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  /**
   * Clona proyecto existente
   */
  async cloneProject(sourceProjectId, cloneData, createdBy) {
    try {
      const sourceProject = await prisma.project.findUnique({
        where: { id: sourceProjectId },
        include: {
          client: true,
          area: true
        }
      });

      if (!sourceProject) {
        throw new Error('Proyecto origen no encontrado');
      }

      // Generar nuevo ID interno
      const internalId = await internalIdService.generateInternalId(
        sourceProject.client.acronym,
        sourceProject.client.segmentId
      );

      // Crear proyecto clonado
      const clonedProject = await prisma.project.create({
        data: {
          internalId,
          title: cloneData.title || `${sourceProject.title} (Copia)`,
          description: cloneData.description || sourceProject.description,
          clientId: cloneData.clientId || sourceProject.clientId,
          areaId: cloneData.areaId || sourceProject.areaId,
          projectStageId: cloneData.projectStageId || sourceProject.projectStageId,
          assignedToId: cloneData.assignedToId || sourceProject.assignedToId,
          tcvMXN: cloneData.tcvMXN || sourceProject.tcvMXN,
          monthlyMXN: cloneData.monthlyMXN || sourceProject.monthlyMXN,
          status: 'ACTIVE',
          createdBy,
          createdAt: new Date()
        },
        include: {
          client: true,
          area: true,
          projectStage: true
        }
      });

      return clonedProject;

    } catch (error) {
      console.error('Error cloning project:', error);
      throw error;
    }
  }

  /**
   * Obtiene dashboard de proyectos por área
   */
  async getAreaDashboard(areaId) {
    try {
      const [
        totalProjects,
        projectsByStage,
        projectsByStatus,
        recentTransfers,
        pendingApprovals
      ] = await Promise.all([
        // Total de proyectos en el área
        prisma.project.count({
          where: { areaId }
        }),

        // Proyectos por etapa
        prisma.project.groupBy({
          by: ['projectStageId'],
          where: { areaId },
          _count: true,
          include: {
            projectStage: true
          }
        }),

        // Proyectos por estado
        prisma.project.groupBy({
          by: ['status'],
          where: { areaId },
          _count: true
        }),

        // Transferencias recientes
        prisma.transferLog.findMany({
          where: {
            OR: [
              { fromAreaId: areaId },
              { toAreaId: areaId }
            ]
          },
          include: {
            project: {
              include: {
                client: true
              }
            },
            fromArea: true,
            toArea: true
          },
          orderBy: { transferDate: 'desc' },
          take: 10
        }),

        // Transferencias pendientes de aprobación
        transferService.getPendingTransfersForArea(areaId)
      ]);

      return {
        summary: {
          totalProjects,
          pendingApprovals: pendingApprovals.length
        },
        projectsByStage,
        projectsByStatus,
        recentActivity: {
          transfers: recentTransfers
        },
        pendingApprovals
      };

    } catch (error) {
      console.error('Error getting area dashboard:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedProjectService();