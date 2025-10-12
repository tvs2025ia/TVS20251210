import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  FileText,
  Download,
  BarChart3,
  PieChart,
  Filter,
  Eye
} from 'lucide-react';

export function FinancialReports() {
  const { sales, expenses, products, purchases, cashMovements } = useData();
  const { stores, currentStore } = useStore();
  const [selectedStore, setSelectedStore] = useState(currentStore?.id || 'all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<'income' | 'balance'>('income');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // NUEVO: Ingresos del período = cashMovements tipo 'sale' del período
  // Filter data by store and period
  const getFilteredData = () => {
    const storeFilter = selectedStore === 'all' ? 
      (item: any) => true : 
      (item: any) => item.storeId === selectedStore;

    const dateFilter = (date: Date) => {
      const itemDate = new Date(date);
      return itemDate.getFullYear() === selectedYear && 
             itemDate.getMonth() === selectedMonth - 1;
    };

    return {
      movements: cashMovements.filter(m => storeFilter(m) && m.type === 'sale' && dateFilter(m.date)),
      sales: sales.filter(s => storeFilter(s) && dateFilter(s.date)),
      expenses: expenses.filter(e => storeFilter(e) && dateFilter(e.date)),
      products: products.filter(storeFilter),
      purchases: purchases.filter(p => storeFilter(p) && dateFilter(p.date))
    };
  };

  const filteredData = getFilteredData();

  // Income Statement Calculations
  const getIncomeStatement = () => {
    const revenue = filteredData.movements.reduce((sum, m) => sum + m.amount, 0);
    const costOfGoodsSold = filteredData.sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        return itemSum + (product ? product.cost * item.quantity : 0);
      }, 0);
    }, 0);
    const grossProfit = revenue - costOfGoodsSold;
    const operatingExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = grossProfit - operatingExpenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    return {
      revenue,
      costOfGoodsSold,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netIncome,
      netMargin
    };
  };

  // Balance Sheet Calculations
  const getBalanceSheet = () => {
    const inventoryValue = filteredData.products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const accountsReceivable = 0;
    const cash = 50000000;
    const totalAssets = inventoryValue + accountsReceivable + cash;
    const accountsPayable = 0;
    const totalLiabilities = accountsPayable;
    const equity = totalAssets - totalLiabilities;

    return {
      cash,
      accountsReceivable,
      inventoryValue,
      totalAssets,
      accountsPayable,
      totalLiabilities,
      equity
    };
  };

  // Expense breakdown by category
  const getExpenseBreakdown = () => {
    return filteredData.expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const incomeStatement = getIncomeStatement();
  const balanceSheet = getBalanceSheet();
  const expenseBreakdown = getExpenseBreakdown();

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const availableYears = [2023, 2024, 2025];

  const IncomeStatementReport = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Estado de Resultados - {months[selectedMonth - 1]} {selectedYear}
          </h3>
          <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {selectedStore === 'all' ? 'Todas las tiendas' : stores.find(s => s.id === selectedStore)?.name}
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Revenue Section */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Ingresos</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Ingresos (ventas + abonos separados)</span>
              <span className="font-semibold text-green-600">{formatCurrency(incomeStatement.revenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
              <span>Total Ingresos</span>
              <span className="text-green-600">{formatCurrency(incomeStatement.revenue)}</span>
            </div>
          </div>
        </div>
        {/* Cost of Goods Sold */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Costo de Ventas</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Costo de Productos Vendidos</span>
              <span className="font-semibold text-red-600">({formatCurrency(incomeStatement.costOfGoodsSold)})</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
              <span>Ganancia Bruta</span>
              <span className={incomeStatement.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(incomeStatement.grossProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Margen Bruto</span>
              <span>{incomeStatement.grossMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        {/* Operating Expenses */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Gastos Operacionales</h4>
          <div className="space-y-2">
            {Object.entries(expenseBreakdown).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center py-2">
                <span className="text-gray-700">{category}</span>
                <span className="font-semibold text-red-600">({formatCurrency(amount)})</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
              <span>Total Gastos Operacionales</span>
              <span className="text-red-600">({formatCurrency(incomeStatement.operatingExpenses)})</span>
            </div>
          </div>
        </div>
        {/* Net Income */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Utilidad Neta</span>
            <span className={incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(incomeStatement.netIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
            <span>Margen Neto</span>
            <span>{incomeStatement.netMargin.toFixed(1)}%</span>
          </div>
        </div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Ingresos del Período</p>
                <p className="font-bold text-blue-900">{filteredData.movements.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">Ticket Promedio</p>
                <p className="font-bold text-green-900">
                  {filteredData.movements.length > 0 ? 
                    formatCurrency(incomeStatement.revenue / filteredData.movements.length) : 
                    formatCurrency(0)
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <PieChart className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">ROI</p>
                <p className="font-bold text-purple-900">
                  {incomeStatement.revenue > 0 ? 
                    `${((incomeStatement.netIncome / incomeStatement.revenue) * 100).toFixed(1)}%` : 
                    '0%'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const BalanceSheetReport = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Balance General - {months[selectedMonth - 1]} {selectedYear}
          </h3>
          <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {selectedStore === 'all' ? 'Todas las tiendas' : stores.find(s => s.id === selectedStore)?.name}
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Assets */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">ACTIVOS</h4>
          <div className="ml-4 space-y-3">
            <h5 className="font-medium text-gray-800">Activos Corrientes</h5>
            <div className="ml-4 space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Efectivo y Equivalentes</span>
                <span className="font-semibold">{formatCurrency(balanceSheet.cash)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Cuentas por Cobrar</span>
                <span className="font-semibold">{formatCurrency(balanceSheet.accountsReceivable)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Inventario</span>
                <span className="font-semibold">{formatCurrency(balanceSheet.inventoryValue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
                <span>Total Activos Corrientes</span>
                <span className="text-blue-600">{formatCurrency(balanceSheet.totalAssets)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 font-bold text-lg mt-4">
            <span>TOTAL ACTIVOS</span>
            <span className="text-blue-600">{formatCurrency(balanceSheet.totalAssets)}</span>
          </div>
        </div>
        {/* Liabilities */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">PASIVOS</h4>
          <div className="ml-4 space-y-3">
            <h5 className="font-medium text-gray-800">Pasivos Corrientes</h5>
            <div className="ml-4 space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Cuentas por Pagar</span>
                <span className="font-semibold">{formatCurrency(balanceSheet.accountsPayable)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
                <span>Total Pasivos Corrientes</span>
                <span className="text-red-600">{formatCurrency(balanceSheet.totalLiabilities)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 font-bold text-lg mt-4">
            <span>TOTAL PASIVOS</span>
            <span className="text-red-600">{formatCurrency(balanceSheet.totalLiabilities)}</span>
          </div>
        </div>
        {/* Equity */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">PATRIMONIO</h4>
          <div className="ml-4 space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Capital Social</span>
              <span className="font-semibold">{formatCurrency(balanceSheet.equity)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Utilidades Retenidas</span>
              <span className="font-semibold">{formatCurrency(0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
              <span>Total Patrimonio</span>
              <span className="text-green-600">{formatCurrency(balanceSheet.equity)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 font-bold text-lg mt-4">
            <span>TOTAL PASIVOS + PATRIMONIO</span>
            <span className="text-green-600">{formatCurrency(balanceSheet.totalLiabilities + balanceSheet.equity)}</span>
          </div>
        </div>
        {/* Balance Verification */}
        <div className={`p-4 rounded-lg ${
          Math.abs(balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.equity)) < 1 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {Math.abs(balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.equity)) < 1 ? (
              <div className="flex items-center text-green-700">
                <TrendingUp className="w-5 h-5 mr-2" />
                <span className="font-medium">Balance cuadrado correctamente</span>
              </div>
            ) : (
              <div className="flex items-center text-red-700">
                <TrendingDown className="w-5 h-5 mr-2" />
                <span className="font-medium">
                  Diferencia: {formatCurrency(balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.equity))}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Key Ratios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Liquidez Corriente</p>
                <p className="font-bold text-blue-900">
                  {balanceSheet.totalLiabilities > 0 ? 
                    (balanceSheet.totalAssets / balanceSheet.totalLiabilities).toFixed(2) : 
                    '∞'
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <PieChart className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">Rotación Inventario</p>
                <p className="font-bold text-green-900">
                  {balanceSheet.inventoryValue > 0 ? 
                    (incomeStatement.costOfGoodsSold / balanceSheet.inventoryValue).toFixed(1) : 
                    '0'
                  }x
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">ROE</p>
                <p className="font-bold text-purple-900">
                  {balanceSheet.equity > 0 ? 
                    ((incomeStatement.netIncome / balanceSheet.equity) * 100).toFixed(1) : 
                    '0'
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes Financieros</h1>
          <p className="text-gray-600 mt-1">Estados financieros y análisis contable</p>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Reporte
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'income' | 'balance')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="income">Estado de Resultados</option>
              <option value="balance">Balance General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tienda
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las tiendas</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => window.print()}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos del Período</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(incomeStatement.revenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Gastos del Período</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(incomeStatement.operatingExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingUp className={`w-8 h-8 mr-3 ${incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="text-sm font-medium text-gray-600">Utilidad Neta</p>
              <p className={`text-2xl font-bold ${incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(incomeStatement.netIncome)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Activos</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(balanceSheet.totalAssets)}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Report Content */}
      {reportType === 'income' ? <IncomeStatementReport /> : <BalanceSheetReport />}
      {/* Additional Analysis */}
      {reportType === 'income' && Object.keys(expenseBreakdown).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Análisis de Gastos por Categoría</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(expenseBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = (amount / incomeStatement.operatingExpenses) * 100;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{category}</span>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                          <span className="text-sm text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}