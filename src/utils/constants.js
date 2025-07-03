/**
 * Constantes utilizadas en toda la aplicación
 */

// Roles de usuario
const USER_ROLES = {
    ADMINISTRADOR: 'ADMINISTRADOR',
    COORDINADOR: 'COORDINADOR',
    COLABORADOR: 'COLABORADOR',
};

// Estados de proyecto
const PROJECT_STATUS = {
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};

// Prioridades
const PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
};

// Estados de tarea
const TASK_STATUS = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    REVIEW: 'REVIEW',
    DONE: 'DONE',
};

// Límites de la aplicación
const LIMITS = {
    MAX_HOURS_PER_DAY: 24,
    MIN_HOURS_PER_ENTRY: 0.25, // 15 minutos
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_NAME_LENGTH: 200,
    PAGE_SIZE_DEFAULT: 10,
    PAGE_SIZE_MAX: 100,
};

// Mensajes de error comunes
const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Token de acceso requerido',
    FORBIDDEN: 'Permisos insuficientes para esta operación',
    INVALID_TOKEN: 'Token inválido o expirado',
    USER_NOT_FOUND: 'Usuario no encontrado',
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    EMAIL_ALREADY_EXISTS: 'El email ya está registrado',
    RESOURCE_NOT_FOUND: 'Recurso no encontrado',
    VALIDATION_ERROR: 'Error de validación en los datos enviados',
    INTERNAL_ERROR: 'Error interno del servidor',
    DUPLICATE_RESOURCE: 'El recurso ya existe',
    INVALID_DATE_RANGE: 'El rango de fechas es inválido',
    HOURS_EXCEED_LIMIT: `No se pueden registrar más de ${LIMITS.MAX_HOURS_PER_DAY} horas por día`,
    ALREADY_ASSIGNED: 'El usuario ya está asignado a este proyecto',
    NOT_ASSIGNED: 'El usuario no está asignado a este proyecto',
    PERIOD_NOT_ACTIVE: 'El período de tiempo no está activo para captura',
    CANNOT_MODIFY_APPROVED: 'No se puede modificar un registro ya aprobado',
};

// Mensajes de éxito
const SUCCESS_MESSAGES = {
    USER_CREATED: 'Usuario creado exitosamente',
    USER_UPDATED: 'Usuario actualizado exitosamente',
    LOGIN_SUCCESS: 'Autenticación exitosa',
    LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
    RESOURCE_CREATED: 'Recurso creado exitosamente',
    RESOURCE_UPDATED: 'Recurso actualizado exitosamente',
    RESOURCE_DELETED: 'Recurso eliminado exitosamente',
    ASSIGNMENT_CREATED: 'Asignación creada exitosamente',
    ASSIGNMENT_REMOVED: 'Asignación removida exitosamente',
    TIME_ENTRY_APPROVED: 'Registro de horas aprobado exitosamente',
    TIME_ENTRY_REJECTED: 'Registro de horas rechazado exitosamente',
};

// Configuración de paginación
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
};

// Configuración de fechas
const DATE_FORMATS = {
    ISO_DATE: 'YYYY-MM-DD',
    ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DISPLAY_DATE: 'DD/MM/YYYY',
    DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm',
};

module.exports = {
    USER_ROLES,
    PROJECT_STATUS,
    PRIORITY,
    TASK_STATUS,
    LIMITS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    PAGINATION,
    DATE_FORMATS,
};
