const UserService = require('../services/user.service');
const ApiResponse = require('../utils/response');
const { LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Controlador para gestión de usuarios
 */
class UserController {
    constructor() {
        this.userService = new UserService();
    }

    /**
     * Crear nuevo usuario
     */
    createUser = async (req, res) => {
        try {
            const user = await this.userService.createUser(req.body, req.user);

            logger.info(`Usuario creado: ${user.email} por ${req.user.email}`);
            return ApiResponse.success(res, user, 'Usuario creado exitosamente', 201);
        } catch (error) {
            logger.error('Error al crear usuario:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener usuario por ID
     */
    getUserById = async (req, res) => {
        try {
            const { id } = req.params;
            const user = await this.userService.getUserById(id);

            return ApiResponse.success(res, user, 'Usuario obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener usuario:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };

    /**
     * Obtener todos los usuarios con filtros y paginación
     */
    getUsers = async (req, res) => {
        try {
            const {
                page = 1,
                limit = LIMITS.PAGE_SIZE_DEFAULT,
                search,
                role,
                areaId,
                isActive
            } = req.query;

            // Validar límites de paginación
            const pageSize = Math.min(parseInt(limit), LIMITS.PAGE_SIZE_MAX);
            const pageNumber = Math.max(parseInt(page), 1);

            const filters = {};
            if (search) filters.search = search;
            if (role) filters.role = role;
            if (areaId) filters.areaId = areaId;
            if (isActive !== undefined) filters.isActive = isActive === 'true';

            // Si el usuario es coordinador, solo puede ver usuarios de su área
            if (req.user.role === 'COORDINADOR') {
                filters.areaId = req.user.areaId;
            }

            const pagination = {
                page: pageNumber,
                limit: pageSize
            };

            const result = await this.userService.getUsers(filters, pagination);

            return ApiResponse.success(res, result, 'Usuarios obtenidos exitosamente');
        } catch (error) {
            logger.error('Error al obtener usuarios:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Actualizar usuario
     */
    updateUser = async (req, res) => {
        try {
            const { id } = req.params;
            const user = await this.userService.updateUser(id, req.body, req.user);

            logger.info(`Usuario actualizado: ${user.email} por ${req.user.email}`);
            return ApiResponse.success(res, user, 'Usuario actualizado exitosamente');
        } catch (error) {
            logger.error('Error al actualizar usuario:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Eliminar usuario (soft delete)
     */
    deleteUser = async (req, res) => {
        try {
            const { id } = req.params;
            await this.userService.deleteUser(id, req.user);

            logger.info(`Usuario eliminado: ${id} por ${req.user.email}`);
            return ApiResponse.success(res, null, 'Usuario eliminado exitosamente');
        } catch (error) {
            logger.error('Error al eliminar usuario:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Activar/Desactivar usuario
     */
    toggleUserStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { isActive } = req.body;

            const user = await this.userService.updateUser(id, { isActive }, req.user);

            logger.info(`Estado de usuario cambiado: ${user.email} - ${isActive ? 'Activado' : 'Desactivado'} por ${req.user.email}`);
            return ApiResponse.success(res, user, `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`);
        } catch (error) {
            logger.error('Error al cambiar estado del usuario:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Obtener estadísticas de usuarios
     */
    getUserStats = async (req, res) => {
        try {
            const stats = await this.userService.getUserStats();

            return ApiResponse.success(res, stats, 'Estadísticas de usuarios obtenidas exitosamente');
        } catch (error) {
            logger.error('Error al obtener estadísticas de usuarios:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new UserController();
