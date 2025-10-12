import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { DollarSign, ShoppingBag, TrendingUp, Package, Users, Truck, Calculator } from 'lucide-react';

export function Accounting() {
  const { user } = useAuth();
  const { 
    sales, purchases, expenses, products, customers, suppliers, cashRegisters, formatCurrency 
  } = useData();
  const { currentStore } = useStore();

  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        Acceso restringido. Solo administradores.
      </div>
    );
  }

  const byStore = (storeId?: string) => (storeId ? storeId === currentStore?.id : true);

  const storeSales = sales.filter(s => byStore(s.storeId));
  const storePurchases = purchases.filter(p => byStore(p.storeId));
  const storeExpenses = expenses.filter(e => byStore(e.storeId));
  const lowStock = products.filter(p => p.storeId === currentStore?.id && p.stock <= p.minStock);

  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const monthSales = storeSales.filter(s => new Date(s.date).getMonth() === month && new Date(s.date).getFullYear() === year);
  const monthPurchases = storePurchases.filter(p => new Date(p.date).getMonth() === month && new Date(p.date).getFullYear() === year);
  const monthExpenses = storeExpenses.filter(e => new Date(e.date).getMonth() === month && new Date(e.date).getFullYear() === year);

  const totalSales = monthSales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchases = monthPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfitApprox = totalSales - totalPurchases - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas (mes)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <ShoppingBag className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Compras (mes)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Gastos (mes)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Calculator className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Utilidad aprox.</p>
              <p className={`text-2xl font-bold ${grossProfitApprox >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(grossProfitApprox)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Ventas recientes</h3>
          </div>
          <div className="divide-y">
            {storeSales.slice(0, 8).map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">#{s.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString()}</p>
                </div>
                <div className="font-semibold">{formatCurrency(s.total)}</div>
              </div>
            ))}
            {storeSales.length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin ventas</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Compras recientes</h3>
          </div>
          <div className="divide-y">
            {storePurchases.slice(0, 8).map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">#{p.invoiceNumber || p.id}</p>
                  <p className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString()}</p>
                </div>
                <div className="font-semibold">{formatCurrency(p.total)}</div>
              </div>
            ))}
            {storePurchases.length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin compras</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Gastos recientes</h3>
          </div>
          <div className="divide-y">
            {storeExpenses.slice(0, 8).map(e => (
              <div key={e.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</p>
                </div>
                <div className="font-semibold">{formatCurrency(e.amount)}</div>
              </div>
            ))}
            {storeExpenses.length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin gastos</div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory and people */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex items-center">
            <Package className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Inventario bajo stock</h3>
          </div>
          <div className="divide-y">
            {lowStock.slice(0, 10).map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-500">SKU {p.sku}</p>
                </div>
                <div className="text-sm">Stock: <span className="font-semibold">{p.stock}</span> / Min: {p.minStock}</div>
              </div>
            ))}
            {lowStock.length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin alertas</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex items-center">
            <Users className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Clientes destacados</h3>
          </div>
          <div className="divide-y">
            {customers
              .filter(c => byStore(c.storeId))
              .sort((a, b) => b.totalPurchases - a.totalPurchases)
              .slice(0, 10)
              .map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.lastPurchase && (
                      <p className="text-xs text-gray-500">Última compra: {new Date(c.lastPurchase).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="font-semibold">{formatCurrency(c.totalPurchases)}</div>
                </div>
              ))}
            {customers.filter(c => byStore(c.storeId)).length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin clientes</div>
            )}
          </div>
        </div>
      </div>

      {/* Suppliers and cash registers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex items-center">
            <Truck className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Proveedores</h3>
          </div>
          <div className="divide-y">
            {suppliers.filter(s => s.isActive).slice(0, 10).map(s => (
              <div key={s.id} className="p-4">
                <p className="font-medium">{s.name}</p>
                {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
              </div>
            ))}
            {suppliers.filter(s => s.isActive).length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin proveedores</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex items-center">
            <Calculator className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Cajas</h3>
          </div>
          <div className="divide-y">
            {cashRegisters.filter(cr => byStore(cr.storeId)).slice(0, 8).map(cr => (
              <div key={cr.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{cr.status === 'open' ? 'Abierta' : 'Cerrada'}</p>
                  <p className="text-xs text-gray-500">{new Date(cr.openedAt).toLocaleString()}</p>
                </div>
                {typeof cr.closingAmount === 'number' && (
                  <div className="font-semibold">{formatCurrency(cr.closingAmount)}</div>
                )}
              </div>
            ))}
            {cashRegisters.filter(cr => byStore(cr.storeId)).length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin cajas</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
