import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useData } from '../contexts/DataContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { ProductService } from '../services/productService';
import { 
  Menu, 
  X, 
  Store, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings,
  LogOut,
  DollarSign,
  FileText,
  Calculator,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Home,
  Bookmark,
  Cloud,
  CloudOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const { stores, currentStore, setCurrentStore } = useStore();
  const { isConnected, refreshData } = useData();
  const { forceSyncNow, pendingSyncCount } = useOfflineSync();
  const [syncing, setSyncing] = useState(false);

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile) {
        setSidebarCollapsed(true);
      } else {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
          setSidebarCollapsed(savedState === 'true');
        }
      }
      
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Guardar el estado del sidebar
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed, isMobile]);

  // Bloquear scroll cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen, isMobile]);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: Home, admin: false },
    { name: 'Punto de Venta', id: 'pos', icon: ShoppingCart, admin: false },
    { name: 'Separados', id: 'layaway', icon: Bookmark, admin: false },
    { name: 'Registro de Ventas', id: 'sales', icon: FileText, admin: false },
    { name: 'Inventario', id: 'inventory', icon: Package, admin: false },
    { name: 'Clientes', id: 'customers', icon: Users, admin: false },
    { name: 'Cotizaciones', id: 'quotes', icon: FileText, admin: false },
    { name: 'Compras', id: 'purchases', icon: ShoppingBag, admin: false },
    { name: 'Ingresos', id: 'incomes', icon: TrendingUp, admin: true },
    { name: 'Egresos', id: 'expenses', icon: DollarSign, admin: false },
    { name: 'Cuadre de Caja', id: 'cash-register', icon: Calculator, admin: false },
    { name: 'Estadísticas', id: 'stats', icon: BarChart3, admin: false },
    { name: 'Administración', id: 'admin', icon: Settings, admin: true },
    { name: 'Reporte Financiero', id: 'financialreports', icon: FileText, admin: true },
    { name: 'Contabilidad', id: 'accounting', icon: BarChart3, admin: true },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.admin || (item.admin && user?.role === 'admin')
  );

  const handleNavigation = (itemId: string) => {
    onPageChange(itemId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleStoreChange = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setCurrentStore(store);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // ✅ Estado de conexión con botón de sync (unifica OfflineSync + Inventario)
  const ConnectionStatus = () => {
    const statusIcon = isConnected ? (
      <Cloud className="w-4 h-4 text-green-500" />
    ) : (
      <CloudOff className="w-4 h-4 text-orange-500" />
    );
    
    const statusText = isConnected ? 'Online' : 'Offline';
    const statusColor = isConnected ? 'text-green-600' : 'text-orange-600';

    const handleManualSync = async () => {
      setSyncing(true);
      try {
        console.log("🔄 Iniciando sincronización completa desde Layout...");
        // 1. Sincronizar datos offline → online
        await forceSyncNow();
        // 2. Sincronizar inventarios desde Supabase
        await ProductService.syncProductsFromSupabase();
        // 3. Refrescar datos globales
        await refreshData();
        console.log("✅ Sincronización completa finalizada");
      } catch (error) {
        console.error("❌ Error en sincronización:", error);
      } finally {
        setSyncing(false);
      }
    };

    return (
      <div className="flex items-center space-x-2">
        {statusIcon}
        <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
        
        {/* Botón pequeño de sync */}
        {isConnected && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
            title="Sincronizar ahora"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Mostrar pendientes */}
        {pendingSyncCount > 0 && (
          <span className="text-xs font-medium text-orange-600">
            {pendingSyncCount} pendientes
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isConnected && (
        <div className="bg-orange-50 border-b border-orange-200 p-3">
          <div className="flex items-center justify-center space-x-2 text-orange-800">
            <CloudOff className="w-5 h-5" />
            <span className="text-sm font-medium">
              Modo offline activado. Los datos se sincronizarán automáticamente al recuperar la conexión.
            </span>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Overlay móvil */}
        {sidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed z-50 lg:z-30 inset-y-0 left-0 transform bg-white border-r border-gray-200 
          flex flex-col transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-16' : 'w-64 xl:w-72'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <h1 className="text-lg font-bold text-gray-800">POS</h1>
            )}
            <button 
              onClick={toggleSidebar}
              className="p-1 rounded-md hover:bg-gray-100 lg:block hidden"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {filteredNavigation.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {!sidebarCollapsed && item.name}
              </button>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4 space-y-2">
            {!sidebarCollapsed && currentStore && (
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {currentStore.name}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              {!sidebarCollapsed && 'Cerrar sesión'}
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-16 xl:pl-16' : 'lg:pl-64 xl:pl-72'
        }`}>
          {/* Topbar */}
          <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex-1 flex justify-end items-center space-x-4">
              {/* ✅ Selector de tienda disponible para todos */}
              {stores.length > 0 && (
                <select
                  value={currentStore?.id || ''}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Estado de conexión + botón sync */}
              <ConnectionStatus />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
