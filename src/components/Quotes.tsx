import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, SaleItem, Quote, Customer, Sale } from '../types';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar,
  User,
  DollarSign,
  Eye,
  Edit3,
  Check,
  X,
  Clock,
  AlertCircle,
  Package,
  Truck,
  Minus,
  Menu,
  ChevronDown,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { CreateQuoteModal } from './CreateQuoteModal';
import { ViewQuoteModal } from './ViewQuoteModal';

// Estilos de impresión
const usePrintStyles = () => {
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #quote-print, #quote-print * { visibility: visible !important; }
        #quote-print { position: absolute; left: 0; top: 0; width: 90vw !important; background: white; font-size: 13px; line-height: 1.4; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
};

export function Quotes() {
  usePrintStyles();

  const { products, quotes, customers, addQuote, updateQuote, addSale } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Memoizar todos los datos del store para evitar renders innecesarios
  const storeProducts = React.useMemo(() => 
    products.filter(p => p.storeId === currentStore?.id), 
    [products, currentStore?.id]
  );
  
  const storeCustomers = React.useMemo(() => 
    customers.filter(c => c.storeId === currentStore?.id), 
    [customers, currentStore?.id]
  );
  
  const storeQuotes = React.useMemo(() => 
    quotes.filter(q => q.storeId === currentStore?.id) || [], 
    [quotes, currentStore?.id]
  );

  const filteredQuotes = storeQuotes.filter(quote => {
    const customer = storeCustomers.find(c => c.id === quote.customerId);
    const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedQuotes = [...filteredQuotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  // Función para convertir cotización en venta
  const convertToSale = async (quote: Quote) => {
    if (!user) {
      alert('Error: Usuario no autenticado');
      return;
    }

    try {
      const newSale: Sale = {
        id: Date.now().toString(),
        storeId: quote.storeId,
        employeeId: user.id,
        customerId: quote.customerId,
        items: quote.items,
        subtotal: quote.subtotal,
        discount: quote.discount,
        shippingCost: quote.shippingCost,
        total: quote.total,
        netTotal: quote.total,
        paymentMethod: 'cash',
        paymentMethodDiscount: 0,
        date: new Date(),
        invoiceNumber: `FAC-${Date.now()}`
      };

      await addSale(newSale);
      
      // Marcamos como aceptada en lugar de completed para evitar errores de tipos
      const updatedQuote = { 
        ...quote, 
        status: 'accepted' as const
      };
      
      await updateQuote(updatedQuote);
      
      alert('✅ Cotización convertida en venta exitosamente');
      setViewingQuote(null);
      
    } catch (error) {
      console.error('Error al convertir cotización en venta:', error);
      alert('❌ Error al convertir la cotización en venta');
    }
  };

  const handleSaveQuote = async (quote: Quote) => {
    if (editingQuote) {
      await updateQuote(quote);
      setEditingQuote(null);
    } else {
      await addQuote(quote);
      setShowCreateModal(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{currentStore?.name}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Nueva Cotización</span>
        </button>
      </div>

      {/* Stats - Responsiva */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{storeQuotes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {storeQuotes.filter(q => q.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Aceptadas</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {storeQuotes.filter(q => q.status === 'accepted').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {formatCurrency(storeQuotes.reduce((sum, q) => sum + q.total, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:hidden mb-3">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center justify-between text-sm font-medium text-gray-700"
          >
            <span>Filtros</span>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 ${!showMobileFilters ? 'hidden sm:flex' : ''}`}>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Buscar cotizaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="expired">Expiradas</option>
          </select>
        </div>
      </div>

      {/* Lista de cotizaciones - Vista móvil */}
      <div className="block sm:hidden space-y-3">
        {filteredQuotes.map(quote => {
          const customer = storeCustomers.find(c => c.id === quote.customerId);
          const isExpired = new Date() > new Date(quote.validUntil);
          const displayStatus = isExpired && quote.status === 'pending' ? 'expired' : quote.status;
          
          return (
            <div key={quote.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">#{quote.id}</h3>
                  <p className="text-sm text-gray-500">{new Date(quote.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                  {getStatusText(displayStatus)}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>{customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Válida hasta: </span>
                  </div>
                  <span className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                    {new Date(quote.validUntil).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(quote.total)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingQuote(quote)}
                  className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver</span>
                </button>
                <button
                  onClick={() => setEditingQuote(quote)}
                  className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de cotizaciones - Vista escritorio (tabla) */}
      <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cotización
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Válida Hasta
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotes.map(quote => {
                const customer = storeCustomers.find(c => c.id === quote.customerId);
                const isExpired = new Date() > new Date(quote.validUntil);
                const displayStatus = isExpired && quote.status === 'pending' ? 'expired' : quote.status;
                
                return (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{quote.id}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{customer?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                        {getStatusText(displayStatus)}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className={isExpired ? 'text-red-600' : ''}>
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingQuote(quote)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Ver cotización"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingQuote(quote)}
                          className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                          title="Editar cotización"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredQuotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron cotizaciones</p>
          </div>
        )}
      </div>

      {/* Mensaje cuando no hay cotizaciones en móvil */}
      {filteredQuotes.length === 0 && (
        <div className="block sm:hidden text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron cotizaciones</p>
        </div>
      )}

      {/* Modales */}
      {showCreateModal && (
        <CreateQuoteModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveQuote}
          storeProducts={storeProducts}
          storeCustomers={storeCustomers}
          currentStore={currentStore}
          user={user}
        />
      )}
      {editingQuote && (
        <CreateQuoteModal
          quote={editingQuote}
          onClose={() => setEditingQuote(null)}
          onSave={handleSaveQuote}
          storeProducts={storeProducts}
          storeCustomers={storeCustomers}
          currentStore={currentStore}
          user={user}
        />
      )}
      {viewingQuote && (
        <ViewQuoteModal
          quote={viewingQuote}
          onClose={() => setViewingQuote(null)}
          storeCustomers={storeCustomers}
          updateQuote={updateQuote}
          convertToSale={convertToSale}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
        />
      )}
    </div>
  );
}