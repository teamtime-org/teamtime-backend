const { PrismaClient } = require('@prisma/client');

let prisma;

// Singleton pattern para Prisma client
if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // En desarrollo, usar global para evitar múltiples instancias
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
        });
    }
    prisma = global.prisma;
}

module.exports = prisma;
