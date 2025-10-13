import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { useAuth } from './AuthContext';

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
  addStore: (store: Store) => void;
  updateStore: (store: Store) => void;
  deleteStore: (id: string) => void;
  isLoading: boolean;
  loadStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    // Set first active store as default when stores are loaded
    if (stores.length > 0 && !currentStore && !user) {
      const firstActiveStore = stores.find(s => s.isActive) || stores[0];
      setCurrentStoreState(firstActiveStore);
    }
  }, [stores, currentStore, user]);

  // Sincronizar tienda actual con usuario logueado (excepto admin)
useEffect(() => {
  if (user?.role === 'admin') return; // 👈 evitar sobrescribir al admin

  if (user?.storeId && stores.length > 0) {
    const userStore = stores.find(s => s.id === user.storeId);
    if (userStore) {
      if (!currentStore || currentStore.id !== userStore.id) {
        console.log('🏪 Estableciendo tienda del usuario:', userStore.name);
        setCurrentStoreState(userStore);
      }
    }
  }
}, [user?.storeId, stores, currentStore]);

  const loadStores = async () => {
    try {
      setIsLoading(true);
      console.log('🏪 Cargando tiendas desde Supabase...');
      
      const storesFromSupabase = await SupabaseService.getAllStores();
      
      if (storesFromSupabase.length > 0) {
        setStores(storesFromSupabase);
        localStorage.setItem('cached_stores', JSON.stringify(storesFromSupabase));
        console.log(`✅ ${storesFromSupabase.length} tiendas cargadas desde Supabase`);
      } else {
        // Intentar cargar del cache
        const cachedStores = localStorage.getItem('cached_stores');
        if (cachedStores) {
          const stores = JSON.parse(cachedStores);
          setStores(stores);
          console.log(`✅ ${stores.length} tiendas cargadas desde cache`);
        } else {
          console.warn('⚠️ No hay tiendas disponibles en Supabase ni en cache');
          setStores([]);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando tiendas desde Supabase:', error);
      
      // Fallback al cache si hay error
      try {
        const cachedStores = localStorage.getItem('cached_stores');
        if (cachedStores) {
          const stores = JSON.parse(cachedStores);
          setStores(stores);
          console.log(`✅ ${stores.length} tiendas cargadas desde cache (fallback)`);
        } else {
          console.error('❌ No hay tiendas disponibles');
          setStores([]);
        }
      } catch (cacheError) {
        console.error('Error cargando cache:', cacheError);
        setStores([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentStore = (store: Store) => {
    console.log('🏪 Cambiando tienda actual a:', store.name);
    setCurrentStoreState(store);
  };

  const addStore = async (store: Store) => {
    try {
      console.log('🏪 Creando nueva tienda:', store.name);
      
      const savedStore = await SupabaseService.saveStore(store);
      setStores(prevStores => [...prevStores, savedStore]);
      
      // Actualizar cache
      const updatedStores = [...stores, savedStore];
      localStorage.setItem('cached_stores', JSON.stringify(updatedStores));
      
      console.log('✅ Tienda creada exitosamente:', savedStore.name);
    } catch (error) {
      console.error('❌ Error creando tienda:', error);
      throw error;
    }
  };

  const updateStore = async (store: Store) => {
    try {
      console.log('🏪 Actualizando tienda:', store.name);
      
      const savedStore = await SupabaseService.saveStore(store);
      setStores(prevStores => 
        prevStores.map(s => s.id === savedStore.id ? savedStore : s)
      );
      
      // Actualizar cache
      const updatedStores = stores.map(s => s.id === savedStore.id ? savedStore : s);
      localStorage.setItem('cached_stores', JSON.stringify(updatedStores));
      
      if (currentStore?.id === savedStore.id) {
        setCurrentStoreState(savedStore);
      }
      
      console.log('✅ Tienda actualizada exitosamente:', savedStore.name);
    } catch (error) {
      console.error('❌ Error actualizando tienda:', error);
      throw error;
    }
  };

  const deleteStore = async (id: string) => {
    try {
      const storeToDelete = stores.find(s => s.id === id);
      console.log('🏪 Desactivando tienda:', storeToDelete?.name);
      
      await SupabaseService.deleteStore(id);
      setStores(prevStores => 
        prevStores.map(s => s.id === id ? { ...s, isActive: false } : s)
      );
      
      // Actualizar cache
      const updatedStores = stores.map(s => s.id === id ? { ...s, isActive: false } : s);
      localStorage.setItem('cached_stores', JSON.stringify(updatedStores));
      
      if (currentStore?.id === id) {
        const activeStores = stores.filter(s => s.isActive && s.id !== id);
        if (activeStores.length > 0) {
          setCurrentStoreState(activeStores[0]);
        }
      }
      
      console.log('✅ Tienda desactivada exitosamente');
    } catch (error) {
      console.error('❌ Error desactivando tienda:', error);
      throw error;
    }
  };

  const value = {
    stores,
    currentStore,
    setCurrentStore,
    addStore,
    updateStore,
    deleteStore,
    isLoading,
    loadStores
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}