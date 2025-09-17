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
 *     StagingImportResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             imported:
 *               type: integer
 *             errors:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   row:
 *                     type: integer
 *                   errors:
 *                     type: array
 *                   data:
 *                     type: object
 *             stagingProjects:
 *               type: array
 *             importLogId:
 *               type: string
 */

/**
 * @swagger
 * /api/excel-import/staging:
 *   post:
 *     summary: Importar proyectos desde Excel a área de staging
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
 *               sourceAreaId:
 *                 type: string
 *                 description: ID del área de origen
 *     responses:
 *       200:
 *         description: Importación a staging completada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StagingImportResult'
 *       400:
 *         description: Error de validación o archivo inválido
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/staging',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => excelImportController.importToStaging(req, res)
);

/**
 * @swagger
 * /api/excel-import/validate:
 *   post:
 *     summary: Validar estructura de archivo Excel antes de importar
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
 *                 description: Archivo Excel a validar
 *               sourceAreaId:
 *                 type: string
 *                 description: ID del área para validar campos
 *     responses:
 *       200:
 *         description: Resultado de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     headers:
 *                       type: array
 *                     expectedHeaders:
 *                       type: array
 *                     missingRequired:
 *                       type: array
 *                     extraHeaders:
 *                       type: array
 *                     rowCount:
 *                       type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 */
router.post('/validate',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => excelImportController.validateExcelStructure(req, res)
);

/**
 * @swagger
 * /api/excel-import/preview:
 *   post:
 *     summary: Previsualizar datos del archivo Excel antes de importar
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
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel a previsualizar
 *               sourceAreaId:
 *                 type: string
 *                 description: ID del área para mapear campos
 *               maxRows:
 *                 type: integer
 *                 description: Número máximo de filas a mostrar (default 10)
 *     responses:
 *       200:
 *         description: Previsualización de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     previewRows:
 *                       type: array
 *                     totalRows:
 *                       type: integer
 *                     mappedFields:
 *                       type: integer
 *                     mappingResults:
 *                       type: object
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 */
router.post('/preview',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => excelImportController.previewExcelData(req, res)
);

/**
 * @swagger
 * /api/excel-import/template/{sourceAreaId}:
 *   get:
 *     summary: Generar plantilla de Excel dinámica basada en configuración del área
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área para generar plantilla específica
 *     responses:
 *       200:
 *         description: Plantilla de Excel generada
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Área no especificada
 *       404:
 *         description: No hay configuración de campos para el área
 *       401:
 *         description: No autorizado
 */
router.get('/template/:sourceAreaId',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDINADOR]),
    (req, res) => excelImportController.generateTemplate(req, res)
);

/**
 * @swagger
 * /api/excel-import/logs:
 *   get:
 *     summary: Obtener historial de importaciones
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceAreaId
 *         schema:
 *           type: string
 *         description: Filtrar por área específica
 *     responses:
 *       200:
 *         description: Historial de importaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       importDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [PROCESSING, COMPLETED, FAILED]
 *                       totalRows:
 *                         type: integer
 *                       processedRows:
 *                         type: integer
 *                       errorRows:
 *                         type: integer
 *       401:
 *         description: No autorizado
 */
router.get('/logs',
    authenticateToken,
    (req, res) => excelImportController.getImportLogs(req, res)
);

/**
 * @swagger
 * /api/excel-import/statistics:
 *   get:
 *     summary: Obtener estadísticas de importaciones
 *     tags: [Excel Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceAreaId
 *         schema:
 *           type: string
 *         description: Filtrar por área específica
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para filtrar
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para filtrar
 *     responses:
 *       200:
 *         description: Estadísticas de importaciones
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
 *                     totalImports:
 *                       type: integer
 *                     successfulImports:
 *                       type: integer
 *                     failedImports:
 *                       type: integer
 *                     totalRowsProcessed:
 *                       type: integer
 *                     totalRowsWithErrors:
 *                       type: integer
 *                     averageSuccessRate:
 *                       type: integer
 *       401:
 *         description: No autorizado
 */
router.get('/statistics',
    authenticateToken,
    (req, res) => excelImportController.getImportStatistics(req, res)
);

module.exports = router;