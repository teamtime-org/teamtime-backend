const express = require('express');
const ExcelImportController = require('../controllers/excelImport.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();
const excelImportController = new ExcelImportController();

/**
 * @swagger
 * components:
 *   schemas:
 *     ExcelImportResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             processed:
 *               type: integer
 *             errors:
 *               type: integer
 *             created:
 *               type: integer
 *             updated:
 *               type: integer
 *             errorDetails:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   row:
 *                     type: integer
 *                   data:
 *                     type: object
 *                   error:
 *                     type: string
 */

/**
 * @swagger
 * /api/excel-import/upload:
 *   post:
 *     summary: Importar proyectos desde archivo Excel
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               excelFile:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel con los proyectos a importar
 *     responses:
 *       200:
 *         description: Importación completada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExcelImportResult'
 *       400:
 *         description: Error de validación o archivo inválido
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       500:
 *         description: Error interno del servidor
 */
router.post('/upload',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => excelImportController.importProjects(req, res)
);

/**
 * @swagger
 * /api/excel-import/template:
 *   get:
 *     summary: Descargar plantilla de Excel para importación
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plantilla de Excel generada
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/template',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => excelImportController.downloadTemplate(req, res)
);

/**
 * @swagger
 * /api/excel-import/error-report:
 *   get:
 *     summary: Descargar reporte de errores de la última importación
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reporte de errores en formato Excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No hay reporte de errores disponible
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/error-report',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    (req, res) => excelImportController.downloadErrorReport(req, res)
);

/**
 * @swagger
 * /api/excel-import/projects:
 *   get:
 *     summary: Obtener proyectos importados desde Excel
 *     tags: [Excel Import]
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
 *         description: Elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Lista de proyectos importados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ExcelProject'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/projects',
    authenticateToken,
    (req, res) => excelImportController.getImportedProjects(req, res)
);

/**
 * @swagger
 * /api/excel-import/stats:
 *   get:
 *     summary: Obtener estadísticas de proyectos importados
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de proyectos importados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProjects:
 *                       type: integer
 *                     projectsByRisk:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     projectsByStage:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     projectsByBusinessLine:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats',
    authenticateToken,
    (req, res) => excelImportController.getImportStats(req, res)
);

module.exports = router;