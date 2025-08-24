const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
    try {
        console.log('🔄 Buscando registros con problemas de fecha...');
        
        // Buscar todos los registros del usuario específico
        const entries = await prisma.timeEntry.findMany({
            where: {
                userId: '4dad04db-1b59-4892-81d2-cc720ce53a39'
            },
            select: {
                id: true,
                date: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`📊 Encontrados ${entries.length} registros`);
        
        // Mostrar las fechas para analizar el problema
        entries.forEach(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            const timeStr = entry.date.toISOString();
            console.log(`ID: ${entry.id} | Date: ${dateStr} | Full: ${timeStr} | Created: ${entry.createdAt.toISOString()}`);
        });

        // Buscar específicamente registros que deberían ser 2025-08-18
        console.log('\n🔍 Buscando registros que coincidan con 2025-08-18...');
        const problematicEntries = await prisma.timeEntry.findMany({
            where: {
                userId: '4dad04db-1b59-4892-81d2-cc720ce53a39',
                date: {
                    gte: new Date('2025-08-18T00:00:00.000Z'),
                    lte: new Date('2025-08-18T23:59:59.999Z')
                }
            }
        });

        console.log(`🎯 Registros encontrados para 2025-08-18: ${problematicEntries.length}`);
        
        if (problematicEntries.length > 0) {
            console.log('✅ Los registros SÍ existen en la DB y son consultables');
            problematicEntries.forEach(entry => {
                console.log(`  - ${entry.id}: ${entry.date.toISOString()}`);
            });
        } else {
            console.log('❌ No se encontraron registros - problema confirmado');
            
            // Buscar con rango más amplio para encontrar dónde están
            console.log('\n🔎 Buscando en rango más amplio...');
            const widerRange = await prisma.timeEntry.findMany({
                where: {
                    userId: '4dad04db-1b59-4892-81d2-cc720ce53a39',
                    date: {
                        gte: new Date('2025-08-17T00:00:00.000Z'),
                        lte: new Date('2025-08-19T23:59:59.999Z')
                    }
                }
            });
            
            console.log(`📋 Registros en rango 17-19 agosto: ${widerRange.length}`);
            widerRange.forEach(entry => {
                console.log(`  - ${entry.id}: ${entry.date.toISOString()}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDates();