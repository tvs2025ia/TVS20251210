import React, { useState } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function OfflineIndicator() {
  const { 
    isOnline, 
    syncStatus, 
    pendingSyncCount, 
    lastSyncResult, 
    forceSyncNow, 
    clearOfflineData,
    getStorageStats 
  } = useOfflineSync();
  
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [storageStats, setStorageStats] = useState<any>(null);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await forceSyncNow();
    } finally {
      setSyncing(false);
    }
  };

  const handleShowDetails = async () => {
    if (!showDetails) {
      const stats = await getStorageStats();
      setStorageStats(stats);
    }
    setShowDetails(!showDetails);
  };

  const handleClearOfflineData = async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de que quieres eliminar todos los datos offline?\n\n' +
      'Esto eliminará:\n' +
      '- Ventas no sincronizadas\n' +
      '- Datos en caché\n' +
      '- Cola de sincronización\n\n' +
      'Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      await clearOfflineData();
      setStorageStats(null);
      alert('Datos offline eliminados correctamente');
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus?.type === 'syncing' || syncing) return 'bg-yellow-500';
    if (pendingSyncCount > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Sin conexión';
    if (syncStatus?.type === 'syncing' || syncing) return 'Sincronizando...';
    if (pendingSyncCount > 0) return `${pendingSyncCount} pendientes`;
    return 'Sincronizado';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-3 h-3" />;
    if (syncStatus?.type === 'syncing' || syncing) return <RefreshCw className="w-3 h-3 animate-spin" />;
    if (pendingSyncCount > 0) return <Clock className="w-3 h-3" />;
    return <Wifi className="w-3 h-3" />;
  };

  return (
    <>
      {/* Main compact indicator - Fixed at bottom right */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Compact header */}
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              {getStatusIcon()}
              <span className="text-xs font-medium text-gray-700">
                {getStatusText()}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {isOnline && pendingSyncCount > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  title="Sincronizar ahora"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              )}
              
              <button
                onClick={handleShowDetails}
                className="p-1 text-gray-600 hover:text-gray-800"
                title={showDetails ? "Ocultar detalles" : "Ver detalles"}
              >
                {showDetails ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable details section */}
          {showDetails && (
            <div className="px-2 pb-2 border-t border-gray-100">
              <div className="space-y-2 pt-2">
                {/* Connection status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Conexión:</span>
                  <span className="text-xs font-medium">
                    {isOnline ? 'Conectado' : 'Sin conexión'}
                  </span>
                </div>

                {/* Pending items */}
                {pendingSyncCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Pendientes:</span>
                    <span className="text-xs font-medium text-orange-600">
                      {pendingSyncCount}
                    </span>
                  </div>
                )}

                {/* Last sync result */}
                {lastSyncResult && (
                  <div className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Última sync:</span>
                      <span className="font-medium">
                        {lastSyncResult.success} ok
                        {lastSyncResult.errors > 0 && `, ${lastSyncResult.errors} err`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex space-x-1 pt-1">
                  {isOnline && pendingSyncCount > 0 && (
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="flex-1 bg-blue-100 text-blue-700 text-xs py-1 px-2 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors flex items-center justify-center"
                      title="Sincronizar ahora"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                      Sync
                    </button>
                  )}
                  
                  <button
                    onClick={handleClearOfflineData}
                    className="bg-red-100 text-red-700 text-xs py-1 px-2 rounded hover:bg-red-200 transition-colors flex items-center justify-center"
                    title="Limpiar datos offline"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full details modal for mobile */}
      {showDetails && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4 md:hidden">
          <div className="bg-white rounded-t-xl w-full max-w-md max-h-[70vh] overflow-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Estado de Sincronización</h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {isOnline ? (
                      <Wifi className="w-5 h-5 text-green-600" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {isOnline ? 'Conectado' : 'Sin conexión'}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
                </div>

                {/* Pending Sync Count */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="font-medium">Pendientes de sincronizar</span>
                  </div>
                  <span className="font-bold text-orange-600">{pendingSyncCount}</span>
                </div>

                {/* Storage Stats */}
                {storageStats && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Datos Almacenados Offline</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Ventas:</span>
                        <span>{storageStats.sales}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Productos:</span>
                        <span>{storageStats.products}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clientes:</span>
                        <span>{storageStats.customers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gastos:</span>
                        <span>{storageStats.expenses}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Sync Result */}
                {lastSyncResult && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Última Sincronización</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{lastSyncResult.success} elementos sincronizados</span>
                      </div>
                      {lastSyncResult.errors > 0 && (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>{lastSyncResult.errors} errores</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  {isOnline && pendingSyncCount > 0 && (
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleClearOfflineData}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Limpiar Datos Offline</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}