const express = require('express');

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const areaRoutes = require('./area.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const timeEntryRoutes = require('./timeEntry.routes');
const excelProjectMigrationRoutes = require('./excelProjectMigration.routes');
const excelImportRoutes = require('./excelImport.routes');
const catalogRoutes = require('./catalog.routes');
const systemConfigRoutes = require('./systemConfig.routes');

const router = express.Router();

/**
 * Main routes configuration
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del sistema
 *     description: Verifica el estado de salud del servicio API.
 *     tags: [Sistema]
 *     security: []
 *     responses:
 *       200:
 *         description: Servicio funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-04T10:30:00.000Z"
 *                 service:
 *                   type: string
 *                   example: TeamTime API
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'TeamTime API',
        version: '1.0.0'
    });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/areas', areaRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/excel-projects', excelProjectMigrationRoutes);
router.use('/excel-import', excelImportRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/system-config', systemConfigRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl
    });
});

module.exports = router;
