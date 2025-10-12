import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '../types';
import { SupabaseService } from '../services/supabaseService';

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

// Fallback stores for when Supabase is not available
const mockStores: Store[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Tienda Principal',
    address: 'Calle 123, Ciudad',
    phone: '+57 300 123 4567',
    email: 'principal@tienda.com',
    isActive: true
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sucursal Norte',
    address: 'Av. Norte 456, Ciudad',
    phone: '+57 300 123 4568',
    email: 'norte@tienda.com',
    isActive: true
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Sucursal Sur',
    address: 'Av. Sur 789, Ciudad',
    phone: '+57 300 123 4569',
    email: 'sur@tienda.com',
    isActive: true
  }
];

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    // Set first active store as default when stores are loaded
    if (stores.length > 0 && !currentStore) {
      const firstActiveStore = stores.find(s => s.isActive) || stores[0];
      setCurrentStoreState(firstActiveStore);
    }
  }, [stores]);

  const loadStores = async () => {
    try {
      setIsLoading(true);
      console.log('🏪 Cargando tiendas desde Supabase...');
      
      const storesFromSupabase = await SupabaseService.getAllStores();
      
      if (storesFromSupabase.length > 0) {
        setStores(storesFromSupabase);
        console.log(`✅ ${storesFromSupabase.length} tiendas cargadas desde Supabase`);
      } else {
        console.log('⚠️ No se encontraron tiendas en Supabase, usando datos mock');
        setStores(mockStores);
      }
    } catch (error) {
      console.error('❌ Error cargando tiendas desde Supabase:', error);
      console.log('📦 Usando tiendas mock como fallback');
      setStores(mockStores);
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
      
      // Save to Supabase first
      const savedStore = await SupabaseService.saveStore(store);
      
      // Update local state
      setStores(prevStores => [...prevStores, savedStore]);
      
      console.log('✅ Tienda creada exitosamente:', savedStore.name);
    } catch (error) {
      console.error('❌ Error creando tienda:', error);
      throw error;
    }
  };

  const updateStore = async (store: Store) => {
    try {
      console.log('🏪 Actualizando tienda:', store.name);
      
      // Save to Supabase first
      const savedStore = await SupabaseService.saveStore(store);
      
      // Update local state
      setStores(prevStores => 
        prevStores.map(s => s.id === savedStore.id ? savedStore : s)
      );
      
      // Update current store if it's the one being updated
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
      
      // Deactivate in Supabase
      await SupabaseService.deleteStore(id);
      
      // Update local state
      setStores(prevStores => 
        prevStores.map(s => s.id === id ? { ...s, isActive: false } : s)
      );
      
      // If current store was deleted, switch to first available store
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
