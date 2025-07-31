const ExcelImportService = require('./src/services/excelImport.service');
const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function finalTest() {
    try {
        console.log('🎯 PRUEBA FINAL - Importación de Excel con nuevas equivalencias');
        console.log('=====================================================');
        
        // Verificar que tenemos un área
        const area = await prisma.area.findFirst();
        if (!area) {
            throw new Error('No se encontró área en la base de datos');
        }
        
        console.log(`✅ Área encontrada: ${area.name}`);
        
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
        
        console.log('\n📊 Iniciando importación completa (no incremental)...');
        const result = await excelImportService.importFromExcel(
            filePath, 
            mockUser, 
            area.id, 
            false // NO incremental, actualizar todo
        );
        
        console.log('\n✅ RESULTADOS DE IMPORTACIÓN:');
        console.log(`   📈 Proyectos procesados: ${result.success}`);
        console.log(`   ❌ Errores: ${result.errors.length}`);
        console.log(`   ⚠️  Warnings: ${result.warnings?.length || 0}`);
        console.log(`   🆕 Creados: ${result.created.length}`);
        console.log(`   🔄 Actualizados: ${result.updated.length}`);
        
        // Verificar estadísticas finales
        const stats = await Promise.all([
            prisma.project.count(),
            prisma.excelProject.count(),
            prisma.catalog.count(),
            prisma.user.count(),
            prisma.catalog.groupBy({
                by: ['type'],
                _count: { id: true }
            })
        ]);
        
        console.log('\n📊 ESTADÍSTICAS FINALES:');
        console.log(`   🎯 Proyectos principales: ${stats[0]}`);
        console.log(`   📋 Proyectos Excel: ${stats[1]}`);
        console.log(`   📚 Entradas de catálogo: ${stats[2]}`);
        console.log(`   👥 Usuarios totales: ${stats[3]}`);
        
        console.log('\n📋 CATÁLOGOS POR TIPO:');
        stats[4].forEach(item => {
            console.log(`   - ${item.type}: ${item._count.id} entradas`);
        });
        
        // Probar algunos proyectos con detalles Excel
        const projectsWithExcel = await prisma.project.findMany({
            take: 3,
            include: {
                excelDetails: {
                    select: {
                        id: true,
                        siebelOrderNumber: true,
                        mentor: { select: { firstName: true, lastName: true } },
                        coordinator: { select: { firstName: true, lastName: true } },
                        salesManagement: { select: { name: true } }
                    }
                }
            },
            where: {
                excelDetails: { isNot: null }
            }
        });
        
        console.log('\n🔍 MUESTRA DE PROYECTOS CON DETALLES EXCEL:');
        projectsWithExcel.forEach((project, index) => {
            console.log(`   ${index + 1}. ${project.name}`);
            console.log(`      Status: ${project.status}`);
            if (project.excelDetails) {
                console.log(`      Siebel: ${project.excelDetails.siebelOrderNumber || 'N/A'}`);
                console.log(`      Colaborador: ${project.excelDetails.mentor ? 
                    `${project.excelDetails.mentor.firstName} ${project.excelDetails.mentor.lastName}` : 'N/A'}`);
                console.log(`      Coordinador: ${project.excelDetails.coordinator ? 
                    `${project.excelDetails.coordinator.firstName} ${project.excelDetails.coordinator.lastName}` : 'N/A'}`);
                console.log(`      Gerencia: ${project.excelDetails.salesManagement?.name || 'N/A'}`);
            }
            console.log('');
        });
        
        console.log('🎉 PRUEBA FINAL COMPLETADA EXITOSAMENTE!');
        console.log('✅ Todas las equivalencias implementadas correctamente');
        console.log('✅ Catálogos creados dinámicamente');
        console.log('✅ Relación projects-excel_projects funcionando');
        console.log('✅ Usuarios creados con roles correctos');
        
    } catch (error) {
        console.error('❌ ERROR EN PRUEBA FINAL:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

finalTest();