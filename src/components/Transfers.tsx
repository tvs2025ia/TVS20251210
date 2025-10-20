import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Plus, 
  Eye,
  X,
  Minus,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Transfer } from '../types';

export default function Transfers() {
  const { products, transfers, addTransfer, updateProduct } = useData(); // ✅ Cambiar a updateProduct
  const { currentStore, stores } = useStore();
  const { user } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<Transfer | null>(null);

  const storeTransfers = transfers.filter(
    t => t.fromStoreId === currentStore?.id || t.toStoreId === currentStore?.id
  );

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const getStatusBadge = (status: Transfer['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-transit': 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Pendiente',
      'in-transit': 'En Tránsito',
      completed: 'Completada',
      cancelled: 'Cancelada'
    };

    const icons = {
      pending: Clock,
      'in-transit': ArrowRightLeft,
      completed: CheckCircle,
      cancelled: XCircle
    };

    const Icon = icons[status];

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {labels[status]}
      </span>
    );
  };

  // --- Create Transfer Modal ---
  const CreateTransferModal = ({ onClose }: { onClose: () => void }) => {
    const [fromStoreId, setFromStoreId] = useState(currentStore?.id || '');
    const [toStoreId, setToStoreId] = useState('');
    const [items, setItems] = useState<
      { productId: string; productName: string; productSku: string; quantity: number }[]
    >([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [productSearch, setProductSearch] = useState('');
    const [notes, setNotes] = useState('');

    const availableProducts = products.filter(
      p =>
        p.storeId === fromStoreId &&
        (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    );

    const addItem = () => {
      const product = products.find(p => p.id === selectedProduct);
      if (!product || quantity <= 0 || quantity > product.stock) return;

      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        const updated = items.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
        setItems(updated);
      } else {
        setItems(prev => [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity
          }
        ]);
      }

      setSelectedProduct('');
      setQuantity(1);
    };

    const updateItemQuantity = (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        setItems(prev => prev.filter(i => i.productId !== productId));
        return;
      }
      const product = products.find(p => p.id === productId);
      if (product && newQuantity > product.stock) {
        alert(`Stock insuficiente. Disponible: ${product.stock}`);
        return;
      }
      setItems(prev =>
        prev.map(i =>
          i.productId === productId ? { ...i, quantity: newQuantity } : i
        )
      );
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!toStoreId || items.length === 0) {
        alert('Completa todos los campos requeridos');
        return;
      }

      if (fromStoreId === toStoreId) {
        alert('La tienda origen y destino deben ser diferentes');
        return;
      }

      const newTransfer: Transfer = {
        id: crypto.randomUUID(),
        fromStoreId,
        toStoreId,
        items,
        status: 'pending',
        createdAt: new Date(),
        employeeId: user?.id || 'system',
        notes
      };

      await addTransfer(newTransfer);

      // ✅ CORREGIDO: Usar updateProduct para actualizar el stock de productos
      for (const item of items) {
        const originProduct = products.find(
          p => p.id === item.productId && p.storeId === fromStoreId
        );
        const destProduct = products.find(
          p => p.sku === item.productSku && p.storeId === toStoreId
        );

        if (originProduct) {
          // Actualizar stock del producto origen
          const updatedOriginProduct = {
            ...originProduct,
            stock: originProduct.stock - item.quantity
          };
          await updateProduct(updatedOriginProduct);
        }

        if (destProduct) {
          // Actualizar stock del producto destino
          const updatedDestProduct = {
            ...destProduct,
            stock: destProduct.stock + item.quantity
          };
          await updateProduct(updatedDestProduct);
        }
      }

      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nueva Transferencia</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tiendas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tienda Origen
                  </label>
                  <select
                    value={fromStoreId}
                    onChange={e => {
                      setFromStoreId(e.target.value);
                      setItems([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {stores.filter((s: any) => s.isActive).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tienda Destino *
                  </label>
                  <select
                    value={toStoreId}
                    onChange={e => setToStoreId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar tienda</option>
                    {stores
                      .filter((s: any) => s.isActive && s.id !== fromStoreId)
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Productos */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Agregar Productos</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Buscar por nombre o SKU..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={selectedProduct}
                      onChange={e => setSelectedProduct(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar producto</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - Stock: {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!selectedProduct || quantity <= 0}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
                    >
                      <Plus className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista */}
              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Productos a Transferir</h4>
                  {items.map(item => (
                    <div
                      key={item.productId}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2"
                    >
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">{item.productSku}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item.productId, item.quantity - 1)
                          }
                          className="w-8 h-8 border rounded-full flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item.productId, item.quantity + 1)
                          }
                          className="w-8 h-8 border rounded-full flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notas (opcional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  disabled={!toStoreId || items.length === 0}
                >
                  Crear Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // --- View Transfer Modal ---
  const ViewTransferModal = ({
    transfer,
    onClose
  }: {
    transfer: Transfer;
    onClose: () => void;
  }) => {
    const fromStore = stores.find((s: any) => s.id === transfer.fromStoreId);
    const toStore = stores.find((s: any) => s.id === transfer.toStoreId);

    const handleStatusChange = async (newStatus: Transfer['status']) => {
      await updateTransfer({
        ...transfer,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : transfer.completedAt
      });
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Transferencia #{transfer.id}</h3>
              <button onClick={onClose}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Origen</p>
                  <p className="font-semibold">{fromStore?.name}</p>
                </div>
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                <div className="text-right">
                  <p className="text-sm text-gray-500">Destino</p>
                  <p className="font-semibold">{toStore?.name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Estado</p>
                {getStatusBadge(transfer.status)}
              </div>

              {transfer.completedAt && (
                <div>
                  <p className="text-sm text-gray-500">Completado</p>
                  <p className="font-semibold">{formatDate(transfer.completedAt)}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Productos Transferidos
                </h4>
                <div className="space-y-2">
                  {transfer.items.map(i => (
                    <div
                      key={i.productId}
                      className="flex justify-between bg-gray-50 p-3 rounded-lg"
                    >
                      <p>{i.productName}</p>
                      <span>{i.quantity} u.</span>
                    </div>
                  ))}
                </div>
              </div>

              {transfer.status !== 'completed' &&
                transfer.status !== 'cancelled' && (
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    {transfer.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange('in-transit')}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      >
                        Marcar En Tránsito
                      </button>
                    )}
                    {transfer.status === 'in-transit' && (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                      >
                        Marcar Completada
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferencias</h1>
          <p className="text-gray-600 mt-1">
            {currentStore?.name || 'Selecciona una tienda'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Transferencia
        </button>
      </div>

      {/* Tabla / Listado de transferencias */}
      <div className="bg-white shadow rounded-xl p-4">
        {storeTransfers.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            No hay transferencias registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-gray-600 uppercase text-xs">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {storeTransfers.map(t => {
                  const fromStore = stores.find((s: any) => s.id === t.fromStoreId);
                  const toStore = stores.find((s: any) => s.id === t.toStoreId);
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-3">{t.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{fromStore?.name || '-'}</td>
                      <td className="px-4 py-3">{toStore?.name || '-'}</td>
                      <td className="px-4 py-3">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewingTransfer(t)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateTransferModal onClose={() => setShowCreateModal(false)} />
      )}
      {viewingTransfer && (
        <ViewTransferModal
          transfer={viewingTransfer}
          onClose={() => setViewingTransfer(null)}
        />
      )}
    </div>
  );
}