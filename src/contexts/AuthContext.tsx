import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { SupabaseService } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, storeId?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  canAccessStore: (storeId: string) => boolean;
  switchStore: (storeId: string) => boolean;
  updateLastLogin: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Mock users for demo (fallback when no users in database)
const mockUsers: User[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    username: 'admin',
    email: 'admin@tienda.com',
    role: 'admin',
    storeId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    username: 'empleado1',
    email: 'empleado1@tienda.com',
    role: 'employee',
    storeId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    username: 'empleado2',
    email: 'empleado2@tienda.com',
    role: 'employee',
    storeId: '22222222-2222-2222-2222-222222222222',
    createdAt: new Date(),
    isActive: true
  }
];

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // ✅ Cargar sesión persistida al inicializar
  useEffect(() => {
    const loadPersistedSession = async () => {
      try {
        const savedSession = localStorage.getItem('pos_user_session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // Verificar que la sesión no haya expirado (24 horas)
          const sessionAge = Date.now() - sessionData.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 horas
          
          if (sessionAge < maxAge) {
            console.log('🔄 Restaurando sesión persistida:', sessionData.user.username);
            setUser(sessionData.user);
            
            // Actualizar último login
            await updateLastLogin(sessionData.user.id);
          } else {
            console.log('⏰ Sesión expirada, eliminando...');
            localStorage.removeItem('pos_user_session');
          }
        }
      } catch (error) {
        console.error('Error restaurando sesión:', error);
        localStorage.removeItem('pos_user_session');
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedSession();
  }, []);

  // Load users from localStorage and Supabase
  useEffect(() => {
    const loadUsers = async () => {
      if (user) return; // No cargar usuarios si ya hay sesión activa
      
      try {
        // Load from localStorage first
        const localUsers = localStorage.getItem('cached_users');
        if (localUsers) {
          const parsedUsers = JSON.parse(localUsers);
          setAllUsers([...mockUsers, ...parsedUsers]);
        } else {
          setAllUsers(mockUsers);
        }

        // Try to load from Supabase if online
        try {
          const { SupabaseService } = await import('../services/supabaseService');
          const supabaseUsers = await SupabaseService.getAllUsers();
          if (supabaseUsers.length > 0) {
            setAllUsers([...mockUsers, ...supabaseUsers]);
            localStorage.setItem('cached_users', JSON.stringify(supabaseUsers));
          }
        } catch (error) {
          console.warn('No se pudieron cargar usuarios desde Supabase:', error);
        }

      } catch (error) {
        console.error('Error cargando usuarios:', error);
        setAllUsers(mockUsers);
      }
    };

    if (!isLoading) {
      loadUsers();
    }
  }, [isLoading, user]);

  // ✅ Función para actualizar último login
  const updateLastLogin = async (userId: string) => {
    try {
      await SupabaseService.updateUserLastLogin(userId);
    } catch (error) {
      console.warn('Error actualizando último login:', error);
    }
  };

  // ✅ Función para persistir sesión
  const persistSession = (userData: User) => {
    try {
      const sessionData = {
        user: userData,
        timestamp: Date.now()
      };
      localStorage.setItem('pos_user_session', JSON.stringify(sessionData));
      console.log('💾 Sesión persistida para:', userData.username);
    } catch (error) {
      console.error('Error persistiendo sesión:', error);
    }
  };
  const login = async (username: string, password: string, storeId?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔑 Intentando login...', { username, storeId });
      
      // ✅ Intentar autenticación con Supabase primero
      try {
        const authenticatedUser = await SupabaseService.authenticateUser(username, password);
        if (authenticatedUser) {
          // Verificar acceso a la tienda para empleados
          if (authenticatedUser.role === 'employee' && authenticatedUser.storeId !== storeId) {
            console.log('❌ Empleado no tiene acceso a esta tienda');
            return false;
          }
          
          // Para admin, permitir cualquier tienda
          const userWithStore = {
            ...authenticatedUser,
            storeId: storeId || authenticatedUser.storeId
          };
          
          setUser(userWithStore);
          persistSession(userWithStore);
          await updateLastLogin(userWithStore.id);
          
          console.log('✅ Login exitoso con Supabase:', { 
            userId: userWithStore.id, 
            storeId: userWithStore.storeId 
          });
          
          return true;
        }
      } catch (supabaseError) {
        console.warn('Error autenticando con Supabase, usando fallback:', supabaseError);
      }
      
      // ✅ Fallback a usuarios mock/locales
      const foundUser = allUsers.find(u => 
        u.username === username && u.isActive
      );
      
      if (foundUser && password === '123456') {
        if (foundUser.role === 'employee' && foundUser.storeId !== storeId) {
          console.log('❌ Empleado no tiene acceso a esta tienda');
          return false;
        }
        
        const userWithStore = {
          ...foundUser,
          storeId: storeId || foundUser.storeId
        };
        
        setUser(userWithStore);
        persistSession(userWithStore);
        
        console.log('✅ Login exitoso con datos locales:', { 
          userId: userWithStore.id, 
          storeId: userWithStore.storeId 
        });
        
        return true;
      }
      
      console.log('❌ Credenciales incorrectas');
      return false;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const canAccessStore = (storeId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.storeId === storeId;
  };

  const switchStore = (storeId: string): boolean => {
    if (!user) return false;
    
    if (user.role === 'admin') {
      console.log('🏪 Admin cambiando de tienda:', { 
        from: user.storeId, 
        to: storeId 
      });
      setUser(prev => prev ? { ...prev, storeId } : null);
      return true;
    }
    
    // Los empleados no pueden cambiar de tienda
    if (user.storeId !== storeId) {
      console.log('❌ Empleado no puede cambiar de tienda');
      return false;
    }
    
    return true;
  };

  const logout = () => {
    console.log('👋 Cerrando sesión...');
    localStorage.removeItem('pos_user_session');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    canAccessStore,
    switchStore,
    updateLastLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}