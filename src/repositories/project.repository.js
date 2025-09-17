const prisma = require('../config/database');
const { PROJECT_STATUS } = require('../utils/constants');

/**
 * Repositorio para operaciones de proyecto - Schema v2
 */
class ProjectRepository {
    /**
     * Buscar proyecto por ID
     * @param {string} id
     * @param {Object} options - Opciones de include
     * @returns {Promise<Object|null>}
     */
    async findById(id, options = {}) {
        const include = {
            client: {
                select: {
                    id: true,
                    name: true,
                    acronym: true,
                },
            },
            area: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                    code: true,
                },
            },
            creator: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
            stagingProjects: {
                select: {
                    id: true,
                    projectName: true,
                    serviceDescription: true,
                    generalStatus: true,
                    monthlyIncomeMXN: true,
                    tcvMXN: true,
                    siebelId: true,
                    architect: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    salesManager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            },
            ...options.include,
        };

        if (options.includeAssignments) {
            include.assignments = {
                where: { isActive: true },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            };
        }

        if (options.includeTasks) {
            include.tasks = {
                where: { isActive: true },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    estimatedHours: true,
                    dueDate: true,
                },
            };
        }

        if (options.includeStats) {
            include._count = {
                select: {
                    assignments: { where: { isActive: true } },
                    tasks: { where: { isActive: true } },
                    timeEntries: true,
                },
            };
        }

        return await prisma.project.findUnique({
            where: { id },
            include,
        });
    }

    /**
     * Crear nuevo proyecto
     * @param {Object} projectData
     * @returns {Promise<Object>}
     */
    async create(projectData) {
        return await prisma.project.create({
            data: projectData,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        acronym: true,
                    },
                },
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        code: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Actualizar proyecto
     * @param {string} id
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    async update(id, updateData) {
        return await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        acronym: true,
                    },
                },
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        code: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Listar proyectos con filtros y paginación
     * @param {Object} filters
     * @param {Object} pagination
     * @param {string} userRole - Rol del usuario que consulta
     * @param {string} userId - ID del usuario que consulta
     * @returns {Promise<Object>}
     */
    async findMany(filters = {}, pagination = {}, userRole = null, userId = null) {
        const where = { status: 'ACTIVE' }; // Solo proyectos activos por defecto

        // Aplicar filtros de acceso por rol
        console.log('ProjectRepository.findMany - filters:', filters);
        console.log('ProjectRepository.findMany - userRole:', userRole);
        console.log('ProjectRepository.findMany - userId:', userId);

        // Aplicar filtros adicionales
        if (filters.areaId) {
            where.areaId = filters.areaId;
            console.log('ProjectRepository.findMany - Applied areaId filter:', filters.areaId);
        }

        if (filters.clientId) {
            where.clientId = filters.clientId;
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.priority) {
            where.priority = filters.priority;
        }

        if (filters.createdBy) {
            where.createdBy = filters.createdBy;
        }

        if (filters.isGeneral !== undefined) {
            where.isGeneral = filters.isGeneral;
        }

        // Lógica especial para colaboradores: proyectos asignados + proyectos generales del área
        if (filters.collaboratorAccess && filters.collaboratorUserId && filters.collaboratorAreaId) {
            console.log(`ProjectRepository.findMany - Applying collaborator access for user ${filters.collaboratorUserId} in area ${filters.collaboratorAreaId}`);
            where.OR = [
                // Proyectos asignados específicamente al colaborador
                {
                    assignments: {
                        some: {
                            userId: filters.collaboratorUserId,
                            isActive: true,
                        },
                    },
                },
                // Proyectos generales del área del colaborador
                {
                    isGeneral: true,
                    areaId: filters.collaboratorAreaId,
                },
            ];
        } else if (filters.assignedToMe && userId) {
            where.assignments = {
                some: {
                    userId,
                    isActive: true,
                },
            };
        }

        if (filters.assignedUserId) {
            // Si es "me", usar el userId actual
            const targetUserId = filters.assignedUserId === 'me' ? userId : filters.assignedUserId;
            where.assignments = {
                some: {
                    userId: targetUserId,
                    isActive: true,
                },
            };
        }

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
                { internalId: { contains: filters.search, mode: 'insensitive' } },
                // Buscar también en cliente
                {
                    client: {
                        OR: [
                            { name: { contains: filters.search, mode: 'insensitive' } },
                            { acronym: { contains: filters.search, mode: 'insensitive' } },
                        ]
                    }
                }
            ];
        }

        if (filters.startDate || filters.endDate) {
            where.startDate = {};
            if (filters.startDate) {
                where.startDate.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.startDate.lte = filters.endDate;
            }
        }

        // Contar total
        const total = await prisma.project.count({ where });

        // Obtener proyectos
        const projects = await prisma.project.findMany({
            where,
            skip: pagination.skip || 0,
            take: pagination.limit || 10,
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        acronym: true,
                    },
                },
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        code: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                assignments: {
                    where: { isActive: true },
                    select: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: { where: { isActive: true } },
                        timeEntries: true,
                        stagingProjects: true,
                    },
                },
            },
        });

        console.log('ProjectRepository.findMany - where clause:', where);
        console.log('ProjectRepository.findMany - found projects:', projects.length);
        console.log('ProjectRepository.findMany - total count:', total);

        return { projects, total };
    }

    /**
     * Asignar usuario a proyecto
     * @param {string} projectId
     * @param {string} userId
     * @param {string} assignedBy
     * @returns {Promise<Object>}
     */
    async assignUser(projectId, userId, assignedBy) {
        // Verificar si ya existe una asignación activa
        const existingAssignment = await prisma.projectAssignment.findFirst({
            where: {
                projectId,
                userId,
                isActive: true,
            },
        });

        if (existingAssignment) {
            throw new Error('El usuario ya está asignado a este proyecto');
        }

        return await prisma.projectAssignment.create({
            data: {
                projectId,
                userId,
                assignedById: assignedBy,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                assignedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Remover asignación de usuario
     * @param {string} projectId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async unassignUser(projectId, userId) {
        return await prisma.projectAssignment.updateMany({
            where: {
                projectId,
                userId,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
    }

    /**
     * Obtener usuarios asignados al proyecto
     * @param {string} projectId
     * @returns {Promise<Array>}
     */
    async getAssignedUsers(projectId) {
        const assignments = await prisma.projectAssignment.findMany({
            where: {
                projectId,
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
                assignedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                assignedAt: 'desc',
            },
        });

        return assignments;
    }

    /**
     * Verificar si un usuario está asignado al proyecto
     * @param {string} projectId
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    async isUserAssigned(projectId, userId) {
        const assignment = await prisma.projectAssignment.findFirst({
            where: {
                projectId,
                userId,
                isActive: true,
            },
        });

        return !!assignment;
    }

    /**
     * Verificar si un usuario puede acceder al proyecto
     * @param {string} projectId
     * @param {string} userId
     * @param {string} userRole
     * @returns {Promise<boolean>}
     */
    async canUserAccess(projectId, userId, userRole) {
        if (userRole === 'ADMINISTRADOR') {
            return true;
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                createdBy: true,
                assignments: {
                    where: {
                        userId,
                        isActive: true,
                    },
                },
            },
        });

        if (!project) {
            return false;
        }

        // Los coordinadores pueden acceder a proyectos que crearon
        if (userRole === 'COORDINADOR' && project.createdBy === userId) {
            return true;
        }

        // Los colaboradores pueden acceder a proyectos asignados
        return project.assignments.length > 0;
    }

    /**
     * Obtener proyectos del usuario
     * @param {string} userId
     * @param {string} userRole
     * @returns {Promise<Array>}
     */
    async findByUser(userId, userRole) {
        let where = {};

        if (userRole === 'COORDINADOR') {
            where.createdBy = userId;
        } else if (userRole === 'COLABORADOR') {
            where.assignments = {
                some: {
                    userId,
                    isActive: true,
                },
            };
        }

        return await prisma.project.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                priority: true,
                internalId: true,
                client: {
                    select: {
                        id: true,
                        name: true,
                        acronym: true,
                    },
                },
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        code: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Obtener estadísticas del proyecto
     * @param {string} id
     * @returns {Promise<Object>}
     */
    async getStats(id) {
        const [
            project,
            taskStats,
            timeStats,
            assignmentCount,
        ] = await Promise.all([
            prisma.project.findUnique({
                where: { id },
                select: {
                    estimatedHours: true,
                    startDate: true,
                    endDate: true,
                },
            }),
            prisma.task.groupBy({
                by: ['status'],
                where: { projectId: id, isActive: true },
                _count: { id: true },
            }),
            prisma.timeEntry.aggregate({
                where: { projectId: id },
                _sum: { hours: true },
                _count: { id: true },
            }),
            prisma.projectAssignment.count({
                where: { projectId: id, isActive: true },
            }),
        ]);

        const totalTasks = taskStats.reduce((sum, stat) => sum + stat._count.id, 0);
        const completedTasks = taskStats.find(stat => stat.status === 'DONE')?._count.id || 0;

        return {
            estimatedHours: project?.estimatedHours || 0,
            actualHours: timeStats._sum.hours || 0,
            totalTasks,
            completedTasks,
            taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            totalTimeEntries: timeStats._count.id || 0,
            assignedUsers: assignmentCount,
            tasksByStatus: taskStats.reduce((acc, stat) => {
                acc[stat.status] = stat._count.id;
                return acc;
            }, {}),
        };
    }

    /**
     * Eliminar proyecto (soft delete)
     * @param {string} id
     * @returns {Promise<Object>}
     */
    async softDelete(id) {
        return await prisma.project.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Buscar proyecto general por área
     * @param {string} areaId
     * @returns {Promise<Object|null>}
     */
    async findGeneralProjectByArea(areaId) {
        return await prisma.project.findFirst({
            where: {
                areaId,
                isGeneral: true,
                isActive: true,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        acronym: true,
                    },
                },
                area: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                tasks: {
                    where: {
                        isActive: true,
                    },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        status: true,
                        priority: true,
                    },
                },
                assignments: {
                    where: {
                        isActive: true,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Asignar usuario a proyecto
     * @param {string} projectId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async assignUserToProject(projectId, userId) {
        // Verificar si ya está asignado
        const existingAssignment = await prisma.projectAssignment.findFirst({
            where: {
                projectId,
                userId,
                isActive: true,
            },
        });

        if (existingAssignment) {
            throw new Error('El usuario ya está asignado a este proyecto');
        }

        return await prisma.projectAssignment.create({
            data: {
                projectId,
                userId,
                assignedAt: new Date(),
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        internalId: true,
                    },
                },
            },
        });
    }
}

module.exports = ProjectRepository;