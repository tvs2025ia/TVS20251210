import React, { useState, useEffect } from 'react';
import { Product, SaleItem, Quote, Customer, Store, User } from '../types';
import { Plus, X, Minus, Search } from 'lucide-react';

interface CreateQuoteModalProps {
  onClose: () => void;
  onSave: (quote: Quote) => void;
  quote?: Quote;
  storeProducts: Product[];
  storeCustomers: Customer[];
  currentStore?: Store;
  user?: User;
}

export function CreateQuoteModal({ 
  onClose, 
  onSave, 
  quote, 
  storeProducts, 
  storeCustomers, 
  currentStore, 
  user 
}: CreateQuoteModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(quote?.customerId || '');
  const [cart, setCart] = useState<SaleItem[]>(quote?.items || []);
  const [discount, setDiscount] = useState(quote?.discount || 0);
  const [shippingCost, setShippingCost] = useState(quote?.shippingCost || 0);
  const [validDays, setValidDays] = useState(
    quote ? Math.max(1, Math.ceil((new Date(quote.validUntil).getTime() - new Date().getTime()) / (24 * 3600 * 1000))) : 30
  );
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      const prod = storeProducts.find(p => p.id === selectedProduct);
      setCustomPrice(prod ? prod.price : '');
    }
  }, [selectedProduct, storeProducts]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount + shippingCost;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Memoizar productos filtrados para evitar recálculo en cada render
  const displayedProducts = React.useMemo(() => {
    if (productSearch.trim() === '') {
      return storeProducts.slice(0, 10);
    }
    const searchLower = productSearch.toLowerCase();
    return storeProducts.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower)
    ).slice(0, 10);
  }, [productSearch, storeProducts]);

  const addToCart = (productId: string) => {
    const product = storeProducts.find(p => p.id === productId);
    if (!product || customPrice === '' || Number(customPrice) <= 0) return;

    const price = Number(customPrice);
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
      setCart(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, unitPrice: price, total: (item.quantity + 1) * price }
          : item
      ));
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: price,
        total: price
      };
      setCart(prev => [...prev, newItem]);
    }
    setSelectedProduct('');
    setCustomPrice('');
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || cart.length === 0) {
      alert('Selecciona un cliente y agrega productos');
      return;
    }
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const newQuote: Quote = {
      id: quote?.id || Date.now().toString(),
      storeId: quote?.storeId || currentStore?.id || '1',
      customerId: selectedCustomerId,
      items: cart,
      subtotal,
      discount,
      shippingCost,
      total,
      validUntil,
      status: quote?.status || 'pending',
      createdAt: quote?.createdAt || new Date(),
      employeeId: quote?.employeeId || user?.id || '1'
    };

    onSave(newQuote);
    onClose();
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product.id);
    setCustomPrice(product.price);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              {quote ? 'Editar Cotización' : 'Nueva Cotización'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Cliente y días de validez */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {storeCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Válida por (días)
                </label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min="1"
                  max="365"
                />
              </div>
            </div>

            {/* Agregar productos con búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar y Agregar Producto
              </label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Buscar producto por nombre, SKU o categoría..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    
                    {/* Dropdown de productos */}
                    {showProductDropdown && displayedProducts.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {displayedProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-sm text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500">
                              SKU: {product.sku} | {product.category} | {formatCurrency(product.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedProduct && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={customPrice}
                        min="1"
                        onChange={e => setCustomPrice(Number(e.target.value))}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Precio"
                      />
                      <button
                        type="button"
                        onClick={() => selectedProduct && addToCart(selectedProduct)}
                        disabled={!selectedProduct || customPrice === '' || Number(customPrice) <= 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de productos en el carrito */}
            {cart.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Productos en Cotización</h4>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 rounded-lg gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base">{item.productName}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm sm:text-base min-w-[80px] text-right">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descuento
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo de Envío
                </label>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min="0"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-base sm:text-lg text-green-600">
                    {formatCurrency(total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {quote ? 'Actualizar Cotización' : 'Crear Cotización'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}