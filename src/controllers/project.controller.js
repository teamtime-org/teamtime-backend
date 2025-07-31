const ProjectService = require('../services/project.service');
const ApiResponse = require('../utils/response');
const { LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de proyectos
 */
class ProjectController {
    constructor() {
        this.projectService = new ProjectService();
    }

    /**
     * Crear nuevo proyecto
     */
    createProject = async (req, res) => {
        try {
            const project = await this.projectService.createProject(req.body, req.user);

            logger.info(`Proyecto creado: ${project.name} por ${req.user.email}`);
            return ApiResponse.success(res, project, 'Proyecto creado exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener proyecto por ID
     */
    getProjectById = async (req, res) => {
        try {
            const { id } = req.params;
            const project = await this.projectService.getProjectById(id, req.user);

            return ApiResponse.success(res, project, 'Proyecto obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener proyecto:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };

    /**
     * Obtener todos los proyectos con filtros y paginación
     */
    getProjects = async (req, res) => {
        try {
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                status,
                priority,
                areaId,
                startDate,
                endDate,
                // Nuevos filtros de Excel
                mentorId,
                coordinatorId,
                salesExecutiveId,
                salesManagementId,
                siebelOrderNumber,
                projectType
            } = req.query;

            // Validar límites de paginación
            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (areaId) filters.areaId = areaId;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            // Filtros específicos de Excel
            if (mentorId) filters.mentorId = mentorId;
            if (coordinatorId) filters.coordinatorId = coordinatorId;
            if (salesExecutiveId) filters.salesExecutiveId = salesExecutiveId;
            if (salesManagementId) filters.salesManagementId = salesManagementId;
            if (siebelOrderNumber) filters.siebelOrderNumber = siebelOrderNumber;
            if (projectType) filters.projectType = projectType;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.projectService.getProjects(filters, pagination, req.user);

            return ApiResponse.success(res, result, 'Proyectos obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener proyectos:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Actualizar proyecto
     */
    updateProject = async (req, res) => {
        try {
            const { id } = req.params;
            const project = await this.projectService.updateProject(id, req.body, req.user);

            logger.info(`Proyecto actualizado: ${project.name} por ${req.user.email}`);
            return ApiResponse.success(res, project, 'Proyecto actualizado exitosamente');
        } catch (error) {
            logger.error('Error al actualizar proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Eliminar proyecto (soft delete)
     */
    deleteProject = async (req, res) => {
        try {
            const { id } = req.params;
            await this.projectService.deleteProject(id, req.user);

            logger.info(`Proyecto eliminado: ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Proyecto eliminado exitosamente');
        } catch (error) {
            logger.error('Error al eliminar proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Cambiar estado del proyecto
     */
    changeProjectStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const project = await this.projectService.changeProjectStatus(id, status, req.user);

            logger.info(`Estado del proyecto cambiado: ${project.name} a ${status} por ${req.user.email}`);
            return ApiResponse.success(res, project, 'Estado del proyecto cambiado exitosamente');
        } catch (error) {
            logger.error('Error al cambiar estado del proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener tareas de un proyecto
     */
    getProjectTasks = async (req, res) => {
        try {
            const { id } = req.params;
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                status,
                priority,
                assignedTo
            } = req.query;

            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (assignedTo) filters.assignedTo = assignedTo;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.projectService.getProjectTasks(id, filters, pagination, req.user);

            return ApiResponse.success(res, result, 'Tareas del proyecto obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener tareas del proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Asignar usuario a proyecto
     */
    assignUserToProject = async (req, res) => {
        try {
            const { id } = req.params;
            const { userId } = req.body;

            await this.projectService.assignUserToProject(id, userId, req.user);

            logger.info(`Usuario ${userId} asignado al proyecto ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Usuario asignado al proyecto exitosamente');
        } catch (error) {
            logger.error('Error al asignar usuario al proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Remover usuario de proyecto
     */
    removeUserFromProject = async (req, res) => {
        try {
            const { id, userId } = req.params;

            await this.projectService.removeUserFromProject(id, userId, req.user);

            logger.info(`Usuario ${userId} removido del proyecto ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Usuario removido del proyecto exitosamente');
        } catch (error) {
            logger.error('Error al remover usuario del proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener estadísticas de un proyecto
     */
    getProjectStats = async (req, res) => {
        try {
            const { id } = req.params;
            const stats = await this.projectService.getProjectStats(id, req.user);

            return ApiResponse.success(res, stats, 'Estadísticas del proyecto obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas del proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new ProjectController();
