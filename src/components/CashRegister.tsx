import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { CashRegister as CashRegisterType, CashMovement, Expense } from '../types';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  CreditCard
} from 'lucide-react';

export function CashRegister() {
  const { cashRegisters, cashMovements, sales, expenses, openCashRegister, closeCashRegister, addCashMovement, users } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  const [closingOther, setClosingOther] = useState(0);

  // Filtro de fechas para historial
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const storeRegisters = cashRegisters.filter(r => r.storeId === currentStore?.id);
  const currentRegister = storeRegisters.find(r => r.status === 'open');
  const storeSales = sales.filter(s => s.storeId === currentStore?.id);
  const storeExpenses = expenses.filter(e => e.storeId === currentStore?.id);

  // Filtrar egresos del turno actual
  const expensesSinceOpen: Expense[] = currentRegister
    ? storeExpenses.filter(e => new Date(e.date) >= new Date(currentRegister.openedAt))
    : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // 🟢 NUEVOS CÁLCULOS DESDE DATOS EXISTENTES
  const today = new Date();
  
  // Total ingresos hoy (todas las ventas del día)
  const totalIngresosHoy = storeSales
    .filter(sale => {
      const saleDate = new Date(sale.date);
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, sale) => sum + sale.total, 0);

  // Total ingresos en EFECTIVO hoy
  const totalEfectivoHoy = storeSales
    .filter(sale => {
      const saleDate = new Date(sale.date);
      const isToday = (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
      const isEfectivo = sale.paymentMethod?.toLowerCase().includes('efectivo') || 
                        sale.paymentMethod === 'cash' || 
                        sale.paymentMethod === 'Efectivo';
      return isToday && isEfectivo;
    })
    .reduce((sum, sale) => sum + sale.total, 0);

  // Total otros métodos de pago hoy
  const totalOtrosMediosHoy = storeSales
    .filter(sale => {
      const saleDate = new Date(sale.date);
      const isToday = (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
      const isOtrosMedios = !sale.paymentMethod?.toLowerCase().includes('efectivo') && 
                           sale.paymentMethod !== 'cash' && 
                           sale.paymentMethod !== 'Efectivo';
      return isToday && isOtrosMedios;
    })
    .reduce((sum, sale) => sum + sale.total, 0);

  // Total egresos hoy
  const totalEgresosHoy = storeExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getDate() === today.getDate() &&
        expenseDate.getMonth() === today.getMonth() &&
        expenseDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const handleOpenRegister = () => {
    if (openingAmount < 0) {
      alert('El monto de apertura debe ser mayor o igual a 0');
      return;
    }

    const newRegister: CashRegisterType = {
      id: crypto.randomUUID(),
      storeId: currentStore?.id || '11111111-1111-1111-1111-111111111111',
      employeeId: user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      openingAmount,
      openedAt: new Date(),
      status: 'open'
    };

    openCashRegister(newRegister);
    setShowOpenModal(false);
    setOpeningAmount(0);
  };

  const handleCloseRegister = () => {
    if (!currentRegister) return;
    const totalCounted = closingCash + closingOther;
    closeCashRegister(currentRegister.id, totalCounted, expensesSinceOpen, user?.id);
    setShowCloseModal(false);
    setClosingCash(0);
    setClosingOther(0);
  };

  // Obtener ingresos del turno (ventas + abonos de separados)
  const getTurnoMovements = () => {
    if (!currentRegister) return [];
    return cashMovements.filter(m => 
      m.storeId === currentStore?.id &&
      m.type === 'sale' &&
      new Date(m.date) >= new Date(currentRegister.openedAt)
    );
  };
  const ingresosTurno = getTurnoMovements().reduce((sum, m) => sum + m.amount, 0);

  // Filtrar historial por fechas
  const filteredRegisters = storeRegisters.filter(register => {
    const openedAt = new Date(register.openedAt);
    const passesStart = !filterStartDate || openedAt >= new Date(filterStartDate);
    const passesEnd = !filterEndDate || openedAt <= new Date(filterEndDate + 'T23:59:59');
    return passesStart && passesEnd;
  });

  // Obtener nombre de usuario por employeeId
  const getEmployeeName = (employeeId: string) => {
    if (!users || !employeeId) return 'Desconocido';
    const employee = users.find(u => u.id === employeeId);
    return employee ? employee.username : 'Desconocido';
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cuadre de Caja</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{currentStore?.name}</p>
        </div>
        {!currentRegister ? (
          <button
            onClick={() => setShowOpenModal(true)}
            className="bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Abrir Caja</span>
          </button>
        ) : (
          <button
            onClick={() => setShowCloseModal(true)}
            className="bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Cerrar Caja</span>
          </button>
        )}
      </div>

      {/* Current Register Status - Responsive */}
      {currentRegister ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-green-900">Caja Abierta</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-green-600">Apertura</p>
              <p className="text-lg sm:text-xl font-bold text-green-900">{formatCurrency(currentRegister.openingAmount)}</p>
              <p className="text-xs text-green-600">{new Date(currentRegister.openedAt).toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-600">Ingresos del turno</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900">{formatCurrency(ingresosTurno)}</p>
              <p className="text-xs text-blue-600">(ventas + abonos)</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-green-600">Esperado</p>
              <p className="text-lg sm:text-xl font-bold text-green-900">{formatCurrency(currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0))}</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-green-600">Empleado</p>
              <p className="text-sm sm:text-lg font-medium text-green-900 truncate">{getEmployeeName(currentRegister.employeeId)}</p>
            </div>
          </div>
          
          {/* Egresos del turno - Responsive */}
          <div className="mt-4 bg-white p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-red-600 font-medium mb-2">Egresos en este turno:</p>
            {expensesSinceOpen.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500">No hay egresos registrados.</p>
            ) : (
              <>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {expensesSinceOpen.map(e => (
                    <div key={e.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-700 border-b pb-1">
                      <span className="font-medium">{e.description}</span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <span className="font-bold text-red-600">{formatCurrency(e.amount)}</span>
                        <span className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t text-xs sm:text-sm text-red-700 font-bold">
                  Total egresos del turno: {formatCurrency(expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-yellow-900">Caja Cerrada</h3>
          </div>
          <p className="text-yellow-700 mt-2 text-sm sm:text-base">Debes abrir la caja para comenzar a operar.</p>
        </div>
      )}

      {/* 🟢 NUEVO: Today's Summary - 5 Cuadros Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Efectivo Hoy - NUEVO */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-3" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Efectivo Hoy</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalEfectivoHoy)}</p>
              <p className="text-xs text-gray-500">Solo ventas en efectivo</p>
            </div>
          </div>
        </div>
        
        {/* Ingresos Hoy */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-3" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Ingresos Hoy</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(totalIngresosHoy)}</p>
              <p className="text-xs text-gray-500">Todos los medios</p>
            </div>
          </div>
        </div>
        
        {/* Egresos Hoy */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-3" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Egresos Hoy</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(totalEgresosHoy)}</p>
              <p className="text-xs text-gray-500">{storeExpenses.filter(e => {
                const d = new Date(e.date);
                return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
              }).length} registros</p>
            </div>
          </div>
        </div>

        {/* Balance Hoy */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mr-3" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Balance Hoy</p>
              <p className={`text-lg sm:text-2xl font-bold ${totalIngresosHoy - totalEgresosHoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalIngresosHoy - totalEgresosHoy)}
              </p>
            </div>
          </div>
        </div>

        {/* Registros Caja */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mr-3" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Registros Caja</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{storeRegisters.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resto del código permanece igual... */}
      {/* Filtros de fecha */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-start sm:items-center">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Historial de Cajas - El resto del código del historial permanece igual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* ... código del historial existente ... */}
      </div>

      {/* Modales - El resto del código de modales permanece igual */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {/* ... código del modal de apertura existente ... */}
        </div>
      )}

      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {/* ... código del modal de cierre existente ... */}
        </div>
      )}
    </div>
  );
}