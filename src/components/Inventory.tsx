import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { BulkInventoryUpload } from './BulkInventoryUpload';
import { ProductService } from '../services/productService';
import { ImageUploadPreview } from './LocalImage';
import { Product } from '../types';
import {
  Search,
  Plus,
  Edit3,
  Package,
  AlertTriangle,
  Filter,
  Upload,
  X,
  Check,
  RefreshCw,
  Database,
  Grid,
  List
} from 'lucide-react';

export function Inventory() {
  const { products, addProduct, updateProduct } = useData();
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFilters, setShowFilters] = useState(false);

  const storeProducts = products.filter(p => p.storeId === currentStore?.id);
  
  const filteredProducts = storeProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || product.category === categoryFilter;
    
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && product.stock <= product.minStock) ||
                        (stockFilter === 'out' && product.stock === 0) ||
                        (stockFilter === 'available' && product.stock > 0);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = [...new Set(storeProducts.map(p => p.category))];
  const lowStockCount = storeProducts.filter(p => p.stock <= p.minStock).length;
  const outOfStockCount = storeProducts.filter(p => p.stock === 0).length;

  const handleSyncFromSupabase = async () => {
    if (!currentStore) return;
    
    setSyncing(true);
    try {
      const syncedProducts = await ProductService.syncProductsFromSupabase(currentStore.id);
      syncedProducts.forEach(product => {
        const existingProduct = products.find(p => p.sku === product.sku && p.storeId === currentStore.id);
        if (!existingProduct) {
          addProduct(product);
        }
      });
      alert(`${syncedProducts.length} productos sincronizados desde Supabase`);
    } catch (error) {
      alert(`Error al sincronizar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkUploadSuccess = (newProducts: Product[]) => {
    newProducts.forEach(product => addProduct(product));
    setShowBulkUpload(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const ProductModal = ({ product, onClose, onSave }: {
    product?: Product;
    onClose: () => void;
    onSave: (product: Product) => void;
  }) => {
    const [formData, setFormData] = useState({
      name: product?.name || '',
      sku: product?.sku || '',
      category: product?.category || '',
      price: product?.price || 0,
      cost: product?.cost || 0,
      stock: product?.stock || 0,
      minStock: product?.minStock || 0,
      imageUrl: product?.imageUrl || ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name || !formData.sku || !formData.category) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      setUploading(true);

      try {
        let finalImageUrl = formData.imageUrl;

        if (selectedFile) {
          const productId = product?.id || crypto.randomUUID();
          finalImageUrl = await ProductService.uploadProductImage(selectedFile, productId);
        }

        const newProduct: Product = {
          id: product?.id || crypto.randomUUID(),
          ...formData,
          imageUrl: finalImageUrl,
          storeId: currentStore?.id || '1'
        };

        onSave(newProduct);
        onClose();
      } catch (error) {
        alert('Error subiendo imagen: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl w-full max-w-md sm:max-w-lg max-h-[95vh] overflow-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {product ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Venta
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagen del Producto (opcional)
                </label>

                <ImageUploadPreview
                  onImageSelect={setSelectedFile}
                  currentImage={formData.imageUrl}
                  productId={product?.id}
                  className="w-24 h-24 sm:w-32 sm:h-32"
                />

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    O ingresa una URL de imagen:
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      setSelectedFile(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Las imágenes se guardan en public/img/ sin usar Supabase Storage</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full sm:flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  {uploading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{uploading ? 'Subiendo...' : (product ? 'Actualizar' : 'Crear')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{currentStore?.name}</p>
        </div>
        
        {/* Desktop buttons */}
        <div className="hidden sm:flex space-x-3">
          <button
            onClick={handleSyncFromSupabase}
            disabled={syncing}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center space-x-2 text-sm"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="hidden lg:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline">Carga Masiva</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Mobile buttons */}
        <div className="flex sm:hidden space-x-2 overflow-x-auto pb-2">
          <button
            onClick={handleSyncFromSupabase}
            disabled={syncing}
            className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center space-x-1 text-sm whitespace-nowrap"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 text-sm whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Masiva</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{storeProducts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mr-2 sm:mr-3 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Bajo</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-2 sm:mr-3 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Sin Stock</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{outOfStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100">
          <div className="flex items-center">
            <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Disponibles</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{storeProducts.filter(p => p.stock > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
        <div className="p-3 sm:p-6">
          {/* Search bar always visible */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter toggle button for mobile */}
          <div className="flex items-center justify-between sm:hidden mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filtros</span>
            </button>
            
            {/* View mode toggle */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters - always visible on desktop, toggleable on mobile */}
          <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">Todo el stock</option>
                <option value="available">Disponibles</option>
                <option value="low">Stock bajo</option>
                <option value="out">Sin stock</option>
              </select>

              {/* View mode toggle for desktop */}
              <div className="hidden sm:flex space-x-1 bg-gray-100 rounded-lg p-1 ml-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        /* Grid View for Mobile */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                  <p className="text-xs text-gray-500">{product.category}</p>
                  
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.price)}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock === 0 
                          ? 'bg-red-100 text-red-800'
                          : product.stock <= product.minStock
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.stock}
                        {product.stock <= product.minStock && product.stock > 0 && (
                          <AlertTriangle className="w-3 h-3 ml-1" />
                        )}
                      </span>
                      
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    SKU
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Categoría
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Costo
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex items-center">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover mr-2 sm:mr-3 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                          {/* Show SKU and category on mobile when columns are hidden */}
                          <div className="sm:hidden text-xs text-gray-500 space-y-1 mt-1">
                            <div>SKU: {product.sku}</div>
                            <div>{product.category}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {product.sku}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                      {product.category}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-sm font-medium">{formatCurrency(product.price)}</div>
                      {/* Show cost on mobile when column is hidden */}
                      <div className="lg:hidden text-xs text-gray-500 mt-1">
                        Costo: {formatCurrency(product.cost)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock === 0 
                          ? 'bg-red-100 text-red-800'
                          : product.stock <= product.minStock
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.stock}
                        <span className="hidden sm:inline ml-1">unidades</span>
                        {product.stock <= product.minStock && product.stock > 0 && (
                          <AlertTriangle className="w-3 h-3 ml-1" />
                        )}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Editar producto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base sm:text-lg">No se encontraron productos</p>
              <p className="text-gray-400 text-sm mt-2">Intenta ajustar los filtros o agregar nuevos productos</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <ProductModal
          onClose={() => setShowAddModal(false)}
          onSave={(product) => addProduct(product)}
        />
      )}

      {editingProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(product) => updateProduct(product)}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkInventoryUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      )}
    </div>
  );
}