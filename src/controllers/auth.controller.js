const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Controlador para autenticación
 */
class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    /**
     * Registrar nuevo usuario
     */
    register = async (req, res) => {
        try {
            const user = await this.authService.register(req.body);

            logger.info(`Usuario registrado: ${user.email}`);
            return ApiResponse.success(res, user, 'Usuario registrado exitosamente', 201);
        } catch (error) {
            logger.error('Error en registro:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Iniciar sesión
     */
    login = async (req, res) => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);

            logger.info(`Usuario logueado: ${email}`);
            return ApiResponse.success(res, result, 'Inicio de sesión exitoso');
        } catch (error) {
            logger.error('Error en login:', error);
            return ApiResponse.error(res, error.message, 401);
        }
    };

    /**
     * Obtener perfil del usuario autenticado
     */
    getProfile = async (req, res) => {
        try {
            const user = await this.authService.getProfile(req.user.userId);

            return ApiResponse.success(res, user, 'Perfil obtenido exitosamente');
        } catch (error) {
            logger.error('Error al obtener perfil:', error);
            return ApiResponse.error(res, error.message, 404);
        }
    };

    /**
     * Actualizar perfil del usuario autenticado
     */
    updateProfile = async (req, res) => {
        try {
            const user = await this.authService.updateProfile(req.user.userId, req.body);

            logger.info(`Perfil actualizado: ${user.email}`);
            return ApiResponse.success(res, user, 'Perfil actualizado exitosamente');
        } catch (error) {
            logger.error('Error al actualizar perfil:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Cambiar contraseña
     */
    changePassword = async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            await this.authService.changePassword(req.user.userId, currentPassword, newPassword);

            logger.info(`Contraseña cambiada para usuario: ${req.user.email}`);
            return ApiResponse.success(res, null, 'Contraseña cambiada exitosamente');
        } catch (error) {
            logger.error('Error al cambiar contraseña:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };

    /**
     * Cerrar sesión (placeholder)
     */
    logout = async (req, res) => {
        try {
            // En una implementación JWT stateless, el logout se maneja en el frontend
            // eliminando el token. Aquí podríamos implementar una blacklist de tokens
            // o invalidar el token de otra manera.

            logger.info(`Usuario deslogueado: ${req.user.email}`);
            return ApiResponse.success(res, null, 'Sesión cerrada exitosamente');
        } catch (error) {
            logger.error('Error al cerrar sesión:', error);
            return ApiResponse.error(res, error.message, 400);
        }
    };
}

module.exports = new AuthController();
