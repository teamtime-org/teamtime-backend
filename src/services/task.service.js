const TaskRepository = require('../repositories/task.repository');
const ProjectRepository = require('../repositories/project.repository');
const UserRepository = require('../repositories/user.repository');
const { USER_ROLES, TASK_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de tareas
 */
class TaskService {
    constructor() {
        this.taskRepository = new TaskRepository();
        this.projectRepository = new ProjectRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Crear nueva tarea
     * @param {Object} taskData - Datos de la tarea
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createTask(taskData, requestingUser) {
        try {
            // Verificar que el proyecto existe
            const project = await this.projectRepository.findById(taskData.projectId);
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos
            if (!this.canUserCreateTask(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar fechas - permitir fechas de hoy en adelante
            if (taskData.dueDate) {
                const dueDate = new Date(taskData.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparar solo fechas
                
                if (dueDate < today) {
                    throw new Error('La fecha de vencimiento no puede ser anterior a hoy');
                }
            }

            // Verificar que la fecha esté dentro del rango del proyecto
            if (taskData.dueDate && project.endDate) {
                if (new Date(taskData.dueDate) > new Date(project.endDate)) {
                    throw new Error('La fecha de vencimiento no puede ser posterior al fin del proyecto');
                }
            }

            const task = await this.taskRepository.create({
                ...taskData,
                createdBy: requestingUser.userId,
            });

            logger.info(`Tarea creada: ${task.title} en proyecto ${project.name} por ${requestingUser.email}`);
            return task;
        } catch (error) {
            logger.error('Error al crear tarea:', error);
            throw error;
        }
    }

    /**
     * Obtener tarea por ID
     * @param {string} taskId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getTaskById(taskId, requestingUser) {
        try {
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos de acceso
            if (!this.canUserAccessTask(requestingUser, task)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return task;
        } catch (error) {
            logger.error('Error al obtener tarea:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las tareas con filtros y paginación
     * @param {Object} filters - Filtros de búsqueda
     * @param {Object} pagination - Configuración de paginación
     * @param {Object} requestingUser - Usuario que realiza la consulta
     * @returns {Promise<Object>}
     */
    async getTasks(filters = {}, pagination = {}, requestingUser) {
        try {
            // Aplicar filtros según permisos del usuario
            const userFilters = await this.applyUserFilters(filters, requestingUser);

            return await this.taskRepository.findMany(userFilters, pagination);
        } catch (error) {
            logger.error('Error al obtener tareas:', error);
            throw error;
        }
    }

    /**
     * Actualizar tarea
     * @param {string} taskId 
     * @param {Object} taskData 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async updateTask(taskId, taskData, requestingUser) {
        try {
            // Verificar que la tarea existe
            const existingTask = await this.taskRepository.findById(taskId);
            if (!existingTask) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos
            if (!this.canUserUpdateTask(requestingUser, existingTask)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar fechas - permitir fechas de hoy en adelante
            if (taskData.dueDate) {
                const dueDate = new Date(taskData.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparar solo fechas
                
                if (dueDate < today) {
                    throw new Error('La fecha de vencimiento no puede ser anterior a hoy');
                }
            }

            const updatedTask = await this.taskRepository.update(taskId, taskData);

            logger.info(`Tarea actualizada: ${updatedTask.title} por ${requestingUser.email}`);
            return updatedTask;
        } catch (error) {
            logger.error('Error al actualizar tarea:', error);
            throw error;
        }
    }

    /**
     * Eliminar tarea (soft delete)
     * @param {string} taskId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async deleteTask(taskId, requestingUser) {
        try {
            // Verificar que la tarea existe
            const existingTask = await this.taskRepository.findById(taskId);
            if (!existingTask) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos
            if (!this.canUserDeleteTask(requestingUser, existingTask)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar que no tenga registros de tiempo
            const timeEntries = await this.taskRepository.getTimeEntriesCount(taskId);
            if (timeEntries > 0) {
                throw new Error('No se puede eliminar una tarea con registros de tiempo');
            }

            await this.taskRepository.softDelete(taskId);

            logger.info(`Tarea eliminada: ${existingTask.title} por ${requestingUser.email}`);
        } catch (error) {
            logger.error('Error al eliminar tarea:', error);
            throw error;
        }
    }

    /**
     * Cambiar estado de la tarea
     * @param {string} taskId 
     * @param {string} status 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async changeTaskStatus(taskId, status, requestingUser) {
        try {
            // Verificar que la tarea existe
            const existingTask = await this.taskRepository.findById(taskId);
            if (!existingTask) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos
            if (!this.canUserUpdateTaskStatus(requestingUser, existingTask)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Validar cambio de estado
            if (!this.isValidStatusTransition(existingTask.status, status)) {
                throw new Error('Cambio de estado no válido');
            }

            const updatedTask = await this.taskRepository.update(taskId, {
                status,
                completedAt: status === TASK_STATUS.DONE ? new Date() : null
            });

            logger.info(`Estado de tarea cambiado: ${updatedTask.title} de ${existingTask.status} a ${status} por ${requestingUser.email}`);
            return updatedTask;
        } catch (error) {
            logger.error('Error al cambiar estado de la tarea:', error);
            throw error;
        }
    }

    /**
     * Asignar tarea a usuario
     * @param {string} taskId 
     * @param {string} userId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async assignTask(taskId, userId, requestingUser) {
        try {
            // Verificar que la tarea existe
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error('Tarea no encontrada');
            }

            // Verificar permisos
            if (!this.canUserAssignTask(requestingUser, task)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            const updatedTask = await this.taskRepository.update(taskId, { assignedTo: userId });

            logger.info(`Tarea ${task.title} asignada a usuario ${userId} por ${requestingUser.email}`);
            return updatedTask;
        } catch (error) {
            logger.error('Error al asignar tarea:', error);
            throw error;
        }
    }

    /**
     * Asignación múltiple de tareas
     * @param {Array} taskIds 
     * @param {string} userId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async bulkAssignTasks(taskIds, userId, requestingUser) {
        try {
            const results = {
                successful: [],
                failed: [],
                total: taskIds.length
            };

            // Verificar que el usuario asignado existe
            const assigneeExists = await this.userRepository.findById(userId);
            if (!assigneeExists) {
                throw new Error('Usuario asignado no encontrado');
            }

            for (const taskId of taskIds) {
                try {
                    // Verificar que la tarea existe
                    const task = await this.taskRepository.findById(taskId);
                    if (!task) {
                        results.failed.push({
                            taskId,
                            error: 'Tarea no encontrada'
                        });
                        continue;
                    }

                    // Verificar permisos
                    if (!this.canUserAssignTask(requestingUser, task)) {
                        results.failed.push({
                            taskId,
                            error: 'Sin permisos para asignar esta tarea'
                        });
                        continue;
                    }

                    // Asignar la tarea
                    const updatedTask = await this.taskRepository.update(taskId, { assignedTo: userId });
                    results.successful.push({
                        taskId,
                        task: updatedTask
                    });

                    logger.info(`Tarea ${task.title} asignada a usuario ${userId} por ${requestingUser.email} (bulk operation)`);
                } catch (error) {
                    results.failed.push({
                        taskId,
                        error: error.message
                    });
                }
            }

            logger.info(`Asignación múltiple completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas`);
            return results;
        } catch (error) {
            logger.error('Error en asignación múltiple de tareas:', error);
            throw error;
        }
    }

    /**
     * Obtener registros de tiempo de una tarea
     * @param {string} taskId 
     * @param {Object} filters 
     * @param {Object} pagination 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getTaskTimeEntries(taskId, filters = {}, pagination = {}, requestingUser) {
        try {
            // Verificar que la tarea existe y el usuario tiene acceso
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error('Tarea no encontrada');
            }

            if (!this.canUserAccessTask(requestingUser, task)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return await this.taskRepository.getTimeEntries(taskId, filters, pagination);
        } catch (error) {
            logger.error('Error al obtener registros de tiempo de la tarea:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de una tarea
     * @param {string} taskId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getTaskStats(taskId, requestingUser) {
        try {
            // Verificar que la tarea existe y el usuario tiene acceso
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error('Tarea no encontrada');
            }

            if (!this.canUserAccessTask(requestingUser, task)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return await this.taskRepository.getStats(taskId);
        } catch (error) {
            logger.error('Error al obtener estadísticas de la tarea:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario puede crear una tarea
     * @param {Object} user 
     * @param {Object} project 
     * @returns {boolean}
     */
    canUserCreateTask(user, project) {
        // Administradores pueden crear tareas en cualquier proyecto
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden crear tareas en proyectos de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === project.areaId;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede acceder a una tarea
     * @param {Object} user 
     * @param {Object} task 
     * @returns {boolean}
     */
    canUserAccessTask(user, task) {
        // Administradores pueden acceder a cualquier tarea
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Usuarios pueden acceder a tareas de proyectos de su área
        return user.areaId === task.project.areaId;
    }

    /**
     * Verificar si un usuario puede actualizar una tarea
     * @param {Object} user 
     * @param {Object} task 
     * @returns {boolean}
     */
    canUserUpdateTask(user, task) {
        // Administradores pueden actualizar cualquier tarea
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden actualizar tareas de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === task.project.areaId;
        }

        // Colaboradores pueden actualizar tareas asignadas a ellos
        if (user.role === USER_ROLES.COLABORADOR) {
            return task.assignedTo === user.id;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede actualizar el estado de una tarea
     * @param {Object} user 
     * @param {Object} task 
     * @returns {boolean}
     */
    canUserUpdateTaskStatus(user, task) {
        // Administradores pueden cambiar estado de cualquier tarea
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden cambiar estado de tareas de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === task.project.areaId;
        }

        // Colaboradores pueden cambiar estado de tareas asignadas a ellos
        if (user.role === USER_ROLES.COLABORADOR) {
            return task.assignedTo === user.id;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede eliminar una tarea
     * @param {Object} user 
     * @param {Object} task 
     * @returns {boolean}
     */
    canUserDeleteTask(user, task) {
        // Solo administradores y coordinadores de la misma área pueden eliminar tareas
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === task.project.areaId;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede asignar una tarea
     * @param {Object} user 
     * @param {Object} task 
     * @returns {boolean}
     */
    canUserAssignTask(user, task) {
        // Administradores pueden asignar cualquier tarea
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden asignar tareas de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === task.project.areaId;
        }

        return false;
    }

    /**
     * Aplicar filtros según permisos del usuario
     * @param {Object} filters 
     * @param {Object} user 
     * @returns {Promise<Object>}
     */
    async applyUserFilters(filters, user) {
        // Administradores ven todas las tareas
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return filters;
        }

        // Coordinadores ven tareas de proyectos de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            const userProjects = await this.projectRepository.findMany({
                areaId: user.areaId
            }, { page: 1, limit: 1000 });

            const projectIds = userProjects.projects.map(p => p.id);

            return {
                ...filters,
                projectId: filters.projectId ?
                    (projectIds.includes(filters.projectId) ? filters.projectId : null) :
                    projectIds,
            };
        }

        // Colaboradores ven tareas de su área O asignadas a ellos
        if (user.role === USER_ROLES.COLABORADOR) {
            const userProjects = await this.projectRepository.findMany({
                areaId: user.areaId
            }, { page: 1, limit: 1000 });

            const projectIds = userProjects.projects.map(p => p.id);

            return {
                ...filters,
                // Permite ver tareas de proyectos de su área O tareas asignadas a ellos
                OR: [
                    { projectId: { in: projectIds } },
                    { assignedTo: user.id }
                ]
            };
        }

        return filters;
    }

    /**
     * Verificar si una transición de estado es válida
     * @param {string} currentStatus 
     * @param {string} newStatus 
     * @returns {boolean}
     */
    isValidStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [TASK_STATUS.TODO]: [TASK_STATUS.IN_PROGRESS],
            [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.TODO, TASK_STATUS.REVIEW, TASK_STATUS.DONE],
            [TASK_STATUS.REVIEW]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.DONE],
            [TASK_STATUS.DONE]: [TASK_STATUS.IN_PROGRESS], // Solo para reapertura
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Obtener tareas asignadas a un usuario
     * @param {string} userId 
     * @param {Object} filters 
     * @param {Object} pagination 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getUserTasks(userId, filters = {}, pagination = {}, requestingUser) {
        try {
            // Verificar permisos
            if (requestingUser.userId !== userId && requestingUser.role !== USER_ROLES.ADMINISTRADOR) {
                if (requestingUser.role !== USER_ROLES.COORDINADOR) {
                    throw new Error(ERROR_MESSAGES.FORBIDDEN);
                }
            }

            return await this.taskRepository.findMany({
                ...filters,
                assignedTo: userId
            }, pagination);
        } catch (error) {
            logger.error('Error al obtener tareas del usuario:', error);
            throw error;
        }
    }
}

module.exports = TaskService;
