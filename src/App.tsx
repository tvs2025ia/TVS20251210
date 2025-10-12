import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { DataProvider, useData } from './contexts/DataContext';
import { useServiceWorker } from './hooks/useServiceWorker';
import { useOfflineSync } from './hooks/useOfflineSync';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { LayawayComponent } from './components/Layaway';
import { Sales } from './components/Sales';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { Quotes } from './components/Quotes';
import { Purchases } from './components/Purchases';
import { Incomes } from './components/Incomes';
import { Expenses } from './components/Expenses';
import { CashRegister } from './components/CashRegister';
import { Statistics } from './components/Statistics';
import { Admin } from './components/Admin';
import { FinancialReports } from './components/FinancialReports';
import { Accounting } from './components/Accounting';

// ✅ Banner de notificación para datos cargándose
function DataLoadingBanner({ 
  hasInitialData, 
  criticalDataLoaded, 
  secondaryDataLoaded, 
  loadingProgress, 
  connectionError 
}: { 
  hasInitialData: boolean; 
  criticalDataLoaded: boolean; 
  secondaryDataLoaded: boolean; 
  loadingProgress: { critical: number; secondary: number };
  connectionError: string | null;
}) {
  // No mostrar nada si ya tenemos todos los datos
  if (criticalDataLoaded && secondaryDataLoaded) return null;

  const getMessage = () => {
    if (connectionError) {
      return `⚠��� ${connectionError}`;
    }
    if (!criticalDataLoaded) {
      return `📊 Cargando datos esenciales... ${loadingProgress.critical}%`;
    }
    if (!secondaryDataLoaded) {
      return `🔄 Sincronizando datos adicionales... ${loadingProgress.secondary}%`;
    }
    return 'Cargando...';
  };

  const getBannerStyle = () => {
    if (connectionError) {
      return "bg-amber-50 border-l-4 border-amber-400 text-amber-700";
    }
    return "bg-blue-50 border-l-4 border-blue-400 text-blue-700";
  };

  return (
    <div className={`${getBannerStyle()} p-3 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {!connectionError && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          )}
          <div className="text-sm">{getMessage()}</div>
        </div>
        {loadingProgress.critical > 0 && loadingProgress.critical < 100 && (
          <div className="ml-4 w-32">
            <div className="bg-white bg-opacity-50 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress.critical}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ Componente LoadingScreen solo para autenticación crítica
function LoadingScreen({ message = "Verificando autenticación..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-lg">{message}</p>
        <p className="mt-2 text-sm text-gray-500">
          Verificando credenciales...
        </p>
      </div>
    </div>
  );
}

// ✅ Hook para determinar si una página necesita datos críticos
function usePageDataRequirements() {
  // Páginas que requieren datos críticos actualizados
  const criticalDataPages = ['pos', 'cash-register'];
  
  // Páginas que funcionan mejor con datos completos pero no los requieren
  const preferredDataPages = ['sales', 'inventory', 'layaway'];
  
  const needsCriticalData = (page: string) => criticalDataPages.includes(page);
  const preferCompleteData = (page: string) => preferredDataPages.includes(page);
  
  return {
    criticalDataPages,
    preferredDataPages,
    needsCriticalData,
    preferCompleteData
  };
}

// ✅ Componente que maneja el estado de la aplicación con carga inteligente
function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isLoading: dataLoading, 
    hasInitialData, 
    criticalDataLoaded, 
    secondaryDataLoaded,
    loadingProgress,
    connectionError,
    retryConnection
  } = useData();
  
  const { isSupported: swSupported, isRegistered: swRegistered } = useServiceWorker();
  const { isOnline, pendingSyncCount } = useOfflineSync();
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const { needsCriticalData, preferCompleteData } = usePageDataRequirements();

  // ✅ Solo bloquear para autenticación
  if (authLoading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  // ✅ Si no hay usuario, mostrar login
  if (!user) {
    return <Login />;
  }

  // ✅ Wrapper para páginas que necesitan datos críticos
  const renderPageWithDataCheck = (pageContent: React.ReactNode) => {
    // Si la página actual necesita datos críticos y no los tenemos
    if (needsCriticalData(currentPage) && !criticalDataLoaded) {
      return (
        <div className="min-h-96 bg-gray-50 flex items-center justify-center rounded-lg">
          <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {currentPage === 'pos' ? 'Cargando Punto de Venta' : 'Cargando datos de caja'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Esta sección requiere datos actualizados para funcionar correctamente
            </p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress.critical}%` }}
              ></div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Ir al Dashboard
              </button>
              {connectionError && (
                <button
                  onClick={retryConnection}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Reintentar conexión
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Si la página prefiere datos completos, mostrar advertencia sutil
    if (preferCompleteData(currentPage) && criticalDataLoaded && !secondaryDataLoaded) {
      return (
        <div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center text-sm text-yellow-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Algunos datos se están cargando en segundo plano. La información puede estar incompleta.
            </div>
          </div>
          {pageContent}
        </div>
      );
    }

    return pageContent;
  };

  // ✅ Usuario autenticado - mostrar aplicación principal
  const renderPage = () => {
    const pageContent = (() => {
      switch (currentPage) {
        case 'dashboard':
          return <Dashboard onPageChange={setCurrentPage} />;
        case 'pos':
          return <POS />;
        case 'layaway':
          return <LayawayComponent />;
        case 'sales':
          return <Sales />;
        case 'inventory':
          return <Inventory />;
        case 'customers':
          return <Customers />;
        case 'quotes':
          return <Quotes />;
        case 'purchases':
          return <Purchases />;
        case 'incomes':
          return <Incomes />;  
        case 'expenses':
          return <Expenses />;
        case 'cash-register':
          return <CashRegister />;
        case 'stats':
          return <Statistics />;
        case 'admin':
          return <Admin />;
        case 'financialreports':
          return <FinancialReports />;
        case 'accounting':
          return <Accounting />;
        default:
          return <Dashboard onPageChange={setCurrentPage} />;
      }
    })();

    return renderPageWithDataCheck(pageContent);
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {/* ✅ Banner de estado de carga no intrusivo */}
      <DataLoadingBanner 
        hasInitialData={hasInitialData}
        criticalDataLoaded={criticalDataLoaded}
        secondaryDataLoaded={secondaryDataLoaded}
        loadingProgress={loadingProgress}
        connectionError={connectionError}
      />
      
      {renderPage()}
    </Layout>
  );
}

// ✅ Componente principal con providers
function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
