const prisma = require('../config/database');
const { getTimePeriodForDate } = require('../utils/dateUtils');

/**
 * Repositorio para operaciones de entrada de tiempo
 */
class TimeEntryRepository {
    /**
     * Buscar entrada de tiempo por ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        return await prisma.timeEntry.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        area: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                            },
                        },
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                timePeriod: {
                    select: {
                        id: true,
                        year: true,
                        month: true,
                        periodNumber: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                approver: {
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
     * Crear nueva entrada de tiempo
     * @param {Object} entryData 
     * @returns {Promise<Object>}
     */
    async create(entryData) {
        // Obtener el período de tiempo correspondiente
        const periodInfo = getTimePeriodForDate(entryData.date);

        // Buscar o crear el período
        let timePeriod = await prisma.timePeriod.findFirst({
            where: {
                year: periodInfo.year,
                month: periodInfo.month,
                periodNumber: periodInfo.periodNumber,
            },
        });

        if (!timePeriod) {
            timePeriod = await prisma.timePeriod.create({
                data: {
                    year: periodInfo.year,
                    month: periodInfo.month,
                    periodNumber: periodInfo.periodNumber,
                    startDate: periodInfo.startDate,
                    endDate: periodInfo.endDate,
                },
            });
        }

        return await prisma.timeEntry.create({
            data: {
                ...entryData,
                timePeriodId: timePeriod.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                timePeriod: {
                    select: {
                        id: true,
                        year: true,
                        month: true,
                        periodNumber: true,
                    },
                },
            },
        });
    }

    /**
     * Actualizar entrada de tiempo
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Promise<Object>}
     */
    async update(id, updateData) {
        // Si se actualiza la fecha, recalcular el período
        if (updateData.date) {
            const periodInfo = getTimePeriodForDate(updateData.date);

            let timePeriod = await prisma.timePeriod.findFirst({
                where: {
                    year: periodInfo.year,
                    month: periodInfo.month,
                    periodNumber: periodInfo.periodNumber,
                },
            });

            if (!timePeriod) {
                timePeriod = await prisma.timePeriod.create({
                    data: {
                        year: periodInfo.year,
                        month: periodInfo.month,
                        periodNumber: periodInfo.periodNumber,
                        startDate: periodInfo.startDate,
                        endDate: periodInfo.endDate,
                    },
                });
            }

            updateData.timePeriodId = timePeriod.id;
        }

        return await prisma.timeEntry.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }

    /**
     * Listar entradas de tiempo con filtros y paginación
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
            // Los coordinadores ven entradas de proyectos que crearon
            where.project = {
                createdBy: userId,
            };
        } else if (userRole === 'COLABORADOR') {
            // Los colaboradores solo ven sus propias entradas
            where.userId = userId;
        }

        // Aplicar filtros adicionales
        if (filters.userId && userRole === 'ADMINISTRADOR') {
            where.userId = filters.userId;
        }

        if (filters.projectId) {
            where.projectId = filters.projectId;
        }

        if (filters.taskId) {
            where.taskId = filters.taskId;
        }

        if (filters.timePeriodId) {
            where.timePeriodId = filters.timePeriodId;
        }

        if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
        }

        if (filters.isApproved !== undefined) {
            where.isApproved = filters.isApproved;
        }

        if (filters.pendingApproval) {
            where.isApproved = false;
        }

        if (filters.myEntries && userId) {
            where.userId = userId;
        }

        if (filters.minHours || filters.maxHours) {
            where.hours = {};
            if (filters.minHours) {
                where.hours.gte = filters.minHours;
            }
            if (filters.maxHours) {
                where.hours.lte = filters.maxHours;
            }
        }

        // Configurar ordenamiento
        const orderBy = {};
        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'date':
                    orderBy.date = filters.sortOrder || 'desc';
                    break;
                case 'hours':
                    orderBy.hours = filters.sortOrder || 'desc';
                    break;
                case 'project':
                    orderBy.project = { name: filters.sortOrder || 'asc' };
                    break;
                case 'user':
                    orderBy.user = { firstName: filters.sortOrder || 'asc' };
                    break;
                default:
                    orderBy.createdAt = filters.sortOrder || 'desc';
            }
        } else {
            orderBy.date = 'desc';
        }

        // Contar total
        const total = await prisma.timeEntry.count({ where });

        // Obtener entradas
        const timeEntries = await prisma.timeEntry.findMany({
            where,
            skip: pagination.skip || 0,
            take: pagination.limit || 10,
            orderBy,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        area: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                            },
                        },
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                timePeriod: {
                    select: {
                        id: true,
                        year: true,
                        month: true,
                        periodNumber: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return { timeEntries, total };
    }

    /**
     * Aprobar entrada de tiempo
     * @param {string} id 
     * @param {string} approvedBy 
     * @param {string} comments 
     * @returns {Promise<Object>}
     */
    async approve(id, approvedBy, comments = null) {
        return await prisma.timeEntry.update({
            where: { id },
            data: {
                isApproved: true,
                approvedBy,
                approvedAt: new Date(),
            },
        });
    }

    /**
     * Rechazar entrada de tiempo
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async reject(id) {
        return await prisma.timeEntry.update({
            where: { id },
            data: {
                isApproved: false,
                approvedBy: null,
                approvedAt: null,
            },
        });
    }

    /**
     * Verificar si existe una entrada duplicada
     * @param {string} userId 
     * @param {string} projectId 
     * @param {string} taskId 
     * @param {Date} date 
     * @param {string} excludeId - ID a excluir de la búsqueda
     * @returns {Promise<boolean>}
     */
    async existsDuplicate(userId, projectId, taskId, date, excludeId = null) {
        const where = {
            userId,
            projectId,
            taskId,
            date,
        };

        if (excludeId) {
            where.id = { not: excludeId };
        }

        const entry = await prisma.timeEntry.findFirst({ where });
        return !!entry;
    }

    /**
     * Buscar entrada duplicada (retorna el registro completo)
     * @param {string} userId 
     * @param {string} projectId 
     * @param {string} taskId 
     * @param {Date} date 
     * @returns {Promise<Object|null>}
     */
    async findDuplicate(userId, projectId, taskId, date) {
        const where = {
            userId,
            projectId,
            taskId,
            date,
        };

        return await prisma.timeEntry.findFirst({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
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
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                timePeriod: {
                    select: {
                        id: true,
                        year: true,
                        month: true,
                        periodNumber: true,
                    },
                },
            },
        });
    }

    /**
     * Verificar límite de horas por día
     * @param {string} userId 
     * @param {Date} date 
     * @param {number} newHours 
     * @param {string} excludeId - ID a excluir del cálculo
     * @returns {Promise<Object>}
     */
    async checkDailyHoursLimit(userId, date, newHours, excludeId = null) {
        const where = {
            userId,
            date,
        };

        if (excludeId) {
            where.id = { not: excludeId };
        }

        const result = await prisma.timeEntry.aggregate({
            where,
            _sum: { hours: true },
        });

        const currentHours = result._sum.hours || 0;
        const totalHours = currentHours + newHours;

        return {
            currentHours,
            newHours,
            totalHours,
            isValid: totalHours <= 24,
        };
    }

    /**
     * Obtener reporte de tiempo
     * @param {Object} filters 
     * @returns {Promise<Object>}
     */
    async getTimeReport(filters) {
        const where = {};

        if (filters.startDate) {
            where.date = { gte: filters.startDate };
        }

        if (filters.endDate) {
            where.date = { ...where.date, lte: filters.endDate };
        }

        if (filters.userIds && filters.userIds.length > 0) {
            where.userId = { in: filters.userIds };
        }

        if (filters.projectIds && filters.projectIds.length > 0) {
            where.projectId = { in: filters.projectIds };
        }

        if (filters.areaIds && filters.areaIds.length > 0) {
            where.project = {
                areaId: { in: filters.areaIds },
            };
        }

        if (filters.onlyApproved) {
            where.isApproved = true;
        }

        // Configurar agrupación
        const groupBy = [];
        const select = {
            _sum: { hours: true },
            _count: { id: true },
        };

        switch (filters.groupBy) {
            case 'user':
                groupBy.push('userId');
                select.userId = true;
                break;
            case 'project':
                groupBy.push('projectId');
                select.projectId = true;
                break;
            case 'area':
                // Necesitaremos hacer una consulta más compleja
                break;
            case 'day':
                groupBy.push('date');
                select.date = true;
                break;
        }

        if (groupBy.length > 0) {
            const results = await prisma.timeEntry.groupBy({
                by: groupBy,
                where,
                _sum: { hours: true },
                _count: { id: true },
                orderBy: { _sum: { hours: 'desc' } },
            });

            return { results, groupBy: filters.groupBy };
        }

        // Si no hay agrupación, devolver totales
        const totals = await prisma.timeEntry.aggregate({
            where,
            _sum: { hours: true },
            _count: { id: true },
        });

        return {
            totalHours: totals._sum.hours || 0,
            totalEntries: totals._count.id || 0,
        };
    }

    /**
     * Obtener entradas pendientes de aprobación
     * @param {string} coordinatorId 
     * @returns {Promise<Array>}
     */
    async getPendingApproval(coordinatorId) {
        return await prisma.timeEntry.findMany({
            where: {
                isApproved: false,
                project: {
                    createdBy: coordinatorId,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }

    /**
     * Eliminar entrada de tiempo
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async delete(id) {
        return await prisma.timeEntry.delete({
            where: { id },
        });
    }

    /**
     * Crear múltiples entradas de tiempo (importación)
     * @param {Array} entries 
     * @param {Object} options 
     * @returns {Promise<Object>}
     */
    async createMany(entries, options = {}) {
        const results = {
            created: [],
            skipped: [],
            errors: [],
        };

        for (const entryData of entries) {
            try {
                // Verificar duplicados si se requiere
                if (!options.skipDuplicates) {
                    const exists = await this.existsDuplicate(
                        entryData.userId,
                        entryData.projectId,
                        entryData.taskId,
                        entryData.date
                    );

                    if (exists) {
                        results.skipped.push({
                            entry: entryData,
                            reason: 'Entrada duplicada',
                        });
                        continue;
                    }
                }

                // Verificar límite de horas
                const hoursCheck = await this.checkDailyHoursLimit(
                    entryData.userId,
                    entryData.date,
                    entryData.hours
                );

                if (!hoursCheck.isValid) {
                    results.errors.push({
                        entry: entryData,
                        reason: `Excede límite de 24 horas (total: ${hoursCheck.totalHours})`,
                    });
                    continue;
                }

                // Crear entrada
                const created = await this.create(entryData);
                results.created.push(created);

            } catch (error) {
                results.errors.push({
                    entry: entryData,
                    reason: error.message,
                });
            }
        }

        return results;
    }
}

module.exports = TimeEntryRepository;
