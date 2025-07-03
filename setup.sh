#!/bin/bash

# Script de configuración inicial para TeamTime Backend
echo "🚀 Configurando TeamTime Backend..."

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ antes de continuar."
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Se requiere Node.js versión 18 o superior. Versión actual: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi

echo "✅ Dependencias instaladas"

# Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Error al generar cliente Prisma"
    exit 1
fi

echo "✅ Cliente Prisma generado"

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones de base de datos..."
npx prisma migrate dev --name init

if [ $? -ne 0 ]; then
    echo "❌ Error al ejecutar migraciones"
    echo "ℹ️ Verifica que la base de datos esté disponible y las credenciales sean correctas"
    exit 1
fi

echo "✅ Migraciones ejecutadas"

# Opcional: Poblar base de datos
read -p "¿Deseas poblar la base de datos con datos de ejemplo? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Poblando base de datos..."
    npm run db:seed
    
    if [ $? -eq 0 ]; then
        echo "✅ Base de datos poblada con datos de ejemplo"
    else
        echo "⚠️ Error al poblar la base de datos (esto es opcional)"
    fi
fi

echo ""
echo "🎉 ¡Configuración completada exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ejecuta 'npm run dev' para iniciar el servidor en modo desarrollo"
echo "2. El servidor estará disponible en http://localhost:3000"
echo "3. La API estará en http://localhost:3000/api"
echo "4. Verifica el estado con GET /api/health"
echo ""
echo "📚 Para más información, consulta el archivo README.md"
