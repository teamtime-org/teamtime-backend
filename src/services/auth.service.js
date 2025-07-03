const UserService = require('./user.service');
const { ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de autenticación
 */
class AuthService {
    constructor() {
        this.userService = new UserService();
    }

    /**
     * Registrar nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>}
     */
    async register(userData) {
        try {
            return await this.userService.createUser(userData);
        } catch (error) {
            logger.error('Error en registro:', error);
            throw error;
        }
    }

    /**
     * Iniciar sesión
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>}
     */
    async login(email, password) {
        try {
            return await this.userService.authenticateUser(email, password);
        } catch (error) {
            logger.error('Error en login:', error);
            throw error;
        }
    }

    /**
     * Obtener perfil del usuario autenticado
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async getProfile(userId) {
        try {
            return await this.userService.getUserById(userId);
        } catch (error) {
            logger.error('Error al obtener perfil:', error);
            throw error;
        }
    }

    /**
     * Actualizar perfil del usuario autenticado
     * @param {string} userId 
     * @param {Object} userData 
     * @returns {Promise<Object>}
     */
    async updateProfile(userId, userData) {
        try {
            // Un usuario puede actualizar su propio perfil
            const user = await this.userService.getUserById(userId);
            return await this.userService.updateUser(userId, userData, user);
        } catch (error) {
            logger.error('Error al actualizar perfil:', error);
            throw error;
        }
    }

    /**
     * Cambiar contraseña
     * @param {string} userId 
     * @param {string} currentPassword 
     * @param {string} newPassword 
     * @returns {Promise<void>}
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            await this.userService.changePassword(userId, currentPassword, newPassword);
        } catch (error) {
            logger.error('Error al cambiar contraseña:', error);
            throw error;
        }
    }
}

module.exports = AuthService;
