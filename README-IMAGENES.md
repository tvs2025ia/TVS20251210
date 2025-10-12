# 📸 Sistema de Imágenes Locales

Las imágenes de productos ahora se guardan **localmente en `public/img/`** en lugar de Supabase Storage para ahorrar memoria y costos.

## 🎯 **Características**

- ✅ **Almacenamiento local**: Sin consumo de Supabase Storage
- ✅ **Optimización automática**: Redimensiona a 800x800px máximo
- ✅ **Compresión inteligente**: JPEG al 85% de calidad
- ✅ **Validación de archivos**: Máximo 10MB por imagen
- ✅ **URLs amigables**: `/img/product_[ID]_[timestamp]_[random].jpg`
- ✅ **Componente dedicado**: `LocalImage` para mostrar imágenes
- ✅ **Preview instantáneo**: Vista previa antes de guardar

## 🔧 **Cómo funciona**

### **1. Subida de imágenes**
```typescript
// El ProductService ahora usa LocalImageService
const imageUrl = await ProductService.uploadProductImage(file, productId);
// Resultado: "/img/product_123_1734567890_abc123.jpg"
```

### **2. Visualización de imágenes**
```jsx
// Componente LocalImage maneja URLs locales automáticamente
<LocalImage 
  src={product.imageUrl} 
  alt={product.name}
  className="w-32 h-32 object-cover rounded"
/>
```

### **3. Almacenamiento simulado**
- Las imágenes se guardan en **localStorage** como base64
- Se genera un **registro** de todas las imágenes
- Se crean **URLs blob** para renderizado eficiente

## 📁 **Estructura de archivos**

```
public/
└── img/                    # Carpeta para imágenes
    ├── product_1_*.jpg     # Imágenes optimizadas
    └── product_2_*.jpg

src/
├── services/
│   ├── localImageService.ts    # Manejo de imágenes locales
│   └── productService.ts       # Actualizado para usar LocalImageService
├── components/
│   ├── LocalImage.tsx           # Componente para mostrar imágenes
│   └── Inventory.tsx            # Usa ImageUploadPreview
└── utils/
    └── imageUtils.ts            # Optimización de imágenes
```

## 🎨 **Componentes disponibles**

### **LocalImage**
Muestra imágenes con fallback automático:
```jsx
<LocalImage 
  src="/img/product_123.jpg"
  alt="Producto" 
  className="w-24 h-24"
  fallback="/placeholder.jpg"
/>
```

### **ImageUploadPreview**
Subida con preview:
```jsx
<ImageUploadPreview
  onImageSelect={setSelectedFile}
  currentImage={product.imageUrl}
  productId={product.id}
  className="w-32 h-32"
/>
```

## 📊 **Gestión de almacenamiento**

### **Ver estadísticas**
```javascript
const stats = LocalImageService.getTotalStorageUsed();
console.log(`${stats.count} imágenes, ${stats.formattedSize}`);
```

### **Limpiar imágenes antiguas**
```javascript
// Elimina imágenes de más de 7 días
const cleaned = LocalImageService.cleanupImages(24 * 7);
console.log(`${cleaned} imágenes eliminadas`);
```

### **Listar todas las imágenes**
```javascript
const images = LocalImageService.getStoredImages();
images.forEach(img => {
  console.log(`${img.fileName} - ${img.productId} - ${img.formattedSize}`);
});
```

## ⚡ **Optimizaciones**

1. **Redimensionado automático** a 800x800px máximo
2. **Compresión JPEG** al 85% de calidad
3. **Validación de tipo** y tamaño de archivo
4. **URLs blob** para renderizado eficiente
5. **Limpieza automática** de imágenes huérfanas

## 🔄 **Migración desde Supabase**

Si tenías imágenes en Supabase Storage, puedes:

1. **Mantener URLs existentes**: El sistema las mostrará normalmente
2. **Migrar gradualmente**: Las nuevas imágenes van a local
3. **Limpiar Supabase**: Eliminar bucket `product-images` si no lo necesitas

## 🚀 **Ventajas**

- **Cero costos** de almacenamiento en Supabase
- **Mejor rendimiento** con imágenes optimizadas
- **Control total** sobre las imágenes
- **Fallback robusto** si falla una imagen
- **Fácil backup** copiando la carpeta `public/img/`

## 📝 **Notas**

- Las imágenes se almacenan como **base64 en localStorage** por simplicidad
- En producción podrías usar un **endpoint real** para guardar archivos
- El tamaño de localStorage está limitado (~5-10MB por dominio)
- Para **muchas imágenes**, considera implementar un servidor de archivos

**¡Ahora tus imágenes no consumen memoria en Supabase! 🎉**
