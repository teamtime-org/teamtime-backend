const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/user.repository');
const config = require('../config');
const { USER_ROLES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Servicio para gestión de usuarios
 */
class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * Crear nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @param {Object} requestingUser - Usuario que realiza la operación
     * @returns {Promise<Object>}
     */
    async createUser(userData, requestingUser = null) {
        try {
            // Verificar si el email ya existe
            const existingUser = await this.userRepository.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }

            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(userData.password, 12);

            // Preparar datos del usuario
            const userToCreate = {
                ...userData,
                password: hashedPassword,
            };

            // Agregar createdBy si se proporciona el usuario que crea
            if (requestingUser) {
                userToCreate.createdBy = requestingUser.userId;
            }

            // Crear usuario
            const user = await this.userRepository.create(userToCreate);

            // Remover password del resultado
            const { password, ...userWithoutPassword } = user;

            logger.info(`Usuario creado: ${user.email}`);
            return userWithoutPassword;
        } catch (error) {
            logger.error('Error al crear usuario:', error);
            throw error;
        }
    }

    /**
     * Autenticar usuario
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>}
     */
    async authenticateUser(email, password) {
        try {
            // Buscar usuario por email
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new Error('Credenciales inválidas');
            }

            // Verificar si el usuario está activo
            if (!user.isActive) {
                throw new Error('Usuario inactivo. Contacte al administrador');
            }

            // Verificar contraseña
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Credenciales inválidas');
            }

            // Generar token JWT
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES_IN }
            );

            // Actualizar último login
            // TODO: Agregar campo lastLogin al schema y descomentar
            // await this.userRepository.updateLastLogin(user.id);

            // Remover password del resultado
            const { password: _, ...userWithoutPassword } = user;

            logger.info(`Usuario autenticado: ${user.email}`);

            return {
                user: userWithoutPassword,
                token,
            };
        } catch (error) {
            logger.error('Error en autenticación:', error);
            throw error;
        }
    }

    /**
     * Obtener usuario por ID
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async getUserById(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            logger.error('Error al obtener usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los usuarios con filtros y paginación
     * @param {Object} filters - Filtros de búsqueda
     * @param {Object} pagination - Configuración de paginación
     * @returns {Promise<Object>}
     */
    async getUsers(filters = {}, pagination = {}) {
        try {
            const result = await this.userRepository.findMany(filters, pagination);

            // Remover passwords de los resultados
            result.users = result.users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            return result;
        } catch (error) {
            logger.error('Error al obtener usuarios:', error);
            throw error;
        }
    }

    /**
     * Actualizar usuario
     * @param {string} userId 
     * @param {Object} userData 
     * @param {Object} requestingUser - Usuario que realiza la actualización
     * @returns {Promise<Object>}
     */
    async updateUser(userId, userData, requestingUser) {
        try {
            // Verificar que el usuario existe
            const existingUser = await this.userRepository.findById(userId);
            if (!existingUser) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar permisos
            const canUpdate = this.canUserUpdateUser(requestingUser, existingUser);
            if (!canUpdate) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            // Si se actualiza email, verificar que no exista
            if (userData.email && userData.email !== existingUser.email) {
                const emailExists = await this.userRepository.findByEmail(userData.email);
                if (emailExists) {
                    throw new Error('El email ya está registrado');
                }
            }

            // Si se actualiza password, hashearla
            if (userData.password) {
                userData.password = await bcrypt.hash(userData.password, 12);
            }

            const updatedUser = await this.userRepository.update(userId, userData);
            const { password, ...userWithoutPassword } = updatedUser;

            logger.info(`Usuario actualizado: ${updatedUser.email}`);
            return userWithoutPassword;
        } catch (error) {
            logger.error('Error al actualizar usuario:', error);
            throw error;
        }
    }

    /**
     * Eliminar usuario (soft delete)
     * @param {string} userId 
     * @param {Object} requestingUser 
     * @returns {Promise<void>}
     */
    async deleteUser(userId, requestingUser) {
        try {
            // Verificar que el usuario existe
            const existingUser = await this.userRepository.findById(userId);
            if (!existingUser) {
                throw new Error('Usuario no encontrado');
            }

            // No permitir auto-eliminación
            if (requestingUser.userId === userId) {
                throw new Error('No puedes eliminar tu propia cuenta');
            }

            // Verificar permisos
            if (requestingUser.role !== USER_ROLES.ADMINISTRADOR) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            await this.userRepository.softDelete(userId);

            logger.info(`Usuario eliminado: ${existingUser.email}`);
        } catch (error) {
            logger.error('Error al eliminar usuario:', error);
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
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar contraseña actual
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                throw new Error('Contraseña actual incorrecta');
            }

            // Hash nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            await this.userRepository.update(userId, { password: hashedPassword });

            logger.info(`Contraseña cambiada para usuario: ${user.email}`);
        } catch (error) {
            logger.error('Error al cambiar contraseña:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario puede actualizar a otro usuario
     * @param {Object} requestingUser 
     * @param {Object} targetUser 
     * @returns {boolean}
     */
    canUserUpdateUser(requestingUser, targetUser) {
        // Administradores pueden actualizar cualquier usuario
        if (requestingUser.role === USER_ROLES.ADMINISTRADOR) {
            return true;
        }

        // Coordinadores pueden actualizar colaboradores de su área
        if (requestingUser.role === USER_ROLES.COORDINADOR) {
            return targetUser.role === USER_ROLES.COLABORADOR &&
                targetUser.areaId === requestingUser.areaId;
        }

        // Colaboradores solo pueden actualizar su propio perfil
        return requestingUser.userId === targetUser.id;
    }

    /**
     * Obtener estadísticas de usuarios
     * @returns {Promise<Object>}
     */
    async getUserStats() {
        try {
            return await this.userRepository.getStats();
        } catch (error) {
            logger.error('Error al obtener estadísticas de usuarios:', error);
            throw error;
        }
    }
}

module.exports = UserService;
