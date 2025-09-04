const prisma = require('../config/database');
const { USER_ROLES } = require('../utils/constants');

/**
 * Repositorio para operaciones de usuario
 */
class UserRepository {
    /**
     * Buscar usuario por email
     * @param {string} email 
     * @returns {Promise<Object|null>}
     */
    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: { email },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });
    }

    /**
     * Buscar usuario por ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        return await prisma.user.findUnique({
            where: { id },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });
    }

    /**
     * Crear nuevo usuario
     * @param {Object} userData 
     * @returns {Promise<Object>}
     */
    async create(userData) {
        // Convertir string vacío a null para areaId
        const processedUserData = {
            ...userData,
            areaId: userData.areaId === '' ? null : userData.areaId
        };

        return await prisma.user.create({
            data: processedUserData,
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });
    }

    /**
     * Actualizar usuario
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Promise<Object>}
     */
    async update(id, updateData) {
        // Convertir string vacío a null para areaId
        const processedUpdateData = {
            ...updateData,
            areaId: updateData.areaId === '' ? null : updateData.areaId
        };

        return await prisma.user.update({
            where: { id },
            data: processedUpdateData,
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });
    }

    /**
     * Listar usuarios con filtros y paginación
     * @param {Object} filters 
     * @param {Object} pagination 
     * @returns {Promise<Object>}
     */
    async findMany(filters = {}, pagination = {}) {
        const where = {};

        // Aplicar filtros
        if (filters.role) {
            where.role = filters.role;
        }

        if (filters.areaId) {
            where.areaId = filters.areaId;
        }

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        // Configurar paginación
        const page = pagination.page || 1;
        const limit = pagination.limit || 10;
        const skip = (page - 1) * limit;

        // Contar total
        const total = await prisma.user.count({ where });

        // Calcular información de paginación
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // Obtener usuarios
        const users = await prisma.user.findMany({
            where,
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
                area: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });

        return { 
            users, 
            total,
            page,
            limit,
            totalPages,
            hasNextPage,
            hasPreviousPage
        };
    }

    /**
     * Eliminar usuario (soft delete)
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async softDelete(id) {
        return await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Buscar usuarios por área
     * @param {string} areaId 
     * @param {boolean} activeOnly 
     * @returns {Promise<Array>}
     */
    async findByArea(areaId, activeOnly = true) {
        const where = { areaId };
        if (activeOnly) {
            where.isActive = true;
        }

        return await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
            },
            orderBy: [
                { firstName: 'asc' },
                { lastName: 'asc' },
            ],
        });
    }

    /**
     * Buscar usuarios por rol
     * @param {string} role 
     * @param {boolean} activeOnly 
     * @returns {Promise<Array>}
     */
    async findByRole(role, activeOnly = true) {
        const where = { role };
        if (activeOnly) {
            where.isActive = true;
        }

        return await prisma.user.findMany({
            where,
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { firstName: 'asc' },
                { lastName: 'asc' },
            ],
        });
    }

    /**
     * Verificar si un email ya existe
     * @param {string} email 
     * @param {string} excludeId - ID a excluir de la búsqueda
     * @returns {Promise<boolean>}
     */
    async emailExists(email, excludeId = null) {
        const where = { email };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const user = await prisma.user.findFirst({ where });
        return !!user;
    }

    /**
     * Obtener estadísticas de usuarios
     * @returns {Promise<Object>}
     */
    async getStats() {
        const [
            totalUsers,
            activeUsers,
            adminCount,
            coordinadorCount,
            colaboradorCount,
            usersByArea,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({ where: { role: USER_ROLES.ADMINISTRADOR } }),
            prisma.user.count({ where: { role: USER_ROLES.COORDINADOR } }),
            prisma.user.count({ where: { role: USER_ROLES.COLABORADOR } }),
            prisma.user.groupBy({
                by: ['areaId'],
                _count: { id: true },
                where: { isActive: true },
            }),
        ]);

        return {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            byRole: {
                admin: adminCount,
                coordinador: coordinadorCount,
                colaborador: colaboradorCount,
            },
            byArea: usersByArea,
        };
    }

    /**
     * Cambiar contraseña de usuario
     * @param {string} id 
     * @param {string} hashedPassword 
     * @returns {Promise<Object>}
     */
    async changePassword(id, hashedPassword) {
        return await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
    }

    /**
     * Buscar colaboradores disponibles para asignación
     * @param {string} areaId 
     * @returns {Promise<Array>}
     */
    async findAvailableCollaborators(areaId) {
        return await prisma.user.findMany({
            where: {
                areaId,
                role: USER_ROLES.COLABORADOR,
                isActive: true,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            },
            orderBy: [
                { firstName: 'asc' },
                { lastName: 'asc' },
            ],
        });
    }

    /**
     * Verificar si un usuario puede crear otros usuarios
     * @param {string} userId 
     * @returns {Promise<boolean>}
     */
    async canCreateUsers(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        return user && [USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR].includes(user.role);
    }

    /**
     * Actualizar la fecha del último login de un usuario
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async updateLastLogin(userId) {
        return await prisma.user.update({
            where: { id: userId },
            data: { lastLogin: new Date() },
        });
    }
}

module.exports = UserRepository;
