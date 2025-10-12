import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { Store, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { stores, isLoading: storesLoading } = useStore();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema POS</h1>
          <p className="text-gray-600 mt-2">Ingresa a tu cuenta</p>
        </div>

        {/* Demo credentials info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Credenciales de prueba:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <div><strong>Admin:</strong> admin / 123456</div>
            <div><strong>Empleado:</strong> empleado1 / 123456</div>
            <div><strong>Empleado:</strong> empleado2 / 123456 (solo Sucursal Norte)</div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tienda
            </label>
            {storesLoading ? (
              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-500">Cargando tiendas...</span>
              </div>
            ) : (
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              >
                <option value="">Selecciona una tienda</option>
                {stores.filter(store => store.isActive).map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            )}
            {!storesLoading && stores.length === 0 && (
              <p className="text-sm text-red-600 mt-1">
                No hay tiendas disponibles. Contacta al administrador.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Sistema POS Multi-tienda v1.0
          </p>
        </div>
      </div>
    </div>
  );
}