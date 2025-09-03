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
            // Los colaboradores ven tareas de proyectos asignados a ellos
            where.project = {
                assignments: {
                    some: {
                        userId,
                        isActive: true,
                    },
                },
            };
        }

        // Aplicar filtros adicionales
        if (filters.projectId) {
            where.projectId = filters.projectId;
        }

        if (filters.status) {
            where.project = {
                ...where.project,
                status: filters.status
            };
        }

        if (filters.priority) {
            where.priority = filters.priority;
        }

        // Los filtros de asignación de tareas ya no son relevantes
        // Los usuarios se asignan a proyectos, no a tareas individuales

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
            // Las tareas vencidas se filtran por fecha, no por status
            // El status se maneja a nivel de proyecto
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
            where.project = {
                ...where.project,
                status: filters.status
            };
        }

        // Las tareas ya no tienen asignación individual

        return await prisma.task.findMany({
            where,
            include: {
            },
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' },
            ],
        });
    }

    /**
     * Obtener tareas de proyectos asignados al usuario
     * @param {string} userId 
     * @param {Object} filters 
     * @returns {Promise<Array>}
     */
    async findByAssignee(userId, filters = {}) {
        const where = { 
            isActive: true,
            project: {
                assignments: {
                    some: {
                        userId,
                        isActive: true,
                    },
                },
            },
        };

        if (filters.status) {
            where.project = {
                ...where.project,
                status: filters.status
            };
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

        // Los colaboradores pueden acceder a tareas de proyectos asignados
        return task.createdBy === userId ||
            task.project.assignments.length > 0;
    }

    /**
     * Las tareas ya no se asignan individualmente
     * Los usuarios se asignan a proyectos completos
     * @deprecated - Usar ProjectRepository.assignUserToProject en su lugar
     */
    async assignToUser(taskId, userId) {
        throw new Error('Las tareas ya no se asignan individualmente. Los usuarios se asignan a proyectos completos.');
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
            isActive: true,
            // Status se maneja a nivel de proyecto, no de tarea
        };

        if (userId) {
            // Filtrar por tareas de proyectos asignados al usuario
            where.project = {
                assignments: {
                    some: {
                        userId,
                        isActive: true,
                    },
                },
            };
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
     * Obtener tareas de un proyecto (simple)
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getTasksByProject(projectId) {
        return await prisma.task.findMany({
            where: {
                projectId,
                isActive: true,
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                createdAt: true,
                dueDate: true,
                estimatedHours: true,
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' },
            ],
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
            // Filtrar por tareas de proyectos asignados al usuario
            where.project = {
                assignments: {
                    some: {
                        userId: filters.userId,
                        isActive: true,
                    },
                },
            };
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
                    // Status se maneja a nivel de proyecto, no de tarea
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
