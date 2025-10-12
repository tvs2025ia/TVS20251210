import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

export function Statistics() {
  const { sales, products, customers, expenses, cashMovements } = useData();
  const { currentStore } = useStore();
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const storeProducts = products.filter(p => p.storeId === currentStore?.id);
  const storeCustomers = customers.filter(c => c.storeId === currentStore?.id);
  const storeExpenses = expenses.filter(e => e.storeId === currentStore?.id);
  const storeMovements = cashMovements.filter(m => m.storeId === currentStore?.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // NUEVO: Ingresos son cashMovements tipo 'sale'
  const getDateRangeData = () => {
    const now = new Date();
    let startPeriod: Date;
    switch (dateRange) {
      case 'today':
        startPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startPeriod = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startPeriod = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          startPeriod = new Date(startDate);
          const endPeriod = new Date(endDate);
          return {
            movements: storeMovements.filter(m => {
              const d = new Date(m.date);
              return m.type === 'sale' && d >= startPeriod && d <= endPeriod;
            }),
            expenses: storeExpenses.filter(e => {
              const expenseDate = new Date(e.date);
              return expenseDate >= startPeriod && expenseDate <= endPeriod;
            })
          };
        }
        startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      movements: storeMovements.filter(m => m.type === 'sale' && new Date(m.date) >= startPeriod),
      expenses: storeExpenses.filter(e => new Date(e.date) >= startPeriod)
    };
  };

  const periodData = getDateRangeData();
  const periodMovements = periodData.movements;
  const periodExpenses = periodData.expenses;

  const totalRevenue = periodMovements.reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Top selling products must still use Sale data
  const storeSales = sales.filter(s => s.storeId === currentStore?.id);
  const startPeriod = dateRange === 'custom' && startDate ? new Date(startDate) : (dateRange === 'today' ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const endPeriod = dateRange === 'custom' && endDate ? new Date(endDate) : new Date();

  const periodSales = storeSales.filter(s => {
    const d = new Date(s.date);
    return d >= startPeriod && d <= endPeriod;
  });

  // Top selling products
  const productSales = periodSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      if (!acc[item.productId]) {
        acc[item.productId] = {
          productName: item.productName,
          quantity: 0,
          revenue: 0
        };
      }
      acc[item.productId].quantity += item.quantity;
      acc[item.productId].revenue += item.total;
    });
    return acc;
  }, {} as Record<string, { productName: string; quantity: number; revenue: number }>);

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Sales by payment method
  const paymentMethodStats = periodSales.reduce((acc, sale) => {
    if (!acc[sale.paymentMethod]) {
      acc[sale.paymentMethod] = { count: 0, total: 0 };
    }
    acc[sale.paymentMethod].count++;
    acc[sale.paymentMethod].total += sale.total;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Expense categories
  const expenseCategories = periodExpenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    acc[expense.category] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Daily sales for the period (last 30 days max for chart)
  const getDailySales = () => {
    const days = Math.min(30, Math.ceil((new Date().getTime() - new Date(periodMovements[0]?.date || new Date()).getTime()) / (24 * 60 * 60 * 1000)));
    const dailyData = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayMovements = periodMovements.filter(m => {
        const d = new Date(m.date);
        return d >= dayStart && d < dayEnd;
      });
      dailyData.push({
        date: dayStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        sales: dayMovements.reduce((sum, m) => sum + m.amount, 0),
        count: dayMovements.length
      });
    }
    return dailyData;
  };

  const dailySalesData = getDailySales();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Exportar</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Este mes</option>
              <option value="year">Este año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-500">{periodMovements.length} ingresos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Egresos</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-gray-500">{periodExpenses.length} registros</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingUp className={`w-8 h-8 mr-3 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="text-sm font-medium text-gray-600">Ganancia Neta</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className="text-xs text-gray-500">
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% margen` : '0% margen'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <ShoppingCart className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {periodMovements.length > 0 ? formatCurrency(totalRevenue / periodMovements.length) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos Diarios</h3>
          <div className="space-y-2">
            {dailySalesData.slice(-10).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{day.date}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.max(5, (day.sales / Math.max(...dailySalesData.map(d => d.sales))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
                    {formatCurrency(day.sales)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.productName}</p>
                    <p className="text-sm text-gray-500">{product.quantity} unidades</p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">{formatCurrency(product.revenue)}</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de productos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods & Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          <div className="space-y-3">
            {Object.entries(paymentMethodStats).map(([method, stats]) => (
              <div key={method} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{method}</p>
                  <p className="text-sm text-gray-500">{stats.count} transacciones</p>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(stats.total)}</span>
              </div>
            ))}
            {Object.keys(paymentMethodStats).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de pagos</p>
              </div>
            )}
          </div>
        </div>
        {/* Expense Categories */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorías de Egresos</h3>
          <div className="space-y-3">
            {Object.entries(expenseCategories)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{category}</p>
                  <p className="text-sm text-gray-500">
                    {((amount / totalExpenses) * 100).toFixed(1)}% del total
                  </p>
                </div>
                <span className="font-semibold text-red-600">{formatCurrency(amount)}</span>
              </div>
            ))}
            {Object.keys(expenseCategories).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de egresos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Productos Activos</p>
              <p className="text-2xl font-bold text-gray-900">{storeProducts.filter(p => p.stock > 0).length}</p>
              <p className="text-xs text-gray-500">de {storeProducts.length} total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {storeCustomers.filter(c => c.lastPurchase && 
                  new Date(c.lastPurchase) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-xs text-gray-500">últimos 30 días</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-teal-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Inventario</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(storeProducts.reduce((sum, p) => sum + (p.cost * p.stock), 0))}
              </p>
              <p className="text-xs text-gray-500">costo total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}