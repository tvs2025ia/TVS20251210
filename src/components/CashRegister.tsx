import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { CashRegister as CashRegisterType, Expense, Sale, Layaway } from '../types';
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
  Users
} from 'lucide-react';

export function CashRegister() {
  const { cashRegisters, sales, expenses, layaways, openCashRegister, closeCashRegister, users } = useData();
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

  const storeRegisters = cashRegisters.filter((r: CashRegisterType) => r.storeId === currentStore?.id);
  const currentRegister = storeRegisters.find((r: CashRegisterType) => r.status === 'open');
  const storeSales = sales.filter((s: Sale) => s.storeId === currentStore?.id);
  const storeExpenses = expenses.filter((e: Expense) => e.storeId === currentStore?.id);
  const storeLayaways = layaways.filter((l: Layaway) => l.storeId === currentStore?.id);

  // Filtrar ventas, egresos y abonos del turno actual
  const salesSinceOpen = currentRegister
    ? storeSales.filter((s: Sale) => new Date(s.date) >= new Date(currentRegister.openedAt))
    : [];

  const expensesSinceOpen = currentRegister
    ? storeExpenses.filter((e: Expense) => new Date(e.date) >= new Date(currentRegister.openedAt))
    : [];

  // 🟢 OBTENER ABONOS DE SEPARADOS DEL TURNO ACTUAL
  const layawayPaymentsSinceOpen = currentRegister
    ? storeLayaways.flatMap((layaway: Layaway) => 
        layaway.payments.filter((payment: any) => 
          new Date(payment.date) >= new Date(currentRegister.openedAt)
        )
      )
    : [];

  // 🟢 FUNCIONES PARA SEPARAR EFECTIVO Y OTROS MÉTODOS
  const isCashPayment = (paymentMethod: string | undefined) => {
    if (!paymentMethod) return false;
    const method = paymentMethod.toLowerCase();
    return method.includes('efectivo') || method === 'cash' || method === 'efectivo';
  };

  const isOtherPayment = (paymentMethod: string | undefined) => {
    if (!paymentMethod) return false;
    return !isCashPayment(paymentMethod);
  };

  // 🟢 CÁLCULOS PARA EL TURNO ACTUAL - INCLUYENDO ABONOS
  const ventasEfectivoTurno = salesSinceOpen
    .filter((sale: Sale) => isCashPayment(sale.paymentMethod))
    .reduce((sum: number, sale: Sale) => sum + sale.total, 0);

  const ventasOtrosTurno = salesSinceOpen
    .filter((sale: Sale) => isOtherPayment(sale.paymentMethod))
    .reduce((sum: number, sale: Sale) => sum + sale.total, 0);

  const abonosEfectivoTurno = layawayPaymentsSinceOpen
    .filter((payment: any) => isCashPayment(payment.paymentMethod))
    .reduce((sum: number, payment: any) => sum + payment.amount, 0);

  const abonosOtrosTurno = layawayPaymentsSinceOpen
    .filter((payment: any) => isOtherPayment(payment.paymentMethod))
    .reduce((sum: number, payment: any) => sum + payment.amount, 0);

  // 🟢 TOTALES COMBINADOS (VENTAS + ABONOS)
  const ingresosEfectivoTurno = ventasEfectivoTurno + abonosEfectivoTurno;
  const ingresosOtrosTurno = ventasOtrosTurno + abonosOtrosTurno;

  // 🟢 NUEVO: TOTAL INGRESOS DEL TURNO (TODOS LOS MÉTODOS)
  const totalIngresosTurno = ingresosEfectivoTurno + ingresosOtrosTurno;

  const egresosEfectivoTurno = expensesSinceOpen
    .filter((expense: Expense) => isCashPayment(expense.paymentMethod))
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0);

  const egresosOtrosTurno = expensesSinceOpen
    .filter((expense: Expense) => isOtherPayment(expense.paymentMethod))
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0);

  // Totales esperados
  const totalEsperadoEfectivo = (currentRegister?.openingAmount || 0) + ingresosEfectivoTurno - egresosEfectivoTurno;
  const totalEsperadoOtros = ingresosOtrosTurno;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // 🟢 CÁLCULOS DEL DÍA
  const today = new Date();
  
  const isToday = (date: Date) => {
    const targetDate = new Date(date);
    return (
      targetDate.getDate() === today.getDate() &&
      targetDate.getMonth() === today.getMonth() &&
      targetDate.getFullYear() === today.getFullYear()
    );
  };

  // Total ingresos hoy (ventas + abonos)
  const ventasEfectivoHoy = storeSales
    .filter((sale: Sale) => isToday(new Date(sale.date)) && isCashPayment(sale.paymentMethod))
    .reduce((sum: number, sale: Sale) => sum + sale.total, 0);

  const ventasOtrosHoy = storeSales
    .filter((sale: Sale) => isToday(new Date(sale.date)) && isOtherPayment(sale.paymentMethod))
    .reduce((sum: number, sale: Sale) => sum + sale.total, 0);

  // 🟢 ABONOS DE HOY
  const abonosHoy = storeLayaways.flatMap((layaway: Layaway) => 
    layaway.payments.filter((payment: any) => isToday(new Date(payment.date)))
  );

  const abonosEfectivoHoy = abonosHoy
    .filter((payment: any) => isCashPayment(payment.paymentMethod))
    .reduce((sum: number, payment: any) => sum + payment.amount, 0);

  const abonosOtrosHoy = abonosHoy
    .filter((payment: any) => isOtherPayment(payment.paymentMethod))
    .reduce((sum: number, payment: any) => sum + payment.amount, 0);

  const totalEfectivoHoy = ventasEfectivoHoy + abonosEfectivoHoy;
  const totalOtrosMediosHoy = ventasOtrosHoy + abonosOtrosHoy;
  const totalIngresosHoy = totalEfectivoHoy + totalOtrosMediosHoy;

  // Total egresos hoy
  const totalEgresosHoy = storeExpenses
    .filter((expense: Expense) => isToday(new Date(expense.date)))
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0);

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
    
    // Pasar los datos separados al cierre
    closeCashRegister(
      currentRegister.id, 
      totalCounted, 
      expensesSinceOpen,
      user?.id // Este parámetro debería ser el closingEmployeeId
    );
    
    setShowCloseModal(false);
    setClosingCash(0);
    setClosingOther(0);
  };

  // Filtrar historial por fechas
  const filteredRegisters = storeRegisters.filter((register: CashRegisterType) => {
    const openedAt = new Date(register.openedAt);
    const passesStart = !filterStartDate || openedAt >= new Date(filterStartDate);
    const passesEnd = !filterEndDate || openedAt <= new Date(filterEndDate + 'T23:59:59');
    return passesStart && passesEnd;
  });

  // 🟢 MEJORADO: Obtener nombre de usuario por employeeId
  const getEmployeeName = (employeeId: string) => {
    if (!users || !employeeId) return 'Desconocido';
    const employee = users.find((u: any) => u.id === employeeId);
    return employee ? `${employee.username} (${employee.role})` : 'Desconocido';
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      {/* Header */}
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

      {/* Current Register Status - MEJORADO */}
      {currentRegister ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-green-900">Caja Abierta</h3>
          </div>
          
          {/* 🟢 NUEVO: Total ingresos del turno */}
          <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Resumen del Turno
            </h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total ingresos del turno:</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(totalIngresosTurno)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Incluye {salesSinceOpen.length} ventas y {layawayPaymentsSinceOpen.length} abonos en todos los métodos de pago
            </div>
          </div>
          
          {/* Resumen por tipo de pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Efectivo */}
            <div className="bg-white p-4 rounded-lg border border-green-100">
              <h4 className="text-sm font-semibold text-green-800 mb-3">EFECTIVO</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Apertura:</span>
                  <span className="font-medium">{formatCurrency(currentRegister.openingAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ventas:</span>
                  <span className="font-medium text-blue-600">+{formatCurrency(ventasEfectivoTurno)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Abonos:</span>
                  <span className="font-medium text-purple-600">+{formatCurrency(abonosEfectivoTurno)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Egresos:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(egresosEfectivoTurno)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span className="text-green-800">Total Esperado:</span>
                  <span className="text-green-800">{formatCurrency(totalEsperadoEfectivo)}</span>
                </div>
              </div>
            </div>

            {/* Otros Medios */}
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">OTROS MÉTODOS</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ventas:</span>
                  <span className="font-medium text-blue-600">+{formatCurrency(ventasOtrosTurno)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Abonos:</span>
                  <span className="font-medium text-purple-600">+{formatCurrency(abonosOtrosTurno)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Egresos:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(egresosOtrosTurno)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span className="text-blue-800">Total Esperado:</span>
                  <span className="text-blue-800">{formatCurrency(totalEsperadoOtros)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-green-600 font-medium mb-1 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Empleado que abrió:
                </p>
                <p className="text-gray-700">{getEmployeeName(currentRegister.employeeId)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Apertura: {new Date(currentRegister.openedAt).toLocaleString()}
                </p>
              </div>
              {currentRegister.closingEmployeeId && (
                <div>
                  <p className="text-red-600 font-medium mb-1 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Empleado que cerró:
                  </p>
                  <p className="text-gray-700">{getEmployeeName(currentRegister.closingEmployeeId)}</p>
                  {currentRegister.closedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cierre: {new Date(currentRegister.closedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
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

      {/* Today's Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Efectivo Hoy */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-3" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Efectivo Hoy</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalEfectivoHoy)}</p>
              <p className="text-xs text-gray-500">
                {ventasEfectivoHoy > 0 && `Ventas: ${formatCurrency(ventasEfectivoHoy)}`}
                {abonosEfectivoHoy > 0 && ` Abonos: ${formatCurrency(abonosEfectivoHoy)}`}
              </p>
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
              <p className="text-xs text-gray-500">{storeExpenses.filter((e: Expense) => isToday(new Date(e.date))).length} registros</p>
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

      {/* HISTORIAL DE CAJAS - MEJORADO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Historial de Cajas</h3>
        </div>
        
        {/* Mobile Cards View - MEJORADO */}
        <div className="block sm:hidden">
          {filteredRegisters
            .sort((a: CashRegisterType, b: CashRegisterType) => 
              new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
            )
            .map((register: CashRegisterType) => (
            <div key={register.id} className="border-b border-gray-200 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  register.status === 'open' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
              
              {/* Sección de usuarios - MEJORADA */}
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 font-medium">Abrió:</span>
                  <div className="font-medium text-gray-900">{getEmployeeName(register.employeeId)}</div>
                  <div className="text-xs text-gray-500">{new Date(register.openedAt).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Cerró:</span>
                  <div className="font-medium text-gray-900">
                    {register.closingEmployeeId ? getEmployeeName(register.closingEmployeeId) : '-'}
                  </div>
                  {register.closedAt && (
                    <div className="text-xs text-gray-500">{new Date(register.closedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Apertura:</span>
                  <div className="font-medium">{formatCurrency(register.openingAmount)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Esperado:</span>
                  <div className="font-medium">{register.expectedAmount ? formatCurrency(register.expectedAmount) : '-'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Contado:</span>
                  <div className="font-medium">{register.closingAmount ? formatCurrency(register.closingAmount) : '-'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Diferencia:</span>
                  <div className="font-medium">
                    {register.difference !== undefined ? (
                      <span className={register.difference === 0 ? 'text-green-600' : register.difference > 0 ? 'text-blue-600' : 'text-red-600'}>
                        {register.difference > 0 ? '+' : ''}{formatCurrency(register.difference)}
                      </span>
                    ) : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View - MEJORADO */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario Apertura
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario Cierre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apertura
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cierre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Esperado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegisters
                .sort((a: CashRegisterType, b: CashRegisterType) => 
                  new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
                )
                .map((register: CashRegisterType) => (
                <tr key={register.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      register.status === 'open' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmployeeName(register.employeeId)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.closingEmployeeId ? getEmployeeName(register.closingEmployeeId) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(register.openingAmount)}</div>
                    <div className="text-sm text-gray-500">{new Date(register.openedAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.closedAt ? new Date(register.closedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.expectedAmount ? formatCurrency(register.expectedAmount) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.closingAmount ? formatCurrency(register.closingAmount) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {register.difference !== undefined ? (
                      <span className={register.difference === 0 ? 'text-green-600' : register.difference > 0 ? 'text-blue-600' : 'text-red-600'}>
                        {register.difference > 0 ? '+' : ''}{formatCurrency(register.difference)}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRegisters.length === 0 && (
          <div className="text-center py-12">
            <Calculator className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base sm:text-lg">No hay registros de caja en este rango de fechas</p>
          </div>
        )}
      </div>

      {/* Modal Abrir Caja */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Abrir Caja</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto de Apertura
                </label>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Efectivo inicial en caja</p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenRegister}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                >
                  Abrir Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja - MEJORADO */}
      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Cerrar Caja</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Resumen detallado por tipo de pago - MEJORADO */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-800 text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Resumen del Turno
                </h4>
                
                {/* 🟢 NUEVO: Total ingresos del turno */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Total ingresos del turno:</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(totalIngresosTurno)}</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Incluye {salesSinceOpen.length} ventas y {layawayPaymentsSinceOpen.length} abonos en todos los métodos de pago
                  </div>
                </div>
                
                {/* Efectivo */}
                <div className="bg-white p-3 rounded border border-green-100">
                  <h5 className="text-xs font-semibold text-green-700 mb-2">EFECTIVO</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Apertura:</span>
                      <span>{formatCurrency(currentRegister.openingAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ventas:</span>
                      <span className="text-blue-600">+{formatCurrency(ventasEfectivoTurno)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abonos:</span>
                      <span className="text-purple-600">+{formatCurrency(abonosEfectivoTurno)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Egresos:</span>
                      <span className="text-red-600">-{formatCurrency(egresosEfectivoTurno)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span className="text-green-700">Total Esperado:</span>
                      <span className="text-green-700">{formatCurrency(totalEsperadoEfectivo)}</span>
                    </div>
                  </div>
                </div>

                {/* Otros Medios */}
                <div className="bg-white p-3 rounded border border-blue-100">
                  <h5 className="text-xs font-semibold text-blue-700 mb-2">OTROS MÉTODOS</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ventas:</span>
                      <span className="text-blue-600">+{formatCurrency(ventasOtrosTurno)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abonos:</span>
                      <span className="text-purple-600">+{formatCurrency(abonosOtrosTurno)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Egresos:</span>
                      <span className="text-red-600">-{formatCurrency(egresosOtrosTurno)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span className="text-blue-700">Total Esperado:</span>
                      <span className="text-blue-700">{formatCurrency(totalEsperadoOtros)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Efectivo Contado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Efectivo Contado
                </label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Efectivo físico en caja</p>
              </div>

              {/* Otros Métodos de Pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Otros Métodos de Pago
                </label>
                <input
                  type="number"
                  value={closingOther}
                  onChange={(e) => setClosingOther(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Transferencias, tarjetas, etc.</p>
              </div>

              {/* Resumen de diferencias */}
              {(closingCash > 0 || closingOther > 0) && (
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">Total Contado:</span>
                    <span className="font-bold text-blue-900">
                      {formatCurrency(closingCash + closingOther)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">Diferencia Efectivo:</span>
                    <span className={`font-medium ${
                      closingCash - totalEsperadoEfectivo === 0 
                        ? 'text-green-600' 
                        : closingCash - totalEsperadoEfectivo > 0 
                        ? 'text-blue-600' 
                        : 'text-red-600'
                    }`}>
                      {closingCash - totalEsperadoEfectivo > 0 ? '+' : ''}
                      {formatCurrency(closingCash - totalEsperadoEfectivo)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">Diferencia Otros:</span>
                    <span className={`font-medium ${
                      closingOther - totalEsperadoOtros === 0 
                        ? 'text-green-600' 
                        : closingOther - totalEsperadoOtros > 0 
                        ? 'text-blue-600' 
                        : 'text-red-600'
                    }`}>
                      {closingOther - totalEsperadoOtros > 0 ? '+' : ''}
                      {formatCurrency(closingOther - totalEsperadoOtros)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseRegister}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  Cerrar Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}