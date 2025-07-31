const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Servicio para migración de proyectos Excel a proyectos normales
 */
class ExcelProjectMigrationService {

    /**
     * Migrar proyectos Excel a proyectos normales
     * @param {Object} requestingUser - Usuario que realiza la migración
     * @returns {Promise<Object>}
     */
    async migrateExcelProjectsToProjects(requestingUser) {
        try {
            logger.info('Iniciando migración de proyectos Excel a proyectos normales...');

            // Obtener todos los proyectos Excel activos
            const excelProjects = await prisma.excelProject.findMany({
                where: { isActive: true },
                include: {
                    area: true,
                    mentor: true,
                    coordinator: true,
                    salesExecutive: true,
                    designer: true
                }
            });

            if (excelProjects.length === 0) {
                return {
                    success: true,
                    message: 'No hay proyectos Excel para migrar',
                    migrated: 0,
                    errors: 0
                };
            }

            logger.info(`Encontrados ${excelProjects.length} proyectos Excel para migrar`);

            const results = {
                migrated: 0,
                errors: 0,
                errorDetails: []
            };

            // Migrar cada proyecto en una transacción
            for (const excelProject of excelProjects) {
                try {
                    await prisma.$transaction(async (tx) => {
                        // Verificar si ya existe un proyecto con el mismo ExcelId
                        const existingProject = await tx.project.findFirst({
                            where: {
                                OR: [
                                    { name: excelProject.title },
                                    // Podríamos agregar un campo excelId a Project si queremos tracking
                                ]
                            }
                        });

                        if (existingProject) {
                            logger.warn(`Proyecto ya existe: ${excelProject.title} - saltando`);
                            return;
                        }

                        // Crear el proyecto normal basado en el Excel
                        const newProject = await tx.project.create({
                            data: {
                                name: excelProject.title,
                                description: this.buildDescription(excelProject),
                                areaId: excelProject.areaId,
                                status: this.mapStatus(excelProject.generalStatus),
                                priority: this.mapPriority(excelProject.risk),
                                startDate: excelProject.assignmentDate,
                                endDate: excelProject.estimatedEndDate || excelProject.actualEndDate,
                                estimatedHours: this.calculateEstimatedHours(excelProject),
                                createdBy: requestingUser.userId,
                                isActive: true
                            }
                        });

                        // Asignar usuarios al proyecto
                        const assignments = [];

                        if (excelProject.mentorId) {
                            assignments.push({
                                projectId: newProject.id,
                                userId: excelProject.mentorId,
                                assignedById: requestingUser.userId
                            });
                        }

                        if (excelProject.coordinatorId) {
                            assignments.push({
                                projectId: newProject.id,
                                userId: excelProject.coordinatorId,
                                assignedById: requestingUser.userId
                            });
                        }

                        if (excelProject.salesExecutiveId) {
                            assignments.push({
                                projectId: newProject.id,
                                userId: excelProject.salesExecutiveId,
                                assignedById: requestingUser.userId
                            });
                        }

                        if (excelProject.designerId) {
                            assignments.push({
                                projectId: newProject.id,
                                userId: excelProject.designerId,
                                assignedById: requestingUser.userId
                            });
                        }

                        // Crear asignaciones
                        if (assignments.length > 0) {
                            await tx.projectAssignment.createMany({
                                data: assignments,
                                skipDuplicates: true
                            });
                        }

                        // Marcar el proyecto Excel como migrado (desactivar)
                        await tx.excelProject.update({
                            where: { id: excelProject.id },
                            data: {
                                isActive: false,
                                updatedAt: new Date()
                            }
                        });

                        logger.info(`Migrado: ${excelProject.title} -> ${newProject.id}`);
                        results.migrated++;
                    });
                } catch (error) {
                    logger.error(`Error migrando proyecto ${excelProject.title}:`, error);
                    results.errors++;
                    results.errorDetails.push({
                        projectTitle: excelProject.title,
                        error: error.message
                    });
                }
            }

            logger.info(`Migración completada: ${results.migrated} exitosos, ${results.errors} errores`);

            return {
                success: true,
                message: `Migración completada: ${results.migrated}/${excelProjects.length} proyectos migrados`,
                migrated: results.migrated,
                errors: results.errors,
                errorDetails: results.errorDetails
            };

        } catch (error) {
            logger.error('Error en migración de proyectos Excel:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de migración
     * @returns {Promise<Object>}
     */
    async getMigrationStats() {
        try {
            const [activeExcelProjects, totalProjects] = await Promise.all([
                prisma.excelProject.count({ where: { isActive: true } }),
                prisma.project.count({ where: { isActive: true } })
            ]);

            return {
                activeExcelProjects,
                totalProjects,
                pendingMigration: activeExcelProjects,
                migrationNeeded: activeExcelProjects > 0
            };
        } catch (error) {
            logger.error('Error obteniendo estadísticas de migración:', error);
            throw error;
        }
    }

    /**
     * Construir descripción del proyecto basada en datos Excel
     * @param {Object} excelProject 
     * @returns {string}
     */
    buildDescription(excelProject) {
        const parts = [];

        if (excelProject.serviceDescription) {
            parts.push(excelProject.serviceDescription);
        }

        if (excelProject.nextSteps) {
            parts.push(`\n\nPróximos pasos: ${excelProject.nextSteps}`);
        }

        if (excelProject.projectStage) {
            parts.push(`\nEtapa: ${excelProject.projectStage}`);
        }

        if (excelProject.projectType) {
            parts.push(`\nTipo: ${excelProject.projectType}`);
        }

        // Agregar información financiera si existe
        if (excelProject.totalContractAmountMXN) {
            parts.push(`\nMonto del contrato: $${excelProject.totalContractAmountMXN.toNumber().toLocaleString()} MXN`);
        }

        if (excelProject.monthlyBillingMXN) {
            parts.push(`\nFacturación mensual: $${excelProject.monthlyBillingMXN.toNumber().toLocaleString()} MXN`);
        }

        return parts.join('') || 'Proyecto importado desde Excel';
    }

    /**
     * Mapear estado del proyecto Excel a estado normal
     * @param {string} generalStatus 
     * @returns {string}
     */
    mapStatus(generalStatus) {
        if (!generalStatus) return 'ACTIVE';

        const status = generalStatus.toLowerCase();

        if (status.includes('completado') || status.includes('terminado') || status.includes('finalizado')) {
            return 'COMPLETED';
        }

        if (status.includes('cancelado') || status.includes('suspendido')) {
            return 'CANCELLED';
        }

        if (status.includes('pausa') || status.includes('hold')) {
            return 'ON_HOLD';
        }

        return 'ACTIVE';
    }

    /**
     * Mapear riesgo a prioridad
     * @param {string} risk 
     * @returns {string}
     */
    mapPriority(risk) {
        if (!risk) return 'MEDIUM';

        switch (risk) {
            case 'LOW': return 'LOW';
            case 'MEDIUM': return 'MEDIUM';
            case 'HIGH': return 'HIGH';
            default: return 'MEDIUM';
        }
    }

    /**
     * Calcular horas estimadas basado en datos Excel
     * @param {Object} excelProject 
     * @returns {number}
     */
    calculateEstimatedHours(excelProject) {
        // Si hay periodo de contrato en meses, hacer una estimación
        if (excelProject.contractPeriodMonths) {
            const months = excelProject.contractPeriodMonths.toNumber();
            // Estimación: 160 horas por mes (4 semanas * 40 horas)
            return Math.round(months * 160);
        }

        // Si hay fechas, calcular diferencia y estimar
        if (excelProject.assignmentDate && excelProject.estimatedEndDate) {
            const start = new Date(excelProject.assignmentDate);
            const end = new Date(excelProject.estimatedEndDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const workingDays = Math.round(diffDays * 0.7); // Asumiendo 70% días laborables
            return Math.round(workingDays * 8); // 8 horas por día
        }

        // Valor por defecto
        return 40;
    }
}

module.exports = ExcelProjectMigrationService;
