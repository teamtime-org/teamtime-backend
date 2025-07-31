#!/usr/bin/env node

/**
 * Script para migrar proyectos Excel a proyectos normales
 */
const prisma = require('./src/config/database');
const ExcelProjectMigrationService = require('./src/services/excelProjectMigration.service');
const logger = require('./src/utils/logger');

async function main() {
    try {
        console.log('🔄 Iniciando migración de proyectos Excel...\n');

        // Crear instancia del servicio
        const migrationService = new ExcelProjectMigrationService();

        // Obtener estadísticas antes de migrar
        console.log('📊 Estadísticas antes de la migración:');
        const statsBefore = await migrationService.getMigrationStats();
        console.log(`   • Proyectos Excel activos: ${statsBefore.activeExcelProjects}`);
        console.log(`   • Proyectos normales: ${statsBefore.totalProjects}`);
        console.log(`   • Pendientes de migración: ${statsBefore.pendingMigration}\n`);

        if (statsBefore.pendingMigration === 0) {
            console.log('✅ No hay proyectos pendientes de migración.\n');
            return;
        }

        // Usuario administrativo para la migración
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMINISTRADOR' }
        });

        if (!adminUser) {
            throw new Error('No se encontró usuario administrador para realizar la migración');
        }

        console.log(`👤 Migración realizada por: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})\n`);

        // Realizar migración
        const requestingUser = {
            userId: adminUser.id,
            email: adminUser.email,
            role: adminUser.role
        };

        const result = await migrationService.migrateExcelProjectsToProjects(requestingUser);

        // Mostrar resultados
        console.log('📈 Resultados de la migración:');
        console.log(`   ✅ Proyectos migrados: ${result.migrated}`);
        console.log(`   ❌ Errores: ${result.errors}`);

        if (result.errorDetails && result.errorDetails.length > 0) {
            console.log('\n🚨 Detalles de errores:');
            result.errorDetails.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.projectTitle}: ${error.error}`);
            });
        }

        // Estadísticas finales
        console.log('\n📊 Estadísticas después de la migración:');
        const statsAfter = await migrationService.getMigrationStats();
        console.log(`   • Proyectos Excel activos: ${statsAfter.activeExcelProjects}`);
        console.log(`   • Proyectos normales: ${statsAfter.totalProjects}`);
        console.log(`   • Pendientes de migración: ${statsAfter.pendingMigration}`);

        console.log('\n🎉 Migración completada exitosamente!');

    } catch (error) {
        console.error('\n❌ Error durante la migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = main;
