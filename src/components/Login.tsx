// src/components/Login.tsx - VERSION MULTI-TIENDA
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { SupabaseService } from '../services/supabaseService';
import { indexedDBService } from '../services/indexedDBService';
import { Store, Eye, EyeOff, AlertCircle, RefreshCw, Check } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const { login } = useAuth();
  const { stores, isLoading: storesLoading } = useStore();
  
  // ✅ NUEVO: Tiendas filtradas según usuario
  const [availableStores, setAvailableStores] = useState<typeof stores>([]);
  const [userChecked, setUserChecked] = useState(false);

  // ✅ Efecto para filtrar tiendas cuando cambia el usuario
  useEffect(() => {
    const checkUserStores = async () => {
      if (!username.trim() || storesLoading) {
        setAvailableStores(stores);
        setUserChecked(false);
        return;
      }

      setLoadingStores(true);
      setUserChecked(false);

      try {
        // Intentar obtener tiendas disponibles desde Supabase
        const storeIds = await SupabaseService.getAvailableStoresForUser(username);
        
        if (storeIds.length > 0) {
          // Filtrar tiendas disponibles
          const filtered = stores.filter(s => storeIds.includes(s.id) && s.isActive);
          setAvailableStores(filtered);
          
          // Auto-seleccionar si solo hay una tienda
          if (filtered.length === 1) {
            setSelectedStoreId(filtered[0].id);
          }
          
          setUserChecked(true);
          console.log(`✅ Usuario ${username} tiene acceso a ${filtered.length} tienda(s)`);
        } else {
          // Si no hay tiendas en Supabase, intentar con IndexedDB
          try {
            const localUser = await indexedDBService.getUser(username, '');
            if (localUser) {
              if (localUser.role === 'admin') {
                setAvailableStores(stores.filter(s => s.isActive));
              } else {
                const userStores = await indexedDBService.getUserStores(localUser.id);
                const filtered = stores.filter(s => userStores.includes(s.id) && s.isActive);
                setAvailableStores(filtered);
                
                if (filtered.length === 1) {
                  setSelectedStoreId(filtered[0].id);
                }
              }
              setUserChecked(true);
            } else {
              // Usuario no encontrado, mostrar todas las tiendas
              setAvailableStores(stores.filter(s => s.isActive));
            }
          } catch (localError) {
            console.warn('Error buscando usuario en IndexedDB:', localError);
            setAvailableStores(stores.filter(s => s.isActive));
          }
        }
      } catch (error) {
        console.warn('Error obteniendo tiendas del usuario:', error);
        // En caso de error, mostrar todas las tiendas
        setAvailableStores(stores.filter(s => s.isActive));
      } finally {
        setLoadingStores(false);
      }
    };

    // Debounce: esperar 500ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(checkUserStores, 500);
    return () => clearTimeout(timeoutId);
  }, [username, stores, storesLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !selectedStoreId) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(username, password, selectedStoreId);
      if (!success) {
        setError('Credenciales incorrectas o no tienes acceso a esta tienda');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Determinar qué tiendas mostrar
  const displayStores = availableStores.length > 0 ? availableStores : stores.filter(s => s.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema POS Multi-Tienda</h1>
          <p className="text-gray-600 mt-2">Ingresa a tu cuenta</p>
        </div>

        {/* Demo credentials info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Credenciales de prueba:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <div><strong>Admin:</strong> admin / 123456 (todas las tiendas)</div>
            <div><strong>Empleado:</strong> empleado1 / 123456</div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu usuario"
              disabled={loading}
              required
            />
            {userChecked && username && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <Check className="w-3 h-3 mr-1" />
                {availableStores.length} tienda(s) disponible(s)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa tu contraseña"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tienda *
            </label>
            {storesLoading || loadingStores ? (
              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                <RefreshCw className="animate-spin h-4 w-4 text-blue-600 mr-2" />
                <span className="text-gray-500 text-sm">
                  {loadingStores ? 'Verificando acceso...' : 'Cargando tiendas...'}
                </span>
              </div>
            ) : (
              <>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading || displayStores.length === 0}
                  required
                >
                  <option value="">
                    {displayStores.length === 0 
                      ? 'No hay tiendas disponibles'
                      : 'Selecciona una tienda'
                    }
                  </option>
                  {displayStores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                
                {username && userChecked && availableStores.length > 0 && availableStores.length < stores.length && (
                  <p className="text-xs text-blue-600 mt-1">
                    Mostrando solo tus tiendas asignadas ({availableStores.length} de {stores.length})
                  </p>
                )}
              </>
            )}
            
            {displayStores.length === 0 && !storesLoading && !loadingStores && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {username 
                    ? 'No tienes tiendas asignadas. Contacta al administrador.'
                    : 'No hay tiendas disponibles. Contacta al administrador.'
                  }
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || displayStores.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin w-5 h-5 mr-2" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Sistema POS Multi-tienda v2.0
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Modo online/offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}