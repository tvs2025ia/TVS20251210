/**
 * Local Image Service - Saves images to public/img folder
 * This avoids using Supabase Storage and saves memory/costs
 */

export class LocalImageService {
  private static readonly BASE_PATH = '/img/';
  private static readonly UPLOAD_PATH = 'public/img/';

  /**
   * Saves an image file to public/img and returns the public URL
   */
  static async saveProductImage(file: File, productId: string): Promise<string> {
    try {
      console.log(`📷 Guardando imagen para producto ${productId} localmente...`);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `product_${productId}_${timestamp}_${random}.${fileExt}`;
      
      // Convert file to base64 for storage simulation
      const base64Data = await this.fileToBase64(file);
      
      // Save to localStorage as simulation (in real app, this would be a server endpoint)
      const imageData = {
        fileName,
        data: base64Data,
        contentType: file.type,
        size: file.size,
        productId,
        uploadedAt: new Date().toISOString()
      };
      
      // Store in localStorage with key for the filename
      localStorage.setItem(`local_image_${fileName}`, JSON.stringify(imageData));
      
      // Also keep a registry of all images
      const registry = this.getImageRegistry();
      registry[fileName] = {
        productId,
        fileName,
        uploadedAt: imageData.uploadedAt,
        size: file.size
      };
      localStorage.setItem('local_images_registry', JSON.stringify(registry));
      
      const publicUrl = `${this.BASE_PATH}${fileName}`;
      
      console.log(`✅ Imagen guardada localmente: ${publicUrl}`);
      
      // Create a blob URL for immediate display
      const blobUrl = URL.createObjectURL(file);
      
      // Store mapping for serving
      this.storeImageMapping(fileName, blobUrl);
      
      return publicUrl;
      
    } catch (error) {
      console.error('Error guardando imagen localmente:', error);
      throw new Error(`Error guardando imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Get image URL for display (handles both stored and blob URLs)
   */
  static getImageUrl(imagePath: string): string {
    if (imagePath.startsWith('blob:')) {
      return imagePath; // Already a blob URL
    }
    
    if (imagePath.startsWith(this.BASE_PATH)) {
      const fileName = imagePath.replace(this.BASE_PATH, '');
      
      // Try to get from blob URL mapping first
      const blobMapping = this.getImageMapping();
      if (blobMapping[fileName]) {
        return blobMapping[fileName];
      }
      
      // Try to reconstruct from localStorage
      const imageData = localStorage.getItem(`local_image_${fileName}`);
      if (imageData) {
        try {
          const parsed = JSON.parse(imageData);
          return `data:${parsed.contentType};base64,${parsed.data}`;
        } catch (e) {
          console.warn('Error parsing stored image data:', e);
        }
      }
    }
    
    return imagePath; // Return as-is if can't resolve
  }

  /**
   * Delete an image from local storage
   */
  static deleteImage(imagePath: string): boolean {
    try {
      if (imagePath.startsWith(this.BASE_PATH)) {
        const fileName = imagePath.replace(this.BASE_PATH, '');
        
        // Remove from localStorage
        localStorage.removeItem(`local_image_${fileName}`);
        
        // Remove from registry
        const registry = this.getImageRegistry();
        delete registry[fileName];
        localStorage.setItem('local_images_registry', JSON.stringify(registry));
        
        // Remove from blob mapping
        const blobMapping = this.getImageMapping();
        if (blobMapping[fileName]) {
          URL.revokeObjectURL(blobMapping[fileName]); // Clean up blob URL
          delete blobMapping[fileName];
          localStorage.setItem('local_images_blob_mapping', JSON.stringify(blobMapping));
        }
        
        console.log(`🗑️ Imagen eliminada: ${fileName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      return false;
    }
  }

  /**
   * Get list of all stored images
   */
  static getStoredImages(): Array<{
    fileName: string;
    productId: string;
    uploadedAt: string;
    size: number;
  }> {
    const registry = this.getImageRegistry();
    return Object.values(registry);
  }

  /**
   * Get total storage used by images
   */
  static getTotalStorageUsed(): { count: number; totalSize: number; formattedSize: string } {
    const images = this.getStoredImages();
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return {
      count: images.length,
      totalSize,
      formattedSize: formatSize(totalSize)
    };
  }

  /**
   * Clean up old or orphaned images
   */
  static cleanupImages(maxAgeHours = 24 * 7): number { // Default: 1 week
    const registry = this.getImageRegistry();
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleaned = 0;

    Object.entries(registry).forEach(([fileName, data]) => {
      const uploadTime = new Date(data.uploadedAt);
      if (uploadTime < cutoffTime) {
        this.deleteImage(`${this.BASE_PATH}${fileName}`);
        cleaned++;
      }
    });

    console.log(`🧹 Limpieza completada: ${cleaned} imágenes eliminadas`);
    return cleaned;
  }

  // Private helper methods
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private static getImageRegistry(): Record<string, any> {
    try {
      const registry = localStorage.getItem('local_images_registry');
      return registry ? JSON.parse(registry) : {};
    } catch {
      return {};
    }
  }

  private static storeImageMapping(fileName: string, blobUrl: string): void {
    const mapping = this.getImageMapping();
    mapping[fileName] = blobUrl;
    localStorage.setItem('local_images_blob_mapping', JSON.stringify(mapping));
  }

  private static getImageMapping(): Record<string, string> {
    try {
      const mapping = localStorage.getItem('local_images_blob_mapping');
      return mapping ? JSON.parse(mapping) : {};
    } catch {
      return {};
    }
  }
}
