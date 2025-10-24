// src/services/offlineService.ts
import { Product, Customer, Sale, Expense, CashMovement } from '../types';

export class OfflineService {
  private static dbName = 'POSDatabase';
  private static version = 3;

  // 🟦 Inicializar base de datos
  static async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = [
          'products',
          'customers',
          'sales',
          'expenses',
          'cash_movements',
          'sync_queue'
        ];

        stores.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            this.createObjectStore(db, name);
          }
        });
      };
    });
  }

  // 🟩 Crear object store
  private static createObjectStore(db: IDBDatabase, storeName: string) {
    switch (storeName) {
      case 'products':
        const p = db.createObjectStore('products', { keyPath: 'id' });
        p.createIndex('storeId', 'storeId', { unique: false });
        p.createIndex('sku', 'sku', { unique: true });
        break;

      case 'customers':
        const c = db.createObjectStore('customers', { keyPath: 'id' });
        c.createIndex('storeId', 'storeId', { unique: false });
        break;

      case 'sales':
        const s = db.createObjectStore('sales', { keyPath: 'id' });
        s.createIndex('storeId', 'storeId', { unique: false });
        s.createIndex('date', 'date', { unique: false });
        break;

      case 'expenses':
        const e = db.createObjectStore('expenses', { keyPath: 'id' });
        e.createIndex('storeId', 'storeId', { unique: false });
        break;

      case 'cash_movements':
        const m = db.createObjectStore('cash_movements', { keyPath: 'id' });
        m.createIndex('storeId', 'storeId', { unique: false });
        break;

      case 'sync_queue':
        const q = db.createObjectStore('sync_queue', { keyPath: 'id' });
        q.createIndex('type', 'type', { unique: false });
        q.createIndex('priority', 'priority', { unique: false });
        q.createIndex('createdAt', 'createdAt', { unique: false });
        break;
    }
  }

  // 🟨 Obtener DB
  private static async getDB(): Promise<IDBDatabase> {
    try {
      const request = indexedDB.open(this.dbName, this.version);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const stores = [
            'products',
            'customers',
            'sales',
            'expenses',
            'cash_movements',
            'sync_queue'
          ];

          stores.forEach((name) => {
            if (!db.objectStoreNames.contains(name)) {
              this.createObjectStore(db, name);
            }
          });
        };
      });
    } catch (error) {
      return await this.init();
    }
  }

  // 🧾 Guardar venta offline
  static async saveSaleOffline(sale: Sale): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sales'], 'readwrite');
      const salesStore = tx.objectStore('sales');

      // Solo guardar en IndexedDB como respaldo, NO agregar a sync_queue
      salesStore.put(sale);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      console.log('✅ Venta guardada en IndexedDB (respaldo):', sale.id);
    } catch (error) {
      console.error('Error guardando venta en IndexedDB:', error);
      throw error;
    }
  }

  // 💰 Guardar gasto offline
  static async saveExpenseOffline(expense: Expense): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['expenses'], 'readwrite');
      const expensesStore = tx.objectStore('expenses');

      // Solo guardar en IndexedDB como respaldo, NO agregar a sync_queue
      expensesStore.put(expense);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      console.log('✅ Gasto guardado en IndexedDB (respaldo):', expense.id);
    } catch (error) {
      console.error('Error guardando gasto en IndexedDB:', error);
      throw error;
    }
  }

  // 📦 Obtener cola de sincronización
  static async getSyncQueue(): Promise<any[]> {
    try {
      const db = await this.getDB();
      if (!db.objectStoreNames.contains('sync_queue')) return [];

      const tx = db.transaction(['sync_queue'], 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error obteniendo cola de sync:', error);
      return [];
    }
  }

  // ➕ Agregar a la cola
  static async addToSyncQueue(type: string, data: any, priority = 0): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');

      const syncItem = {
        id: crypto.randomUUID(),
        type,
        data,
        priority,
        retries: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      store.add(syncItem);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('Error agregando a sync queue:', error);
      throw error;
    }
  }

  // ❌ Eliminar item de cola
  static async removeSyncQueueItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sync_queue'], 'readwrite');
      tx.objectStore('sync_queue').delete(id);
    } catch (error) {
      console.error('Error eliminando sync item:', error);
    }
  }

  // 🔁 Incrementar reintentos
  static async incrementSyncRetries(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.retries = (item.retries || 0) + 1;
          item.updatedAt = new Date();
          store.put(item);
        }
      };
    } catch (error) {
      console.error('Error incrementando retries:', error);
    }
  }

  // ✅ Marcar venta como sincronizada
  static async markSaleSynced(saleId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sales'], 'readwrite');
      const store = tx.objectStore('sales');
      const request = store.get(saleId);

      request.onsuccess = () => {
        const sale = request.result;
        if (sale) {
          sale.synced = true;
          store.put(sale);
        }
      };
    } catch (error) {
      console.error('Error marcando venta sincronizada:', error);
    }
  }

  // 🔍 Métodos de obtención offline
  static async getProductsOffline(storeId: string): Promise<Product[]> {
    return this.getByStoreId<Product>('products', storeId);
  }

  static async getCustomersOffline(storeId: string): Promise<Customer[]> {
    return this.getByStoreId<Customer>('customers', storeId);
  }

  static async getSalesOffline(storeId: string): Promise<Sale[]> {
    return this.getByStoreId<Sale>('sales', storeId);
  }

  static async getExpensesOffline(storeId: string): Promise<Expense[]> {
    return this.getByStoreId<Expense>('expenses', storeId);
  }

  static async getCashMovementsOffline(storeId: string): Promise<CashMovement[]> {
    return this.getByStoreId<CashMovement>('cash_movements', storeId);
  }

  // ♻️ Método auxiliar reutilizable
  private static async getByStoreId<T>(storeName: string, storeId: string): Promise<T[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('storeId');
      const request = index.getAll(storeId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error obteniendo ${storeName}:`, error);
      return [];
    }
  }

  // 💾 Guardar productos/clientes offline
  static async saveProductsOffline(products: Product[]): Promise<void> {
    await this.bulkSave('products', products);
  }

  static async saveCustomersOffline(customers: Customer[]): Promise<void> {
    await this.bulkSave('customers', customers);
  }

  private static async bulkSave(storeName: string, data: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);

      data.forEach((item) => store.put(item));

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(`Error guardando ${storeName} offline:`, error);
    }
  }

  // 🧹 Limpiar todos los datos
  static async clearAllData(): Promise<void> {
    try {
      const db = await this.getDB();
      const stores = [
        'products',
        'customers',
        'sales',
        'expenses',
        'cash_movements',
        'sync_queue'
      ];

      const tx = db.transaction(stores, 'readwrite');
      stores.forEach((name) => tx.objectStore(name).clear());

      console.log('🗑️ Datos offline eliminados correctamente');
    } catch (error) {
      console.error('Error limpiando datos offline:', error);
      throw error;
    }
  }

  // 📊 Estadísticas de almacenamiento
  static async getStorageStats(): Promise<{
    sales: number;
    products: number;
    customers: number;
    expenses: number;
    pendingSync: number;
  }> {
    try {
      const db = await this.getDB();

      const [sales, products, customers, expenses, pendingSync] = await Promise.all([
        this.getStoreCount(db, 'sales'),
        this.getStoreCount(db, 'products'),
        this.getStoreCount(db, 'customers'),
        this.getStoreCount(db, 'expenses'),
        this.getStoreCount(db, 'sync_queue')
      ]);

      return { sales, products, customers, expenses, pendingSync };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { sales: 0, products: 0, customers: 0, expenses: 0, pendingSync: 0 };
    }
  }

  private static async getStoreCount(db: IDBDatabase, storeName: string): Promise<number> {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) return resolve(0);
      const tx = db.transaction([storeName], 'readonly');
      const request = tx.objectStore(storeName).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  // 🔧 Verificar stores faltantes
  static async ensureObjectStores(): Promise<void> {
    const db = await this.getDB();
    const stores = [
      'products',
      'customers',
      'sales',
      'expenses',
      'cash_movements',
      'sync_queue'
    ];

    stores.forEach((name) => {
      if (!db.objectStoreNames.contains(name)) {
        console.warn(`Object store ${name} faltante, recreando...`);
        this.createObjectStore(db, name);
      }
    });
  }
}

// 🟢 Inicializar automáticamente
OfflineService.init().catch((err) =>
  console.error('Error inicializando OfflineService:', err)
);
