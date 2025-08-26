const prisma = require('../config/database');

/**
 * Repositorio para operaciones de períodos de tiempo
 */
class TimePeriodRepository {
    /**
     * Buscar período por ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        return await prisma.timePeriod.findUnique({
            where: { id },
            include: {
                timeEntries: {
                    select: {
                        id: true,
                        userId: true,
                        hours: true,
                        date: true
                    }
                }
            }
        });
    }

    /**
     * Obtener todos los períodos con filtros
     * @param {Object} filters 
     * @param {Object} pagination 
     * @returns {Promise<Object>}
     */
    async findMany(filters = {}, pagination = {}) {
        const where = {};

        if (filters.year) {
            where.year = parseInt(filters.year);
        }

        if (filters.month) {
            where.month = parseInt(filters.month);
        }

        if (filters.periodNumber) {
            where.periodNumber = parseInt(filters.periodNumber);
        }

        if (filters.type) {
            where.type = filters.type;
        }

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters.startDate || filters.endDate) {
            where.startDate = {};
            if (filters.startDate) {
                where.startDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.startDate.lte = new Date(filters.endDate);
            }
        }

        const orderBy = [];
        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'year':
                    orderBy.push({ year: filters.sortOrder || 'desc' });
                    break;
                case 'month':
                    orderBy.push({ month: filters.sortOrder || 'desc' });
                    break;
                case 'periodNumber':
                    orderBy.push({ periodNumber: filters.sortOrder || 'asc' });
                    break;
                default:
                    orderBy.push({ year: 'desc' }, { month: 'desc' }, { periodNumber: 'desc' });
            }
        } else {
            orderBy.push({ year: 'desc' }, { month: 'desc' }, { periodNumber: 'desc' });
        }

        const total = await prisma.timePeriod.count({ where });

        const timePeriods = await prisma.timePeriod.findMany({
            where,
            skip: pagination.skip || 0,
            take: pagination.limit || 50,
            orderBy
        });

        return { timePeriods, total };
    }

    /**
     * Crear un nuevo período
     * @param {Object} periodData 
     * @returns {Promise<Object>}
     */
    async create(periodData) {
        const { startDate, endDate, ...otherData } = periodData;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Calcular la duración en días para determinar el tipo automáticamente si no se especifica
        const durationInDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        let type = otherData.type;
        
        if (!type) {
            // Si no se especifica tipo, determinarlo automáticamente
            type = durationInDays > 10 ? 'biweekly' : 'weekly';
        } else if (type === 'weekly' && durationInDays > 10) {
            // Corregir tipo si es inconsistente
            type = 'biweekly';
        } else if (type === 'biweekly' && durationInDays <= 10) {
            // Corregir tipo si es inconsistente
            type = 'weekly';
        }
        
        return await prisma.timePeriod.create({
            data: {
                ...otherData,
                type,
                startDate: start,
                endDate: end
            }
        });
    }

    /**
     * Crear múltiples períodos
     * @param {Array} periodsData 
     * @returns {Promise<Object>}
     */
    async createMany(periodsData) {
        const results = {
            created: [],
            skipped: [],
            errors: []
        };

        for (const periodData of periodsData) {
            try {
                // Verificar si ya existe un período con los mismos parámetros
                const existing = await prisma.timePeriod.findFirst({
                    where: {
                        year: periodData.year,
                        month: periodData.month,
                        periodNumber: periodData.periodNumber
                    }
                });

                if (existing) {
                    results.skipped.push({
                        period: periodData,
                        reason: 'Período ya existe'
                    });
                    continue;
                }

                const created = await this.create(periodData);
                results.created.push(created);

            } catch (error) {
                results.errors.push({
                    period: periodData,
                    reason: error.message
                });
            }
        }

        return results;
    }

    /**
     * Actualizar período
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Promise<Object>}
     */
    async update(id, updateData) {
        const { startDate, endDate, ...otherData } = updateData;
        
        const data = { ...otherData };
        if (startDate) data.startDate = new Date(startDate);
        if (endDate) data.endDate = new Date(endDate);

        return await prisma.timePeriod.update({
            where: { id },
            data
        });
    }

    /**
     * Eliminar período
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async delete(id) {
        return await prisma.timePeriod.delete({
            where: { id }
        });
    }

    /**
     * Obtener período actual
     * @returns {Promise<Object|null>}
     */
    async getCurrentPeriod() {
        const today = new Date();
        
        return await prisma.timePeriod.findFirst({
            where: {
                startDate: { lte: today },
                endDate: { gte: today },
                isActive: true
            },
            orderBy: { startDate: 'desc' }
        });
    }

    /**
     * Obtener períodos por rango de fecha
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @returns {Promise<Array>}
     */
    async findByDateRange(startDate, endDate) {
        return await prisma.timePeriod.findMany({
            where: {
                OR: [
                    {
                        startDate: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    {
                        endDate: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    {
                        AND: [
                            { startDate: { lte: startDate } },
                            { endDate: { gte: endDate } }
                        ]
                    }
                ]
            },
            orderBy: [
                { year: 'asc' },
                { month: 'asc' },
                { periodNumber: 'asc' }
            ]
        });
    }

    /**
     * Obtener estadísticas de un período
     * @param {string} periodId 
     * @returns {Promise<Object>}
     */
    async getStatistics(periodId) {
        const period = await this.findById(periodId);
        
        if (!period) {
            throw new Error('Período no encontrado');
        }

        // Obtener estadísticas de time entries del período
        const stats = await prisma.timeEntry.aggregate({
            where: { timePeriodId: periodId },
            _sum: { hours: true },
            _count: { id: true },
            _avg: { hours: true }
        });

        // Obtener número de usuarios únicos que registraron tiempo
        const uniqueUsers = await prisma.timeEntry.findMany({
            where: { timePeriodId: periodId },
            select: { userId: true },
            distinct: ['userId']
        });

        return {
            period,
            totalHours: stats._sum.hours || 0,
            totalEntries: stats._count.id || 0,
            averageHours: stats._avg.hours || 0,
            uniqueUsers: uniqueUsers.length,
            referenceHours: period.referenceHours || 0,
            completionPercentage: period.referenceHours && stats._sum.hours 
                ? ((stats._sum.hours / period.referenceHours) * 100) 
                : 0
        };
    }

    /**
     * Comparar horas trabajadas vs referencia para un período
     * @param {string} periodId 
     * @param {string} userId - opcional, si se especifica solo para un usuario
     * @returns {Promise<Object>}
     */
    async getComparison(periodId, userId = null) {
        const period = await this.findById(periodId);
        
        if (!period) {
            throw new Error('Período no encontrado');
        }

        const where = { timePeriodId: periodId };
        if (userId) {
            where.userId = userId;
        }

        // Obtener horas totales
        const actualHours = await prisma.timeEntry.aggregate({
            where,
            _sum: { hours: true }
        });

        // Obtener horas PMO (proyectos generales)
        const horasPMO = await prisma.timeEntry.aggregate({
            where: {
                ...where,
                project: {
                    isGeneral: true
                }
            },
            _sum: { hours: true }
        });

        // Obtener horas Cliente (proyectos específicos)
        const horasCliente = await prisma.timeEntry.aggregate({
            where: {
                ...where,
                project: {
                    isGeneral: false
                }
            },
            _sum: { hours: true }
        });

        const referenceHours = period.referenceHours || 0;
        const actualTotal = actualHours._sum.hours || 0;
        const pmoHours = horasPMO._sum.hours || 0;
        const clienteHours = horasCliente._sum.hours || 0;
        const difference = actualTotal - referenceHours;
        const percentage = referenceHours > 0 ? (actualTotal / referenceHours) * 100 : 0;

        return {
            periodId,
            userId,
            referenceHours,
            actualHours: actualTotal,
            horasPMO: pmoHours,
            horasCliente: clienteHours,
            difference,
            percentage,
            status: difference >= 0 ? 'above' : 'below'
        };
    }
}

module.exports = TimePeriodRepository;