const express = require('express');
const userController = require('../controllers/user.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');
const {
    createUserSchema,
    updateUserSchema,
    toggleUserStatusSchema
} = require('../validators/user.validator');

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Crear nuevo usuario
 * @access  Private (Administrador/Coordinador)
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    validate(createUserSchema),
    userController.createUser
);

/**
 * @route   GET /api/users
 * @desc    Obtener todos los usuarios con filtros y paginación
 * @access  Private (Administrador/Coordinador)
 */
router.get('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    userController.getUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (Administrador)
 */
router.get('/stats',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    userController.getUserStats
);

/**
 * @route   GET /api/users/:id
 * @desc    Obtener usuario por ID
 * @access  Private (Administrador/Coordinador/Mismo usuario)
 */
router.get('/:id',
    authenticateToken,
    userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar usuario
 * @access  Private (Administrador/Coordinador/Mismo usuario)
 */
router.put('/:id',
    authenticateToken,
    validate(updateUserSchema),
    userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private (Administrador)
 */
router.delete('/:id',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    userController.deleteUser
);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Activar/Desactivar usuario
 * @access  Private (Administrador)
 */
router.patch('/:id/status',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    validate(toggleUserStatusSchema),
    userController.toggleUserStatus
);

module.exports = router;
