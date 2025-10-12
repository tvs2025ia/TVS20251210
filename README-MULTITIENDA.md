🎯 OBJETIVO
Crear un sistema de login multi-tienda que funcione online con Supabase y offline con IndexedDB, donde los usuarios puedan acceder a múltiples tiendas.

🏗️ ARQUITECTURA
Frontend: React + TypeScript

Base de datos online: Supabase

Base de datos offline: IndexedDB

Sincronización: Automática cuando hay internet

📋 COMPONENTES PRINCIPALES
1. LOGIN MULTI-TIENDA (Login.tsx)
Campo usuario + contraseña

Selector de tienda (obligatorio)

Las tiendas disponibles cambian según el usuario

Admin ve todas las tiendas, empleados solo las asignadas

2. GESTIÓN DE USUARIOS (Admin.tsx)
Crear/editar usuarios

Asignar múltiples tiendas a cada usuario

Sincronización automática Supabase ↔ IndexedDB

Exportar/importar usuarios

3. AUTENTICACIÓN (AuthContext.tsx)
typescript
interface User {
  id: string
  username: string
  role: 'admin' | 'employee'
  allowedStores: string[]  // Tiendas permitidas
  storeId: string         // Tienda actual de sesión
}
4. LAYOUT CON SELECTOR DE TIENDA (Layout.tsx)
Solo admin puede cambiar de tienda sin cerrar sesión

Empleados ven tienda actual fija

Estado de conexión online/offline

🔄 FLUJOS DE USUARIO
LOGIN:
text
1. Usuario ingresa credenciales
2. Selecciona tienda (solo ve las permitidas)
3. Sistema verifica acceso a esa tienda
4. Si acceso permitido → login exitoso
CAMBIO DE TIENDA:
text
Admin: Puede cambiar desde el header
Empleado: Debe cerrar sesión y volver a login
🗃️ ESTRUCTURA BASE DE DATOS
Tabla users en Supabase:
sql
id, username, password_hash, role, is_active
Tabla user_stores (relación muchos a muchos):
sql
user_id, store_id, is_active
IndexedDB (offline):
javascript
{
  users: [...],
  user_stores: [...],
  stores: [...],
  syncQueue: [...]
}
🔧 FUNCIONALIDADES CLAVE
Login con selección de tienda obligatoria

Control de acceso por tienda

Trabajo offline completo

Sincronización automática

Admin puede cambiar tiendas libremente

Empleados atados a tienda de sesión

📱 MULTIPLATAFORMA
Web PWA

App móvil (mismo código)

Desktop (mismo código)

Nota: Eliminar completamente usuarios mock, todo se gestiona desde la interfaz admin.





# Prompt para Bolt.new - Modificar Sistema POS Existente para Multi-Tienda

## 🎯 OBJETIVO
Modificar el sistema POS existente para implementar autenticación multi-tienda usando IndexedDB + Supabase, reemplazando los usuarios mock por un sistema dinámico.

## 📁 ARCHIVOS A MODIFICAR (ya existen)

### 1. `AuthContext.tsx` - COMPLETO REEMPLAZO
**ELIMINAR:** 
- Usuarios mock hardcodeados (`mockUsers`)
- Lógica de autenticación simple

**IMPLEMENTAR:**
- Autenticación contra IndexedDB (primero) y Supabase (si hay internet)
- Gestión de `allowedStores` por usuario
- Función `getAllowedStores()` para login
- Persistencia en IndexedDB (sobrevive a F5)

### 2. `Login.tsx` - MEJORAR
**MODIFICAR:**
- Agregar selector de tienda OBLIGATORIO
- Filtrar tiendas según usuario (`allowedStores`)
- Mostrar solo tiendas permitidas
- Validar acceso a tienda seleccionada

### 3. `Layout.tsx` - AJUSTAR
**MODIFICAR:**
- Selector de tienda SOLO visible para admin
- Empleados ven tienda actual fija
- Bloquear cambio de tienda para empleados

### 4. `Admin.tsx` - EXTENDER
**AGREGAR:**
- Campo "Tiendas Permitidas" en formulario de usuario
- Para empleados: selección múltiple de tiendas
- Para admin: mensaje "Acceso a todas las tiendas"
- Sincronización automática IndexedDB ↔ Supabase

### 5. `SupabaseService.ts` - NUEVAS FUNCIONES
**AGREGAR:**
```typescript
// Gestión de relaciones usuario-tienda
getUserStores(userId: string): Promise<string[]>
verifyStoreAccess(userId: string, storeId: string): Promise<boolean>
updateUserStores(userId: string, storeIds: string[]): Promise<boolean>
```

### 6. NUEVO ARCHIVO: `indexedDBService.ts`
**CREAR:**
- Gestión completa de usuarios en IndexedDB
- Cola de sincronización con Supabase
- Operaciones CRUD para usuarios y relaciones

## 🔄 FLUJO DE AUTENTICACIÓN MODIFICADO

### LOGIN:
```
1. Usuario + password + selección de tienda
2. Buscar en IndexedDB local
3. Si no encontrado y hay internet → buscar en Supabase
4. Validar que usuario tiene acceso a tienda seleccionada
5. Permitir login solo si acceso válido
```

### GESTIÓN USUARIOS:
```
Admin crea/edita usuario → Guarda en IndexedDB → Sincroniza con Supabase
```

## 🗂️ ESTRUCTURAS DE DATOS

### User en IndexedDB:
```typescript
{
  id: string,
  username: string,
  passwordHash: string,
  role: 'admin' | 'employee',
  allowedStores: string[], // Para empleados
  storeId: string, // Tienda sesión actual
  isActive: boolean,
  lastSync: string
}
```

## 🚫 ELIMINAR COMPLETAMENTE
- Usuarios mock hardcodeados
- Lógica de autenticación simple con "123456"
- `storeId` fijo en usuarios

## ✅ MANTENER
- UI/UX existente
- Navegación y componentes actuales
- Integración con Supabase existente
- Funcionalidades POS actuales

## 🎯 RESULTADO FINAL
Sistema donde:
- Admin puede acceder a todas las tiendas
- Empleados acceden solo a tiendas asignadas
- Login requiere selección de tienda
- Funciona online/offline
- Usuarios se gestionan desde interfaz admin
