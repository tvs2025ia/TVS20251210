import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Expense } from '../types';
import { 
  Search, 
  Plus, 
  DollarSign, 
  Calendar,
  TrendingDown,
  Edit3,
  X,
  Filter,
  FileText
} from 'lucide-react';

export function Expenses() {
  const { expenses, addExpense, expenseCategories, paymentMethods } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // --- CORREGIDO: fuerza date como objeto Date ---
  const storeExpenses = expenses
    .filter(e => e.storeId === currentStore?.id)
    .map(e => ({
      ...e,
      date: typeof e.date === 'string' ? new Date(e.date) : e.date
    }));

  const filteredExpenses = storeExpenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Use managed categories from context, plus any existing categories from expenses for backward compatibility
  const existingCategories = [...new Set(storeExpenses.map(e => e.category))];
  const allCategories = [...new Set([...expenseCategories, ...existingCategories])].sort();
  const thisMonthExpenses = storeExpenses.filter(e => 
    e.date.getMonth() === new Date().getMonth() &&
    e.date.getFullYear() === new Date().getFullYear()
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // ---- MODAL DE EGRESO CON HORA Y FECHA ----
  const ExpenseModal = ({ onClose, onSave }: {
    onClose: () => void;
    onSave: (expense: Expense) => void;
  }) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const initialDate = now.toISOString().split('T')[0];
    const initialTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const [formData, setFormData] = useState({
      description: '',
      amount: 0,
      category: '',
      paymentMethod: '',
      date: initialDate,
      time: initialTime
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.description || !formData.category || !formData.paymentMethod || formData.amount <= 0) {
        alert('Por favor completa todos los campos');
        return;
      }

      // Construye la fecha con la hora
      const fullDateString = `${formData.date}T${formData.time}:00`;
      const expenseDate = new Date(fullDateString);

      const newExpense: Expense = {
        id: crypto.randomUUID(),
        storeId: currentStore?.id || '11111111-1111-1111-1111-111111111111',
        description: formData.description,
        amount: formData.amount,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        date: expenseDate,
        employeeId: user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      };

      onSave(newExpense);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nuevo Egreso</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Pago de servicios públicos"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona método de pago</option>
                  {paymentMethods.filter(pm => pm.isActive).map(method => (
                    <option key={method.id} value={method.name}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Registrar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egresos</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Egreso</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Egresos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(storeExpenses.reduce((sum, e) => sum + e.amount, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Registros</p>
              <p className="text-2xl font-bold text-gray-900">{storeExpenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar egresos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las categorías</option>
            {allCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {expense.paymentMethod || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    -{formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date instanceof Date
                      ? expense.date.toLocaleDateString()
                      : new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date instanceof Date
                      ? expense.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron egresos</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showAddModal && (
        <ExpenseModal
          onClose={() => setShowAddModal(false)}
          onSave={(expense) => addExpense(expense)}
        />
      )}
    </div>
  );
}
