#!/usr/bin/env node

/**
 * Script para enlazar proyectos existentes con sus detalles de Excel
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔗 Enlazando proyectos con detalles de Excel...');

        // Obtener todos los proyectos
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                description: true,
            }
        });

        // Obtener todos los proyectos Excel
        const excelProjects = await prisma.excelProject.findMany({
            select: {
                id: true,
                title: true,
                serviceDescription: true,
            }
        });

        let linkedCount = 0;
        let notFoundCount = 0;

        console.log(`📊 Encontrados ${projects.length} proyectos y ${excelProjects.length} proyectos Excel`);

        // Intentar enlazar por nombre/título similar
        for (const project of projects) {
            // Buscar coincidencia exacta por nombre
            let excelProject = excelProjects.find(ep =>
                ep.title && project.name && ep.title.trim().toLowerCase() === project.name.trim().toLowerCase()
            );

            // Si no hay coincidencia exacta, buscar por contenido similar
            if (!excelProject && project.description) {
                excelProject = excelProjects.find(ep =>
                    ep.title && project.description &&
                    project.description.includes(ep.title.substring(0, 50))
                );
            }

            // Si no hay coincidencia por descripción, buscar parcialmente por nombre
            if (!excelProject) {
                const projectNameWords = project.name.toLowerCase().split(/[\s-]+/).filter(word => word.length > 3);
                excelProject = excelProjects.find(ep => {
                    if (!ep.title) return false;
                    const excelTitleLower = ep.title.toLowerCase();
                    return projectNameWords.some(word => excelTitleLower.includes(word));
                });
            }

            if (excelProject) {
                try {
                    await prisma.excelProject.update({
                        where: { id: excelProject.id },
                        data: { projectId: project.id }
                    });

                    linkedCount++;
                    console.log(`✅ Enlazado: "${project.name}" -> "${excelProject.title}"`);
                } catch (error) {
                    console.log(`⚠️  Error enlazando "${project.name}": ${error.message}`);
                }
            } else {
                notFoundCount++;
                console.log(`❌ No encontrado detalle Excel para: "${project.name}"`);
            }
        }

        console.log('\n🎉 Proceso completado:');
        console.log(`   ✅ Proyectos enlazados: ${linkedCount}`);
        console.log(`   ❌ Proyectos sin detalle: ${notFoundCount}`);
        console.log(`   📊 Total procesados: ${projects.length}`);

        // Mostrar estadísticas
        const linkedProjects = await prisma.project.findMany({
            where: {
                excelDetails: {
                    isNot: null
                }
            },
            include: {
                excelDetails: {
                    select: {
                        id: true,
                        title: true,
                        monthlyBillingMXN: true,
                        totalContractAmountMXN: true
                    }
                }
            }
        });

        console.log(`\n💰 Proyectos con información financiera: ${linkedProjects.filter(p => p.excelDetails?.monthlyBillingMXN || p.excelDetails?.totalContractAmountMXN).length}`);

    } catch (error) {
        console.error('❌ Error:', error);
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
