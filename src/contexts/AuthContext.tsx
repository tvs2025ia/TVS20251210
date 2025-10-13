// src/contexts/AuthContext.tsx - VERSION MULTI-TIENDA
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { indexedDBService } from '../services/indexedDBService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, storeId: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  canAccessStore: (storeId: string) => boolean;
  switchStore: (storeId: string) => boolean;
  updateLastLogin: (userId: string) => Promise<void>;
  getAllowedStores: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allowedStores, setAllowedStores] = useState<string[]>([]);

  // ============== INICIALIZACIÓN ==============
  
  useEffect(() => {
    const initialize = async () => {
      try {
        // Inicializar IndexedDB
        await indexedDBService.init();
        console.log('✅ IndexedDB inicializado');

        // Intentar restaurar sesión
        await loadPersistedSession();
      } catch (error) {
        console.error('Error inicializando:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // ============== GESTIÓN DE SESIÓN ==============

  const loadPersistedSession = async () => {
    try {
      const savedSession = localStorage.getItem('pos_user_session');
      if (!savedSession) return;

      const sessionData = JSON.parse(savedSession);
      
      // Verificar que la sesión no haya expirado (24 horas)
      const sessionAge = Date.now() - sessionData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000;
      
      if (sessionAge >= maxAge) {
        console.log('⏰ Sesión expirada');
        localStorage.removeItem('pos_user_session');
        return;
      }

      console.log('🔄 Restaurando sesión:', sessionData.user.username);
      setUser(sessionData.user);
      setAllowedStores(sessionData.allowedStores || []);
      
      await updateLastLogin(sessionData.user.id);
    } catch (error) {
      console.error('Error restaurando sesión:', error);
      localStorage.removeItem('pos_user_session');
    }
  };

  const persistSession = (userData: User, stores: string[]) => {
    try {
      const sessionData = {
        user: userData,
        allowedStores: stores,
        timestamp: Date.now()
      };
      localStorage.setItem('pos_user_session', JSON.stringify(sessionData));
      console.log('💾 Sesión persistida');
    } catch (error) {
      console.error('Error persistiendo sesión:', error);
    }
  };

  // ============== AUTENTICACIÓN ==============

  const login = async (
    username: string, 
    password: string, 
    storeId: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔑 Intentando login:', { username, storeId });
  
      let authenticatedUser: User | null = null;
      let userAllowedStores: string[] = [];
  
      // 1. Intentar autenticación con Supabase (PRIORIDAD)
      try {
        console.log('🌐 Intentando autenticación online...');
        authenticatedUser = await SupabaseService.authenticateUserMultiStore(
          username,
          password,
          storeId
        );
  
        if (authenticatedUser) {
          // Obtener tiendas permitidas
          if (authenticatedUser.role === 'admin') {
            const allStores = await SupabaseService.getAllStores();
            userAllowedStores = allStores.map(s => s.id);
          } else {
            userAllowedStores = await SupabaseService.getUserStores(authenticatedUser.id);
          }
  
          // Verificar acceso a la tienda seleccionada
          if (authenticatedUser.role === 'employee' && 
              !userAllowedStores.includes(storeId)) {
            console.log('❌ Usuario no tiene acceso a esta tienda');
            return false;
          }
  
          // Guardar en IndexedDB para offline
          await indexedDBService.saveUser(authenticatedUser, userAllowedStores);
          
          console.log('✅ Login online exitoso');
        }
      } catch (onlineError) {
        console.warn('⚠️ Error en autenticación online:', onlineError);
      }
  
      // 2. Si falló online, intentar IndexedDB (FALLBACK OFFLINE)
      if (!authenticatedUser) {
        console.log('💾 Intentando autenticación offline...');
        authenticatedUser = await indexedDBService.getUser(username, password);
  
        if (authenticatedUser) {
          if (authenticatedUser.role === 'admin') {
            // Admin: cargar todas las tiendas del cache
            try {
              const cachedStores = localStorage.getItem('cached_stores');
              if (cachedStores) {
                const stores = JSON.parse(cachedStores);
                userAllowedStores = stores.map((s: any) => s.id);
              }
            } catch (e) {
              console.warn('Error cargando tiendas del cache:', e);
              userAllowedStores = [];
            }
          } else {
            // Empleado: obtener de IndexedDB
            userAllowedStores = await indexedDBService.getUserStores(authenticatedUser.id);
          }
  
          // Verificar acceso a tienda seleccionada
          if (authenticatedUser.role === 'employee' && 
              !userAllowedStores.includes(storeId)) {
            console.log('❌ Usuario no tiene acceso a esta tienda (offline)');
            return false;
          }
  
          console.log('✅ Login offline exitoso');
        }
      }
  
      // Validación final
      if (!authenticatedUser) {
        console.log('❌ Credenciales incorrectas');
        return false;
      }
  
      // Actualizar estado con la tienda seleccionada
      const userWithStore = { ...authenticatedUser, storeId };
      setUser(userWithStore);
      setAllowedStores(userAllowedStores);
      persistSession(userWithStore, userAllowedStores);
      await updateLastLogin(userWithStore.id);
  
      console.log('✅ Login completado:', {
        user: userWithStore.username,
        role: userWithStore.role,
        storeId: userWithStore.storeId,
        allowedStores: userAllowedStores
      });
  
      return true;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ============== CONTROL DE ACCESO ==============

  const canAccessStore = (storeId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return allowedStores.includes(storeId);
  };

  const switchStore = (storeId: string): boolean => {
    if (!user) return false;
    
    // Admin puede cambiar a cualquier tienda
    if (user.role === 'admin') {
      console.log('🏪 Admin cambiando de tienda:', { from: user.storeId, to: storeId });
      const updatedUser = { ...user, storeId };
      setUser(updatedUser);
      persistSession(updatedUser, allowedStores);
      return true;
    }
    
    // Empleados solo pueden acceder a sus tiendas asignadas
    if (!allowedStores.includes(storeId)) {
      console.log('❌ Empleado no tiene acceso a esta tienda');
      return false;
    }
    
    console.log('🏪 Empleado cambiando de tienda:', { from: user.storeId, to: storeId });
    const updatedUser = { ...user, storeId };
    setUser(updatedUser);
    persistSession(updatedUser, allowedStores);
    return true;
  };

  const getAllowedStores = async (): Promise<string[]> => {
    if (!user) return [];
    return allowedStores;
  };

  // ============== UTILIDADES ==============

  const updateLastLogin = async (userId: string) => {
    try {
      await SupabaseService.updateUserLastLogin(userId);
    } catch (error) {
      console.warn('Error actualizando último login:', error);
    }
  };

  const logout = () => {
    console.log('👋 Cerrando sesión');
    localStorage.removeItem('pos_user_session');
    setUser(null);
    setAllowedStores([]);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    canAccessStore,
    switchStore,
    updateLastLogin,
    getAllowedStores
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}