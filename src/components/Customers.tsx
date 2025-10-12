import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { Customer } from '../types';
import { 
  Search, 
  Plus, 
  Edit3, 
  Users, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  X,
  Check,
  User
} from 'lucide-react';

export function Customers() {
  const { customers, addCustomer, updateCustomer } = useData();
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const storeCustomers = customers.filter(c => c.storeId === currentStore?.id);
  
  const filteredCustomers = storeCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const CustomerModal = ({ customer, onClose, onSave }: {
    customer?: Customer;
    onClose: () => void;
    onSave: (customer: Customer) => void;
  }) => {
    const [formData, setFormData] = useState({
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name) {
        alert('El nombre es requerido');
        return;
      }

      const newCustomer: Customer = {
        id: customer?.id || crypto.randomUUID(),
        ...formData,
        storeId: currentStore?.id || '11111111-1111-1111-1111-111111111111',
        totalPurchases: customer?.totalPurchases || 0,
        lastPurchase: customer?.lastPurchase
      };

      onSave(newCustomer);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button 
                onClick={onClose} 
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  {customer ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{currentStore?.name}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{storeCustomers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-3" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {formatCurrency(storeCustomers.reduce((sum, c) => sum + c.totalPurchases, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Clientes Activos</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {storeCustomers.filter(c => c.lastPurchase && 
                  new Date(c.lastPurchase) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Buscar clientes por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{customer.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Cliente</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(customer)}
                className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50 flex-shrink-0"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {customer.email && (
                <div className="flex items-center text-xs sm:text-sm text-gray-600 min-w-0">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              
              {customer.phone && (
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </div>
              )}
              
              {customer.address && (
                <div className="flex items-start text-xs sm:text-sm text-gray-600 min-w-0">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2 break-words">{customer.address}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Total Compras</p>
                  <p className="font-semibold text-green-600 text-sm sm:text-base truncate">
                    {formatCurrency(customer.totalPurchases)}
                  </p>
                </div>
                {customer.lastPurchase && (
                  <div className="sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-500">Última Compra</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {new Date(customer.lastPurchase).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-base sm:text-lg">No se encontraron clientes</p>
          {searchTerm && (
            <p className="text-gray-400 text-sm sm:text-base mt-2">
              Intenta con otros términos de búsqueda
            </p>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <CustomerModal
          onClose={() => setShowAddModal(false)}
          onSave={(customer) => addCustomer(customer)}
        />
      )}

      {editingCustomer && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={(customer) => updateCustomer(customer)}
        />
      )}
    </div>
  );
}