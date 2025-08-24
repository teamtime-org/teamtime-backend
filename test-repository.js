const TimeEntryRepository = require('./src/repositories/timeEntry.repository');

async function testRepository() {
    try {
        const repository = new TimeEntryRepository();
        
        console.log('🧪 Probando repositorio directamente...');
        
        // Simular filtros típicos del colaborador
        const filters = {
            startDate: '2025-08-18',
            endDate: '2025-08-18'
        };
        
        const pagination = {
            skip: 0,
            limit: 50
        };
        
        console.log('📋 Filtros aplicados:', filters);
        console.log('📄 Paginación:', pagination);
        
        const result = await repository.findMany(
            filters, 
            pagination, 
            'COLABORADOR',  // userRole
            '4dad04db-1b59-4892-81d2-cc720ce53a39'  // userId
        );
        
        console.log('📊 Resultados:', result.total, 'registros encontrados');
        console.log('📝 Primeros registros:');
        
        result.timeEntries.forEach((entry, index) => {
            console.log(`  ${index + 1}. ID: ${entry.id} | Fecha: ${entry.date.toISOString().split('T')[0]} | Horas: ${entry.hours}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testRepository();