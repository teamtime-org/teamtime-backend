/**
 * Utilidades para manejo de fechas y períodos quincenales
 */

/**
 * Obtiene el período quincenal para una fecha dada
 * @param {Date} date - Fecha a evaluar
 * @returns {Object} Información del período
 */
function getTimePeriodForDate(date) {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // JavaScript months are 0-based
    const day = targetDate.getDate();

    // Determinar si es primera (1-15) o segunda quincena (16-fin de mes)
    const periodNumber = day <= 15 ? 1 : 2;

    // Calcular fechas de inicio y fin del período
    let startDate, endDate;

    if (periodNumber === 1) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month - 1, 15);
    } else {
        const lastDay = new Date(year, month, 0).getDate(); // Último día del mes
        startDate = new Date(year, month - 1, 16);
        endDate = new Date(year, month - 1, lastDay);
    }

    return {
        year,
        month,
        periodNumber,
        startDate,
        endDate,
    };
}

/**
 * Genera todos los períodos quincenales para un año
 * @param {number} year - Año para generar períodos
 * @returns {Array} Array de períodos
 */
function generateTimePeriodsForYear(year) {
    const periods = [];

    for (let month = 1; month <= 12; month++) {
        // Primera quincena
        periods.push({
            year,
            month,
            periodNumber: 1,
            startDate: new Date(year, month - 1, 1),
            endDate: new Date(year, month - 1, 15),
        });

        // Segunda quincena
        const lastDay = new Date(year, month, 0).getDate();
        periods.push({
            year,
            month,
            periodNumber: 2,
            startDate: new Date(year, month - 1, 16),
            endDate: new Date(year, month - 1, lastDay),
        });
    }

    return periods;
}

/**
 * Valida si una fecha está dentro de un período específico
 * @param {Date} date - Fecha a validar
 * @param {Object} period - Período con startDate y endDate
 * @returns {boolean} True si la fecha está en el período
 */
function isDateInPeriod(date, period) {
    const targetDate = new Date(date);
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    // Normalizar las fechas para comparar solo día/mes/año
    targetDate.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return targetDate >= start && targetDate <= end;
}

/**
 * Obtiene el período actual
 * @returns {Object} Información del período actual
 */
function getCurrentTimePeriod() {
    return getTimePeriodForDate(new Date());
}

/**
 * Formatea una fecha a string ISO (YYYY-MM-DD)
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDateToISO(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Parsea una fecha string a objeto Date
 * @param {string} dateString - String de fecha en formato ISO
 * @returns {Date} Objeto Date
 */
function parseISODate(dateString) {
    return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Valida si una fecha es válida
 * @param {*} date - Valor a validar
 * @returns {boolean} True si es una fecha válida
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Obtiene el primer día del mes para una fecha
 * @param {Date} date - Fecha de referencia
 * @returns {Date} Primer día del mes
 */
function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Obtiene el último día del mes para una fecha
 * @param {Date} date - Fecha de referencia
 * @returns {Date} Último día del mes
 */
function getLastDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {number} Número de días
 */
function getDaysDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una fecha es fin de semana
 * @param {Date} date - Fecha a verificar
 * @returns {boolean} True si es fin de semana
 */
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo = 0, Sábado = 6
}

/**
 * Obtiene todos los días laborales entre dos fechas
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Array} Array de fechas laborales
 */
function getWorkDaysBetween(startDate, endDate) {
    const workDays = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        if (!isWeekend(current)) {
            workDays.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return workDays;
}

module.exports = {
    getTimePeriodForDate,
    generateTimePeriodsForYear,
    isDateInPeriod,
    getCurrentTimePeriod,
    formatDateToISO,
    parseISODate,
    isValidDate,
    getFirstDayOfMonth,
    getLastDayOfMonth,
    getDaysDifference,
    isWeekend,
    getWorkDaysBetween,
};
