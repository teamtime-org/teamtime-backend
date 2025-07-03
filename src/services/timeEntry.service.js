const TimeEntryRepository = require('../repositories/timeEntry.repository');
const TaskRepository = require('../repositories/task.repository');
const { USER_ROLES, LIMITS, ERROR_MESSAGES } = require('../utils/constants');
const { isSameDay, startOfDay, endOfDay } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de registros de tiempo
 */
class TimeEntryService {
    constructor() {
        this.timeEntryRepository = new TimeEntryRepository();
        this.taskRepository = new TaskRepository();
    }

    /**
     * Crear nuevo registro de tiempo
     * @param {Object} timeEntryData - Datos del registro de tiempo
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createTimeEntry(timeEntryData, requestingUser) {
        try {
            // Verificar que la tarea existe
            const task = await this.taskRepository.findById(timeEntryData.taskId);
            if (!task) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos
            if (!this.canUserCreateTimeEntry(requestingUser, task, timeEntryData.userId)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Validar horas
            await this.validateTimeEntry(timeEntryData);

            const timeEntry = await this.timeEntryRepository.create({
                ...timeEntryData,
                createdBy: requestingUser.userId,
            });

            logger.info(`Registro de tiempo creado: ${timeEntry.hours}h en tarea ${task.title} por ${requestingUser.email}`);
            return timeEntry;
        } catch (error) {
            logger.error('Error al crear registro de tiempo:', error);
            throw error;
        }
    }

    /**
     * Obtener registro de tiempo por ID
     * @param {string} timeEntryId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getTimeEntryById(timeEntryId, requestingUser) {
        try {
            const timeEntry = await this.timeEntryRepository.findById(timeEntryId);
            if (!timeEntry) {
                throw new Error('Registro de tiempo no encontrado');
            }

            // Verificar permisos de acceso
            if (!this.canUserAccessTimeEntry(requestingUser, timeEntry)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return timeEntry;
        } catch (error) {
            logger.error('Error al obtener registro de tiempo:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los registros de tiempo con filtros y paginación
     * @param {Object} filters - Filtros de búsqueda
     * @param {Object} pagination - Configuración de paginación
     * @param {Object} requestingUser - Usuario que realiza la consulta
     * @returns {Promise<Object>}
     */
    async getTimeEntries(filters = {}, pagination = {}, requestingUser) {
        try {
            // Aplicar filtros según permisos del usuario
            const userFilters = await this.applyUserFilters(filters, requestingUser);

            return await this.timeEntryRepository.findMany(userFilters, pagination);
        } catch (error) {
            logger.error('Error al obtener registros de tiempo:', error);
            throw error;
        }
    }

    /**
     * Actualizar registro de tiempo
     * @param {string} timeEntryId 
     * @param {Object} timeEntryData 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async updateTimeEntry(timeEntryId, timeEntryData, requestingUser) {
        try {
            // Verificar que el registro existe
            const existingTimeEntry = await this.timeEntryRepository.findById(timeEntryId);
            if (!existingTimeEntry) {
                throw new Error('Registro de tiempo no encontrado');
            }

            // Verificar permisos
            if (!this.canUserUpdateTimeEntry(requestingUser, existingTimeEntry)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Validar datos si se actualizan horas o fecha
            if (timeEntryData.hours || timeEntryData.date) {
                const dataToValidate = {
                    ...existingTimeEntry,
                    ...timeEntryData,
                };
                await this.validateTimeEntry(dataToValidate);
            }

            const updatedTimeEntry = await this.timeEntryRepository.update(timeEntryId, timeEntryData);

            logger.info(`Registro de tiempo actualizado: ${updatedTimeEntry.id} por ${requestingUser.email}`);
            return updatedTimeEntry;
        } catch (error) {
            logger.error('Error al actualizar registro de tiempo:', error);
            throw error;
        }
    }

    /**
     * Eliminar registro de tiempo
     * @param {string} timeEntryId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async deleteTimeEntry(timeEntryId, requestingUser) {
        try {
            // Verificar que el registro existe
            const existingTimeEntry = await this.timeEntryRepository.findById(timeEntryId);
            if (!existingTimeEntry) {
                throw new Error('Registro de tiempo no encontrado');
            }

            // Verificar permisos
            if (!this.canUserDeleteTimeEntry(requestingUser, existingTimeEntry)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            await this.timeEntryRepository.delete(timeEntryId);

            logger.info(`Registro de tiempo eliminado: ${timeEntryId} por ${requestingUser.email}`);
        } catch (error) {
            logger.error('Error al eliminar registro de tiempo:', error);
            throw error;
        }
    }

    /**
     * Obtener registros de tiempo por fecha
     * @param {string} userId 
     * @param {Date} date 
     * @param {Object} requestingUser 
     * @returns {Promise<Array>}
     */
    async getTimeEntriesByDate(userId, date, requestingUser) {
        try {
            // Verificar permisos
            if (!this.canUserViewUserTimeEntries(requestingUser, userId)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            const startDate = startOfDay(date);
            const endDate = endOfDay(date);

            return await this.timeEntryRepository.findByDateRange(userId, startDate, endDate);
        } catch (error) {
            logger.error('Error al obtener registros de tiempo por fecha:', error);
            throw error;
        }
    }

    /**
     * Obtener registros de tiempo por rango de fechas
     * @param {Object} filters 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getTimeEntriesByDateRange(filters, startDate, endDate, requestingUser) {
        try {
            // Aplicar filtros de usuario
            const userFilters = await this.applyUserFilters(filters, requestingUser);

            return await this.timeEntryRepository.findByDateRange(
                userFilters.userId,
                startDate,
                endDate,
                userFilters
            );
        } catch (error) {
            logger.error('Error al obtener registros de tiempo por rango:', error);
            throw error;
        }
    }

    /**
     * Obtener resumen de tiempo por usuario
     * @param {string} userId 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getUserTimeSummary(userId, startDate, endDate, requestingUser) {
        try {
            // Verificar permisos
            if (!this.canUserViewUserTimeEntries(requestingUser, userId)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return await this.timeEntryRepository.getUserSummary(userId, startDate, endDate);
        } catch (error) {
            logger.error('Error al obtener resumen de tiempo del usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener reporte de tiempo por proyecto
     * @param {string} projectId 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getProjectTimeReport(projectId, startDate, endDate, requestingUser) {
        try {
            // Verificar permisos (implementar según necesidades)
            // Aquí podrías verificar que el usuario pueda ver el proyecto

            return await this.timeEntryRepository.getProjectReport(projectId, startDate, endDate);
        } catch (error) {
            logger.error('Error al obtener reporte de tiempo del proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de tiempo
     * @param {Object} filters 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getTimeStats(filters, startDate, endDate, requestingUser) {
        try {
            // Aplicar filtros de usuario
            const userFilters = await this.applyUserFilters(filters, requestingUser);

            return await this.timeEntryRepository.getStats(userFilters, startDate, endDate);
        } catch (error) {
            logger.error('Error al obtener estadísticas de tiempo:', error);
            throw error;
        }
    }

    /**
     * Validar registro de tiempo
     * @param {Object} timeEntryData 
     * @returns {Promise<void>}
     */
    async validateTimeEntry(timeEntryData) {
        // Validar horas mínimas y máximas
        if (timeEntryData.hours < LIMITS.MIN_HOURS_PER_ENTRY) {
            throw new Error(`Las horas deben ser al menos ${LIMITS.MIN_HOURS_PER_ENTRY}`);
        }

        if (timeEntryData.hours > LIMITS.MAX_HOURS_PER_DAY) {
            throw new Error(`No se pueden registrar más de ${LIMITS.MAX_HOURS_PER_DAY} horas en un día`);
        }

        // Verificar que la fecha no sea futura
        const today = new Date();
        const entryDate = new Date(timeEntryData.date);

        if (entryDate > today) {
            throw new Error('No se pueden registrar horas en fechas futuras');
        }

        // Verificar límite de horas por día
        if (timeEntryData.userId && timeEntryData.date) {
            const existingHours = await this.timeEntryRepository.getTotalHoursByUserAndDate(
                timeEntryData.userId,
                timeEntryData.date,
                timeEntryData.id // Excluir el registro actual en caso de actualización
            );

            const totalHours = existingHours + timeEntryData.hours;

            if (totalHours > LIMITS.MAX_HOURS_PER_DAY) {
                throw new Error(`No se pueden exceder ${LIMITS.MAX_HOURS_PER_DAY} horas por día. Total actual: ${existingHours}`);
            }
        }
    }

    /**
     * Verificar si un usuario puede crear un registro de tiempo
     * @param {Object} user 
     * @param {Object} task 
     * @param {string} targetUserId 
     * @returns {boolean}
     */
    canUserCreateTimeEntry(user, task, targetUserId) {
        // Administradores pueden crear registros para cualquier usuario
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden crear registros para usuarios de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            // Verificar que la tarea pertenece a un proyecto de su área
            return user.areaId === task.project.areaId;
        }

        // Colaboradores solo pueden crear registros para sí mismos
        if (user.role === USER_ROLES.COLABORADOR) {
            return user.id === targetUserId && user.areaId === task.project.areaId;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede acceder a un registro de tiempo
     * @param {Object} user 
     * @param {Object} timeEntry 
     * @returns {boolean}
     */
    canUserAccessTimeEntry(user, timeEntry) {
        // Administradores pueden acceder a cualquier registro
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden acceder a registros de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === timeEntry.task.project.areaId;
        }

        // Colaboradores solo pueden acceder a sus propios registros
        return user.id === timeEntry.userId;
    }

    /**
     * Verificar si un usuario puede actualizar un registro de tiempo
     * @param {Object} user 
     * @param {Object} timeEntry 
     * @returns {boolean}
     */
    canUserUpdateTimeEntry(user, timeEntry) {
        // Administradores pueden actualizar cualquier registro
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden actualizar registros de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === timeEntry.task.project.areaId;
        }

        // Colaboradores solo pueden actualizar sus propios registros
        return user.id === timeEntry.userId;
    }

    /**
     * Verificar si un usuario puede eliminar un registro de tiempo
     * @param {Object} user 
     * @param {Object} timeEntry 
     * @returns {boolean}
     */
    canUserDeleteTimeEntry(user, timeEntry) {
        // Administradores pueden eliminar cualquier registro
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden eliminar registros de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === timeEntry.task.project.areaId;
        }

        // Colaboradores solo pueden eliminar sus propios registros
        return user.id === timeEntry.userId;
    }

    /**
     * Verificar si un usuario puede ver registros de tiempo de otro usuario
     * @param {Object} user 
     * @param {string} targetUserId 
     * @returns {boolean}
     */
    canUserViewUserTimeEntries(user, targetUserId) {
        // Administradores pueden ver registros de cualquier usuario
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden ver registros de usuarios de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            // Aquí necesitarías verificar que el usuario objetivo está en la misma área
            // Por simplicidad, se asume que se validará en el repositorio
            return true;
        }

        // Colaboradores solo pueden ver sus propios registros
        return user.id === targetUserId;
    }

    /**
     * Aplicar filtros según permisos del usuario
     * @param {Object} filters 
     * @param {Object} user 
     * @returns {Promise<Object>}
     */
    async applyUserFilters(filters, user) {
        // Administradores ven todos los registros
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return filters;
        }

        // Coordinadores ven registros de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return {
                ...filters,
                areaId: user.areaId,
            };
        }

        // Colaboradores solo ven sus propios registros
        return {
            ...filters,
            userId: user.id,
        };
    }
}

module.exports = TimeEntryService;
