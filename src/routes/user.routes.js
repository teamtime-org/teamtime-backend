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
 * @swagger
 * /users:
 *   post:
 *     summary: Crear nuevo usuario
 *     description: Permite a administradores y coordinadores crear nuevos usuarios en el sistema.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *               - areaId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nuevo.usuario@ejemplo.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: ContraseñaSegura123
 *               firstName:
 *                 type: string
 *                 example: Carlos
 *               lastName:
 *                 type: string
 *                 example: Rodríguez
 *               role:
 *                 type: string
 *                 enum: [ADMINISTRADOR, COORDINADOR, COLABORADOR]
 *                 example: COLABORADOR
 *               areaId:
 *                 type: string
 *                 format: uuid
 *                 example: area-123
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Usuario creado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    validate(createUserSchema),
    userController.createUser
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener lista de usuarios
 *     description: Retorna una lista paginada de usuarios con filtros opcionales. Los coordinadores solo ven usuarios de su área.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de elementos por página
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMINISTRADOR, COORDINADOR, COLABORADOR]
 *         description: Filtrar por rol
 *       - in: query
 *         name: areaId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por área
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o email
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Usuarios obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    userController.getUsers
);

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Obtener estadísticas de usuarios
 *     description: Retorna estadísticas generales sobre los usuarios del sistema. Solo disponible para administradores.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Estadísticas obtenidas exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *                     activeUsers:
 *                       type: integer
 *                       example: 142
 *                     inactiveUsers:
 *                       type: integer
 *                       example: 8
 *                     usersByRole:
 *                       type: object
 *                       properties:
 *                         ADMINISTRADOR:
 *                           type: integer
 *                           example: 3
 *                         COORDINADOR:
 *                           type: integer
 *                           example: 15
 *                         COLABORADOR:
 *                           type: integer
 *                           example: 132
 *                     usersByArea:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           areaName:
 *                             type: string
 *                             example: Desarrollo
 *                           userCount:
 *                             type: integer
 *                             example: 25
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
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
