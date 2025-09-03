-- Script para inicializar configuraciones de restricción de fechas en timesheet
-- Se ejecuta solo si no existen las configuraciones

-- Insertar configuración para habilitar restricciones de fecha
INSERT INTO system_configs (id, key, value, description, created_by, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'TIME_ENTRY_DATE_RESTRICTIONS_ENABLED',
    'true',
    'Habilitar restricciones de fecha para registro de tiempo',
    (SELECT id FROM users WHERE role = 'ADMINISTRADOR' LIMIT 1),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs WHERE key = 'TIME_ENTRY_DATE_RESTRICTIONS_ENABLED'
);

-- Insertar configuración para días pasados permitidos
INSERT INTO system_configs (id, key, value, description, created_by, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'TIME_ENTRY_PAST_DAYS',
    '30',
    'Número de días en el pasado permitidos para registro de tiempo',
    (SELECT id FROM users WHERE role = 'ADMINISTRADOR' LIMIT 1),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs WHERE key = 'TIME_ENTRY_PAST_DAYS'
);

-- Insertar configuración para días futuros permitidos (si no existe)
INSERT INTO system_configs (id, key, value, description, created_by, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'TIME_ENTRY_FUTURE_DAYS',
    '7',
    'Número de días en el futuro permitidos para registro de tiempo',
    (SELECT id FROM users WHERE role = 'ADMINISTRADOR' LIMIT 1),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs WHERE key = 'TIME_ENTRY_FUTURE_DAYS'
);

-- Mostrar las configuraciones insertadas
SELECT key, value, description, created_at 
FROM system_configs 
WHERE key IN (
    'TIME_ENTRY_DATE_RESTRICTIONS_ENABLED',
    'TIME_ENTRY_PAST_DAYS', 
    'TIME_ENTRY_FUTURE_DAYS'
)
ORDER BY key;