const prisma = require('../config/database');
const { TASK_STATUS } = require('../utils/constants');

/**
 * Repositorio para operaciones de tarea
 */
class TaskRepository {
    /**
     * Buscar tarea por ID
     * @param {string} id 
     * @param {Object} options - Opciones de include
     * @returns {Promise<Object|null>}
     */
    async findById(id, options = {}) {
        const include = {
            project: {
                select: {
                    id: true,
                    name: true,
                    areaId: true,
                    area: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            assignee: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            creator: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
            ...options.include,
        };

        if (options.includeTimeEntries) {
            include.timeEntries = {
                select: {
                    id: true,
                    date: true,
                    hours: true,
                    description: true,
                    isApproved: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { date: 'desc' },
            };
        }

        return await prisma.task.findUnique({
            where: { id },
            include,
        });
    }

    /**
     * Crear nueva tarea
     * @param {Object} taskData 
     * @returns {Promise<Object>}
     */
    async create(taskData) {
        return await prisma.task.create({
            data: taskData,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        area: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
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
     * Actualizar tarea
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Promise<Object>}
     */
    async update(id, updateData) {
        return await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignee: {
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
     * Listar tareas con filtros y paginación
     * @param {Object} filters 
     * @param {Object} pagination 
     * @param {string} userRole - Rol del usuario que consulta
     * @param {string} userId - ID del usuario que consulta
     * @returns {Promise<Object>}
     */
    async findMany(filters = {}, pagination = {}, userRole = null, userId = null) {
        const where = {};

        // Aplicar filtros de acceso por rol
        if (userRole === 'COORDINADOR') {
            // Los coordinadores ven tareas de proyectos que crearon
            where.project = {
                createdBy: userId,
            };
        } else if (userRole === 'COLABORADOR') {
            // Los colaboradores ven tareas de proyectos asignados o tareas asignadas a ellos
            where.OR = [
                { assignedTo: userId },
                {
                    project: {
                        assignments: {
                            some: {
                                userId,
                                isActive: true,
                            },
                        },
                    },
                },
            ];
        }

        // Aplicar filtros adicionales
        if (filters.projectId) {
            where.projectId = filters.projectId;
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.priority) {
            where.priority = filters.priority;
        }

        if (filters.assignedTo) {
            where.assignedTo = filters.assignedTo;
        }

        if (filters.assignedToMe && userId) {
            where.assignedTo = userId;
        }

        if (filters.createdBy) {
            where.createdBy = filters.createdBy;
        }

        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.dueDateStart || filters.dueDateEnd) {
            where.dueDate = {};
            if (filters.dueDateStart) {
                where.dueDate.gte = filters.dueDateStart;
            }
            if (filters.dueDateEnd) {
                where.dueDate.lte = filters.dueDateEnd;
            }
        }

        if (filters.overdue) {
            where.dueDate = {
                lt: new Date(),
            };
            where.status = {
                not: 'DONE',
            };
        }

        // Filtros de proyecto
        if (filters.areaId) {
            where.project = {
                ...where.project,
                areaId: filters.areaId,
            };
        }

        if (filters.projectStatus) {
            where.project = {
                ...where.project,
                status: filters.projectStatus,
            };
        }

        if (filters.siebelOrderNumber) {
            where.project = {
                ...where.project,
                excelDetails: {
                    siebelOrderNumber: { contains: filters.siebelOrderNumber, mode: 'insensitive' },
                },
            };
        }

        // Filtros de asignaciones de proyecto
        if (filters.assignedUserId || filters.mentorId || filters.coordinatorId) {
            const projectFilters = [];
            
            // Asignaciones regulares de proyecto
            if (filters.assignedUserId) {
                projectFilters.push({
                    assignments: {
                        some: {
                            userId: filters.assignedUserId,
                            isActive: true,
                        },
                    },
                });
            }
            
            // Mentores de proyectos Excel
            if (filters.mentorId) {
                projectFilters.push({
                    excelDetails: {
                        mentorId: filters.mentorId,
                    },
                });
            }
            
            // Coordinadores de proyectos Excel
            if (filters.coordinatorId) {
                projectFilters.push({
                    excelDetails: {
                        coordinatorId: filters.coordinatorId,
                    },
                });
            }

            where.project = {
                ...where.project,
                OR: projectFilters,
            };
        }

        // Contar total
        const total = await prisma.task.count({ where });

        // Obtener tareas
        const tasks = await prisma.task.findMany({
            where,
            skip: pagination.skip || 0,
            take: pagination.limit || 10,
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' },
                { createdAt: 'desc' },
            ],
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        area: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                            },
                        },
                        assignments: {
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
                        },
                        excelDetails: {
                            select: {
                                siebelOrderNumber: true,
                                mentor: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                    },
                                },
                                coordinator: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        timeEntries: true,
                    },
                },
            },
        });

        return { tasks, total };
    }

    /**
     * Obtener tareas del proyecto
     * @param {string} projectId 
     * @param {Object} filters 
     * @returns {Promise<Array>}
     */
    async findByProject(projectId, filters = {}) {
        const where = { projectId, isActive: true };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.assignedTo) {
            where.assignedTo = filters.assignedTo;
        }

        return await prisma.task.findMany({
            where,
            include: {
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' },
            ],
        });
    }

    /**
     * Obtener tareas asignadas al usuario
     * @param {string} userId 
     * @param {Object} filters 
     * @returns {Promise<Array>}
     */
    async findByAssignee(userId, filters = {}) {
        const where = { assignedTo: userId, isActive: true };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.projectId) {
            where.projectId = filters.projectId;
        }

        return await prisma.task.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        area: {
                            select: {
                                name: true,
                                color: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' },
            ],
        });
    }

    /**
     * Verificar si un usuario puede acceder a la tarea
     * @param {string} taskId 
     * @param {string} userId 
     * @param {string} userRole 
     * @returns {Promise<boolean>}
     */
    async canUserAccess(taskId, userId, userRole) {
        if (userRole === 'ADMINISTRADOR') {
            return true;
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                assignedTo: true,
                createdBy: true,
                project: {
                    select: {
                        createdBy: true,
                        assignments: {
                            where: {
                                userId,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });

        if (!task) {
            return false;
        }

        // Los coordinadores pueden acceder a tareas de proyectos que crearon
        if (userRole === 'COORDINADOR') {
            return task.project.createdBy === userId || task.createdBy === userId;
        }

        // Los colaboradores pueden acceder a tareas asignadas o de proyectos asignados
        return task.assignedTo === userId ||
            task.createdBy === userId ||
            task.project.assignments.length > 0;
    }

    /**
     * Asignar tarea a usuario
     * @param {string} taskId 
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async assignToUser(taskId, userId) {
        return await prisma.task.update({
            where: { id: taskId },
            data: { assignedTo: userId },
            include: {
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Cambiar estado de tarea
     * @param {string} taskId 
     * @param {string} status 
     * @returns {Promise<Object>}
     */
    async updateStatus(taskId, status) {
        return await prisma.task.update({
            where: { id: taskId },
            data: { status },
        });
    }

    /**
     * Obtener estadísticas de tiempo de la tarea
     * @param {string} taskId 
     * @returns {Promise<Object>}
     */
    async getTimeStats(taskId) {
        const [task, timeStats] = await Promise.all([
            prisma.task.findUnique({
                where: { id: taskId },
                select: { estimatedHours: true },
            }),
            prisma.timeEntry.aggregate({
                where: { taskId },
                _sum: { hours: true },
                _count: { id: true },
            }),
        ]);

        const actualHours = timeStats._sum.hours || 0;
        const estimatedHours = task?.estimatedHours || 0;

        return {
            estimatedHours,
            actualHours,
            totalEntries: timeStats._count.id || 0,
            variance: estimatedHours > 0 ? ((actualHours - estimatedHours) / estimatedHours) * 100 : 0,
            isOverBudget: actualHours > estimatedHours,
        };
    }

    /**
     * Obtener tareas vencidas
     * @param {string} userId - Para filtrar por usuario (opcional)
     * @returns {Promise<Array>}
     */
    async getOverdueTasks(userId = null) {
        const where = {
            dueDate: {
                lt: new Date(),
            },
            status: {
                not: 'DONE',
            },
            isActive: true,
        };

        if (userId) {
            where.assignedTo = userId;
        }

        return await prisma.task.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        area: {
                            select: {
                                name: true,
                                color: true,
                            },
                        },
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });
    }

    /**
     * Eliminar tarea (soft delete)
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async softDelete(id) {
        return await prisma.task.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Obtener el número de entradas de tiempo para una tarea
     * @param {string} taskId 
     * @returns {Promise<number>}
     */
    async getTimeEntriesCount(taskId) {
        return await prisma.timeEntry.count({
            where: { taskId }
        });
    }

    /**
     * Obtener estadísticas generales de tareas
     * @param {Object} filters 
     * @returns {Promise<Object>}
     */
    async getGeneralStats(filters = {}) {
        const where = { isActive: true };

        if (filters.projectId) {
            where.projectId = filters.projectId;
        }

        if (filters.userId) {
            where.assignedTo = filters.userId;
        }

        const [
            totalTasks,
            tasksByStatus,
            tasksByPriority,
            overdueTasks,
        ] = await Promise.all([
            prisma.task.count({ where }),
            prisma.task.groupBy({
                by: ['status'],
                where,
                _count: { id: true },
            }),
            prisma.task.groupBy({
                by: ['priority'],
                where,
                _count: { id: true },
            }),
            prisma.task.count({
                where: {
                    ...where,
                    dueDate: { lt: new Date() },
                    status: { not: 'DONE' },
                },
            }),
        ]);

        return {
            total: totalTasks,
            overdue: overdueTasks,
            byStatus: tasksByStatus.reduce((acc, stat) => {
                acc[stat.status] = stat._count.id;
                return acc;
            }, {}),
            byPriority: tasksByPriority.reduce((acc, stat) => {
                acc[stat.priority] = stat._count.id;
                return acc;
            }, {}),
        };
    }
}

module.exports = TaskRepository;
