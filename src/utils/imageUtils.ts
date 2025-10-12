export class ImageUtils {
  /**
   * Optimizes an image file for web use
   * Resizes to max dimensions and compresses to reduce file size
   */
  static async optimizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress the image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], this.generateFileName(file.name), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              resolve(file); // Fallback to original if optimization fails
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve(file); // Fallback to original if image can't be loaded
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generates a unique filename for the image
   */
  private static generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'jpg';
    return `product_${timestamp}_${random}.${extension}`;
  }

  /**
   * Creates a preview URL for an image file
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Validates if a file is a valid image
   */
  static isValidImage(file: File): boolean {
    return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024; // Max 10MB
  }

  /**
   * Gets image dimensions without loading the full image
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compresses image to specific file size (approximate)
   */
  static async compressToSize(file: File, maxSizeKB: number): Promise<File> {
    let quality = 0.9;
    let compressedFile = file;

    while (compressedFile.size > maxSizeKB * 1024 && quality > 0.1) {
      compressedFile = await this.optimizeImage(file, 800, 800, quality);
      quality -= 0.1;
    }

    return compressedFile;
  }

  /**
   * Creates multiple thumbnail sizes
   */
  static async createThumbnails(file: File): Promise<{
    small: File;
    medium: File;
    large: File;
  }> {
    const [small, medium, large] = await Promise.all([
      this.optimizeImage(file, 150, 150, 0.8),  // Small thumbnail
      this.optimizeImage(file, 400, 400, 0.85), // Medium thumbnail  
      this.optimizeImage(file, 800, 800, 0.9)   // Large thumbnail
    ]);

    return { small, medium, large };
  }
}
