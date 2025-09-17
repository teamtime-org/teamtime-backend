const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const prisma = require('../config/database');

/**
 * Controlador para catálogos de filtros
 */
class CatalogController {
    /**
     * Obtener lista de gerencias de venta (deprecated en Schema v2)
     * TODO: Migrar a otra estructura o eliminar completamente
     */
    getSalesManagements = async (req, res) => {
        try {
            // En Schema v2 no existe el tipo SALES_MANAGEMENT
            // Retornamos array vacío por compatibilidad
            return ApiResponse.success(res, [], 'Gerencias de venta obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener gerencias de venta:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener lista de usuarios que pueden ser mentores
     */
    getMentors = async (req, res) => {
        try {
            const mentors = await prisma.user.findMany({
                where: {
                    isActive: true,
                    role: { in: ['COLABORADOR'] },
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

            return ApiResponse.success(res, mentors, 'Mentores obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener mentores:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener lista de usuarios que pueden ser coordinadores
     */
    getCoordinators = async (req, res) => {
        try {
            const coordinators = await prisma.user.findMany({
                where: {
                    isActive: true,
                    role: { in: ['ADMINISTRADOR', 'COORDINADOR'] },
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

            return ApiResponse.success(res, coordinators, 'Coordinadores obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener coordinadores:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener lista de ejecutivos de venta (deprecated en Schema v2)
     * TODO: Migrar a otra estructura o eliminar completamente
     */
    getSalesExecutives = async (req, res) => {
        try {
            // En Schema v2 no existe el tipo SALES_EXECUTIVE
            // Retornamos array vacío por compatibilidad
            return ApiResponse.success(res, [], 'Ejecutivos de venta obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener ejecutivos de venta:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener lista de diseñadores
     */
    getDesigners = async (req, res) => {
        try {
            const designers = await prisma.catalog.findMany({
                where: {
                    isActive: true,
                    type: 'DESIGNER',
                },
                select: {
                    id: true,
                    name: true,
                },
                orderBy: { name: 'asc' },
            });

            return ApiResponse.success(res, designers, 'Diseñadores obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener diseñadores:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener tipos de proyecto únicos (deprecated en Schema v2)
     * TODO: Migrar a otra estructura o eliminar completamente
     */
    getProjectTypes = async (req, res) => {
        try {
            // En Schema v2 no existe el tipo PROJECT_TYPE
            // Retornamos array vacío por compatibilidad
            return ApiResponse.success(res, [], 'Tipos de proyecto obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener tipos de proyecto:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener estadísticas de filtros
     */
    getFilterStats = async (req, res) => {
        try {
            const stats = await Promise.all([
                // Proyectos con staging projects asociados
                prisma.project.count({
                    where: {
                        stagingProjects: { some: {} },
                        isActive: true,
                    }
                }),
                // Proyectos staging con información financiera
                prisma.stagingProject.count({
                    where: {
                        OR: [
                            { monthlyIncomeMXN: { not: null } },
                            { tcvMXN: { not: null } },
                        ],
                        isActive: true,
                    }
                }),
                // Total de proyectos activos
                prisma.project.count({ where: { isActive: true } }),
                // Total de proyectos staging
                prisma.stagingProject.count({ where: { isActive: true } }),
            ]);

            const [projectsWithStaging, stagingWithFinancials, totalProjects, totalStaging] = stats;

            return ApiResponse.success(res, {
                totalProjects,
                totalStaging,
                projectsWithStaging,
                stagingWithFinancials,
                projectsWithoutStaging: totalProjects - projectsWithStaging,
            }, 'Estadísticas de filtros obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas de filtros:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };
}

module.exports = new CatalogController();
