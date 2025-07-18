const TaskService = require('../services/task.service');
const ApiResponse = require('../utils/response');
const { LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de tareas
 */
class TaskController {
    constructor() {
        this.taskService = new TaskService();
    }

    /**
     * Crear nueva tarea
     */
    createTask = async (req, res) => {
        try {
            const task = await this.taskService.createTask(req.body, req.user);

            logger.info(`Tarea creada: ${task.title} por ${req.user.email}`);
            return ApiResponse.success(res, task, 'Tarea creada exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener tarea por ID
     */
    getTaskById = async (req, res) => {
        try {
            const { id } = req.params;
            const task = await this.taskService.getTaskById(id, req.user);

            return ApiResponse.success(res, task, 'Tarea obtenida exitosamente');
        } catch (error) {
            logger.error('Error al obtener tarea:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };

    /**
     * Obtener todas las tareas con filtros y paginación
     */
    getTasks = async (req, res) => {
        try {
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                status,
                priority,
                projectId,
                assignedTo,
                dueDate
            } = req.query;

            // Validar límites de paginación
            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (projectId) filters.projectId = projectId;
            if (assignedTo) filters.assignedTo = assignedTo;
            if (dueDate) filters.dueDate = dueDate;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.taskService.getTasks(filters, pagination, req.user);

            return ApiResponse.success(res, result, 'Tareas obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener tareas:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Actualizar tarea
     */
    updateTask = async (req, res) => {
        try {
            const { id } = req.params;
            const task = await this.taskService.updateTask(id, req.body, req.user);

            logger.info(`Tarea actualizada: ${task.title} por ${req.user.email}`);
            return ApiResponse.success(res, task, 'Tarea actualizada exitosamente');
        } catch (error) {
            logger.error('Error al actualizar tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Eliminar tarea (soft delete)
     */
    deleteTask = async (req, res) => {
        try {
            const { id } = req.params;
            await this.taskService.deleteTask(id, req.user);

            logger.info(`Tarea eliminada: ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Tarea eliminada exitosamente');
        } catch (error) {
            logger.error('Error al eliminar tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Cambiar estado de la tarea
     */
    changeTaskStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const task = await this.taskService.changeTaskStatus(id, status, req.user);

            logger.info(`Estado de tarea cambiado: ${task.title} a ${status} por ${req.user.email}`);
            return ApiResponse.success(res, task, 'Estado de la tarea cambiado exitosamente');
        } catch (error) {
            logger.error('Error al cambiar estado de la tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Asignar tarea a usuario
     */
    assignTask = async (req, res) => {
        try {
            const { id } = req.params;
            const { userId } = req.body;

            const task = await this.taskService.assignTask(id, userId, req.user);

            logger.info(`Tarea ${task.title} asignada a ${userId} por ${req.user.email}`);
            return ApiResponse.success(res, task, 'Tarea asignada exitosamente');
        } catch (error) {
            logger.error('Error al asignar tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener registros de tiempo de una tarea
     */
    getTaskTimeEntries = async (req, res) => {
        try {
            const { id } = req.params;
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                startDate,
                endDate,
                userId
            } = req.query;

            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (userId) filters.userId = userId;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.taskService.getTaskTimeEntries(id, filters, pagination, req.user);

            return ApiResponse.success(res, result, 'Registros de tiempo de la tarea obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener registros de tiempo de la tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener estadísticas de una tarea
     */
    getTaskStats = async (req, res) => {
        try {
            const { id } = req.params;
            const stats = await this.taskService.getTaskStats(id, req.user);

            return ApiResponse.success(res, stats, 'Estadísticas de la tarea obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas de la tarea:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener tareas asignadas a un usuario
     */
    getUserTasks = async (req, res) => {
        try {
            const { userId } = req.params;
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                status,
                priority,
                projectId
            } = req.query;

            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (projectId) filters.projectId = projectId;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.taskService.getUserTasks(userId, filters, pagination, req.user);

            return ApiResponse.success(res, result, 'Tareas del usuario obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener tareas del usuario:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Asignación múltiple de tareas
     */
    bulkAssignTasks = async (req, res) => {
        try {
            const { taskIds, userId } = req.body;

            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return ApiResponse.error(res, 'Se requiere un array de IDs de tareas', 400);
            }

            if (!userId) {
                return ApiResponse.error(res, 'Se requiere el ID del usuario asignado', 400);
            }

            const result = await this.taskService.bulkAssignTasks(taskIds, userId, req.user);

            return ApiResponse.success(res, result, 'Tareas asignadas exitosamente');
        } catch (error) {
            logger.error('Error en asignación múltiple de tareas:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new TaskController();
