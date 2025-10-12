import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { BulkSalesUpload } from './BulkSalesUpload';
import { Sale, SaleItem } from '../types';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Package,
  DollarSign,
  FileText,
  Download,
  X,
  ShoppingCart,
  Clock,
  Upload,
  Edit3,
  Trash2,
  Plus,
  TrendingUp,
  Smile,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';

export function Sales() {
  const { sales, users, customers, getActiveReceiptTemplate, updateSale, deleteSale, paymentMethods, products } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const activeReceiptTemplate = getActiveReceiptTemplate(currentStore?.id || '11111111-1111-1111-1111-111111111111');
  const isAdmin = user?.role === 'admin';

  const storeSales = sales.filter(s => s.storeId === currentStore?.id);
  
  // Get available years from sales data
  const availableYears = [...new Set(storeSales.map(s => new Date(s.date).getFullYear()))]
    .sort((a, b) => b - a);

  const months = [
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' }
  ];

  const filteredSales = storeSales.filter(sale => {
    const saleDate = new Date(sale.date);
    const saleYear = saleDate.getFullYear();
    const saleMonth = saleDate.getMonth();
    
    const matchesSearch = sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === '' || saleYear.toString() === selectedYear;
    const matchesMonth = selectedMonth === '' || saleMonth.toString() === selectedMonth;
    
    return matchesSearch && matchesYear && matchesMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = users.find(u => u.id === employeeId);
    return employee?.username || 'Usuario desconocido';
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Venta rápida';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Cliente desconocido';
  };

  const getProductImage = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.image || null;
  };

  const getProductCategory = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.category || 'Sin categoría';
  };

  const getTotalsByPeriod = () => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    return { totalSales, totalRevenue, totalItems };
  };

  const { totalSales, totalRevenue, totalItems } = getTotalsByPeriod();

  // Estilos de impresión para recibo térmico
  useEffect(() => {
    const style = document.createElement('style');
    const template = activeReceiptTemplate;
    const width = template?.thermalWidth || 58;
    const fontSize = template?.fontSize || 11;

    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #sales-receipt, #sales-receipt * { visibility: visible !important; }
        #sales-receipt {
          position: absolute;
          left: 0;
          top: 0;
          width: ${width}mm !important;
          font-size: ${fontSize}px;
          line-height: 1.2;
          background: white;
          padding: 5px;
        }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [activeReceiptTemplate]);

  const handlePrintReceipt = (sale: Sale) => {
    setPrintingSale(sale);
    setShowReceiptModal(true);
  };

  const printThermalReceipt = () => {
    window.print();
    setShowReceiptModal(false);
    setPrintingSale(null);
  };

  const handleBulkUploadSuccess = (newSales: Sale[]) => {
    setShowBulkUpload(false);
    // Sales are already added to the context, no need to do anything else
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar la venta ${sale.invoiceNumber}?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmed) {
      setIsDeleting(sale.id);
      try {
        await deleteSale(sale.id);
        // Pequeña animación de éxito
        setTimeout(() => {
          setIsDeleting(null);
        }, 1000);
      } catch (error) {
        alert('Error al eliminar la venta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        setIsDeleting(null);
      }
    }
  };

  const SaleDetailModal = ({ sale, onClose }: {
    sale: Sale;
    onClose: () => void;
  }) => {
    const employee = users.find(u => u.id === sale.employeeId);
    const customer = customers.find(c => c.id === sale.customerId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Factura {sale.invoiceNumber}</h3>
                <p className="text-gray-600">Venta #{sale.id}</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Customer, Discount and Shipping Information - Moved to top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Customer Information */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Información del Cliente
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{customer?.name || 'Venta rápida'}</span>
                  </div>
                  {customer?.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{customer.email}</span>
                    </div>
                  )}
                  {customer?.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Teléfono:</span>
                      <span className="font-medium">{customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sale Information */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Información de la Venta
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{new Date(sale.date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendedor:</span>
                    <span className="font-medium">{employee?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método de Pago:</span>
                    <span className="font-medium">{sale.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Información de Pago
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(sale.discount)}</span>
                    </div>
                  )}
                  {sale.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío:</span>
                      <span className="font-medium">{formatCurrency(sale.shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                    <span>Total:</span>
                    <span>{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items - Improved responsive design with images */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Productos Vendidos
              </h4>
              <div className="space-y-4">
                {sale.items.map((item, index) => {
                  const productImage = getProductImage(item.productId);
                  const productCategory = getProductCategory(item.productId);
                  
                  return (
                    <div key={index} className="flex flex-col sm:flex-row items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden mr-4 mb-3 sm:mb-0">
                        {productImage ? (
                          <img 
                            src={productImage} 
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="sm:col-span-2">
                          <h5 className="font-medium text-gray-900 truncate">{item.productName}</h5>
                          <p className="text-sm text-gray-500">{productCategory}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(item.unitPrice)} c/u</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handlePrintReceipt(sale);
                  onClose();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Recibo Térmico</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir Detalle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditSaleModal = ({ sale, onClose, onSave }: {
    sale: Sale;
    onClose: () => void;
    onSave: (sale: Sale) => void;
  }) => {
    const [formData, setFormData] = useState({
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId || '',
      employeeId: sale.employeeId,
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      shippingCost: sale.shippingCost,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      date: sale.date.toISOString().split('T')[0],
      time: sale.date.toTimeString().split(' ')[0].substring(0, 5)
    });

    const [editingItems, setEditingItems] = useState<SaleItem[]>([...sale.items]);

    const recalculateTotals = () => {
      const itemsTotal = editingItems.reduce((sum, item) => sum + item.total, 0);
      const subtotal = itemsTotal;
      const total = subtotal - formData.discount + formData.shippingCost;

      const selectedPaymentMethod = paymentMethods.find(pm => pm.name === formData.paymentMethod);
      const paymentMethodDiscount = selectedPaymentMethod ? selectedPaymentMethod.discountPercentage : 0;
      const paymentDeduction = total * (paymentMethodDiscount / 100);
      const netTotal = total - paymentDeduction;

      setFormData(prev => ({
        ...prev,
        subtotal,
        total
      }));

      return { subtotal, total, netTotal, paymentMethodDiscount };
    };

    useEffect(() => {
      recalculateTotals();
    }, [editingItems, formData.discount, formData.shippingCost, formData.paymentMethod]);

    const addItem = () => {
      const newItem: SaleItem = {
        productId: crypto.randomUUID(),
        productName: 'Nuevo Producto',
        quantity: 1,
        unitPrice: 0,
        total: 0
      };
      setEditingItems(prev => [...prev, newItem]);
    };

    const updateItem = (index: number, field: keyof SaleItem, value: any) => {
      setEditingItems(prev => prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }));
    };

    const removeItem = (index: number) => {
      setEditingItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.invoiceNumber || editingItems.length === 0) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      const { total, netTotal, paymentMethodDiscount } = recalculateTotals();

      const fullDateString = `${formData.date}T${formData.time}:00`;
      const saleDate = new Date(fullDateString);

      const updatedSale: Sale = {
        ...sale,
        invoiceNumber: formData.invoiceNumber,
        customerId: formData.customerId || undefined,
        employeeId: formData.employeeId,
        items: editingItems,
        subtotal: formData.subtotal,
        discount: formData.discount,
        shippingCost: formData.shippingCost,
        total,
        netTotal,
        paymentMethod: formData.paymentMethod,
        paymentMethodDiscount,
        date: saleDate
      };

      onSave(updatedSale);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Editar Venta</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Factura *
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Venta rápida</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empleado *
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.username}</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  >
                    {paymentMethods.filter(pm => pm.isActive).map(method => (
                      <option key={method.id} value={method.name}>{method.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Customer and Payment Information - Moved to top */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descuento
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de Envío
                  </label>
                  <input
                    type="number"
                    value={formData.shippingCost}
                    onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Items - Improved responsive design */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Productos</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingItems.map((item, index) => {
                    const productImage = getProductImage(item.productId);
                    const productCategory = getProductCategory(item.productId);
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => updateItem(index, 'productName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 transition-colors"
                              />
                              <p className="text-xs text-gray-500 mt-1">{productCategory}</p>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 transition-colors"
                                min="1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unit.</label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 transition-colors"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end justify-between">
                            <div className="text-sm font-medium text-gray-900">
                              Total: {formatCurrency(item.total)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700 transition-colors mt-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                    </div>
                    {formData.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento:</span>
                        <span>-{formatCurrency(formData.discount)}</span>
                      </div>
                    )}
                    {formData.shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Envío:</span>
                        <span className="font-medium">{formatCurrency(formData.shippingCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                      <span>Total:</span>
                      <span>{formatCurrency(formData.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Actualizar Venta
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Ventas</h1>
          <p className="text-gray-600 mt-1 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            {currentStore?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowBulkUpload(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md"
            >
              <Upload className="w-5 h-5" />
              <span>Carga Masiva</span>
            </button>
          )}
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md">
            <Download className="w-5 h-5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Total Ventas</p>
              <p className="text-2xl font-bold text-blue-900">{totalSales}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-sm p-6 border border-green-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Ingresos</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-sm p-6 border border-purple-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-4">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-700">Productos Vendidos</p>
              <p className="text-2xl font-bold text-purple-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-sm p-6 border border-orange-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-4">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-700">Ticket Promedio</p>
              <p className="text-2xl font-bold text-orange-900">
                {totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-blue-500" />
          Filtros de Búsqueda
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por número de factura o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">Todos los años</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">Todos los meses</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedYear(new Date().getFullYear().toString());
              setSelectedMonth('');
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Results Summary */}
      {filteredSales.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-blue-700 text-sm font-medium">
            Mostrando <span className="font-bold">{filteredSales.length}</span> ventas
            {selectedYear && ` del año ${selectedYear}`}
            {selectedMonth && `, mes de ${months.find(m => m.value === selectedMonth)?.label}`}
          </p>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-1 bg-blue-100 rounded mr-3 group-hover:bg-blue-200 transition-colors">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sale.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">#{sale.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{getCustomerName(sale.customerId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getEmployeeName(sale.employeeId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <span className="font-medium">{sale.items.length}</span> productos
                    </div>
                    <div className="text-xs text-gray-500">
                      {sale.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</div>
                    {sale.paymentMethodDiscount > 0 && (
                      <div className="text-xs text-green-600">
                        Neto: {formatCurrency(sale.netTotal)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <div>
                        <div>{new Date(sale.date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(sale.date).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="text-blue-500 hover:text-blue-700 transition-colors flex items-center space-x-1 p-1 rounded hover:bg-blue-50"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(sale)}
                        className="text-green-500 hover:text-green-700 transition-colors flex items-center space-x-1 p-1 rounded hover:bg-green-50"
                        title="Imprimir recibo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setEditingSale(sale)}
                            className="text-orange-500 hover:text-orange-700 transition-colors flex items-center space-x-1 p-1 rounded hover:bg-orange-50"
                            title="Editar venta"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            className="text-red-500 hover:text-red-700 transition-colors flex items-center space-x-1 p-1 rounded hover:bg-red-50"
                            disabled={isDeleting === sale.id}
                            title="Eliminar venta"
                          >
                            {isDeleting === sale.id ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Smile className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No se encontraron ventas</p>
            <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
              {searchTerm || selectedMonth || selectedYear !== new Date().getFullYear().toString()
                ? "Intenta ajustar los filtros para ver más resultados"
                : "Realiza algunas ventas para ver los registros aquí"}
            </p>
            {(searchTerm || selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedYear(new Date().getFullYear().toString());
                  setSelectedMonth('');
                }}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {viewingSale && (
        <SaleDetailModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
        />
      )}

      {/* Thermal Receipt Modal - Showing only gross total */}
      {showReceiptModal && printingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-[320px] p-4 text-sm font-mono" id="sales-receipt">
            {/* Header */}
            {activeReceiptTemplate?.headerText && (
              <div className="text-center font-bold mb-2 whitespace-pre-line">
                {activeReceiptTemplate.headerText}
              </div>
            )}

            {/* Date */}
            {activeReceiptTemplate?.showDate && (
              <div>Fecha: {new Date(printingSale.date).toLocaleString()}</div>
            )}

            {/* Invoice Number */}
            {activeReceiptTemplate?.showInvoiceNumber && (
              <div>Factura: {printingSale.invoiceNumber}</div>
            )}

            {/* Employee */}
            {activeReceiptTemplate?.showEmployee && (
              <div>Empleado: {getEmployeeName(printingSale.employeeId)}</div>
            )}

            {/* Customer */}
            {activeReceiptTemplate?.showCustomer && (
              <div>Cliente: {getCustomerName(printingSale.customerId)}</div>
            )}

            {/* Payment Method */}
            {activeReceiptTemplate?.showPaymentMethod && (
              <div>Método de Pago: {printingSale.paymentMethod}</div>
            )}

            <hr className="my-2" />

            {/* Item Details */}
            {activeReceiptTemplate?.showItemDetails && printingSale.items.map(item => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.productName} x{item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}

            <hr className="my-2" />

            {/* Totals - Showing only gross total, not net total */}
            {activeReceiptTemplate?.showTotals && (
              <>
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(printingSale.subtotal)}</span></div>
                {printingSale.discount > 0 && (
                  <div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(printingSale.discount)}</span></div>
                )}
                {printingSale.shippingCost > 0 && (
                  <div className="flex justify-between"><span>Envío:</span><span>{formatCurrency(printingSale.shippingCost)}</span></div>
                )}
                <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(printingSale.total)}</span></div>
              </>
            )}

            <hr className="my-2" />

            {/* Footer */}
            {activeReceiptTemplate?.footerText && (
              <div className="text-center text-xs whitespace-pre-line">
                {activeReceiptTemplate.footerText}
              </div>
            )}

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setPrintingSale(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={printThermalReceipt}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && isAdmin && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={async (updatedSale) => {
            try {
              await updateSale(updatedSale);
              setEditingSale(null);
              alert('Venta actualizada exitosamente');
            } catch (error) {
              alert('Error al actualizar la venta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
            }
          }}
        />
      )}

      {/* Bulk Sales Upload Modal */}
      {showBulkUpload && isAdmin && (
        <BulkSalesUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      )}
    </div>
  );
}