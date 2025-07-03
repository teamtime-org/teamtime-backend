const prisma = require('../config/database');

/**
 * Repositorio para operaciones de área
 */
class AreaRepository {
    /**
     * Buscar área por ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        return await prisma.area.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        projects: true,
                    },
                },
            },
        });
    }

    /**
     * Buscar área por nombre
     * @param {string} name 
     * @param {string} excludeId - ID a excluir de la búsqueda
     * @returns {Promise<Object|null>}
     */
    async findByName(name, excludeId = null) {
        const where = { name };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        return await prisma.area.findFirst({ where });
    }

    /**
     * Crear nueva área
     * @param {Object} areaData 
     * @returns {Promise<Object>}
     */
    async create(areaData) {
        return await prisma.area.create({
            data: areaData,
            include: {
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
     * Actualizar área
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Promise<Object>}
     */
    async update(id, updateData) {
        return await prisma.area.update({
            where: { id },
            data: updateData,
            include: {
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
     * Listar áreas con filtros y paginación
     * @param {Object} filters 
     * @param {Object} pagination 
     * @returns {Promise<Object>}
     */
    async findMany(filters = {}, pagination = {}) {
        const where = {};

        // Aplicar filtros
        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        // Contar total
        const total = await prisma.area.count({ where });

        // Obtener áreas
        const areas = await prisma.area.findMany({
            where,
            skip: pagination.skip || 0,
            take: pagination.limit || 10,
            orderBy: { name: 'asc' },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        projects: true,
                    },
                },
            },
        });

        return { areas, total };
    }

    /**
     * Obtener todas las áreas activas (para selects)
     * @returns {Promise<Array>}
     */
    async findAllActive() {
        return await prisma.area.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
                color: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Eliminar área (soft delete)
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async softDelete(id) {
        return await prisma.area.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Verificar si un nombre ya existe
     * @param {string} name 
     * @param {string} excludeId - ID a excluir de la búsqueda
     * @returns {Promise<boolean>}
     */
    async nameExists(name, excludeId = null) {
        const where = { name };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const area = await prisma.area.findFirst({ where });
        return !!area;
    }

    /**
     * Verificar si el área tiene usuarios asignados
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async hasUsers(id) {
        const count = await prisma.user.count({
            where: { areaId: id, isActive: true },
        });
        return count > 0;
    }

    /**
     * Verificar si el área tiene proyectos activos
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async hasActiveProjects(id) {
        const count = await prisma.project.count({
            where: {
                areaId: id,
                isActive: true,
                status: { not: 'CANCELLED' },
            },
        });
        return count > 0;
    }

    /**
     * Obtener estadísticas del área
     * @param {string} id 
     * @param {Object} dateRange 
     * @returns {Promise<Object>}
     */
    async getStats(id, dateRange = {}) {
        const where = { areaId: id };

        if (dateRange.startDate || dateRange.endDate) {
            where.createdAt = {};
            if (dateRange.startDate) {
                where.createdAt.gte = dateRange.startDate;
            }
            if (dateRange.endDate) {
                where.createdAt.lte = dateRange.endDate;
            }
        }

        const [
            totalUsers,
            activeUsers,
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks,
            completedTasks,
        ] = await Promise.all([
            prisma.user.count({ where: { areaId: id } }),
            prisma.user.count({ where: { areaId: id, isActive: true } }),
            prisma.project.count({ where: { areaId: id } }),
            prisma.project.count({
                where: {
                    areaId: id,
                    status: 'ACTIVE',
                    isActive: true,
                },
            }),
            prisma.project.count({
                where: {
                    areaId: id,
                    status: 'COMPLETED',
                },
            }),
            prisma.task.count({
                where: {
                    project: { areaId: id },
                },
            }),
            prisma.task.count({
                where: {
                    project: { areaId: id },
                    status: 'DONE',
                },
            }),
        ]);

        // Obtener horas trabajadas
        const timeEntries = await prisma.timeEntry.aggregate({
            where: {
                project: { areaId: id },
                ...(dateRange.startDate || dateRange.endDate ? {
                    date: {
                        ...(dateRange.startDate && { gte: dateRange.startDate }),
                        ...(dateRange.endDate && { lte: dateRange.endDate }),
                    },
                } : {}),
            },
            _sum: { hours: true },
            _count: { id: true },
        });

        return {
            users: {
                total: totalUsers,
                active: activeUsers,
            },
            projects: {
                total: totalProjects,
                active: activeProjects,
                completed: completedProjects,
            },
            tasks: {
                total: totalTasks,
                completed: completedTasks,
                completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            },
            timeEntries: {
                total: timeEntries._count.id || 0,
                totalHours: timeEntries._sum.hours || 0,
            },
        };
    }

    /**
     * Obtener proyectos del área
     * @param {string} id 
     * @param {Object} filters 
     * @returns {Promise<Array>}
     */
    async getProjects(id, filters = {}) {
        const where = { areaId: id };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        return await prisma.project.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                priority: true,
                startDate: true,
                endDate: true,
                estimatedHours: true,
                createdAt: true,
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        assignments: true,
                        tasks: true,
                        timeEntries: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}

module.exports = AreaRepository;
