# Gestión de Datos en Schema v2

## Cambios Principales de Schema v1 a Schema v2

### 1. Personas de Ventas (Sales Management, Sales Executive)
**Schema v1:** Se manejaban como catálogos (tipos en la tabla Catalog)
**Schema v2:** Ahora son **usuarios del sistema** con relaciones directas

#### Estructura Actual:
- `salesManager` → Usuario del sistema (tabla `users`)
- `salesLeader` → Usuario del sistema (tabla `users`)
- `salesExecutive` → Usuario del sistema (tabla `users`)
- `designManager` → Usuario del sistema (tabla `users`)
- `designCoordinator` → Usuario del sistema (tabla `users`)
- `architect` → Usuario del sistema (tabla `users`)

#### Cómo Administrarlos:
```javascript
// Para obtener lista de posibles sales managers
const salesManagers = await prisma.user.findMany({
  where: {
    isActive: true,
    role: { in: ['COORDINADOR', 'ADMINISTRADOR'] }
  },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true
  }
});

// Para asignar a un proyecto staging
await prisma.stagingProject.update({
  where: { id: stagingProjectId },
  data: {
    salesManagerId: userId,
    salesExecutiveId: anotherUserId
  }
});
```

### 2. Tipos de Proyecto (Project Types)
**Schema v1:** Se manejaban como catálogo
**Schema v2:** Ahora usa el modelo `ProjectStage`

#### Estructura Actual:
- `ProjectStage` → Define las etapas del proyecto (PROPUESTA, ADJUDICADO, ENTREGADO, etc.)
- Cada proyecto staging tiene un `projectStageId`

#### Cómo Administrarlos:
```javascript
// Crear nuevas etapas de proyecto
await prisma.projectStage.create({
  data: {
    code: 'PROPUESTA',
    name: 'Propuesta',
    description: 'Proyecto en etapa de propuesta',
    color: '#3B82F6',
    orderIndex: 1
  }
});

// Obtener todas las etapas
const projectStages = await prisma.projectStage.findMany({
  where: { isActive: true },
  orderBy: { orderIndex: 'asc' }
});
```

### 3. Catálogos Disponibles en Schema v2

Los únicos tipos de catálogo válidos ahora son:
- `SERVICE_TYPE` - Tipo de servicio (Nuevo/Existente)
- `CONTRACT_TYPE` - Tipo de contrato (Licitación/BAU/Cotización)
- `BUSINESS_LINE` - Línea de negocio
- `PRODUCT` - Productos
- `MANUFACTURER` - Fabricantes
- `SUPPLIER` - Proveedores
- `WHOLESALER` - Mayoristas

### 4. Mapeo de Campos Excel → Base de Datos

Schema v2 incluye un sistema flexible de mapeo mediante `FieldMapping`:

```javascript
// Ejemplo de configuración de mapeo
await prisma.fieldMapping.create({
  data: {
    sourceAreaId: areaId,
    sourceField: 'Gerente de Ventas',  // Columna en Excel
    targetField: 'salesManagerId',      // Campo en BD
    targetTable: 'staging_projects',
    transformation: 'USER_LOOKUP',      // Busca usuario por nombre
    isRequired: false,
    validationRule: null,
    description: 'Mapea el nombre del gerente a un usuario del sistema'
  }
});
```

## Plan de Migración de Datos

### Para Datos Existentes:

1. **Personas de Ventas Existentes:**
   - Crear usuarios en el sistema para cada persona que antes estaba en catálogos
   - Asignar roles apropiados (COORDINADOR para managers, COLABORADOR para ejecutivos)
   - Actualizar referencias en proyectos existentes

2. **Tipos de Proyecto:**
   - Migrar a la tabla `ProjectStage`
   - Crear registros para cada tipo que existía antes

3. **Catálogos Obsoletos:**
   - Los endpoints retornan arrays vacíos por compatibilidad
   - Gradualmente actualizar el frontend para usar las nuevas estructuras

## Endpoints API Recomendados

### Para Personas (Reemplaza catálogos de ventas):
```javascript
// GET /api/users/sales-managers
// GET /api/users/sales-executives
// GET /api/users/architects
// GET /api/users/coordinators
```

### Para Etapas de Proyecto:
```javascript
// GET /api/project-stages
// POST /api/project-stages
// PUT /api/project-stages/:id
```

### Para Catálogos Válidos:
```javascript
// GET /api/catalogs/service-types
// GET /api/catalogs/contract-types
// GET /api/catalogs/business-lines
```

## Configuración de Importación Excel

Para que la importación de Excel funcione correctamente con personas:

1. Configurar `FieldMapping` con transformación `USER_LOOKUP`
2. El sistema buscará usuarios por nombre completo o email
3. Si no encuentra el usuario, puede:
   - Crear uno nuevo automáticamente
   - Dejar el campo vacío
   - Marcar como error de validación

## Ejemplo de Uso en Frontend

```javascript
// En lugar de:
const salesManagers = await catalogService.getSalesManagements();

// Ahora usar:
const salesManagers = await userService.getUsers({
  role: 'COORDINADOR',
  isActive: true
});

// Para mostrar en un select:
<select>
  {salesManagers.map(user => (
    <option key={user.id} value={user.id}>
      {user.firstName} {user.lastName}
    </option>
  ))}
</select>
```

## Notas Importantes

1. **No crear más catálogos** para personas - usar usuarios del sistema
2. **ProjectStage** es para etapas del ciclo de vida del proyecto
3. **FieldMapping** permite configuración flexible sin cambiar código
4. Los usuarios pueden tener múltiples roles en diferentes proyectos
5. La importación Excel debe mapear nombres a IDs de usuario