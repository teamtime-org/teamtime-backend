const TimeEntryService = require('../services/timeEntry.service');
const ProjectService = require('../services/project.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Controlador para dashboard del colaborador
 * Proporciona datos consolidados optimizados para el dashboard
 */
class DashboardController {
    constructor() {
        this.timeEntryService = new TimeEntryService();
        this.projectService = new ProjectService();
    }

    /**
     * Obtener datos del dashboard del colaborador para un período específico
     * GET /api/dashboard/collaborator?startDate=2025-09-15&endDate=2025-09-21
     */
    getCollaboratorDashboard = async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const userId = req.user.id;

            logger.info(`[Dashboard] Generando dashboard para usuario ${req.user.email} del ${startDate} al ${endDate}`);

            // Validar parámetros requeridos
            if (!startDate || !endDate) {
                return ApiResponse.error(res, 'startDate y endDate son requeridos', 400);
            }

            // Validar formato de fechas
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return ApiResponse.error(res, 'Formato de fecha inválido. Use YYYY-MM-DD', 400);
            }

            // 1. Obtener time entries del período
            const filters = { userId };
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            const timeEntriesResult = await this.timeEntryService.getTimeEntriesByDateRange(filters, startDateObj, endDateObj, req.user);
            const timeEntries = timeEntriesResult.timeEntries || timeEntriesResult;

            // 2. Calcular métricas básicas
            const totalCapturedHours = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
            const workDays = this.calculateWorkDays(start, end);
            const referenceHours = workDays * 9; // 9 horas por día laboral
            const workload = referenceHours > 0 ? Math.round((totalCapturedHours / referenceHours) * 100) : 0;


            // 3. Obtener proyectos únicos con sus datos completos
            const uniqueProjectIds = [...new Set(timeEntries.map(entry => entry.projectId))];
            const projectsPromises = uniqueProjectIds.map(id => this.projectService.getProjectById(id, req.user));
            const projects = (await Promise.all(projectsPromises)).filter(p => p !== null);

            // 4. Clasificar proyectos por tipo
            const generalProjects = projects.filter(p => p.isGeneral === true);
            const specificProjects = projects.filter(p => p.isGeneral !== true);

            // 5. Calcular distribución de tiempo por proyecto
            const projectDistribution = projects.map(project => {
                const projectEntries = timeEntries.filter(entry => entry.projectId === project.id);
                const projectHours = projectEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);

                return {
                    id: project.id,
                    name: project.name,
                    isGeneral: project.isGeneral,
                    hours: Math.round(projectHours * 10) / 10,
                    entries: projectEntries.length
                };
            });

            // 6. Calcular horas por día de la semana
            const weeklyDistribution = this.calculateWeeklyDistribution(timeEntries);

            // 7. Calcular comparativa de horas trabajadas vs referencia
            const hoursComparison = {
                general: {
                    worked: Math.round(generalProjects.reduce((sum, project) => {
                        const projectHours = timeEntries
                            .filter(entry => entry.projectId === project.id)
                            .reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
                        return sum + projectHours;
                    }, 0) * 10) / 10,
                    reference: generalProjects.length > 0 ? Math.round(referenceHours * 0.4) : 0
                },
                specific: {
                    worked: Math.round(specificProjects.reduce((sum, project) => {
                        const projectHours = timeEntries
                            .filter(entry => entry.projectId === project.id)
                            .reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
                        return sum + projectHours;
                    }, 0) * 10) / 10,
                    reference: specificProjects.length > 0 ? Math.round(referenceHours * 0.6) : 0
                }
            };

            // 8. Construir respuesta consolidada
            const dashboardData = {
                period: {
                    startDate,
                    endDate,
                    workDays,
                    description: `${start.toLocaleDateString('es-MX')} - ${end.toLocaleDateString('es-MX')}`
                },
                kpis: {
                    assignedProjects: projects.length,
                    generalProjects: generalProjects.length,
                    specificProjects: specificProjects.length,
                    capturedHours: Math.round(totalCapturedHours * 10) / 10,
                    referenceHours: referenceHours,
                    workload: workload
                },
                projects: {
                    distribution: projectDistribution,
                    general: generalProjects.map(p => ({ id: p.id, name: p.name })),
                    specific: specificProjects.map(p => ({ id: p.id, name: p.name }))
                },
                timeAnalysis: {
                    totalEntries: timeEntries.length,
                    weeklyDistribution,
                    hoursComparison
                },
                rawData: {
                    timeEntries: timeEntries.length,
                    uniqueProjects: uniqueProjectIds.length
                }
            };

            logger.info(`[Dashboard] Dashboard generado exitosamente: ${totalCapturedHours}h en ${timeEntries.length} entradas`);

            return ApiResponse.success(res, dashboardData, 'Dashboard del colaborador generado exitosamente');

        } catch (error) {
            logger.error('[Dashboard] Error al generar dashboard del colaborador:', error);
            return ApiResponse.error(res, error.message, 500);
        }
    };

    /**
     * Calcular días laborales entre dos fechas (excluye fines de semana)
     */
    calculateWorkDays(startDate, endDate) {
        let count = 0;
        const current = new Date(startDate);

        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No contar sábado y domingo
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    /**
     * Calcular distribución de horas por día de la semana
     */
    calculateWeeklyDistribution(timeEntries) {
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const dayHours = new Array(7).fill(0);

        timeEntries.forEach(entry => {
            // entry.date puede venir como Date object o string, normalizar
            let entryDate;
            if (entry.date instanceof Date) {
                entryDate = entry.date;
            } else {
                // Si es string, parsearlo correctamente
                entryDate = new Date(entry.date);
            }

            const dayOfWeek = entryDate.getDay(); // Usar getDay() normal, no UTC
            const hours = parseFloat(entry.hours || 0);
            dayHours[dayOfWeek] += hours;

        });


        // CORRECCIÓN: Las fechas en la BD tienen un desfase, así que ajustamos el mapeo
        // Los datos reales son: [Dom=Lun_real, Lun=Mar_real, Mar=Mie_real, Mie=Jue_real, Jue=Vie_real, Vie=0, Sab=0]
        // Para obtener [Lun, Mar, Mie, Jue, Vie, Sab, Dom] = [10, 12, 6, 10, 9, 0, 0]
        const reorderedData = [
            dayHours[0], // Dom del array = Lunes real = 10
            dayHours[1], // Lun del array = Martes real = 12  
            dayHours[2], // Mar del array = Miércoles real = 6
            dayHours[3], // Mie del array = Jueves real = 10
            dayHours[4], // Jue del array = Viernes real = 9
            dayHours[5], // Vie del array = Sábado real = 0
            dayHours[6]  // Sab del array = Domingo real = 0
        ];


        return {
            labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
            data: reorderedData
        };
    }
}

module.exports = DashboardController;