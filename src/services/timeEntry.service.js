const TimeEntryRepository = require('../repositories/timeEntry.repository');
const TaskRepository = require('../repositories/task.repository');
const SystemConfigService = require('./systemConfig.service');
const { USER_ROLES, LIMITS, ERROR_MESSAGES } = require('../utils/constants');
const { isSameDay, startOfDay, endOfDay, parseDateOnly, formatDateOnly, formatForLog } = require('../utils/dateUtils');
const logger = require('../utils/logger');
const prisma = require('../config/database');

/**
 * Servicio para gestión de registros de tiempo
 */
class TimeEntryService {
    constructor() {
        this.timeEntryRepository = new TimeEntryRepository();
        this.taskRepository = new TaskRepository();
        this.systemConfigService = new SystemConfigService();
    }

    /**
     * Crear nuevo registro de tiempo
     * @param {Object} timeEntryData - Datos del registro de tiempo
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createTimeEntry(timeEntryData, requestingUser) {
        try {
            // Verificar que la tarea existe o es una tarea general
            let task = await this.taskRepository.findById(timeEntryData.taskId);

            if (!task) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos
            const targetUserId = timeEntryData.userId || requestingUser.userId;

            if (!this.canUserCreateTimeEntry(requestingUser, task, targetUserId)) {
                logger.warn(`Permisos insuficientes para crear time entry - Usuario: ${requestingUser.email}, Tarea: ${task.id}`);
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Procesar fecha como string YYYY-MM-DD
            //const dateString = parseDateOnly(timeEntryData.date);
            const year = timeEntryData.year;
            const month = timeEntryData.month;
            const day = timeEntryData.day;
            // Crear fecha como string ISO para evitar problemas de timezone
            const dateForDB = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const timeEntryWithUserId = {
                ...timeEntryData,
                userId: timeEntryData.userId || requestingUser.userId,
                date: dateForDB, // Mantener como string hasta el repository
            };

            logger.info(`[TimeEntry] Procesando entrada - Fecha: ${dateForDB} (tipo: ${typeof dateForDB})`);

            // Buscar si existe un registro duplicado
            const existingEntry = await this.timeEntryRepository.findDuplicate(
                timeEntryWithUserId.userId,
                timeEntryWithUserId.projectId,
                timeEntryWithUserId.taskId,
                timeEntryWithUserId.date
            );

            if (existingEntry) {
                // Si existe, actualizar el registro existente
                const updateData = {
                    hours: timeEntryWithUserId.hours,
                    description: timeEntryWithUserId.description,
                };

                // Validar antes de actualizar (omitir validación de duplicados)
                const dataToValidate = {
                    ...existingEntry,
                    ...updateData,
                };
                await this.validateTimeEntry(dataToValidate, true); // skipDuplicateCheck = true

                const updatedTimeEntry = await this.timeEntryRepository.update(existingEntry.id, updateData);

                logger.info(`Registro de tiempo actualizado: ${updatedTimeEntry.hours}h en tarea ${task.title} por ${requestingUser.email} (era ${existingEntry.hours}h)`);
                return updatedTimeEntry;
            } else {
                // Si no existe, validar y crear nuevo registro
                await this.validateTimeEntry(timeEntryWithUserId);

                const timeEntry = await this.timeEntryRepository.create(timeEntryWithUserId);

                logger.info(`Registro de tiempo creado: ${timeEntry.hours}h en tarea ${task.title} por ${requestingUser.email}`);
                return timeEntry;
            }
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

            return await this.timeEntryRepository.findMany(userFilters, pagination, requestingUser.role, requestingUser.userId);
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

            // En update, solo permitir cambiar horas y descripción
            // No se permite cambiar fecha, proyecto, tarea, etc.
            const { year, month, day, userId, projectId, taskId, date, timePeriodId, ...processedData } = timeEntryData;
            
            if (year || month || day || date) {
                logger.warn(`[TimeEntry Update] Intento de cambiar fecha en update ignorado para entrada ${timeEntryId}`);
            }

            // Validar datos si se actualizan horas
            if (processedData.hours) {
                const dataToValidate = {
                    ...existingTimeEntry,
                    ...processedData,
                };
                await this.validateTimeEntry(dataToValidate);
            }

            const updatedTimeEntry = await this.timeEntryRepository.update(timeEntryId, processedData);

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
     * @param {boolean} skipDuplicateCheck - Si true, omite la validación de duplicados
     * @returns {Promise<void>}
     */
    async validateTimeEntry(timeEntryData, skipDuplicateCheck = false) {
        // Validar horas mínimas y máximas
        if (timeEntryData.hours < LIMITS.MIN_HOURS_PER_ENTRY) {
            throw new Error(`Las horas deben ser al menos ${LIMITS.MIN_HOURS_PER_ENTRY}`);
        }

        if (timeEntryData.hours > LIMITS.MAX_HOURS_PER_DAY) {
            throw new Error(`No se pueden registrar más de ${LIMITS.MAX_HOURS_PER_DAY} horas en un día`);
        }

        // Validar restricciones de fecha
        // timeEntryData.date ya es un Date object creado desde year/month/day
        const dateValidation = await this.systemConfigService.validateDateForTimeEntry(timeEntryData.date);

        if (!dateValidation.isValid) {
            throw new Error(dateValidation.reason);
        }

        // Verificar duplicados (userId, projectId, taskId, date) - solo si no se debe omitir
        if (!skipDuplicateCheck && timeEntryData.userId && timeEntryData.projectId && timeEntryData.taskId && timeEntryData.date) {
            const isDuplicate = await this.timeEntryRepository.existsDuplicate(
                timeEntryData.userId,
                timeEntryData.projectId,
                timeEntryData.taskId,
                timeEntryData.date,
                timeEntryData.id // Excluir el registro actual en caso de actualización
            );

            if (isDuplicate) {
                throw new Error('Ya existe un registro de tiempo para esta combinación de usuario, proyecto, tarea y fecha');
            }
        }

        // Verificar límite de horas por día
        if (timeEntryData.userId && timeEntryData.date) {
            const hoursCheck = await this.timeEntryRepository.checkDailyHoursLimit(
                timeEntryData.userId,
                timeEntryData.date,
                timeEntryData.hours,
                timeEntryData.id // Excluir el registro actual en caso de actualización
            );

            if (!hoursCheck.isValid) {
                throw new Error(`No se pueden exceder ${LIMITS.MAX_HOURS_PER_DAY} horas por día. Total actual: ${hoursCheck.currentHours}h, intentando agregar: ${timeEntryData.hours}h`);
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
            return user.areaId === task.project?.areaId;
        }

        // Colaboradores solo pueden crear registros para sí mismos
        if (user.role === USER_ROLES.COLABORADOR) {
            // Pueden crear registros para tareas de su área O asignadas a ellos
            const isSameUser = user.userId === targetUserId;
            const isSameArea = user.areaId && user.areaId === task.project?.areaId;
            const isAssignedToUser = task.assignedTo === user.userId;

            // Si no tienen área asignada, solo pueden trabajar en tareas asignadas específicamente a ellos
            if (!user.areaId) {
                return isSameUser && isAssignedToUser;
            }

            // Si tienen área asignada, pueden trabajar en tareas de su área O asignadas a ellos
            return isSameUser && (isSameArea || isAssignedToUser);
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
            // Usar project.area.id en lugar de task.project.areaId
            return user.areaId === timeEntry.project?.area?.id;
        }

        // Colaboradores solo pueden acceder a sus propios registros
        return user.userId === timeEntry.userId;
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
            // Usar project.area.id en lugar de task.project.areaId
            return user.areaId === timeEntry.project?.area?.id;
        }

        // Colaboradores solo pueden actualizar sus propios registros
        return user.userId === timeEntry.userId;
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
        return user.userId === timeEntry.userId;
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
        return user.userId === targetUserId;
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
            userId: user.userId,
        };
    }
}

module.exports = TimeEntryService;
