-- Script para corregir proyectos generales existentes
-- Marcar como isGeneral = true todos los proyectos que tienen el patrón de nombre de proyecto general

UPDATE projects 
SET is_general = true 
WHERE 
    (name LIKE 'Actividades generales del área:%' OR name LIKE 'Actividades generales del área %')
    AND is_general = false
    AND is_active = true;

-- Verificar los cambios
SELECT 
    id,
    name,
    area_id,
    is_general,
    created_at
FROM projects 
WHERE 
    (name LIKE 'Actividades generales del área:%' OR name LIKE 'Actividades generales del área %')
    AND is_active = true
ORDER BY created_at;