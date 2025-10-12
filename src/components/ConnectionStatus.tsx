import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { SyncService } from '../services/syncService';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const { isConnected, connectionError, retryConnection } = useData();
  const [syncStatus, setSyncStatus] = useState<{
    type: string;
    message: string;
  } | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = SyncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
      
      // Clear status after 3 seconds for success/error messages
      if (status.type === 'success' || status.type === 'error') {
        setTimeout(() => setSyncStatus(null), 3000);
      }
    });

    // Get initial pending sync count
    SyncService.getPendingSyncCount().then(setPendingSync);

    // Update pending count periodically
    const interval = setInterval(async () => {
      const count = await SyncService.getPendingSyncCount();
      setPendingSync(count);
    }, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await retryConnection();
    } catch (error) {
      console.error('Error retrying connection:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleForceSyncNow = async () => {
    try {
      const result = await SyncService.forceSyncNow();
      console.log('Manual sync result:', result);
      setPendingSync(0);
    } catch (error) {
      console.error('Error in manual sync:', error);
    }
  };

  const getStatusColor = () => {
    if (syncStatus?.type === 'syncing') return 'text-blue-600';
    if (syncStatus?.type === 'success') return 'text-green-600';
    if (syncStatus?.type === 'error') return 'text-red-600';
    if (isConnected) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (syncStatus?.type === 'syncing') return '🔄';
    if (syncStatus?.type === 'success') return '✅';
    if (syncStatus?.type === 'error') return '❌';
    if (isConnected) return '🟢';
    return '🟡';
  };

  const getStatusText = () => {
    if (syncStatus?.message) return syncStatus.message;
    if (isConnected) return 'Conectado';
    if (connectionError) return connectionError;
    return 'Sin conexión';
  };

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {/* Status indicator */}
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-medium">{getStatusText()}</span>
      </div>

      {/* Pending sync count */}
      {pendingSync > 0 && (
        <div className="flex items-center space-x-1 text-yellow-600">
          <span>📤</span>
          <span>{pendingSync} pendientes</span>
          {isConnected && (
            <button
              onClick={handleForceSyncNow}
              className="ml-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200 transition-colors"
              title="Sincronizar ahora"
            >
              Sync
            </button>
          )}
        </div>
      )}

      {/* Retry button for connection errors */}
      {!isConnected && connectionError && (
        <button
          onClick={handleRetryConnection}
          disabled={isRetrying}
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
          title="Reintentar conexión"
        >
          {isRetrying ? '⏳' : '🔄'} Reintentar
        </button>
      )}

      {/* Connection details tooltip */}
      <div className="relative group">
        <button className="text-gray-400 hover:text-gray-600">
          ℹ️
        </button>
        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="text-xs space-y-1">
            <div><strong>Estado:</strong> {isConnected ? 'Conectado a Supabase' : 'Modo offline'}</div>
            {connectionError && (
              <div className="text-red-600"><strong>Error:</strong> {connectionError}</div>
            )}
            {pendingSync > 0 && (
              <div className="text-yellow-600"><strong>Pendientes:</strong> {pendingSync} elementos sin sincronizar</div>
            )}
            <div className="text-gray-500 pt-1">
              {isConnected ? 'Los datos se guardan directamente en la base de datos' : 'Los datos se guardan localmente y se sincronizarán cuando se restaure la conexión'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}