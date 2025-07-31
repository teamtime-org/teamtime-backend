const ExcelImportService = require('./src/services/excelImport.service');
const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testImport() {
    try {
        console.log('🚀 Iniciando prueba de importación...');
        
        // Buscar un área para asignar los proyectos
        const area = await prisma.area.findFirst();
        if (!area) {
            console.error('❌ No se encontró ningún área en la base de datos');
            process.exit(1);
        }
        
        console.log(`📁 Área encontrada: ${area.name} (${area.id})`);
        
        // Obtener un usuario válido de la base de datos
        const validUser = await prisma.user.findFirst({
            where: { role: 'ADMINISTRADOR' }
        });
        
        if (!validUser) {
            // Si no hay admin, usar cualquier usuario válido
            const anyUser = await prisma.user.findFirst();
            if (!anyUser) {
                throw new Error('No hay usuarios en la base de datos');
            }
            console.log(`⚠️ Usando usuario: ${anyUser.email} (${anyUser.role})`);
            var mockUser = anyUser;
        } else {
            console.log(`✅ Usuario administrador encontrado: ${validUser.email}`);
            var mockUser = validUser;
        }
        
        const excelImportService = new ExcelImportService();
        const filePath = '/Users/fsalinas/Downloads/Export_MSList_20250728-1.xlsx';
        
        console.log('📊 Probando importación incremental...');
        const incrementalResult = await excelImportService.importFromExcel(
            filePath, 
            mockUser, 
            area.id, 
            true // incremental
        );
        
        console.log('✅ Resultado de importación incremental:');
        console.log(`   - Éxitos: ${incrementalResult.success}`);
        console.log(`   - Errores: ${incrementalResult.errors.length}`);
        console.log(`   - Warnings: ${incrementalResult.warnings?.length || 0}`);
        console.log(`   - Creados: ${incrementalResult.created.length}`);
        console.log(`   - Actualizados: ${incrementalResult.updated.length}`);
        
        if (incrementalResult.errors.length > 0) {
            console.log('\n❌ Errores encontrados:');
            incrementalResult.errors.slice(0, 5).forEach((error, index) => {
                console.log(`   ${index + 1}. Fila ${error.row}: ${error.error}`);
            });
        }
        
        if (incrementalResult.warnings && incrementalResult.warnings.length > 0) {
            console.log('\n⚠️ Warnings encontrados:');
            incrementalResult.warnings.slice(0, 5).forEach((warning, index) => {
                console.log(`   ${index + 1}. Fila ${warning.row}: ${warning.warning}`);
            });
        }
        
        // Verificar datos en base de datos
        const projectCount = await prisma.project.count();
        const excelProjectCount = await prisma.excelProject.count();
        const catalogCount = await prisma.catalog.count();
        
        console.log('\n📈 Estadísticas de base de datos:');
        console.log(`   - Proyectos principales: ${projectCount}`);
        console.log(`   - Proyectos Excel: ${excelProjectCount}`);
        console.log(`   - Entradas de catálogo: ${catalogCount}`);
        
        // Mostrar algunos catálogos creados
        const catalogs = await prisma.catalog.findMany({
            take: 10,
            select: { type: true, name: true }
        });
        
        console.log('\n📝 Algunos catálogos creados:');
        catalogs.forEach(catalog => {
            console.log(`   - ${catalog.type}: ${catalog.name}`);
        });
        
        console.log('\n🎉 Prueba de importación completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba de importación:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testImport();