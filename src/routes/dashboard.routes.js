const express = require('express');
const DashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();
const dashboardController = new DashboardController();

/**
 * @swagger
 * /dashboard/collaborator:
 *   get:
 *     summary: Obtener dashboard del colaborador
 *     description: Obtiene datos consolidados del dashboard para un colaborador en un período específico
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-09-15"
 *         description: Fecha de inicio del período (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-09-21"
 *         description: Fecha de fin del período (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Dashboard generado exitosamente
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
 *                   example: "Dashboard del colaborador generado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           example: "2025-09-15"
 *                         endDate:
 *                           type: string
 *                           example: "2025-09-21"
 *                         workDays:
 *                           type: number
 *                           example: 5
 *                         description:
 *                           type: string
 *                           example: "15/9/2025 - 21/9/2025"
 *                     kpis:
 *                       type: object
 *                       properties:
 *                         assignedProjects:
 *                           type: number
 *                           example: 3
 *                         generalProjects:
 *                           type: number
 *                           example: 1
 *                         specificProjects:
 *                           type: number
 *                           example: 2
 *                         capturedHours:
 *                           type: number
 *                           example: 47.0
 *                         referenceHours:
 *                           type: number
 *                           example: 45
 *                         workload:
 *                           type: number
 *                           example: 104
 *                     projects:
 *                       type: object
 *                       properties:
 *                         distribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               isGeneral:
 *                                 type: boolean
 *                               hours:
 *                                 type: number
 *                               entries:
 *                                 type: number
 *                     timeAnalysis:
 *                       type: object
 *                       properties:
 *                         totalEntries:
 *                           type: number
 *                         weeklyDistribution:
 *                           type: object
 *                         hoursComparison:
 *                           type: object
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "startDate y endDate son requeridos"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/collaborator', authenticateToken, dashboardController.getCollaboratorDashboard);

module.exports = router;