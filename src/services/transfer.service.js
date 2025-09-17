const { PrismaClient } = require('@prisma/client');
const areaFlowService = require('./areaFlow.service');
const internalIdService = require('./internalId.service');

const prisma = new PrismaClient();

class TransferService {
  /**
   * Transfiere proyecto staging a área activa (crea proyecto real)
   */
  async transferStagingToActive(stagingProjectId, transferredBy) {
    try {
      // Obtener staging project
      const stagingProject = await prisma.stagingProject.findUnique({
        where: { id: stagingProjectId },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true
        }
      });

      if (!stagingProject) {
        throw new Error('Proyecto staging no encontrado');
      }

      if (stagingProject.status !== 'APPROVED') {
        throw new Error('Solo se pueden transferir proyectos aprobados');
      }

      if (stagingProject.transferredToProjectId) {
        throw new Error('Proyecto ya transferido');
      }

      // Generar ID interno
      const internalId = await internalIdService.generateInternalId(
        stagingProject.client.acronym,
        stagingProject.client.segmentId
      );

      // Crear proyecto real
      const project = await prisma.project.create({
        data: {
          internalId,
          title: stagingProject.title,
          description: stagingProject.description,
          clientId: stagingProject.clientId,
          areaId: stagingProject.sourceAreaId,
          projectStageId: stagingProject.projectStageId,
          assignedToId: stagingProject.assignedToId,
          startDate: stagingProject.startDate,
          estimatedEndDate: stagingProject.estimatedEndDate,
          actualEndDate: stagingProject.actualEndDate,
          tcvMXN: stagingProject.tcvMXN,
          monthlyMXN: stagingProject.monthlyMXN,
          status: 'ACTIVE',
          createdAt: new Date(),
          createdBy: transferredBy
        },
        include: {
          client: true,
          area: true,
          projectStage: true,
          assignedTo: true
        }
      });

      // Actualizar staging project con referencia al proyecto real
      await prisma.stagingProject.update({
        where: { id: stagingProjectId },
        data: {
          transferredToProjectId: project.id,
          transferredAt: new Date(),
          transferredBy
        }
      });

      // Crear registro de transferencia
      await this.createTransferLog({
        projectId: project.id,
        fromAreaId: null,
        toAreaId: stagingProject.sourceAreaId,
        transferType: 'STAGING_TO_ACTIVE',
        transferredBy,
        stagingProjectId
      });

      return project;

    } catch (error) {
      console.error('Error transferring staging to active:', error);
      throw error;
    }
  }

  /**
   * Transfiere proyecto entre áreas
   */
  async transferProjectBetweenAreas(projectId, toAreaId, transferredBy, notes = null) {
    try {
      // Obtener proyecto actual
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          area: true,
          client: true
        }
      });

      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      const fromAreaId = project.areaId;

      if (fromAreaId === toAreaId) {
        throw new Error('El proyecto ya está en el área destino');
      }

      // Validar transferencia usando areaFlow
      const validation = await areaFlowService.validateTransfer(
        projectId,
        fromAreaId,
        toAreaId
      );

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Realizar transferencia
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          areaId: toAreaId,
          updatedAt: new Date()
        },
        include: {
          area: true,
          client: true,
          projectStage: true,
          assignedTo: true
        }
      });

      // Crear registro de transferencia
      const transferLog = await this.createTransferLog({
        projectId,
        fromAreaId,
        toAreaId,
        transferType: 'AREA_TRANSFER',
        transferredBy,
        notes,
        requiresApproval: validation.requiresApproval,
        status: validation.requiresApproval ? 'PENDING_APPROVAL' : 'COMPLETED'
      });

      return {
        project: updatedProject,
        transfer: transferLog,
        requiresApproval: validation.requiresApproval
      };

    } catch (error) {
      console.error('Error transferring project between areas:', error);
      throw error;
    }
  }

  /**
   * Procesa transferencia pendiente de aprobación
   */
  async processTransferApproval(transferId, approved, approvedBy, comments = null) {
    try {
      const transfer = await prisma.transferLog.findUnique({
        where: { id: transferId },
        include: {
          project: true,
          fromArea: true,
          toArea: true
        }
      });

      if (!transfer) {
        throw new Error('Transferencia no encontrada');
      }

      if (transfer.status !== 'PENDING_APPROVAL') {
        throw new Error('Esta transferencia no está pendiente de aprobación');
      }

      const status = approved ? 'APPROVED' : 'REJECTED';

      // Actualizar transferencia
      const updatedTransfer = await prisma.transferLog.update({
        where: { id: transferId },
        data: {
          status,
          approvedBy: approvedBy,
          approvedAt: new Date(),
          approvalComments: comments
        }
      });

      // Si fue rechazada, revertir el proyecto al área original
      if (!approved && transfer.fromAreaId) {
        await prisma.project.update({
          where: { id: transfer.projectId },
          data: {
            areaId: transfer.fromAreaId,
            updatedAt: new Date()
          }
        });
      }

      return updatedTransfer;

    } catch (error) {
      console.error('Error processing transfer approval:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de transferencias de un proyecto
   */
  async getProjectTransferHistory(projectId) {
    try {
      return await prisma.transferLog.findMany({
        where: { projectId },
        include: {
          fromArea: true,
          toArea: true,
          approvedByUser: true
        },
        orderBy: { transferDate: 'desc' }
      });

    } catch (error) {
      console.error('Error getting project transfer history:', error);
      throw error;
    }
  }

  /**
   * Obtiene transferencias pendientes para un área
   */
  async getPendingTransfersForArea(areaId) {
    try {
      return await prisma.transferLog.findMany({
        where: {
          toAreaId: areaId,
          status: 'PENDING_APPROVAL'
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
        orderBy: { transferDate: 'desc' }
      });

    } catch (error) {
      console.error('Error getting pending transfers:', error);
      throw error;
    }
  }

  /**
   * Obtiene próximos pasos disponibles para un proyecto
   */
  async getAvailableNextSteps(projectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { area: true }
      });

      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      // Obtener flujos disponibles desde el área actual
      const availableFlows = await areaFlowService.getAvailableFlowsFromArea(
        project.areaId
      );

      const nextSteps = [];

      for (const flow of availableFlows) {
        // Validar cada flujo
        const validation = await areaFlowService.validateTransfer(
          projectId,
          project.areaId,
          flow.toAreaId
        );

        nextSteps.push({
          ...flow,
          isValid: validation.isValid,
          validationError: validation.error,
          requiresApproval: validation.requiresApproval
        });
      }

      return nextSteps;

    } catch (error) {
      console.error('Error getting available next steps:', error);
      throw error;
    }
  }

  /**
   * Crea registro de transferencia
   */
  async createTransferLog({
    projectId,
    fromAreaId,
    toAreaId,
    transferType,
    transferredBy,
    notes = null,
    stagingProjectId = null,
    requiresApproval = false,
    status = 'COMPLETED'
  }) {
    try {
      return await prisma.transferLog.create({
        data: {
          projectId,
          fromAreaId,
          toAreaId,
          transferType,
          transferDate: new Date(),
          transferredBy,
          notes,
          stagingProjectId,
          status,
          requiresApproval
        },
        include: {
          fromArea: true,
          toArea: true,
          project: {
            include: {
              client: true
            }
          }
        }
      });

    } catch (error) {
      console.error('Error creating transfer log:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de transferencias
   */
  async getTransferStatistics(areaId = null, dateFrom = null, dateTo = null) {
    try {
      const where = {};

      if (areaId) {
        where.OR = [
          { fromAreaId: areaId },
          { toAreaId: areaId }
        ];
      }

      if (dateFrom || dateTo) {
        where.transferDate = {};
        if (dateFrom) where.transferDate.gte = new Date(dateFrom);
        if (dateTo) where.transferDate.lte = new Date(dateTo);
      }

      const [total, byStatus, byType, byArea] = await Promise.all([
        // Total de transferencias
        prisma.transferLog.count({ where }),

        // Por estado
        prisma.transferLog.groupBy({
          by: ['status'],
          where,
          _count: true
        }),

        // Por tipo
        prisma.transferLog.groupBy({
          by: ['transferType'],
          where,
          _count: true
        }),

        // Por área destino
        prisma.transferLog.groupBy({
          by: ['toAreaId'],
          where,
          _count: true,
          _avg: { id: true }
        })
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item.transferType] = item._count;
          return acc;
        }, {}),
        byArea
      };

    } catch (error) {
      console.error('Error getting transfer statistics:', error);
      throw error;
    }
  }
}

module.exports = new TransferService();