import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { SupabaseService } from './supabaseService';
import { ImageUtils } from '../utils/imageUtils';
import { LocalImageService } from './localImageService';

export interface BulkProductData {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
}

export class ProductService {
  static async uploadBulkProducts(products: BulkProductData[], storeId: string): Promise<{ success: Product[], errors: string[] }> {
    const success: Product[] = [];
    const errors: string[] = [];

    try {
      // Validate all products first
      const validProducts: BulkProductData[] = [];
      
      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        const rowNumber = i + 2; // +2 because CSV starts at row 2 (after header)

        // Validate required fields
        if (!productData.name || !productData.sku || !productData.category) {
          errors.push(`Fila ${rowNumber}: Faltan campos requeridos (nombre, SKU, categoría)`);
          continue;
        }

        // Validate numeric fields
        if (isNaN(productData.price) || productData.price < 0) {
          errors.push(`Fila ${rowNumber}: Precio inválido`);
          continue;
        }

        if (isNaN(productData.cost) || productData.cost < 0) {
          errors.push(`Fila ${rowNumber}: Costo inválido`);
          continue;
        }

        if (isNaN(productData.stock) || productData.stock < 0) {
          errors.push(`Fila ${rowNumber}: Stock inválido`);
          continue;
        }

        if (isNaN(productData.minStock) || productData.minStock < 0) {
          errors.push(`Fila ${rowNumber}: Stock mínimo inválido`);
          continue;
        }

        validProducts.push(productData);
      }

      if (validProducts.length === 0) {
        return { success, errors };
      }

      // Get all existing SKUs in one query for performance (table-agnostic)
      const skus = validProducts.map(p => p.sku);
      let existingSkus: Set<string>;
      try {
        existingSkus = await SupabaseService.getExistingSkus(skus);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        errors.push(`Error verificando SKUs existentes: ${msg}`);
        return { success, errors };
      }

      // Filter out products with existing SKUs
      const newProducts: Product[] = [];
      
      validProducts.forEach((productData, index) => {
        const rowNumber = index + 2;
        
        if (existingSkus.has(productData.sku)) {
          errors.push(`Fila ${rowNumber}: El SKU "${productData.sku}" ya existe`);
          return;
        }

        // Create local Product object
        const newProduct: Product = {
          id: crypto.randomUUID(),
          name: productData.name,
          sku: productData.sku,
          category: productData.category,
          price: productData.price,
          cost: productData.cost,
          stock: productData.stock,
          minStock: productData.minStock,
          storeId: storeId,
          imageUrl: productData.imageUrl
        };

        newProducts.push(newProduct);
      });

      if (newProducts.length === 0) {
        return { success, errors };
      }

      // Bulk insert all valid products at once for much better performance
      const insertedProducts = await SupabaseService.bulkUpsertProducts(newProducts);
      success.push(...insertedProducts);

      console.log(`✅ Bulk upload completado: ${success.length} productos guardados, ${errors.length} errores`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(`Error general del sistema: ${errorMessage}`);
      console.error('Error en bulk upload:', error);
    }

    return { success, errors };
  }

  static async syncProductsFromSupabase(storeId: string): Promise<Product[]> {
    try {
      console.log('🔄 Sincronizando productos desde Supabase...');
      
      // Use the optimized SupabaseService method
      const products = await SupabaseService.getAllProducts(storeId);
      
      console.log(`✅ ${products.length} productos sincronizados desde Supabase`);
      return products;

    } catch (error) {
      console.error('Error syncing products:', error);
      throw error;
    }
  }

  static async uploadProductImage(file: File, productId: string): Promise<string> {
    try {
      console.log(`📷 Subiendo imagen para producto ${productId} a carpeta local...`);

      // Validate image
      if (!ImageUtils.isValidImage(file)) {
        throw new Error('Archivo de imagen inválido o muy grande (máximo 10MB)');
      }

      // Optimize image before saving (max 800px, 85% quality)
      const optimizedFile = await ImageUtils.optimizeImage(file, 800, 800, 0.85);

      console.log(`📷 Imagen optimizada: ${file.size} bytes → ${optimizedFile.size} bytes`);

      // Save to local public/img folder instead of Supabase
      const imageUrl = await LocalImageService.saveProductImage(optimizedFile, productId);

      console.log(`✅ Imagen guardada localmente: ${imageUrl}`);
      return imageUrl;

    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Creates thumbnails for product images
   */
  static async createProductThumbnails(file: File, productId: string): Promise<{
    small: string;
    medium: string;
    large: string;
  }> {
    try {
      console.log(`📷 Creando miniaturas para producto ${productId}...`);

      const thumbnails = await ImageUtils.createThumbnails(file);

      const [smallUrl, mediumUrl, largeUrl] = await Promise.all([
        SupabaseService.uploadProductImage(thumbnails.small, `${productId}_small`),
        SupabaseService.uploadProductImage(thumbnails.medium, `${productId}_medium`),
        SupabaseService.uploadProductImage(thumbnails.large, `${productId}_large`)
      ]);

      console.log(`✅ Miniaturas creadas exitosamente`);

      return {
        small: smallUrl,
        medium: mediumUrl,
        large: largeUrl
      };

    } catch (error) {
      console.error('Error creating thumbnails:', error);
      throw error;
    }
  }
}
