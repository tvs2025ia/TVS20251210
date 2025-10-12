// hooks/useDataSync.ts
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

/**
 * Hook personalizado para manejar la sincronización automática de datos
 * cuando cambia el usuario o la tienda
 */
export function useDataSync() {
  const { user } = useAuth();
  const { refreshData, isConnected, isLoading } = useData();
  const lastUserRef = useRef<string | null>(null);
  const lastStoreRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentStoreId = user?.storeId || null;

    // Verificar si cambió el usuario o la tienda
    const userChanged = lastUserRef.current !== currentUserId;
    const storeChanged = lastUserRef.current !== null && lastStoreRef.current !== currentStoreId;

    if (user && isConnected && (userChanged || storeChanged)) {
      console.log('🔄 useDataSync: Detectado cambio, refrescando datos...', {
        userId: currentUserId,
        storeId: currentStoreId,
        userChanged,
        storeChanged,
        prevUser: lastUserRef.current,
        prevStore: lastStoreRef.current
      });

      // Limpiar timeout previo si existe
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Refrescar datos con un pequeño delay para evitar múltiples llamadas
      refreshTimeoutRef.current = setTimeout(() => {
        refreshData().catch(error => {
          console.error('❌ useDataSync: Error refrescando datos:', error);
        });
      }, 100);
    }

    // Actualizar referencias
    lastUserRef.current = currentUserId;
    lastStoreRef.current = currentStoreId;

    // Cleanup
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [user?.id, user?.storeId, isConnected, refreshData]);

  return {
    isLoading,
    isConnected,
    user
  };
}