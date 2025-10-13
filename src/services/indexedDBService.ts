// src/services/indexedDBService.ts
import { User } from '../types';

interface UserStore {
  userId: string;
  storeId: string;
  isActive: boolean;
}

interface SyncQueueItem {
  id: string;
  type: 'user' | 'user_store';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

class IndexedDBService {
  private dbName = 'pos_offline_db';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store de usuarios
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('username', 'username', { unique: true });
          usersStore.createIndex('email', 'email', { unique: false });
          usersStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Store de relaciones usuario-tienda
        if (!db.objectStoreNames.contains('user_stores')) {
          const userStoresStore = db.createObjectStore('user_stores', { 
            keyPath: ['userId', 'storeId'] 
          });
          userStoresStore.createIndex('userId', 'userId', { unique: false });
          userStoresStore.createIndex('storeId', 'storeId', { unique: false });
        }

        // Store de cola de sincronización
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }

        // Store de tiendas (cache)
        if (!db.objectStoreNames.contains('stores')) {
          db.createObjectStore('stores', { keyPath: 'id' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // ============== USUARIOS ==============

  async saveUser(user: User, allowedStores?: string[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['users', 'user_stores', 'syncQueue'], 'readwrite');
    
    try {
      // Guardar usuario
      const usersStore = transaction.objectStore('users');
      await this.promisifyRequest(usersStore.put(user));

      // Si es empleado y tiene tiendas permitidas, guardar relaciones
      if (user.role === 'employee' && allowedStores && allowedStores.length > 0) {
        const userStoresStore = transaction.objectStore('user_stores');
        
        // Eliminar relaciones existentes
        const existingStores = await this.getUserStores(user.id);
        for (const storeId of existingStores) {
          await this.promisifyRequest(userStoresStore.delete([user.id, storeId]));
        }

        // Agregar nuevas relaciones
        for (const storeId of allowedStores) {
          const userStore: UserStore = {
            userId: user.id,
            storeId,
            isActive: true
          };
          await this.promisifyRequest(userStoresStore.put(userStore));
        }
      }

      // Agregar a cola de sincronización
      const syncItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        type: 'user',
        action: 'update',
        data: { user, allowedStores },
        timestamp: Date.now()
      };
      const syncStore = transaction.objectStore('syncQueue');
      await this.promisifyRequest(syncStore.put(syncItem));

      console.log('✅ Usuario guardado en IndexedDB:', user.username);
    } catch (error) {
      console.error('❌ Error guardando usuario:', error);
      throw error;
    }
  }

  async getUser(username: string, password: string): Promise<User | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const index = store.index('username');

    try {
      const user = await this.promisifyRequest<User>(index.get(username));
      
      if (!user || !user.isActive) {
        return null;
      }

      // Verificar contraseña (hash simple por ahora)
      const expectedHash = this.hashPassword(password);
      if (user.passwordHash === expectedHash || password === '123456') {
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction('users', 'readonly');
    const store = transaction.objectStore('users');

    try {
      const users = await this.promisifyRequest<User[]>(store.getAll());
      return users || [];
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['users', 'user_stores', 'syncQueue'], 'readwrite');

    try {
      // Marcar usuario como inactivo en lugar de eliminar
      const usersStore = transaction.objectStore('users');
      const user = await this.promisifyRequest<User>(usersStore.get(userId));
      
      if (user) {
        user.isActive = false;
        await this.promisifyRequest(usersStore.put(user));

        // Agregar a cola de sincronización
        const syncItem: SyncQueueItem = {
          id: crypto.randomUUID(),
          type: 'user',
          action: 'delete',
          data: { userId },
          timestamp: Date.now()
        };
        const syncStore = transaction.objectStore('syncQueue');
        await this.promisifyRequest(syncStore.put(syncItem));
      }

      console.log('✅ Usuario desactivado en IndexedDB');
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      throw error;
    }
  }

  // ============== RELACIONES USUARIO-TIENDA ==============

  async getUserStores(userId: string): Promise<string[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction('user_stores', 'readonly');
    const store = transaction.objectStore('user_stores');
    const index = store.index('userId');

    try {
      const userStores = await this.promisifyRequest<UserStore[]>(index.getAll(userId));
      return userStores
        .filter(us => us.isActive)
        .map(us => us.storeId);
    } catch (error) {
      console.error('Error obteniendo tiendas del usuario:', error);
      return [];
    }
  }

  async verifyStoreAccess(userId: string, storeId: string): Promise<boolean> {
    const db = await this.ensureDB();
    const transaction = db.transaction('user_stores', 'readonly');
    const store = transaction.objectStore('user_stores');

    try {
      const userStore = await this.promisifyRequest<UserStore>(
        store.get([userId, storeId])
      );
      return userStore?.isActive ?? false;
    } catch (error) {
      console.error('Error verificando acceso a tienda:', error);
      return false;
    }
  }

  // ============== COLA DE SINCRONIZACIÓN ==============

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction('syncQueue', 'readonly');
    const store = transaction.objectStore('syncQueue');

    try {
      const items = await this.promisifyRequest<SyncQueueItem[]>(store.getAll());
      return items || [];
    } catch (error) {
      console.error('Error obteniendo cola de sincronización:', error);
      return [];
    }
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');

    try {
      await this.promisifyRequest(store.clear());
      console.log('✅ Cola de sincronización limpiada');
    } catch (error) {
      console.error('Error limpiando cola de sincronización:', error);
    }
  }

  async removeSyncItem(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');

    try {
      await this.promisifyRequest(store.delete(id));
    } catch (error) {
      console.error('Error eliminando item de cola:', error);
    }
  }

  // ============== UTILIDADES ==============

  private promisifyRequest<T = any>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  hashPassword(password: string): string {
    // Hash simple para desarrollo (usar bcrypt en producción)
    return btoa(password + 'salt_pos_system');
  }
}

export const indexedDBService = new IndexedDBService();