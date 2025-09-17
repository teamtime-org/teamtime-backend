const { PrismaClient } = require('@prisma/client');
const transferService = require('./transfer.service');

const prisma = new PrismaClient();

class StagingService {
  /**
   * Obtiene todos los proyectos en staging
   */
  async getAllStagingProjects(filters = {}) {
    try {
      const {
        sourceAreaId,
        status,
        clientId,
        batchId,
        importLogId,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const where = {};

      if (sourceAreaId) where.sourceAreaId = sourceAreaId;
      if (status && status !== 'ALL') where.status = status;
      if (clientId) where.clientId = clientId;
      if (batchId) where.batchId = batchId;
      if (importLogId) where.importLogId = importLogId;

      const [total, projects] = await Promise.all([
        prisma.stagingProject.count({ where }),
        prisma.stagingProject.findMany({
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
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder }
        })
      ]);

      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error getting staging projects:', error);
      throw error;
    }
  }

  /**
   * Obtiene un proyecto staging por ID
   */
  async getStagingProjectById(id) {
    try {
      const project = await prisma.stagingProject.findUnique({
        where: { id },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true,
          transferredToProject: {
            include: {
              client: true,
              area: true,
              projectStage: true
            }
          },
          architect: true,
          designManager: true,
          designCoordinator: true,
          salesManager: true,
          salesLeader: true,
          salesExecutive: true,
          transferredByUser: true,
          serviceType: true,
          contractType: true,
          businessLine: true,
          importLog: true
        }
      });

      if (!project) {
        throw new Error('Proyecto staging no encontrado');
      }

      return project;

    } catch (error) {
      console.error('Error getting staging project:', error);
      throw error;
    }
  }

  /**
   * Actualiza un proyecto staging
   */
  async updateStagingProject(id, data) {
    try {
      const project = await prisma.stagingProject.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true
        }
      });

      return project;

    } catch (error) {
      console.error('Error updating staging project:', error);
      throw error;
    }
  }

  /**
   * Aprueba un proyecto staging
   */
  async approveStagingProject(id, approvedBy, notes = null) {
    try {
      const project = await prisma.stagingProject.findUnique({
        where: { id }
      });

      if (!project) {
        throw new Error('Proyecto staging no encontrado');
      }

      if (project.status === 'TRANSFERRED') {
        throw new Error('El proyecto ya fue transferido');
      }

      // Actualizar estado a aprobado
      const updatedProject = await prisma.stagingProject.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewNotes: notes,
          updatedAt: new Date()
        },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true
        }
      });

      return updatedProject;

    } catch (error) {
      console.error('Error approving staging project:', error);
      throw error;
    }
  }

  /**
   * Rechaza un proyecto staging
   */
  async rejectStagingProject(id, rejectedBy, reason) {
    try {
      const project = await prisma.stagingProject.findUnique({
        where: { id }
      });

      if (!project) {
        throw new Error('Proyecto staging no encontrado');
      }

      if (project.status === 'TRANSFERRED') {
        throw new Error('El proyecto ya fue transferido y no puede ser rechazado');
      }

      const updatedProject = await prisma.stagingProject.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewNotes: reason,
          updatedAt: new Date()
        },
        include: {
          sourceArea: true,
          client: true,
          projectStage: true
        }
      });

      return updatedProject;

    } catch (error) {
      console.error('Error rejecting staging project:', error);
      throw error;
    }
  }

  /**
   * Transfiere un proyecto aprobado a producción
   */
  async transferToProduction(id, transferredBy) {
    try {
      const stagingProject = await prisma.stagingProject.findUnique({
        where: { id },
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
        throw new Error('El proyecto ya fue transferido');
      }

      // Usar el servicio de transferencia para crear el proyecto real
      const project = await transferService.transferStagingToActive(id, transferredBy);

      // Actualizar estado del staging project
      await prisma.stagingProject.update({
        where: { id },
        data: {
          status: 'TRANSFERRED',
          transferredAt: new Date(),
          transferredBy,
          transferredToProjectId: project.id
        }
      });

      return project;

    } catch (error) {
      console.error('Error transferring to production:', error);
      throw error;
    }
  }

  /**
   * Aprueba múltiples proyectos staging
   */
  async bulkApproveStagingProjects(ids, approvedBy, notes = null) {
    try {
      const results = {
        approved: [],
        errors: []
      };

      for (const id of ids) {
        try {
          const project = await this.approveStagingProject(id, approvedBy, notes);
          results.approved.push(project);
        } catch (error) {
          results.errors.push({
            id,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Error bulk approving staging projects:', error);
      throw error;
    }
  }

  /**
   * Transfiere múltiples proyectos aprobados
   */
  async bulkTransferToProduction(ids, transferredBy) {
    try {
      const results = {
        transferred: [],
        errors: []
      };

      for (const id of ids) {
        try {
          const project = await this.transferToProduction(id, transferredBy);
          results.transferred.push(project);
        } catch (error) {
          results.errors.push({
            id,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Error bulk transferring projects:', error);
      throw error;
    }
  }

  /**
   * Elimina proyectos staging rechazados o duplicados
   */
  async deleteStagingProject(id, deletedBy) {
    try {
      const project = await prisma.stagingProject.findUnique({
        where: { id }
      });

      if (!project) {
        throw new Error('Proyecto staging no encontrado');
      }

      if (project.status === 'TRANSFERRED') {
        throw new Error('No se pueden eliminar proyectos transferidos');
      }

      if (project.status === 'APPROVED' && !project.transferredToProjectId) {
        throw new Error('No se pueden eliminar proyectos aprobados que no han sido transferidos');
      }

      // Eliminar el proyecto
      await prisma.stagingProject.delete({
        where: { id }
      });

      return {
        success: true,
        message: 'Proyecto staging eliminado exitosamente'
      };

    } catch (error) {
      console.error('Error deleting staging project:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de staging
   */
  async getStagingStatistics(sourceAreaId = null) {
    try {
      const where = sourceAreaId ? { sourceAreaId } : {};

      const [
        total,
        byStatus,
        byArea,
        recentImports,
        pendingReview
      ] = await Promise.all([
        // Total de proyectos
        prisma.stagingProject.count({ where }),

        // Por estado
        prisma.stagingProject.groupBy({
          by: ['status'],
          where,
          _count: true
        }),

        // Por área
        prisma.stagingProject.groupBy({
          by: ['sourceAreaId'],
          where,
          _count: true
        }),

        // Importaciones recientes
        prisma.importLog.findMany({
          where: sourceAreaId ? { sourceAreaId } : {},
          orderBy: { startedAt: 'desc' },
          take: 5,
          include: {
            sourceArea: true
          }
        }),

        // Pendientes de revisión
        prisma.stagingProject.count({
          where: {
            ...where,
            status: 'PENDING_REVIEW'
          }
        })
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byArea,
        recentImports,
        pendingReview,
        stats: {
          approvalRate: total > 0
            ? ((byStatus.find(s => s.status === 'APPROVED')?._count || 0) / total * 100).toFixed(2)
            : 0,
          transferRate: total > 0
            ? ((byStatus.find(s => s.status === 'TRANSFERRED')?._count || 0) / total * 100).toFixed(2)
            : 0
        }
      };

    } catch (error) {
      console.error('Error getting staging statistics:', error);
      throw error;
    }
  }

  /**
   * Busca duplicados potenciales en staging
   */
  async findPotentialDuplicates(stagingProjectId) {
    try {
      const stagingProject = await prisma.stagingProject.findUnique({
        where: { id: stagingProjectId }
      });

      if (!stagingProject) {
        throw new Error('Proyecto staging no encontrado');
      }

      // Buscar proyectos con título similar o mismo cliente
      const duplicates = await prisma.stagingProject.findMany({
        where: {
          AND: [
            { id: { not: stagingProjectId } },
            { status: { not: 'REJECTED' } },
            {
              OR: [
                { title: { contains: stagingProject.title.slice(0, 20) } },
                {
                  AND: [
                    { clientId: stagingProject.clientId },
                    { title: { contains: stagingProject.title.split(' ')[0] } }
                  ]
                }
              ]
            }
          ]
        },
        include: {
          client: true,
          sourceArea: true
        }
      });

      return duplicates;

    } catch (error) {
      console.error('Error finding potential duplicates:', error);
      throw error;
    }
  }
}

module.exports = new StagingService();