// src/components/Login.tsx - SUPABASE FIRST (Sin datos mock)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { SupabaseService } from '../services/supabaseService';
import { Store, Eye, EyeOff, AlertCircle, RefreshCw, Check, Wifi, WifiOff } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { login } = useAuth();
  const { stores, isLoading: storesLoading } = useStore();
  
  const [availableStores, setAvailableStores] = useState<typeof stores>([]);
  const [userChecked, setUserChecked] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Conexión restaurada');
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log('⚠️ Sin conexión a internet');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar tiendas disponibles cuando cambia el usuario
  useEffect(() => {
    const checkUserStores = async () => {
      // Limpiar estados si no hay usuario o aún se están cargando las tiendas
      if (!username.trim() || storesLoading) {
        setAvailableStores([]);
        setUserChecked(false);
        setSelectedStoreId('');
        return;
      }

      setLoadingStores(true);
      setUserChecked(false);
      setError('');

      try {
        if (isOnline) {
          // PRIORIDAD 1: Supabase - Obtener tiendas disponibles
          console.log(`🔍 Verificando tiendas para usuario: ${username}`);
          const storeIds = await SupabaseService.getAvailableStoresForUser(username);
          
          if (storeIds.length > 0) {
            // Filtrar tiendas disponibles y activas
            const filtered = stores.filter(s => storeIds.includes(s.id) && s.isActive);
            setAvailableStores(filtered);
            
            // Auto-seleccionar si solo hay una tienda
            if (filtered.length === 1) {
              setSelectedStoreId(filtered[0].id);
              console.log(`✅ Auto-seleccionada tienda: ${filtered[0].name}`);
            }
            
            setUserChecked(true);
            console.log(`✅ Usuario tiene acceso a ${filtered.length} tienda(s) [Supabase]`);
          } else {
            // Usuario no encontrado o sin tiendas
            setAvailableStores([]);
            setUserChecked(true);
            console.log('⚠️ Usuario no encontrado o sin tiendas asignadas en Supabase');
          }
        } else {
          // OFFLINE: No podemos verificar las tiendas sin conexión
          // El usuario deberá haber iniciado sesión antes al menos una vez
          setAvailableStores([]);
          setUserChecked(true);
          console.log('⚠️ Modo offline - no se pueden verificar tiendas. Debe haber una sesión previa.');
        }
      } catch (error) {
        console.error('❌ Error obteniendo tiendas del usuario:', error);
        setAvailableStores([]);
        setUserChecked(true);
      } finally {
        setLoadingStores(false);
      }
    };

    // Debounce: esperar 500ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(checkUserStores, 500);
    return () => clearTimeout(timeoutId);
  }, [username, stores, storesLoading, isOnline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    if (!selectedStoreId) {
      setError('Por favor selecciona una tienda');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Intentando login:', { username, storeId: selectedStoreId });
      const success = await login(username, password, selectedStoreId);
      
      if (!success) {
        setError('Credenciales incorrectas o no tienes acceso a esta tienda');
        console.log('❌ Login fallido');
      }
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError('Error al iniciar sesión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const displayStores = availableStores;

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

        {/* Estado de conexión */}
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          isOnline 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-orange-50 border border-orange-200'
        }`}>
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
              <span className="text-sm text-green-700">Conectado a Supabase</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-orange-600 mr-2 flex-shrink-0" />
              <span className="text-sm text-orange-700">Modo offline - requiere sesión previa</span>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Ingresa tu usuario"
              disabled={loading}
              required
              autoComplete="username"
            />
            {userChecked && username && availableStores.length > 0 && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <Check className="w-3 h-3 mr-1 flex-shrink-0" />
                {availableStores.length} tienda(s) disponible(s)
              </p>
            )}
            {userChecked && username && availableStores.length === 0 && isOnline && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                Usuario no encontrado o sin tiendas asignadas
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Ingresa tu contraseña"
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Tienda */}
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
                  onChange={(e) => {
                    setSelectedStoreId(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={loading || displayStores.length === 0 || !username}
                  required
                >
                  <option value="">
                    {!username 
                      ? 'Primero ingresa tu usuario'
                      : displayStores.length === 0 
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
                
                {username && userChecked && availableStores.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Mostrando {availableStores.length} tienda(s) asignada(s)
                  </p>
                )}
              </>
            )}
            
            {displayStores.length === 0 && !storesLoading && !loadingStores && userChecked && username && isOnline && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>No tienes tiendas asignadas. Contacta al administrador para obtener acceso.</span>
                </p>
              </div>
            )}

            {!isOnline && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Modo offline: solo puedes iniciar sesión si lo has hecho antes en este dispositivo.</span>
                </p>
              </div>
            )}
          </div>

          {/* Botón de login */}
          <button
            type="submit"
            disabled={loading || (!isOnline && !username) || (isOnline && displayStores.length === 0 && userChecked)}
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

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Sistema POS Multi-tienda v2.0
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              <span>{isOnline ? 'Online' : 'Offline'} - Supabase First</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}