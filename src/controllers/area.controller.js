const AreaService = require('../services/area.service');
const ApiResponse = require('../utils/response');
const { LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de áreas
 */
class AreaController {
    constructor() {
        this.areaService = new AreaService();
    }

    /**
     * Crear nueva área
     */
    createArea = async (req, res) => {
        try {
            const area = await this.areaService.createArea(req.body, req.user);

            logger.info(`Área creada: ${area.name} por ${req.user.email}`);
            return ApiResponse.success(res, area, 'Área creada exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear área:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener área por ID
     */
    getAreaById = async (req, res) => {
        try {
            const { id } = req.params;
            const area = await this.areaService.getAreaById(id);

            return ApiResponse.success(res, area, 'Área obtenida exitosamente');
        } catch (error) {
            logger.error('Error al obtener área:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };

    /**
     * Obtener todas las áreas con filtros y paginación
     */
    getAreas = async (req, res) => {
        try {
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                isActive
            } = req.query;

            // Validar límites de paginación
            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (isActive !== undefined) filters.isActive = isActive === 'true';

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.areaService.getAreas(filters, pagination);

            return ApiResponse.success(res, result, 'Áreas obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener áreas:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Actualizar área
     */
    updateArea = async (req, res) => {
        try {
            const { id } = req.params;
            const area = await this.areaService.updateArea(id, req.body, req.user);

            logger.info(`Área actualizada: ${area.name} por ${req.user.email}`);
            return ApiResponse.success(res, area, 'Área actualizada exitosamente');
        } catch (error) {
            logger.error('Error al actualizar área:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Eliminar área (soft delete)
     */
    deleteArea = async (req, res) => {
        try {
            const { id } = req.params;
            await this.areaService.deleteArea(id, req.user);

            logger.info(`Área eliminada: ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Área eliminada exitosamente');
        } catch (error) {
            logger.error('Error al eliminar área:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener usuarios de un área
     */
    getAreaUsers = async (req, res) => {
        try {
            const { id } = req.params;
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                role,
                isActive
            } = req.query;

            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (role) filters.role = role;
            if (isActive !== undefined) filters.isActive = isActive === 'true';

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.areaService.getAreaUsers(id, filters, pagination);

            return ApiResponse.success(res, result, 'Usuarios del área obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener usuarios del área:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener proyectos de un área
     */
    getAreaProjects = async (req, res) => {
        try {
            const { id } = req.params;
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                status,
                priority
            } = req.query;

            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.areaService.getAreaProjects(id, filters, pagination);

            return ApiResponse.success(res, result, 'Proyectos del área obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener proyectos del área:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener estadísticas de un área
     */
    getAreaStats = async (req, res) => {
        try {
            const { id } = req.params;
            const stats = await this.areaService.getAreaStats(id);

            return ApiResponse.success(res, stats, 'Estadísticas del área obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas del área:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener estadísticas generales de áreas
     */
    getGeneralStats = async (req, res) => {
        try {
            const stats = await this.areaService.getGeneralStats();

            return ApiResponse.success(res, stats, 'Estadísticas generales obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas generales:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new AreaController();
