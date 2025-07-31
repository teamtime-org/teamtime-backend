const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Generar archivo Excel de prueba con datos válidos e inválidos
 * para probar la funcionalidad de manejo de errores
 */
async function generateTestExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Proyectos');

    // Headers (exactamente como los espera el sistema)
    const headers = [
        'ID',
        'Title',
        'Descripcion Servicio',
        'Estatus General',
        'Proximos Pasos',
        'Mentor',
        'Fecha Asignacion',
        'Etapa de Proyecto',
        'Riesgo',
        'Tipo de Proyecto',
        'Tabla Resumen',
        'Coordinador',
        'Linea de Negocios',
        'Tipo de Oportunidad',
        '¿Proyecto Estrategico?',
        'Tipo de Riesgo',
        'Fecha Termino Estimada',
        'Actualizacion Fecha Termino Estimada',
        'Fecha de Termino Real',
        'Control Presupuestal',
        'Monto Total del Contrato MXN',
        'Ingreso',
        'Periodo Contratacion (Meses)',
        'Facturacion Mensual MXN',
        'Penalizacion',
        'Proveedores Involucrados',
        'Fecha Fallo/Adjudicacion',
        'Fecha Transferencia Diseño',
        'Fecha de entrega por Licitacion',
        'Segmento',
        'Gerencia de Ventas',
        'Ejecutivo Ventas',
        'Diseñador',
        'Orden de Siebel/Numero de Proceso',
        'Orden en Progreso',
        'Ordenes Relacionadas (Siebel)',
        '¿Aplica Control de Cambios?',
        'Justificación',
        'SharePoint Documentacion',
        'Respositorio Estratel'
    ];

    worksheet.addRow(headers);

    // Datos de prueba: algunos válidos, otros con errores intencionados
    const testData = [
        // Fila 2 - Datos válidos
        [
            1,
            'Proyecto Sistema CRM',
            'Implementación de sistema CRM para área comercial',
            'En Progreso',
            'Configurar módulo de reportes',
            'Juan Pérez;#123',
            '2024-01-15',
            'Desarrollo',
            'Medio',
            'Tecnología',
            'Resumen proyecto CRM',
            'María García;#456',
            'Tecnología',
            'Interna',
            'Si',
            'Tecnológico, Operacional',
            '2024-06-30',
            '2024-07-15',
            null,
            'Activo',
            250000.50,
            200000.00,
            6.5,
            41666.67,
            'Ninguna',
            'Proveedor A, Proveedor B',
            '2024-01-10',
            '2024-02-01',
            '2024-07-30',
            'Empresarial',
            'Ventas Norte',
            'Carlos López;#789',
            'Ana Martínez;#101',
            'SIE-2024-001',
            'Si',
            'SIE-2024-002, SIE-2024-003',
            'Si',
            'Proyecto estratégico para modernización',
            'https://sharepoint.empresa.com/crm',
            'https://estratel.empresa.com/crm'
        ],
        // Fila 3 - Sin título (error)
        [
            2,
            '', // Título vacío - ERROR
            'Proyecto sin título',
            'Iniciado',
            'Definir alcance',
            'Pedro Rodríguez;#234',
            '2024-02-01',
            'Planeación',
            'Alto',
            'Consultoría',
            'Proyecto consultoría',
            'Laura Sánchez;#567',
            'Consultoría',
            'Externa',
            'No',
            'Financiero',
            '2024-08-30',
            null,
            null,
            'Activo',
            150000.00,
            120000.00,
            4.0,
            37500.00,
            'Multa por retraso',
            'Consultor Externo',
            '2024-01-25',
            '2024-02-15',
            '2024-09-15',
            'Gobierno',
            'Ventas Sur',
            'Roberto Kim;#890',
            'Sofia Vega;#112',
            'SIE-2024-004',
            'No',
            null,
            'No',
            'Consultoría especializada',
            'https://sharepoint.empresa.com/consultoria',
            null
        ],
        // Fila 4 - ID inválido (texto en lugar de número)
        [
            'ABC', // ID inválido - ERROR
            'Proyecto Mobile App',
            'Desarrollo de aplicación móvil',
            'En Progreso',
            'Completar pruebas unitarias',
            'Miguel Torres;#345',
            '2024-03-01',
            'Testing',
            'Bajo',
            'Mobile',
            'App móvil corporativa',
            'Carmen Ruiz;#678',
            'Mobile',
            'Interna',
            'Si',
            'Operacional',
            '2024-09-30',
            '2024-10-15',
            null,
            'Activo',
            180000.75,
            150000.00,
            8.0,
            22500.00,
            'Sin penalizaciones',
            'Dev Studio, QA Team',
            '2024-02-20',
            '2024-03-10',
            '2024-10-30',
            'Retail',
            'Ventas Digital',
            'Elena Castro;#901',
            'David Morales;#113',
            'SIE-2024-005',
            'Si',
            'SIE-2024-006',
            'Si',
            'Modernización canal digital',
            'https://sharepoint.empresa.com/mobile',
            'https://estratel.empresa.com/mobile'
        ],
        // Fila 5 - Fecha inválida
        [
            4,
            'Proyecto Data Analytics',
            'Implementación de plataforma de analytics',
            'Iniciado',
            'Configurar dashboard inicial',
            'Ricardo Mendoza;#456',
            'fecha-invalida', // Fecha inválida - ERROR
            'Análisis',
            'Medio',
            'Data Science',
            'Plataforma analytics',
            'Patricia López;#789',
            'Analytics',
            'Interna',
            'Si',
            'Tecnológico',
            '2024-11-30',
            null,
            null,
            'Activo',
            320000.00,
            280000.00,
            10.0,
            32000.00,
            'Ninguna',
            'Data Provider Inc',
            '2024-03-15',
            '2024-04-01',
            '2024-12-15',
            'Financiero',
            'Ventas Analytics',
            'Jorge Herrera;#012',
            'Lucía Fernández;#114',
            'SIE-2024-007',
            'Si',
            null,
            'Si',
            'Proyecto de inteligencia de negocios',
            'https://sharepoint.empresa.com/analytics',
            'https://estratel.empresa.com/analytics'
        ],
        // Fila 6 - Datos válidos
        [
            5,
            'Proyecto ERP Integration',
            'Integración con sistema ERP existente',
            'Planeado',
            'Definir interfaces de conexión',
            'Andrés Villa;#567',
            '2024-04-01',
            'Diseño',
            'Alto',
            'Integración',
            'Integración ERP',
            'Mónica Guerrero;#890',
            'ERP',
            'Externa',
            'No',
            'Tecnológico, Operacional',
            '2024-12-30',
            null,
            null,
            'Planificado',
            500000.00,
            450000.00,
            12.0,
            41666.67,
            'Penalización por demora',
            'ERP Solutions Ltd',
            '2024-03-25',
            '2024-04-15',
            '2025-01-15',
            'Manufactura',
            'Ventas Enterprise',
            'Gabriel Rojas;#123',
            'Valentina Cruz;#115',
            'SIE-2024-008',
            'No',
            'SIE-2024-009, SIE-2024-010',
            'Si',
            'Integración crítica con sistema legado',
            'https://sharepoint.empresa.com/erp',
            'https://estratel.empresa.com/erp'
        ],
        // Fila 7 - Usuario mentor vacío (warning)
        [
            6,
            'Proyecto Security Audit',
            'Auditoría de seguridad completa',
            'En Progreso',
            'Revisar vulnerabilidades críticas',
            '', // Mentor vacío - WARNING
            '2024-04-15',
            'Auditoría',
            'Alto',
            'Seguridad',
            'Auditoría seguridad',
            'Fernando Jiménez;#901',
            'Seguridad',
            'Externa',
            'Si',
            'Seguridad',
            '2024-08-31',
            null,
            null,
            'Activo',
            95000.00,
            85000.00,
            3.0,
            31666.67,
            'Sin penalizaciones',
            'Security Experts Corp',
            '2024-04-01',
            '2024-04-20',
            '2024-09-15',
            'Seguridad',
            'Ventas Seguridad',
            'Isabella Torres;#234',
            'Sebastián Vargas;#116',
            'SIE-2024-011',
            'Si',
            null,
            'Si',
            'Auditoría mandatoria anual',
            'https://sharepoint.empresa.com/security',
            'https://estratel.empresa.com/security'
        ]
    ];

    // Agregar datos de prueba
    testData.forEach(row => {
        worksheet.addRow(row);
    });

    // Estilizar headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6D7A8' }
    };

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    // Guardar archivo
    const fileName = 'test-excel-con-errores.xlsx';
    const filePath = path.join(__dirname, '..', fileName);

    await workbook.xlsx.writeFile(filePath);

    console.log(`✅ Archivo de prueba generado: ${filePath}`);
    console.log(`
📊 DATOS DE PRUEBA INCLUIDOS:
- Fila 2: ✅ Datos completamente válidos
- Fila 3: ❌ Sin título (campo requerido)
- Fila 4: ❌ ID inválido (texto en lugar de número)
- Fila 5: ❌ Fecha de asignación inválida
- Fila 6: ✅ Datos válidos
- Fila 7: ⚠️  Mentor vacío (se generará warning)

🎯 RESULTADOS ESPERADOS:
- 3 proyectos creados exitosamente (filas 2, 6, 7)
- 3 errores reportados (filas 3, 4, 5)
- 1 warning generado (fila 7)
- Reporte de errores descargable con los datos fallidos
    `);

    return filePath;
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generateTestExcel().catch(console.error);
}

module.exports = { generateTestExcel };
