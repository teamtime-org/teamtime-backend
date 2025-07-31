const ExcelProjectMigrationService = require('../services/excelProjectMigration.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Controlador para migración de proyectos Excel
 */
class ExcelProjectMigrationController {
    constructor() {
        this.migrationService = new ExcelProjectMigrationService();
    }

    /**
     * Migrar proyectos Excel a proyectos normales
     */
    migrateExcelProjects = async (req, res) => {
        try {
            const result = await this.migrationService.migrateExcelProjectsToProjects(req.user);

            logger.info(`Migración de proyectos Excel completada por ${req.user.email}: ${result.migrated} migrados, ${result.errors} errores`);

            return ApiResponse.success(res, result, result.message);
        } catch (error) {
            logger.error('Error en migración de proyectos Excel:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Obtener estadísticas de migración
     */
    getMigrationStats = async (req, res) => {
        try {
            const stats = await this.migrationService.getMigrationStats();

            return ApiResponse.success(res, stats, 'Estadísticas de migración obtenidas exitosamente');
        } catch (error) {
            logger.error('Error obteniendo estadísticas de migración:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };
}

module.exports = new ExcelProjectMigrationController();
