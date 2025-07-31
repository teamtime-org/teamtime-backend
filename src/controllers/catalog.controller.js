const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const prisma = require('../config/database');

/**
 * Controlador para catálogos de filtros
 */
class CatalogController {
    /**
     * Obtener lista de gerencias de venta
     */
    getSalesManagements = async (req, res) => {
        try {
            const salesManagements = await prisma.catalog.findMany({
                where: {
                    isActive: true,
                    type: 'SALES_MANAGEMENT',
                },
                select: {
                    id: true,
                    name: true,
                },
                orderBy: { name: 'asc' },
            });

            return ApiResponse.success(res, salesManagements, 'Gerencias de venta obtenidas exitosamente');
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
     * Obtener lista de ejecutivos de venta
     */
    getSalesExecutives = async (req, res) => {
        try {
            const salesExecutives = await prisma.catalog.findMany({
                where: {
                    isActive: true,
                    type: 'SALES_EXECUTIVE',
                },
                select: {
                    id: true,
                    name: true,
                },
                orderBy: { name: 'asc' },
            });

            return ApiResponse.success(res, salesExecutives, 'Ejecutivos de venta obtenidos exitosamente');
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
     * Obtener tipos de proyecto únicos
     */
    getProjectTypes = async (req, res) => {
        try {
            const projectTypes = await prisma.excelProject.findMany({
                where: {
                    isActive: true,
                    projectType: { isNot: null },
                },
                select: {
                    projectType: true,
                },
                distinct: ['projectType'],
                orderBy: { projectType: 'asc' },
            });

            const types = projectTypes
                .map(p => p.projectType)
                .filter(type => type && type.trim() !== '')
                .sort();

            return ApiResponse.success(res, types, 'Tipos de proyecto obtenidos exitosamente');
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
                // Proyectos con detalles de Excel
                prisma.project.count({
                    where: {
                        excelDetails: { isNot: null },
                        isActive: true,
                    }
                }),
                // Proyectos con información financiera
                prisma.project.count({
                    where: {
                        isActive: true,
                        excelDetails: {
                            OR: [
                                { monthlyBillingMXN: { not: null } },
                                { totalContractAmountMXN: { not: null } },
                            ]
                        }
                    }
                }),
                // Total de proyectos
                prisma.project.count({ where: { isActive: true } }),
            ]);

            const [projectsWithExcel, projectsWithFinancials, totalProjects] = stats;

            return ApiResponse.success(res, {
                totalProjects,
                projectsWithExcel,
                projectsWithFinancials,
                projectsWithoutExcel: totalProjects - projectsWithExcel,
            }, 'Estadísticas de filtros obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas de filtros:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };
}

module.exports = new CatalogController();
