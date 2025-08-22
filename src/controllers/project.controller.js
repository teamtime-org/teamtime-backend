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
                // Filtro de asignaciones
                assignedUserId,
                assigned,
                // Nuevos filtros de Excel
                mentorId,
                coordinatorId,
                salesExecutiveId,
                salesManagementId,
                siebelOrderNumber,
                projectType,
                isGeneral
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

            // Filtros de asignaciones
            if (assignedUserId) filters.assignedUserId = assignedUserId;
            if (assigned === 'true' || assigned === true) filters.assigned = true;

            // Filtros específicos de Excel
            if (mentorId) filters.mentorId = mentorId;
            if (coordinatorId) filters.coordinatorId = coordinatorId;
            if (salesExecutiveId) filters.salesExecutiveId = salesExecutiveId;
            if (salesManagementId) filters.salesManagementId = salesManagementId;
            if (siebelOrderNumber) filters.siebelOrderNumber = siebelOrderNumber;
            if (projectType) filters.projectType = projectType;
            if (isGeneral !== undefined) filters.isGeneral = isGeneral === 'true';

            const pagination = {
                page: pageNumber,
                limit: pageSize,
                skip: (pageNumber - 1) * pageSize
            };

            const result = await this.projectService.getProjects(filters, pagination, req.user);

            // Formatear respuesta con paginación
            const response = {
                projects: result.projects,
                page: pageNumber,
                limit: pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / pageSize)
            };

            return ApiResponse.success(res, response, 'Proyectos obtenidos exitosamente');
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

    /**
     * Crear tareas estándar para un proyecto
     */
    createStandardTasks = async (req, res) => {
        try {
            const { projectId } = req.body;
            const tasks = await this.projectService.createStandardTasks(projectId, req.user);

            logger.info(`Tareas estándar creadas para proyecto ${projectId} por ${req.user.email}`);
            return ApiResponse.success(res, tasks, 'Tareas estándar creadas exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear tareas estándar:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Verificar si un proyecto tiene tareas estándar
     */
    hasStandardTasks = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.projectService.hasStandardTasks(id, req.user);

            return ApiResponse.success(res, result, 'Verificación de tareas estándar completada');
        } catch (error) {
            logger.error('Error al verificar tareas estándar:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Crear o obtener proyecto general de un área
     */
    createOrGetGeneralProject = async (req, res) => {
        try {
            const { areaId, areaName, projectName, tasks } = req.body;
            const project = await this.projectService.createOrGetGeneralProject(
                areaId, 
                areaName, 
                projectName, 
                tasks, 
                req.user
            );

            logger.info(`Proyecto general creado/obtenido para área ${areaId} por ${req.user.email}`);
            return ApiResponse.success(res, project, 'Proyecto general procesado exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear/obtener proyecto general:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Asignar usuario al proyecto general de su área
     */
    assignToGeneralProject = async (req, res) => {
        try {
            const { userId, areaId } = req.body;
            const result = await this.projectService.assignUserToGeneralProject(userId, areaId, req.user);

            logger.info(`Usuario ${userId} asignado al proyecto general del área ${areaId} por ${req.user.email}`);
            return ApiResponse.success(res, result, 'Usuario asignado al proyecto general exitosamente');
        } catch (error) {
            logger.error('Error al asignar usuario al proyecto general:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Asignar múltiples usuarios al proyecto general de su área
     */
    assignUsersToGeneralProject = async (req, res) => {
        try {
            const { userIds, areaId } = req.body;
            const result = await this.projectService.assignUsersToGeneralProject(userIds, areaId, req.user);

            logger.info(`${userIds.length} usuarios asignados al proyecto general del área ${areaId} por ${req.user.email}`);
            return ApiResponse.success(res, result, 'Usuarios asignados al proyecto general exitosamente');
        } catch (error) {
            logger.error('Error al asignar usuarios al proyecto general:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener proyecto general de un área
     */
    getGeneralProjectByArea = async (req, res) => {
        try {
            const { areaId } = req.params;
            const project = await this.projectService.getGeneralProjectByArea(areaId, req.user);

            return ApiResponse.success(res, project, 'Proyecto general obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener proyecto general:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };
}

module.exports = new ProjectController();
