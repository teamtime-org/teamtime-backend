const TimeEntryService = require('../services/timeEntry.service');
const ApiResponse = require('../utils/response');
const { LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de registros de tiempo
 */
class TimeEntryController {
    constructor() {
        this.timeEntryService = new TimeEntryService();
    }

    /**
     * Crear nuevo registro de tiempo
     */
    createTimeEntry = async (req, res) => {
        try {
            logger.info(`[TimeEntry Creation] User: ${req.user?.email || 'unknown'}, Body: ${JSON.stringify(req.body)}`);
            
            const timeEntry = await this.timeEntryService.createTimeEntry(req.body, req.user);

            logger.info(`Registro de tiempo creado: ${timeEntry.hours}h por ${req.user.email}`);
            return ApiResponse.success(res, timeEntry, 'Registro de tiempo creado exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear registro de tiempo:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener registro de tiempo por ID
     */
    getTimeEntryById = async (req, res) => {
        try {
            const { id } = req.params;
            const timeEntry = await this.timeEntryService.getTimeEntryById(id, req.user);

            return ApiResponse.success(res, timeEntry, 'Registro de tiempo obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener registro de tiempo:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };

    /**
     * Obtener todos los registros de tiempo con filtros y paginación
     */
    getTimeEntries = async (req, res) => {
        try {
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                userId,
                taskId,
                projectId,
                startDate,
                endDate
            } = req.query;

            // Validar límites de paginación
            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (userId) filters.userId = userId;
            if (taskId) filters.taskId = taskId;
            if (projectId) filters.projectId = projectId;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.timeEntryService.getTimeEntries(filters, pagination, req.user);

            return ApiResponse.success(res, result, 'Registros de tiempo obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener registros de tiempo:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Actualizar registro de tiempo
     */
    updateTimeEntry = async (req, res) => {
        try {
            const { id } = req.params;
            const timeEntry = await this.timeEntryService.updateTimeEntry(id, req.body, req.user);

            logger.info(`Registro de tiempo actualizado: ${id} por ${req.user.email}`);
            return ApiResponse.success(res, timeEntry, 'Registro de tiempo actualizado exitosamente');
        } catch (error) {
            logger.error('Error al actualizar registro de tiempo:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Eliminar registro de tiempo
     */
    deleteTimeEntry = async (req, res) => {
        try {
            const { id } = req.params;
            await this.timeEntryService.deleteTimeEntry(id, req.user);

            logger.info(`Registro de tiempo eliminado: ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Registro de tiempo eliminado exitosamente');
        } catch (error) {
            logger.error('Error al eliminar registro de tiempo:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener registros de tiempo por fecha
     */
    getTimeEntriesByDate = async (req, res) => {
        try {
            const { userId, date } = req.params;
            const dateObj = new Date(date);

            if (isNaN(dateObj.getTime())) {
                return ApiResponse.error(res, 'Fecha inválida', 400);
            }

            const timeEntries = await this.timeEntryService.getTimeEntriesByDate(userId, dateObj, req.user);

            return ApiResponse.success(res, timeEntries, 'Registros de tiempo por fecha obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener registros de tiempo por fecha:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener registros de tiempo por rango de fechas
     */
    getTimeEntriesByDateRange = async (req, res) => {
        try {
            const { startDate, endDate } = req.params;
            const {
                userId,
                taskId,
                projectId
            } = req.query;

            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);

            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                return ApiResponse.error(res, 'Fechas inválidas', 400);
            }

            if (startDateObj > endDateObj) {
                return ApiResponse.error(res, 'La fecha de inicio debe ser anterior a la fecha de fin', 400);
            }

            const filters = {};
            if (userId) filters.userId = userId;
            if (taskId) filters.taskId = taskId;
            if (projectId) filters.projectId = projectId;

            const result = await this.timeEntryService.getTimeEntriesByDateRange(
                filters,
                startDateObj,
                endDateObj,
                req.user
            );

            return ApiResponse.success(res, result, 'Registros de tiempo por rango obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener registros de tiempo por rango:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener resumen de tiempo por usuario
     */
    getUserTimeSummary = async (req, res) => {
        try {
            const { userId } = req.params;
            const { startDate, endDate } = req.query;

            const startDateObj = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endDateObj = endDate ? new Date(endDate) : new Date();

            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                return ApiResponse.error(res, 'Fechas inválidas', 400);
            }

            const summary = await this.timeEntryService.getUserTimeSummary(userId, startDateObj, endDateObj, req.user);

            return ApiResponse.success(res, summary, 'Resumen de tiempo del usuario obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener resumen de tiempo del usuario:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener reporte de tiempo por proyecto
     */
    getProjectTimeReport = async (req, res) => {
        try {
            const { projectId } = req.params;
            const { startDate, endDate } = req.query;

            const startDateObj = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endDateObj = endDate ? new Date(endDate) : new Date();

            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                return ApiResponse.error(res, 'Fechas inválidas', 400);
            }

            const report = await this.timeEntryService.getProjectTimeReport(projectId, startDateObj, endDateObj, req.user);

            return ApiResponse.success(res, report, 'Reporte de tiempo del proyecto obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener reporte de tiempo del proyecto:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener estadísticas de tiempo
     */
    getTimeStats = async (req, res) => {
        try {
            const { startDate, endDate, userId, projectId, areaId } = req.query;

            const startDateObj = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endDateObj = endDate ? new Date(endDate) : new Date();

            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                return ApiResponse.error(res, 'Fechas inválidas', 400);
            }

            const filters = {};
            if (userId) filters.userId = userId;
            if (projectId) filters.projectId = projectId;
            if (areaId) filters.areaId = areaId;

            const stats = await this.timeEntryService.getTimeStats(filters, startDateObj, endDateObj, req.user);

            return ApiResponse.success(res, stats, 'Estadísticas de tiempo obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas de tiempo:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new TimeEntryController();
