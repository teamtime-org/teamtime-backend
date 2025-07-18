const AreaRepository = require('../repositories/area.repository');
const UserRepository = require('../repositories/user.repository');
const { USER_ROLES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de áreas
 */
class AreaService {
    constructor() {
        this.areaRepository = new AreaRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Obtener usuario por ID
     * @param {string} userId 
     * @returns {Promise<Object|null>}
     */
    async getUserById(userId) {
        try {
            return await this.userRepository.findById(userId);
        } catch (error) {
            logger.error('Error al obtener usuario:', error);
            return null;
        }
    }

    /**
     * Crear nueva área
     * @param {Object} areaData - Datos del área
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createArea(areaData, requestingUser) {
        try {
            // Validar que el usuario existe
            if (!requestingUser || !requestingUser.userId) {
                throw new Error('Usuario no autenticado');
            }

            // Solo administradores pueden crear áreas
            if (requestingUser.role !== USER_ROLES.ADMINISTRADOR) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar que el usuario existe en la base de datos
            const userExists = await this.getUserById(requestingUser.userId);
            if (!userExists) {
                throw new Error('Usuario no encontrado en la base de datos');
            }

            // Verificar si el nombre ya existe
            const existingArea = await this.areaRepository.findByName(areaData.name);
            if (existingArea) {
                throw new Error('Ya existe un área con ese nombre');
            }

            // Agregar el createdBy al área
            const areaToCreate = {
                ...areaData,
                createdBy: requestingUser.userId
            };

            const area = await this.areaRepository.create(areaToCreate);

            logger.info(`Área creada: ${area.name} por ${requestingUser.email}`);
            return area;
        } catch (error) {
            logger.error('Error al crear área:', error);
            throw error;
        }
    }

    /**
     * Obtener área por ID
     * @param {string} areaId 
     * @returns {Promise<Object>}
     */
    async getAreaById(areaId) {
        try {
            const area = await this.areaRepository.findById(areaId);
            if (!area) {
                throw new Error('Área no encontrada');
            }

            return area;
        } catch (error) {
            logger.error('Error al obtener área:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las áreas con filtros y paginación
     * @param {Object} filters - Filtros de búsqueda
     * @param {Object} pagination - Configuración de paginación
     * @returns {Promise<Object>}
     */
    async getAreas(filters = {}, pagination = {}) {
        try {
            return await this.areaRepository.findMany(filters, pagination);
        } catch (error) {
            logger.error('Error al obtener áreas:', error);
            throw error;
        }
    }

    /**
     * Actualizar área
     * @param {string} areaId 
     * @param {Object} areaData 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    async updateArea(areaId, areaData, requestingUser) {
        try {
            // Solo administradores pueden actualizar áreas
            if (requestingUser.role !== USER_ROLES.ADMINISTRADOR) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar que el área existe
            const existingArea = await this.areaRepository.findById(areaId);
            if (!existingArea) {
                throw new Error('Área no encontrada');
            }

            // Si se actualiza el nombre, verificar que no exista
            if (areaData.name && areaData.name !== existingArea.name) {
                const nameExists = await this.areaRepository.findByName(areaData.name);
                if (nameExists) {
                    throw new Error('Ya existe un área con ese nombre');
                }
            }

            const updatedArea = await this.areaRepository.update(areaId, areaData);

            logger.info(`Área actualizada: ${updatedArea.name} por ${requestingUser.email}`);
            return updatedArea;
        } catch (error) {
            logger.error('Error al actualizar área:', error);
            throw error;
        }
    }

    /**
     * Eliminar área (soft delete)
     * @param {string} areaId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async deleteArea(areaId, requestingUser) {
        try {
            // Solo administradores pueden eliminar áreas
            if (requestingUser.role !== USER_ROLES.ADMINISTRADOR) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Verificar que el área existe
            const existingArea = await this.areaRepository.findById(areaId);
            if (!existingArea) {
                throw new Error('Área no encontrada');
            }

            // Verificar que no tenga usuarios activos
            const activeUsers = await this.areaRepository.getActiveUsersCount(areaId);
            if (activeUsers > 0) {
                throw new Error('No se puede eliminar un área con usuarios activos');
            }

            // Verificar que no tenga proyectos activos
            const activeProjects = await this.areaRepository.getActiveProjectsCount(areaId);
            if (activeProjects > 0) {
                throw new Error('No se puede eliminar un área con proyectos activos');
            }

            await this.areaRepository.softDelete(areaId);

            logger.info(`Área eliminada: ${existingArea.name} por ${requestingUser.email}`);
        } catch (error) {
            logger.error('Error al eliminar área:', error);
            throw error;
        }
    }

    /**
     * Obtener usuarios de un área
     * @param {string} areaId 
     * @param {Object} filters 
     * @param {Object} pagination 
     * @returns {Promise<Object>}
     */
    async getAreaUsers(areaId, filters = {}, pagination = {}) {
        try {
            // Verificar que el área existe
            const area = await this.areaRepository.findById(areaId);
            if (!area) {
                throw new Error('Área no encontrada');
            }

            return await this.areaRepository.getUsers(areaId, filters, pagination);
        } catch (error) {
            logger.error('Error al obtener usuarios del área:', error);
            throw error;
        }
    }

    /**
     * Obtener proyectos de un área
     * @param {string} areaId 
     * @param {Object} filters 
     * @param {Object} pagination 
     * @returns {Promise<Object>}
     */
    async getAreaProjects(areaId, filters = {}, pagination = {}) {
        try {
            // Verificar que el área existe
            const area = await this.areaRepository.findById(areaId);
            if (!area) {
                throw new Error('Área no encontrada');
            }

            return await this.areaRepository.getProjects(areaId, filters, pagination);
        } catch (error) {
            logger.error('Error al obtener proyectos del área:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de un área
     * @param {string} areaId 
     * @returns {Promise<Object>}
     */
    async getAreaStats(areaId) {
        try {
            // Verificar que el área existe
            const area = await this.areaRepository.findById(areaId);
            if (!area) {
                throw new Error('Área no encontrada');
            }

            return await this.areaRepository.getStats(areaId);
        } catch (error) {
            logger.error('Error al obtener estadísticas del área:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario puede acceder a un área
     * @param {Object} user 
     * @param {string} areaId 
     * @returns {boolean}
     */
    canUserAccessArea(user, areaId) {
        // Administradores pueden acceder a cualquier área
        if (user.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Otros roles solo pueden acceder a su área
        return user.areaId === areaId;
    }

    /**
     * Obtener estadísticas generales de áreas
     * @returns {Promise<Object>}
     */
    async getGeneralStats() {
        try {
            return await this.areaRepository.getGeneralStats();
        } catch (error) {
            logger.error('Error al obtener estadísticas generales de áreas:', error);
            throw error;
        }
    }
}

module.exports = AreaService;
