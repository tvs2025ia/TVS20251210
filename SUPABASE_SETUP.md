# Configuración de Supabase

## Pasos para configurar la base de datos

### 1. Crear las tablas en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `supabase-schema.sql`
4. Ejecuta el script para crear todas las tablas

### 2. Configurar Storage para imágenes

El script ya incluye la configuración del bucket `product-images`, pero si necesitas configurarlo manualmente:

1. Ve a **Storage** en tu dashboard de Supabase
2. Crea un nuevo bucket llamado `product-images`
3. Marca como público
4. Las políticas ya están configuradas en el script SQL

### 3. Verificar la configuración

Las variables de entorno ya están configuradas:
- `VITE_SUPABASE_URL`: https://gndypctuvwknvytqzlal.supabase.co
- `VITE_SUPABASE_ANON_KEY`: [configurada]

### 4. Estructura de tablas creadas

- **products**: Productos del inventario
- **customers**: Clientes
- **sales**: Ventas realizadas
- **sale_items**: Items de cada venta
- **expenses**: Gastos de la tienda
- **quotes**: Cotizaciones
- **purchases**: Compras a proveedores
- **users**: Usuarios del sistema
- **suppliers**: Proveedores
- **cash_registers**: Cajas registradoras
- **cash_movements**: Movimientos de efectivo
- **payment_methods**: Métodos de pago
- **receipt_templates**: Plantillas de recibos
- **layaways**: Productos separados
- **layaway_items**: Items de productos separados
- **layaway_payments**: Pagos de separados

### 5. Funcionalidades implementadas

✅ **Migración completa de localStorage a Supabase**
✅ **Carga optimizada de datos (lazy loading)**
✅ **Subida de imágenes optimizadas a Supabase Storage**
✅ **Bulk upload mejorado con operaciones por lotes**
✅ **Eliminación de dependencias MySQL**
✅ **Optimizaciones de rendimiento**

### 6. Funciones de imagen

- Subida de archivos con optimización automática
- Redimensionado a máximo 800x800px
- Compresión JPEG al 85%
- Validación de tipo y tamaño de archivo
- Creación de miniaturas (pequeña, mediana, grande)

### 7. Rendimiento

- Carga progresiva de datos (esenciales primero)
- Actualizaciones optimistas en la UI
- Operaciones por lotes para bulk uploads
- Filtrado por tienda para reducir payload
- Cache en memoria para datos frecuentes

## Solución de problemas

### Error de conexión
- Verifica que las variables de entorno estén configuradas
- Confirma que el proyecto de Supabase esté activo
- Revisa que la clave anónima sea válida

### Errores de subida de imágenes
- Confirma que el bucket `product-images` existe
- Verifica que las políticas estén configuradas
- Asegúrate de que las imágenes sean menores a 10MB

### Datos no aparecen
- Ejecuta el script SQL completo
- Verifica que las tablas se crearon correctamente
- Revisa la consola del navegador para errores

## Migración de datos existentes

Si tienes datos en localStorage que quieres migrar:

1. Abre las herramientas de desarrollador
2. Ve a **Application** > **Local Storage**
3. Busca claves que empiecen con `mysql_sim_`
4. Copia los datos y súbelos manualmente o usa las funciones de import

## Próximos pasos

- Implementar autenticación real con Supabase Auth
- Agregar roles y permisos por usuario
- Implementar sincronización en tiempo real
- Añadir reportes avanzados con queries optimizadas
