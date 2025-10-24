import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { LocalImage } from './LocalImage';
import { AgregarAbonoLayaway } from './AgregarAbonoLayaway';
import { NuevoSeparadoModal } from './NuevoSeparadoModal';
import { Product, LayawayItem, Layaway } from '../types';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Package,
  User,
  Eye,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';

export function LayawayComponent() {
  const { products, customers, paymentMethods, layaways, addLayaway, deleteLayaway } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<LayawayItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [viewingLayaway, setViewingLayaway] = useState<Layaway | null>(null);
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [abonoLayaway, setAbonoLayaway] = useState<Layaway | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const storeProducts = React.useMemo(() => products.filter(p => p.storeId === currentStore?.id), [products, currentStore?.id]);
  const storeCustomers = React.useMemo(() => customers.filter(c => c.storeId === currentStore?.id), [customers, currentStore?.id]);
  const storeLayaways = React.useMemo(() => layaways?.filter(l => l.storeId === currentStore?.id) || [], [layaways, currentStore?.id]);

  const filteredProducts = storeProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función para calcular los totales actualizados de un layaway (SOLO VISUAL)
  const calculateLayawayTotals = (layaway: Layaway) => {
    const totalPaid = layaway.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingBalance = layaway.total - totalPaid;
  
    // ✅ SOLO VISUAL: Si saldo es 0, mostrar como completado
    const displayStatus = remainingBalance <= 0 ? 'completed' : layaway.status;
  
    return {
      ...layaway,
      totalPaid,
      remainingBalance: Math.max(0, remainingBalance),
      status: displayStatus // ✅ Solo para mostrar, no se guarda en BD
    };
  };

  // ✅ CALCULAR PRIMERO los totales actualizados
  const updatedLayaways = storeLayaways.map(layaway => calculateLayawayTotals(layaway));

  // ✅ LUEGO FILTRAR basado en el status calculado
  const activeLayaways = updatedLayaways.filter(l => l.status === 'active');
  const completedLayaways = updatedLayaways.filter(l => l.status === 'completed');

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(prev => prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        ));
      }
    } else {
      if (product.stock > 0) {
        const newItem: LayawayItem = {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          total: product.price
        };
        setCart(prev => [...prev, newItem]);
      }
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    if (newQuantity > product.stock) {
      return;
    }
    setCart(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId('');
    setDiscount(0);
    setDueDate('');
    setNotes('');
  };

  const handleCreateLayaway = () => {
    if (!selectedCustomerId || cart.length === 0) {
      alert('Selecciona un cliente y agrega productos');
      return;
    }

    const newLayaway: Layaway = {
      id: Date.now().toString(),
      storeId: currentStore?.id || '1',
      customerId: selectedCustomerId,
      items: cart,
      subtotal,
      discount,
      total,
      totalPaid: 0,
      remainingBalance: total,
      status: 'active',
      createdAt: new Date(),
      employeeId: user?.id || '1',
      payments: [],
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes
    };

    addLayaway(newLayaway);
    clearCart();
    setShowCart(false);
    alert('Separado creado exitosamente');
  };

  const handleDeleteLayaway = async (layaway: Layaway) => {
    // Solo permitir eliminar si está activo o cancelado
    if (layaway.status === 'completed') {
      alert('No se puede eliminar un separado completado. Los productos ya fueron entregados.');
      return;
    }
  
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar el separado de ${customers.find(c => c.id === layaway.customerId)?.name}?\n\n` +
      `Total: ${formatCurrency(layaway.total)}\n` +
      `Productos: ${layaway.items.length}\n\n` +
      `El inventario será restaurado automáticamente.\n` +
      `Esta acción no se puede deshacer.`
    );
  
    if (confirmed) {
      setIsDeleting(layaway.id);
      try {
        await deleteLayaway(layaway.id);
        // Cerrar el modal si está abierto
        if (viewingLayaway?.id === layaway.id) {
          setViewingLayaway(null);
        }
        alert('Separado eliminado exitosamente. El inventario ha sido restaurado.');
        // Pequeña animación de éxito
        setTimeout(() => {
          setIsDeleting(null);
        }, 1000);
      } catch (error) {
        alert('Error al eliminar el separado: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        setIsDeleting(null);
      }
    }
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 md:p-4 hover:shadow-md transition-shadow">
      <LocalImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-20 sm:h-24 md:h-32 object-cover rounded-lg mb-2 sm:mb-3"
      />
      <div className="space-y-1 sm:space-y-2">
        <h3 className="font-semibold text-gray-900 truncate text-xs sm:text-sm md:text-base">{product.name}</h3>
        <p className="text-xs text-gray-500 truncate">{product.category}</p>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span className="text-sm sm:text-base md:text-lg font-bold text-green-600">{formatCurrency(product.price)}</span>
          <span className="text-xs text-gray-500">{product.stock} unidades</span>
        </div>
        <button
          onClick={() => addToCart(product)}
          disabled={product.stock === 0}
          className="w-full bg-orange-600 text-white py-1.5 sm:py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm md:text-base"
        >
          {product.stock === 0 ? 'Sin Stock' : 'Separar'}
        </button>
      </div>
    </div>
  );

  const LayawayDetailModal = ({ layaway, onClose }: {
    layaway: Layaway;
    onClose: () => void;
  }) => {
    const customer = storeCustomers.find(c => c.id === layaway.customerId);
    const isOverdue = layaway.dueDate && new Date() > new Date(layaway.dueDate);
    
    // Calcular totales actualizados
    const updatedLayaway = calculateLayawayTotals(layaway);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] overflow-auto">
          <div className="p-3 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Separado #{layaway.id}</h3>
                <p className="text-sm sm:text-base text-gray-600">Cliente: {customer?.name}</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              {/* Layaway Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Información del Separado</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`font-medium ${
                        updatedLayaway.status === 'active' ? 'text-orange-600' :
                        updatedLayaway.status === 'completed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {updatedLayaway.status === 'active' ? 'Activo' :
                         updatedLayaway.status === 'completed' ? 'Completado' : 'Cancelado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de Creación:</span>
                      <span className="font-medium">{new Date(layaway.createdAt).toLocaleDateString()}</span>
                    </div>
                    {layaway.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha Límite:</span>
                        <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(layaway.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {layaway.notes && (
                      <div>
                        <span className="text-gray-600">Notas:</span>
                        <p className="font-medium mt-1">{layaway.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary - Usando valores calculados */}
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Resumen de Pagos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(updatedLayaway.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pagado:</span>
                      <span className="font-bold text-green-600">{formatCurrency(updatedLayaway.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Saldo:</span>
                      <span className="font-bold text-orange-600">{formatCurrency(updatedLayaway.remainingBalance)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mt-3">
                      <div 
                        className="bg-green-500 h-2 sm:h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${updatedLayaway.total > 0 ? (updatedLayaway.totalPaid / updatedLayaway.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {updatedLayaway.total > 0 ? ((updatedLayaway.totalPaid / updatedLayaway.total) * 100).toFixed(1) : 0}% completado
                    </p>
                  </div>
                </div>

                {/* Add Payment Button */}
                {updatedLayaway.status === 'active' && updatedLayaway.remainingBalance > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setAbonoLayaway(layaway);
                        setAbonoOpen(true);
                      }}
                      className="w-full bg-green-600 text-white py-2 sm:py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Agregar Abono</span>
                    </button>
                    
                    {/* Delete Button - Solo para separados activos */}
                    <button
                      onClick={() => handleDeleteLayaway(layaway)}
                      disabled={isDeleting === layaway.id}
                      className="w-full bg-red-600 text-white py-2 sm:py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isDeleting === layaway.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Eliminando...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Eliminar Separado</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Products and Payments */}
              <div className="space-y-4">
                {/* Products */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Productos Separados</h4>
                  <div className="space-y-2">
                    {layaway.items.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex justify-between items-center bg-gray-50 p-2 sm:p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{item.productName}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Historial de Abonos</h4>
                  {layaway.payments.length > 0 ? (
                    <div className="space-y-2">
                      {layaway.payments.map(payment => (
                        <div key={payment.id} className="flex justify-between items-center bg-green-50 p-2 sm:p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-green-900 text-sm sm:text-base">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs sm:text-sm text-green-600">
                              {payment.paymentMethod} • {new Date(payment.date).toLocaleDateString()}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(payment.date).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm sm:text-base">No hay abonos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente CartPanel movido fuera del componente principal
  const CartPanel = () => (
    <div className="bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Nuevo Separado</h2>
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">
              {cart.length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {cart.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm sm:text-base">Selecciona productos para separar</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {cart.map(item => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={item.productId} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base pr-2">{item.productName}</h4>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={product ? item.quantity >= product.stock : false}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(item.total)}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="border-t border-gray-200 p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base"
              required
            >
              <option value="">Seleccionar cliente</option>
              {storeCustomers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
            <input
              type="number"
              placeholder="Descuento"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
              placeholder="Observaciones del separado..."
            />
          </div>

          <div className="space-y-1 sm:space-y-2 pt-3 sm:pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total a Separar:</span>
              <span className="text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleCreateLayaway}
              disabled={!selectedCustomerId}
              className="w-full bg-orange-600 text-white py-2 sm:py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
            >
              Crear Separado
            </button>
            <button
              onClick={clearCart}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Separados</h1>
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Cart Overlay via Portal */}
      <NuevoSeparadoModal isOpen={showCart} onClose={() => setShowCart(false)} title="Nuevo Separado">
        <CartPanel />
      </NuevoSeparadoModal>

      {/* Desktop Layout */}
      <div className="h-screen flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">
            {/* Desktop Header */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Separados</h1>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar productos para separar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Active Layaways */}
            <div className="mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Separados Activos ({activeLayaways.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {activeLayaways.map(layaway => {
                  const customer = storeCustomers.find(c => c.id === layaway.customerId);
                  const isOverdue = layaway.dueDate && new Date() > new Date(layaway.dueDate);
                  
                  return (
                    <div key={layaway.id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{customer?.name}</span>
                        </div>
                        {isOverdue && (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-semibold">{formatCurrency(layaway.total)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Pagado:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(layaway.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Saldo:</span>
                          <span className="font-semibold text-orange-600">{formatCurrency(layaway.remainingBalance)}</span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 sm:mb-4">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${layaway.total > 0 ? (layaway.totalPaid / layaway.total) * 100 : 0}%` }}
                        ></div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setViewingLayaway(layaway)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1 text-xs sm:text-sm"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Ver</span>
                          </button>
                          <button
                            onClick={() => {
                              setAbonoLayaway(layaway);
                              setAbonoOpen(true);
                            }}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-1 text-xs sm:text-sm"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Abonar</span>
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteLayaway(layaway)}
                          disabled={isDeleting === layaway.id}
                          className="w-full bg-red-600 text-white py-1.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-1 text-xs sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {isDeleting === layaway.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>Eliminar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {activeLayaways.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No hay separados activos</p>
                </div>
              )}
            </div>

            {/* Separados Completados - Colapsable */}
            {completedLayaways.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Separados Completados ({completedLayaways.length})
                  </h2>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition-colors text-sm sm:text-base"
                  >
                    <span>{showCompleted ? 'Ocultar' : 'Mostrar'}</span>
                    {showCompleted ? (
                      <Minus className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {showCompleted && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {completedLayaways.map(layaway => {
                      const customer = storeCustomers.find(c => c.id === layaway.customerId);

                      return (
                        <div key={layaway.id} className="bg-green-50 rounded-lg border border-green-200 p-3 sm:p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-2" />
                              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{customer?.name}</span>
                            </div>
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                          </div>
                          
                          <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-semibold">{formatCurrency(layaway.total)}</span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-semibold text-green-600">{formatCurrency(layaway.totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm text-green-600">
                              <span>Estado:</span>
                              <span className="font-semibold">Completado</span>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2 mb-3 sm:mb-4">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: '100%' }}
                            ></div>
                          </div>

                          <button
                            onClick={() => setViewingLayaway(layaway)}
                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Ver Detalles</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Products Grid */}
            <div className="pb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Productos Disponibles</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm sm:text-lg">No se encontraron productos</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden lg:block w-80 xl:w-96">
          <CartPanel />
        </div>
      </div>

      {/* Modals */}
      {viewingLayaway && (
        <LayawayDetailModal
          layaway={viewingLayaway}
          onClose={() => setViewingLayaway(null)}
        />
      )}

      {abonoLayaway && (
        <AgregarAbonoLayaway
          layaway={abonoLayaway}
          isOpen={abonoOpen}
          onClose={() => { setAbonoOpen(false); setAbonoLayaway(null); }}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  );
}