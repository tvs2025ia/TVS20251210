/**
 * PHP Image Service - Saves images to hosting via PHP endpoint
 * Uploads optimized images to https://tienda.gioeroticshop.co/img/
 */

export class LocalImageService {
  // 🔧 CONFIGURACIÓN - Cambia esta URL a tu dominio
  private static readonly PHP_ENDPOINT = 'https://tienda.gioeroticshop.co/upload-image.php';
  private static readonly BASE_PATH = '/img/';

  /**
   * Saves an image file to the PHP server and returns the public URL
   */
  static async saveProductImage(file: File, productId: string): Promise<string> {
    try {
      console.log(`📷 Subiendo imagen para producto ${productId} al servidor PHP...`);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `product_${productId}_${timestamp}_${random}.${fileExt}`;
      
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Send to PHP endpoint
      const response = await fetch(this.PHP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          filename: fileName,
          productId: productId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al subir la imagen');
      }

      const publicUrl = result.url;
      console.log(`✅ Imagen guardada en servidor: ${publicUrl}`);
      
      return publicUrl;
      
    } catch (error) {
      console.error('Error subiendo imagen al servidor:', error);
      throw new Error(`Error guardando imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Get image URL for display (now just returns the path as-is since images are on server)
   */
  static getImageUrl(imagePath: string): string {
    // Si ya es una URL completa, retornarla tal cual
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Si es una ruta relativa, retornarla tal cual (el navegador la resolverá)
    return imagePath;
  }

  /**
   * Delete an image from the server
   * NOTE: This requires a separate PHP endpoint for deletion
   */
  static async deleteImage(imagePath: string): Promise<boolean> {
    try {
      console.log(`🗑️ Eliminando imagen: ${imagePath}`);
      
      // Extrae el nombre del archivo
      const fileName = imagePath.split('/').pop();
      
      if (!fileName) {
        console.warn('No se pudo extraer el nombre del archivo');
        return false;
      }

      // TODO: Implementar endpoint PHP para eliminar imágenes
      // Por ahora, solo registra en consola
      console.log(`⚠️ La eliminación física requiere implementar un endpoint PHP de eliminación`);
      console.log(`Archivo a eliminar: ${fileName}`);
      
      return true;
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      return false;
    }
  }

  /**
   * Get list of all stored images
   * NOTE: This requires a PHP endpoint to list images
   */
  static getStoredImages(): Array<{
    fileName: string;
    productId: string;
    uploadedAt: string;
    size: number;
  }> {
    console.warn('getStoredImages() requiere implementar un endpoint PHP para listar imágenes');
    return [];
  }

  /**
   * Get total storage used by images
   * NOTE: This requires a PHP endpoint to calculate storage
   */
  static getTotalStorageUsed(): { count: number; totalSize: number; formattedSize: string } {
    console.warn('getTotalStorageUsed() requiere implementar un endpoint PHP');
    return {
      count: 0,
      totalSize: 0,
      formattedSize: '0 B'
    };
  }

  /**
   * Clean up old or orphaned images
   * NOTE: This requires a PHP endpoint for cleanup
   */
  static cleanupImages(maxAgeHours = 24 * 7): number {
    console.warn('cleanupImages() requiere implementar un endpoint PHP');
    return 0;
  }

  // Private helper methods
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Mantiene el prefijo data:image/xxx;base64, para que PHP lo procese
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}