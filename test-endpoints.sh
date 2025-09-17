#!/bin/bash

# Script de prueba de endpoints

echo "==================================="
echo "Prueba de Endpoints - Schema v2"
echo "==================================="
echo ""

# Primero obtenemos un token de autenticación
echo "1. Obteniendo token de autenticación..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teamtime.com","password":"admin123"}' 2>/dev/null)

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "❌ Error al obtener token de autenticación"
  echo "Respuesta: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Token obtenido exitosamente"
echo ""

# Función para probar endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3

  response=$(curl -s -X $method "http://localhost:3000/api$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")

  http_code=$(echo "$response" | tail -n 1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ $description - Status: $http_code"
  else
    echo "❌ $description - Status: $http_code"
    # echo "Response: $(echo "$response" | head -n -1)"
  fi
}

echo "2. Probando endpoints de Schema v2..."
echo ""

# Endpoints básicos
test_endpoint "GET" "/areas" "Áreas"
test_endpoint "GET" "/staging" "Staging Projects (sin params)"
test_endpoint "GET" "/staging/statistics" "Staging Statistics"
test_endpoint "GET" "/field-mappings" "Field Mappings"
test_endpoint "GET" "/area-flows" "Area Flows"
test_endpoint "GET" "/transfers" "Transfers"
test_endpoint "GET" "/documents/templates" "Document Templates"
test_endpoint "GET" "/excel-import/logs" "Import Logs"

echo ""
echo "==================================="
echo "Prueba completada"
echo "==================================="