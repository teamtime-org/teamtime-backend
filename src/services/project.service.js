const ProjectRepository = require('../repositories/project.repository');
const { USER_ROLES, PROJECT_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de proyectos
 */
class ProjectService {
    constructor() {
        this.projectRepository = new ProjectRepository();
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

        // Usuarios pueden acceder a proyectos de su área
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
            return user.areaId === project.areaId;
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
        // Administradores ven todos los proyectos
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            logger.info(`Admin user ${user.email} accessing all projects`);
            return filters;
        }

        // Otros roles solo ven proyectos de su área
        logger.info(`User ${user.email} (role: ${user.role}) filtering projects by areaId: ${user.areaId}`);
        return {
            ...filters,
            areaId: user.areaId,
        };
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
}

module.exports = ProjectService;
