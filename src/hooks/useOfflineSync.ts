import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncStatus, SyncResult } from '../services/syncService';
import { OfflineService } from '../services/offlineService';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Update pending sync count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await SyncService.getPendingSyncCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Error obteniendo contador de sincronización:', error);
    }
  }, []);

  // Force manual sync
  const forceSyncNow = useCallback(async (): Promise<SyncResult> => {
    try {
      const result = await SyncService.forceSyncNow();
      setLastSyncResult(result);
      await updatePendingCount();
      return result;
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      const errorResult = { success: 0, errors: 1, details: ['Error de sincronización'] };
      setLastSyncResult(errorResult);
      return errorResult;
    }
  }, [updatePendingCount]);

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await OfflineService.clearAllData();
      await updatePendingCount();
      console.log('🗑️ Datos offline eliminados');
    } catch (error) {
      console.error('Error eliminando datos offline:', error);
    }
  }, [updatePendingCount]);

  // Get storage statistics
  const getStorageStats = useCallback(async () => {
    try {
      return await OfflineService.getStorageStats();
    } catch (error) {
      console.error('Error obteniendo estadísticas de almacenamiento:', error);
      return { sales: 0, products: 0, customers: 0, expenses: 0, pendingSync: 0 };
    }
  }, []);

  useEffect(() => {
    // Initialize sync service
    SyncService.init();
    
    // Subscribe to sync status changes
    const unsubscribe = SyncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
      setIsOnline(status.type !== 'offline');
    });

    // Update pending count initially
    updatePendingCount();

    // Set up periodic sync check
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        updatePendingCount();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, [updatePendingCount]);

  return {
    isOnline,
    syncStatus,
    pendingSyncCount,
    lastSyncResult,
    forceSyncNow,
    clearOfflineData,
    getStorageStats,
    updatePendingCount
  };
}