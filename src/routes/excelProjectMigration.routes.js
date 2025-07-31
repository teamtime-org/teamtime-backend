const express = require('express');
const excelProjectMigrationController = require('../controllers/excelProjectMigration.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

/**
 * @swagger
 * /excel-projects/migrate:
 *   post:
 *     summary: Migrar proyectos Excel a proyectos normales
 *     description: Convierte todos los proyectos importados desde Excel a proyectos normales del sistema.
 *     tags: [Migración Excel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Migración completada exitosamente
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
 *                   example: "Migración completada: 685/686 proyectos migrados"
 *                 data:
 *                   type: object
 *                   properties:
 *                     migrated:
 *                       type: integer
 *                       example: 685
 *                     errors:
 *                       type: integer
 *                       example: 1
 *                     errorDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectTitle:
 *                             type: string
 *                           error:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/migrate',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    excelProjectMigrationController.migrateExcelProjects
);

/**
 * @swagger
 * /excel-projects/migration-stats:
 *   get:
 *     summary: Obtener estadísticas de migración
 *     description: Retorna información sobre el estado de la migración de proyectos Excel.
 *     tags: [Migración Excel]
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
 *                   example: "Estadísticas de migración obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeExcelProjects:
 *                       type: integer
 *                       example: 686
 *                       description: "Proyectos Excel pendientes de migrar"
 *                     totalProjects:
 *                       type: integer
 *                       example: 4
 *                       description: "Total de proyectos normales en el sistema"
 *                     pendingMigration:
 *                       type: integer
 *                       example: 686
 *                     migrationNeeded:
 *                       type: boolean
 *                       example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/migration-stats',
    authenticateToken,
    requireRole([USER_ROLES.ADMINISTRADOR]),
    excelProjectMigrationController.getMigrationStats
);

module.exports = router;
