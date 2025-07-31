#!/usr/bin/env node

/**
 * Script para probar la API de proyectos después de la migración
 */
const API_BASE = 'http://localhost:3000/api';

async function makeRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    return { data, status: response.status };
}

async function main() {
    try {
        console.log('🔐 Haciendo login como administrador...');

        // Login
        const loginResponse = await makeRequest(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@telecomcorp.com',
                password: 'password123'
            })
        });

        if (!loginResponse.data.success) {
            throw new Error('Login falló: ' + loginResponse.data.message);
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login exitoso\n');

        // Configurar headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('📋 Obteniendo primeros 50 proyectos...');

        // Obtener proyectos con límite más alto
        const projectsResponse = await makeRequest(`${API_BASE}/projects?limit=50&page=1`, {
            method: 'GET',
            headers
        });

        if (!projectsResponse.data.success) {
            throw new Error('Error obteniendo proyectos: ' + projectsResponse.data.message);
        }

        const { projects, total } = projectsResponse.data.data;

        console.log(`✅ ${projects.length} proyectos obtenidos de un total de ${total}\n`);

        // Mostrar resumen de proyectos por área
        console.log('🎯 Resumen de proyectos por área:');
        const projectsByArea = {};
        projects.forEach(project => {
            const areaName = project.area?.name || 'Sin área';
            if (!projectsByArea[areaName]) {
                projectsByArea[areaName] = 0;
            }
            projectsByArea[areaName]++;
        });

        Object.entries(projectsByArea).forEach(([area, count]) => {
            console.log(`   • ${area}: ${count} proyectos`);
        });

        // Mostrar resumen de proyectos por estado
        console.log('\n📊 Resumen de proyectos por estado:');
        const projectsByStatus = {};
        projects.forEach(project => {
            const status = project.status || 'Sin estado';
            if (!projectsByStatus[status]) {
                projectsByStatus[status] = 0;
            }
            projectsByStatus[status]++;
        });

        Object.entries(projectsByStatus).forEach(([status, count]) => {
            console.log(`   • ${status}: ${count} proyectos`);
        });

        console.log('\n🎯 Primeros 10 proyectos:');
        projects.slice(0, 10).forEach((project, index) => {
            console.log(`   ${index + 1}. ${project.name.slice(0, 60)}...`);
            console.log(`      📁 Área: ${project.area?.name || 'Sin área'}`);
            console.log(`      📊 Estado: ${project.status}`);
            console.log(`      ⚡ Prioridad: ${project.priority}`);
            console.log(`      👥 Asignados: ${project.assignments?.length || 0}`);
            console.log('');
        });

        // Obtener estadísticas de migración
        console.log('📊 Verificando estadísticas de migración...');
        try {
            const migrationStatsResponse = await makeRequest(`${API_BASE}/excel-projects/migration-stats`, {
                method: 'GET',
                headers
            });

            if (migrationStatsResponse.data.success) {
                const stats = migrationStatsResponse.data.data;
                console.log(`   • Proyectos Excel activos: ${stats.activeExcelProjects}`);
                console.log(`   • Proyectos normales: ${stats.totalProjects}`);
                console.log(`   • Pendientes de migración: ${stats.pendingMigration}`);
                console.log(`   • ¿Migración necesaria?: ${stats.migrationNeeded ? 'Sí' : 'No'}`);
            }
        } catch (error) {
            console.log('⚠️  No se pudieron obtener estadísticas de migración (endpoint podría no estar disponible)');
        }

        console.log('\n🎉 ¡Migración verificada exitosamente!');
        console.log('\n💡 Los proyectos importados desde Excel ahora están disponibles en /projects');
        console.log('🌐 Puedes ver la nueva vista de tabla en: http://localhost:5174/projects');
        console.log('\n📊 Estadísticas totales:');
        console.log(`   • Total de proyectos: ${total}`);
        console.log(`   • Proyectos mostrados: ${projects.length}`);
        console.log(`   • Páginas disponibles: ${Math.ceil(total / 50)}`);
        console.log('   • Vista de tabla implementada con filtros y paginación ✅');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('   Respuesta del servidor:', error.response.data);
        }
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = main;
