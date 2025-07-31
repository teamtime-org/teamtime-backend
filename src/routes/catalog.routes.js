const express = require('express');
const catalogController = require('../controllers/catalog.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @swagger
 * /api/catalogs/sales-managements:
 *   get:
 *     summary: Obtener gerencias de venta
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de gerencias de venta
 */
router.get('/sales-managements', catalogController.getSalesManagements);

/**
 * @swagger
 * /api/catalogs/mentors:
 *   get:
 *     summary: Obtener lista de mentores
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mentores disponibles
 */
router.get('/mentors', catalogController.getMentors);

/**
 * @swagger
 * /api/catalogs/coordinators:
 *   get:
 *     summary: Obtener lista de coordinadores
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de coordinadores disponibles
 */
router.get('/coordinators', catalogController.getCoordinators);

/**
 * @swagger
 * /api/catalogs/sales-executives:
 *   get:
 *     summary: Obtener lista de ejecutivos de venta
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ejecutivos de venta
 */
router.get('/sales-executives', catalogController.getSalesExecutives);

/**
 * @swagger
 * /api/catalogs/designers:
 *   get:
 *     summary: Obtener lista de diseñadores
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de diseñadores disponibles
 */
router.get('/designers', catalogController.getDesigners);

/**
 * @swagger
 * /api/catalogs/project-types:
 *   get:
 *     summary: Obtener tipos de proyecto
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de proyecto únicos
 */
router.get('/project-types', catalogController.getProjectTypes);

/**
 * @swagger
 * /api/catalogs/filter-stats:
 *   get:
 *     summary: Obtener estadísticas de filtros
 *     tags: [Catalogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas sobre los datos de filtrado
 */
router.get('/filter-stats', catalogController.getFilterStats);

module.exports = router;
