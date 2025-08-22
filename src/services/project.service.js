const ProjectRepository = require('../repositories/project.repository');
const TaskRepository = require('../repositories/task.repository');
const { 
    USER_ROLES, 
    PROJECT_STATUS, 
    ERROR_MESSAGES, 
    STANDARD_PROJECT_TASKS,
    GENERAL_PROJECT_TASKS,
    GENERAL_PROJECT_PREFIX
} = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de proyectos
 */
class ProjectService {
    constructor() {
        this.projectRepository = new ProjectRepository();
        this.taskRepository = new TaskRepository();
    }

    /**
     * Crear nuevo proyecto
     * @param {Object} projectData - Datos del proyecto
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createProject(projectData, requestingUser) {
        try {
            // Verificar permisos
            if (!this.canUserCreateProject(requestingUser, projectData.areaId)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar fechas
            if (projectData.endDate && new Date(projectData.startDate) >= new Date(projectData.endDate)) {
                throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
            }

            const project = await this.projectRepository.create({
                ...projectData,
                createdBy: requestingUser.userId,
            });

            logger.info(`Proyecto creado: ${project.name} por ${requestingUser.email}`);
            return project;
        } catch (error) {
            logger.error('Error al crear proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener proyecto por ID
     * @param {string} projectId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getProjectById(projectId, requestingUser) {
        try {
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos de acceso
            if (!this.canUserAccessProject(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return project;
        } catch (error) {
            logger.error('Error al obtener proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los proyectos con filtros y paginación
     * @param {Object} filters - Filtros de búsqueda
     * @param {Object} pagination - Configuración de paginación
     * @param {Object} requestingUser - Usuario que realiza la consulta
     * @returns {Promise<Object>}
     */
    async getProjects(filters = {}, pagination = {}, requestingUser) {
        try {
            // Aplicar filtros según permisos del usuario
            const userFilters = this.applyUserFilters(filters, requestingUser);

            return await this.projectRepository.findMany(userFilters, pagination, requestingUser.role, requestingUser.userId);
        } catch (error) {
            logger.error('Error al obtener proyectos:', error);
            throw error;
        }
    }

    /**
     * Actualizar proyecto
     * @param {string} projectId 
     * @param {Object} projectData 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async updateProject(projectId, projectData, requestingUser) {
        try {
            // Verificar que el proyecto existe
            const existingProject = await this.projectRepository.findById(projectId);
            if (!existingProject) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos
            if (!this.canUserUpdateProject(requestingUser, existingProject)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar fechas
            if (projectData.startDate && projectData.endDate) {
                if (new Date(projectData.startDate) >= new Date(projectData.endDate)) {
                    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
                }
            }

            const updatedProject = await this.projectRepository.update(projectId, projectData);

            logger.info(`Proyecto actualizado: ${updatedProject.name} por ${requestingUser.email}`);
            return updatedProject;
        } catch (error) {
            logger.error('Error al actualizar proyecto:', error);
            throw error;
        }
    }

    /**
     * Eliminar proyecto (soft delete)
     * @param {string} projectId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async deleteProject(projectId, requestingUser) {
        try {
            // Verificar que el proyecto existe
            const existingProject = await this.projectRepository.findById(projectId);
            if (!existingProject) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos
            if (!this.canUserDeleteProject(requestingUser, existingProject)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar que no tenga tareas activas
            const activeTasks = await this.projectRepository.getActiveTasksCount(projectId);
            if (activeTasks > 0) {
                throw new Error('No se puede eliminar un proyecto con tareas activas');
            }

            await this.projectRepository.softDelete(projectId);

            logger.info(`Proyecto eliminado: ${existingProject.name} por ${requestingUser.email}`);
        } catch (error) {
            logger.error('Error al eliminar proyecto:', error);
            throw error;
        }
    }

    /**
     * Cambiar estado del proyecto
     * @param {string} projectId 
     * @param {string} status 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async changeProjectStatus(projectId, status, requestingUser) {
        try {
            // Verificar que el proyecto existe
            const existingProject = await this.projectRepository.findById(projectId);
            if (!existingProject) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos
            if (!this.canUserUpdateProject(requestingUser, existingProject)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Validar cambio de estado
            if (!this.isValidStatusTransition(existingProject.status, status)) {
                throw new Error('Cambio de estado no válido');
            }

            const updatedProject = await this.projectRepository.update(projectId, { status });

            logger.info(`Estado del proyecto cambiado: ${updatedProject.name} de ${existingProject.status} a ${status} por ${requestingUser.email}`);
            return updatedProject;
        } catch (error) {
            logger.error('Error al cambiar estado del proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener tareas de un proyecto
     * @param {string} projectId 
     * @param {Object} filters 
     * @param {Object} pagination 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getProjectTasks(projectId, filters = {}, pagination = {}, requestingUser) {
        try {
            // Verificar que el proyecto existe y el usuario tiene acceso
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            if (!this.canUserAccessProject(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return await this.projectRepository.getTasks(projectId, filters, pagination);
        } catch (error) {
            logger.error('Error al obtener tareas del proyecto:', error);
            throw error;
        }
    }

    /**
     * Asignar usuario a proyecto
     * @param {string} projectId 
     * @param {string} userId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async assignUserToProject(projectId, userId, requestingUser) {
        try {
            // Verificar que el proyecto existe
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos
            logger.debug(`Verificando permisos assignUserToProject - Usuario: ${requestingUser.role} (areaId: ${requestingUser.areaId}), Proyecto areaId: ${project.areaId || (project.area && project.area.id)}`);
            if (!this.canUserManageProjectMembers(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            await this.projectRepository.assignUser(projectId, userId);

            logger.info(`Usuario ${userId} asignado al proyecto ${project.name} por ${requestingUser.email}`);
        } catch (error) {
            logger.error('Error al asignar usuario al proyecto:', error);
            throw error;
        }
    }

    /**
     * Remover usuario de proyecto
     * @param {string} projectId 
     * @param {string} userId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async removeUserFromProject(projectId, userId, requestingUser) {
        try {
            // Verificar que el proyecto existe
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            // Verificar permisos
            if (!this.canUserManageProjectMembers(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            await this.projectRepository.removeUser(projectId, userId);

            logger.info(`Usuario ${userId} removido del proyecto ${project.name} por ${requestingUser.email}`);
        } catch (error) {
            logger.error('Error al remover usuario del proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de un proyecto
     * @param {string} projectId 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async getProjectStats(projectId, requestingUser) {
        try {
            // Verificar que el proyecto existe y el usuario tiene acceso
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            if (!this.canUserAccessProject(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return await this.projectRepository.getStats(projectId);
        } catch (error) {
            logger.error('Error al obtener estadísticas del proyecto:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario puede crear un proyecto
     * @param {Object} user 
     * @param {string} areaId 
     * @returns {boolean}
     */
    canUserCreateProject(user, areaId) {
        // Administradores pueden crear proyectos en cualquier área
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden crear proyectos en su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === areaId;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede acceder a un proyecto
     * @param {Object} user 
     * @param {Object} project 
     * @returns {boolean}
     */
    canUserAccessProject(user, project) {
        // Administradores pueden acceder a cualquier proyecto
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Si el proyecto es general, todos los usuarios del área pueden verlo
        if (project.isGeneral && user.areaId === project.areaId) {
            return true;
        }

        // Coordinadores pueden ver todos los proyectos de su área
        if (user.role === USER_ROLES.COORDINADOR && user.areaId === project.areaId) {
            return true;
        }

        // Para proyectos no generales, verificar si el usuario tiene acceso específico
        // Esto incluye asignaciones o permisos específicos del proyecto
        return user.areaId === project.areaId;
    }

    /**
     * Verificar si un usuario puede actualizar un proyecto
     * @param {Object} user 
     * @param {Object} project 
     * @returns {boolean}
     */
    canUserUpdateProject(user, project) {
        // Administradores pueden actualizar cualquier proyecto
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden actualizar proyectos de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            return user.areaId === project.areaId;
        }

        return false;
    }

    /**
     * Verificar si un usuario puede eliminar un proyecto
     * @param {Object} user 
     * @param {Object} project 
     * @returns {boolean}
     */
    canUserDeleteProject(user, project) {
        // Solo administradores pueden eliminar proyectos
        return user.role === USER_ROLES.ADMINISTRADOR;
    }

    /**
     * Verificar si un usuario puede gestionar miembros del proyecto
     * @param {Object} user 
     * @param {Object} project 
     * @returns {boolean}
     */
    canUserManageProjectMembers(user, project) {
        // Administradores pueden gestionar cualquier proyecto
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden gestionar proyectos de su área
        if (user.role === USER_ROLES.COORDINADOR) {
            // El areaId puede estar en project.areaId o project.area.id
            const projectAreaId = project.areaId || (project.area && project.area.id);
            return user.areaId === projectAreaId;
        }

        return false;
    }

    /**
     * Aplicar filtros según permisos del usuario
     * @param {Object} filters 
     * @param {Object} user 
     * @returns {Object}
     */
    applyUserFilters(filters, user) {
        const appliedFilters = { ...filters };

        // Si se solicita filtrar por proyectos asignados
        if (filters.assigned === true || filters.assigned === 'true') {
            appliedFilters.assignedToMe = true;
            logger.info(`User ${user.email} requesting assigned projects only`);
        }

        // Administradores ven todos los proyectos
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            logger.info(`Admin user ${user.email} accessing all projects`);
            return appliedFilters;
        }

        // Colaboradores ven proyectos asignados específicamente a ellos + proyectos generales de su área
        if (user.role === USER_ROLES.COLABORADOR) {
            logger.info(`Collaborator ${user.email} - accessing assigned projects and general projects from area ${user.areaId}`);
            // Para colaboradores, usamos una lógica especial en el repositorio
            appliedFilters.collaboratorAccess = true;
            appliedFilters.collaboratorUserId = user.userId;
            appliedFilters.collaboratorAreaId = user.areaId;
        } else {
            // Coordinadores ven proyectos de su área
            if (user.areaId) {
                logger.info(`User ${user.email} (role: ${user.role}) filtering projects by areaId: ${user.areaId}`);
                appliedFilters.areaId = user.areaId;
            } else {
                // Si no tienen área, no pueden ver ningún proyecto (excepto los asignados específicamente)
                logger.warn(`User ${user.email} (role: ${user.role}) has no area assigned - limiting to assigned projects only`);
                appliedFilters.assignedToMe = true;
            }
        }
        
        return appliedFilters;
    }

    /**
     * Verificar si una transición de estado es válida
     * @param {string} currentStatus 
     * @param {string} newStatus 
     * @returns {boolean}
     */
    isValidStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [PROJECT_STATUS.ACTIVE]: [PROJECT_STATUS.ON_HOLD, PROJECT_STATUS.COMPLETED, PROJECT_STATUS.CANCELLED],
            [PROJECT_STATUS.ON_HOLD]: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.CANCELLED],
            [PROJECT_STATUS.COMPLETED]: [],
            [PROJECT_STATUS.CANCELLED]: [],
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Crear tareas estándar para un proyecto
     * @param {string} projectId - ID del proyecto
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Array>}
     */
    async createStandardTasks(projectId, requestingUser) {
        try {
            // Verificar que el proyecto existe y el usuario tiene permisos
            const project = await this.getProjectById(projectId, requestingUser);
            
            // Verificar si ya tiene tareas estándar
            const hasStandard = await this.hasStandardTasks(projectId, requestingUser);
            if (hasStandard.hasStandardTasks) {
                throw new Error('El proyecto ya tiene tareas estándar creadas');
            }

            // Crear las tareas estándar
            const tasksToCreate = STANDARD_PROJECT_TASKS.map((taskTitle, index) => ({
                title: taskTitle,
                description: `Actividad estándar del proyecto: ${taskTitle}`,
                projectId: projectId,
                status: 'TODO',
                priority: 'MEDIUM',
                createdBy: requestingUser.userId,
                // Establecer orden secuencial
                order: index + 1
            }));

            const createdTasks = [];
            for (const taskData of tasksToCreate) {
                const task = await this.taskRepository.create(taskData);
                createdTasks.push(task);
            }

            logger.info(`${createdTasks.length} tareas estándar creadas para proyecto ${projectId} por ${requestingUser.email}`);
            return createdTasks;
        } catch (error) {
            logger.error('Error al crear tareas estándar:', error);
            throw error;
        }
    }

    /**
     * Verificar si un proyecto tiene tareas estándar
     * @param {string} projectId - ID del proyecto
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async hasStandardTasks(projectId, requestingUser) {
        try {
            // Verificar que el proyecto existe y el usuario tiene permisos
            await this.getProjectById(projectId, requestingUser);

            // Obtener tareas del proyecto
            const tasks = await this.taskRepository.getTasksByProject(projectId);
            
            // Verificar si contiene todas las tareas estándar
            const taskTitles = tasks.map(task => task.title);
            const hasAllStandardTasks = STANDARD_PROJECT_TASKS.every(
                standardTask => taskTitles.includes(standardTask)
            );

            return {
                hasStandardTasks: hasAllStandardTasks,
                existingStandardTasks: STANDARD_PROJECT_TASKS.filter(
                    standardTask => taskTitles.includes(standardTask)
                ),
                missingStandardTasks: STANDARD_PROJECT_TASKS.filter(
                    standardTask => !taskTitles.includes(standardTask)
                ),
                totalTasks: tasks.length
            };
        } catch (error) {
            logger.error('Error al verificar tareas estándar:', error);
            throw error;
        }
    }

    /**
     * Crear o obtener proyecto general de un área
     * @param {string} areaId - ID del área
     * @param {string} areaName - Nombre del área
     * @param {string} projectName - Nombre del proyecto
     * @param {Array} tasks - Tareas a crear
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createOrGetGeneralProject(areaId, areaName, projectName, tasks, requestingUser) {
        try {
            // Verificar permisos
            if (!this.canUserCreateProject(requestingUser, areaId)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Buscar si ya existe un proyecto general para esta área
            const existingProject = await this.projectRepository.findGeneralProjectByArea(areaId);
            
            if (existingProject) {
                logger.info(`Proyecto general existente encontrado para área ${areaId}: ${existingProject.id}`);
                return existingProject;
            }

            // Crear nuevo proyecto general
            const projectData = {
                name: projectName || `${GENERAL_PROJECT_PREFIX}: ${areaName}`,
                description: `Proyecto para actividades generales del área ${areaName}`,
                areaId: areaId,
                status: PROJECT_STATUS.ACTIVE,
                isGeneral: true,
                createdBy: requestingUser.userId
            };

            const project = await this.projectRepository.create(projectData);

            // Crear tareas generales
            const tasksToCreate = (tasks || GENERAL_PROJECT_TASKS).map((taskTitle, index) => ({
                title: taskTitle,
                description: `Actividad general del área: ${taskTitle}`,
                projectId: project.id,
                status: 'TODO',
                priority: 'MEDIUM',
                createdBy: requestingUser.userId,
                order: index + 1
            }));

            for (const taskData of tasksToCreate) {
                await this.taskRepository.create(taskData);
            }

            logger.info(`Proyecto general creado para área ${areaId}: ${project.id} con ${tasksToCreate.length} tareas`);
            return project;
        } catch (error) {
            logger.error('Error al crear/obtener proyecto general:', error);
            throw error;
        }
    }

    /**
     * Asignar usuario al proyecto general de su área
     * @param {string} userId - ID del usuario
     * @param {string} areaId - ID del área
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async assignUserToGeneralProject(userId, areaId, requestingUser) {
        try {
            // Buscar o crear proyecto general
            const generalProject = await this.projectRepository.findGeneralProjectByArea(areaId);
            
            if (!generalProject) {
                throw new Error(`No existe proyecto general para el área ${areaId}`);
            }

            // Asignar usuario al proyecto
            const assignment = await this.projectRepository.assignUserToProject(generalProject.id, userId);
            
            logger.info(`Usuario ${userId} asignado al proyecto general ${generalProject.id} del área ${areaId}`);
            return {
                projectId: generalProject.id,
                userId: userId,
                areaId: areaId,
                assignment: assignment
            };
        } catch (error) {
            // Si el error es que ya está asignado, no es crítico
            if (error.message.includes('already assigned') || error.message.includes('ya está asignado')) {
                logger.info(`Usuario ${userId} ya está asignado al proyecto general del área ${areaId}`);
                return {
                    projectId: generalProject?.id,
                    userId: userId,
                    areaId: areaId,
                    alreadyAssigned: true
                };
            }
            logger.error('Error al asignar usuario al proyecto general:', error);
            throw error;
        }
    }

    /**
     * Asignar múltiples usuarios al proyecto general de su área
     * @param {Array} userIds - IDs de los usuarios
     * @param {string} areaId - ID del área
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async assignUsersToGeneralProject(userIds, areaId, requestingUser) {
        try {
            const results = [];
            const errors = [];

            for (const userId of userIds) {
                try {
                    const result = await this.assignUserToGeneralProject(userId, areaId, requestingUser);
                    results.push(result);
                } catch (error) {
                    errors.push({
                        userId: userId,
                        error: error.message
                    });
                }
            }

            logger.info(`Asignación masiva completada: ${results.length} exitosos, ${errors.length} errores`);
            return {
                successful: results,
                errors: errors,
                totalProcessed: userIds.length,
                successCount: results.length,
                errorCount: errors.length
            };
        } catch (error) {
            logger.error('Error en asignación masiva al proyecto general:', error);
            throw error;
        }
    }

    /**
     * Obtener proyecto general de un área
     * @param {string} areaId - ID del área
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async getGeneralProjectByArea(areaId, requestingUser) {
        try {
            const project = await this.projectRepository.findGeneralProjectByArea(areaId);
            
            if (!project) {
                throw new Error(`No existe proyecto general para el área ${areaId}`);
            }

            // Verificar permisos para ver el proyecto
            if (!this.canUserViewProject(requestingUser, project)) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            return project;
        } catch (error) {
            logger.error('Error al obtener proyecto general:', error);
            throw error;
        }
    }
}

module.exports = ProjectService;
