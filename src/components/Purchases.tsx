import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Purchase, Supplier } from '../types';
import {
  Search,
  Plus,
  ShoppingBag,
  Calendar,
  DollarSign,
  Eye,
  Package,
  Truck,
  X,
  Minus,
  FileText,
  Pencil,
  Trash
} from 'lucide-react';

export function Purchases() {
  const { products, purchases, suppliers, addPurchase, updatePurchase, deletePurchase } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const storeProducts = products.filter(p => p.storeId === currentStore?.id);
  const storePurchases = purchases.filter(p => p.storeId === currentStore?.id);
  
  const filteredPurchases = storePurchases.filter(purchase =>
    purchase.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const CreatePurchaseModal = ({ onClose, onSave }: {
    onClose: () => void;
    onSave: (purchase: Purchase) => void;
  }) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [items, setItems] = useState<Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      total: number;
    }>>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const total = items.reduce((sum, item) => sum + item.total, 0);

    const addItem = () => {
      const product = storeProducts.find(p => p.id === selectedProduct);
      if (!product || quantity <= 0 || unitCost <= 0) return;

      const existingItemIndex = items.findIndex(item => item.productId === selectedProduct);
      
      if (existingItemIndex >= 0) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          total: (updatedItems[existingItemIndex].quantity + quantity) * unitCost
        };
        setItems(updatedItems);
      } else {
        const newItem = {
          productId: product.id,
          productName: product.name,
          quantity,
          unitCost,
          total: quantity * unitCost
        };
        setItems(prev => [...prev, newItem]);
      }

      setSelectedProduct('');
      setQuantity(1);
      setUnitCost(0);
    };

    const updateItemQuantity = (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        setItems(prev => prev.filter(item => item.productId !== productId));
        return;
      }

      setItems(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unitCost }
          : item
      ));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (items.length === 0) {
        alert('Agrega al menos un producto');
        return;
      }

      const newPurchase: Purchase = {
        id: crypto.randomUUID(),
        storeId: currentStore?.id || '11111111-1111-1111-1111-111111111111',
        supplierId: selectedSupplierId || undefined,
        items,
        total,
        date: new Date(),
        employeeId: user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        invoiceNumber: invoiceNumber || undefined
      };

      onSave(newPurchase);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nueva Compra</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor (opcional)
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.filter(s => s.isActive).map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Factura (opcional)
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: FAC-001"
                  />
                </div>
              </div>

              {/* Add Products */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Agregar Producto</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre o SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      aria-label="Producto"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar producto</option>
                      {storeProducts
                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)} (Stock: {product.stock})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidades</label>
                    <input
                      type="number"
                      placeholder="Unidades"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario</label>
                    <input
                      type="number"
                      placeholder="Costo unitario"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agregar</label>
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!selectedProduct || quantity <= 0 || unitCost <= 0}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                      <Plus className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.unitCost)} c/u</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="ml-4 font-semibold text-gray-900 min-w-[80px] text-right">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}

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
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const EditPurchaseModal = ({ purchase, onClose, onSave }: {
    purchase: Purchase;
    onClose: () => void;
    onSave: (purchase: Purchase) => void;
  }) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState(purchase.supplierId || '');
    const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoiceNumber || '');
    const [items, setItems] = useState<Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      total: number;
    }>>(purchase.items);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const total = items.reduce((sum, item) => sum + item.total, 0);

    const addItem = () => {
      const product = storeProducts.find(p => p.id === selectedProduct);
      if (!product || quantity <= 0 || unitCost <= 0) return;

      const existingItemIndex = items.findIndex(item => item.productId === selectedProduct);
      if (existingItemIndex >= 0) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          total: (updatedItems[existingItemIndex].quantity + quantity) * unitCost
        };
        setItems(updatedItems);
      } else {
        const newItem = {
          productId: product.id,
          productName: product.name,
          quantity,
          unitCost,
          total: quantity * unitCost
        };
        setItems(prev => [...prev, newItem]);
      }

      setSelectedProduct('');
      setQuantity(1);
      setUnitCost(0);
    };

    const updateItemQuantity = (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        setItems(prev => prev.filter(item => item.productId !== productId));
        return;
      }
      setItems(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unitCost }
          : item
      ));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (items.length === 0) {
        alert('Agrega al menos un producto');
        return;
      }
      const updated: Purchase = {
        ...purchase,
        supplierId: selectedSupplierId || undefined,
        invoiceNumber: invoiceNumber || undefined,
        items,
        total
      };
      onSave(updated);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Editar Compra</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor (opcional)</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.filter(s => s.isActive).map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura (opcional)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: FAC-001"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Agregar Producto</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre o SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      aria-label="Producto"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar producto</option>
                      {storeProducts
                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)} (Stock: {product.stock})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidades</label>
                    <input
                      type="number"
                      placeholder="Unidades"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario</label>
                    <input
                      type="number"
                      placeholder="Costo unitario"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agregar</label>
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!selectedProduct || quantity <= 0 || unitCost <= 0}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                      <Plus className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.unitCost)} c/u</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="ml-4 font-semibold text-gray-900 min-w-[80px] text-right">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}

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
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const ViewPurchaseModal = ({ purchase, onClose }: {
    purchase: Purchase;
    onClose: () => void;
  }) => {
    const supplier = suppliers.find(s => s.id === purchase.supplierId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Compra #{purchase.id}</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Purchase Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Proveedor</p>
                  <p className="font-medium text-gray-900">{supplier?.name || 'Sin proveedor'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium text-gray-900">{new Date(purchase.date).toLocaleDateString()}</p>
                </div>
                {purchase.invoiceNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Número de Factura</p>
                    <p className="font-medium text-gray-900">{purchase.invoiceNumber}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                <div className="space-y-2">
                  {purchase.items.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(item.unitCost)}</p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abonos */}
              {purchase.payments && purchase.payments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Abonos</h4>
                  <div className="space-y-2">
                    {purchase.payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-green-900">{formatCurrency(p.amount)}</p>
                          <p className="text-xs text-green-700">{p.paymentMethod} • {new Date(p.date).toLocaleDateString()}</p>
                          {p.notes && <p className="text-xs text-gray-600 mt-1">{p.notes}</p>}
                        </div>
                        <div className="text-right text-xs text-gray-500">{new Date(p.date).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(purchase.total)}</span>
                </div>
              </div>
            </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Compra</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <ShoppingBag className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Compras</p>
              <p className="text-2xl font-bold text-gray-900">{storePurchases.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(storePurchases.reduce((sum, p) => sum + p.total, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                {storePurchases.filter(p => 
                  new Date(p.date).getMonth() === new Date().getMonth() &&
                  new Date(p.date).getFullYear() === new Date().getFullYear()
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar compras por ID o número de factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map(purchase => {
                const supplier = suppliers.find(s => s.id === purchase.supplierId);
                
                return (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{purchase.id}</div>
                      {purchase.invoiceNumber && (
                        <div className="text-sm text-gray-500">{purchase.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{supplier?.name || 'Sin proveedor'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.items.length} productos
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(purchase.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(purchase.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => setViewingPurchase(purchase)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPurchase(purchase)}
                        className="text-amber-600 hover:text-amber-800"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('¿Eliminar esta compra? Esta acción ajustará el inventario.')) {
                            await deletePurchase(purchase.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPurchases.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron compras</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePurchaseModal
          onClose={() => setShowCreateModal(false)}
          onSave={(purchase) => addPurchase(purchase)}
        />
      )}

      {viewingPurchase && (
        <ViewPurchaseModal
          purchase={viewingPurchase}
          onClose={() => setViewingPurchase(null)}
        />
      )}

      {editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onSave={(p) => updatePurchase(p)}
        />
      )}
    </div>
  );
}
