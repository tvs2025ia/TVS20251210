import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { indexedDBService } from '../services/indexedDBService';
import { SupabaseService } from '../services/supabaseService';
import { User, Store, PaymentMethod, ReceiptTemplate, Supplier } from '../types';
import { 
  Settings, 
  Users, 
  Store as StoreIcon, 
  CreditCard, 
  FileText,
  Truck,
  Plus, 
  Edit3, 
  Trash2,
  X,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  AlertCircle,
  Save
} from 'lucide-react';

export function Admin() {
  const { 
    users, 
    paymentMethods, 
    receiptTemplates, 
    suppliers,
    expenseCategories,
    addUser, 
    updateUser, 
    deleteUser,
    addPaymentMethod, 
    updatePaymentMethod, 
    deletePaymentMethod,
    addReceiptTemplate,
    updateReceiptTemplate,
    deleteReceiptTemplate,
    addSupplier,
    updateSupplier,
    addExpenseCategory,
    deleteExpenseCategory
  } = useData();
  const { stores, addStore, updateStore, deleteStore } = useStore();
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ReceiptTemplate | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newExpenseCategory, setNewExpenseCategory] = useState('');

  // ✅ Modal para crear/editar usuarios con contraseña
  const UserModal = ({ user, onClose, onSave }: {
    user?: User;
    onClose: () => void;
    onSave: (user: User, allowedStores?: string[]) => void;
  }) => {
    const [formData, setFormData] = useState({
      username: user?.username || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'employee' as 'admin' | 'employee',
      storeId: user?.storeId || stores[0]?.id || '', // Tienda principal
      isActive: user?.isActive ?? true
    });
    
    // ✅ NUEVO: Estado para tiendas permitidas (multi-selección)
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
  
    // ✅ Cargar tiendas permitidas al editar
    useEffect(() => {
      const loadAllowedStores = async () => {
        if (user && user.role === 'employee') {
          try {
            // Intentar cargar desde Supabase primero
            const stores = await SupabaseService.getUserStores(user.id);
            if (stores.length > 0) {
              setSelectedStores(stores);
            } else {
              // Fallback: usar storeId actual
              setSelectedStores([user.storeId]);
            }
          } catch (error) {
            console.warn('Error cargando tiendas del usuario:', error);
            setSelectedStores([user.storeId]);
          }
        }
      };
  
      loadAllowedStores();
    }, [user]);
  
    // ✅ Toggle selección de tienda
    const toggleStoreSelection = (storeId: string) => {
      setSelectedStores(prev => {
        if (prev.includes(storeId)) {
          return prev.filter(id => id !== storeId);
        } else {
          return [...prev, storeId];
        }
      });
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.username || !formData.email) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }
  
      // Contraseña requerida solo para nuevos usuarios
      if (!user && !formData.password) {
        alert('La contraseña es requerida para nuevos usuarios');
        return;
      }
  
      // ✅ Validar que empleados tengan al menos una tienda
      if (formData.role === 'employee') {
        if (selectedStores.length === 0) {
          alert('Debes asignar al menos una tienda al empleado');
          return;
        }
        
        // Validar que storeId esté en las tiendas seleccionadas
        if (!selectedStores.includes(formData.storeId)) {
          alert('La tienda principal debe estar en las tiendas permitidas');
          return;
        }
      }
  
      setSaving(true);
  
      try {
        const userData: User = {
          id: user?.id || crypto.randomUUID(),
          username: formData.username,
          email: formData.email,
          role: formData.role,
          storeId: formData.storeId,
          isActive: formData.isActive,
          createdAt: user?.createdAt || new Date(),
          lastLogin: user?.lastLogin,
          passwordHash: formData.password 
            ? SupabaseService.hashPassword(formData.password) 
            : user?.passwordHash
        };
  
        // ✅ Pasar tiendas permitidas solo para empleados
        const allowedStores = formData.role === 'employee' ? selectedStores : undefined;
        onSave(userData, allowedStores);
        onClose();
      } catch (error) {
        alert('Error guardando usuario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      } finally {
        setSaving(false);
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {user ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
  
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {user ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={user ? 'Dejar vacío para mantener actual' : 'Ingresa contraseña'}
                    required={!user}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tienda Principal *
                  </label>
                  <select
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona una tienda</option>
                    {stores.filter(s => s.isActive).map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              </div>
  
              {/* ✅ NUEVO: Selección múltiple de tiendas para empleados */}
              {formData.role === 'employee' && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Users className="w-4 h-4 inline mr-2" />
                    Tiendas Permitidas *
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Selecciona todas las tiendas a las que este empleado puede acceder
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {stores.filter(s => s.isActive).map(store => (
                      <label
                        key={store.id}
                        className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(store.id)}
                          onChange={() => toggleStoreSelection(store.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{store.name}</span>
                        {formData.storeId === store.id && (
                          <span className="text-xs text-blue-600 font-medium">(Principal)</span>
                        )}
                      </label>
                    ))}
                  </div>
  
                  {selectedStores.length === 0 && (
                    <div className="mt-2 flex items-center text-orange-600 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Debes seleccionar al menos una tienda
                    </div>
                  )}
                </div>
              )}
  
              {/* ✅ Mensaje informativo para admin */}
              {formData.role === 'admin' && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center text-blue-800">
                    <Shield className="w-5 h-5 mr-2" />
                    <div>
                      <p className="font-medium text-sm">Acceso Administrativo</p>
                      <p className="text-xs mt-1">
                        Los administradores tienen acceso a todas las tiendas del sistema
                      </p>
                    </div>
                  </div>
                </div>
              )}
  
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>
  
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  {saving && <Save className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Guardando...' : (user ? 'Actualizar' : 'Crear')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };
  
  // ✅ Actualizar las funciones de guardado en Admin.tsx
  
  const handleSaveUser = async (user: User, allowedStores?: string[]) => {
    try {
      // Guardar usuario en Supabase
      await SupabaseService.saveUser(user);
      
      // Si es empleado, actualizar sus tiendas permitidas
      if (user.role === 'employee' && allowedStores) {
        await SupabaseService.updateUserStores(user.id, allowedStores);
      }
      
      // Guardar en IndexedDB para offline
      await indexedDBService.saveUser(user, allowedStores);
      
      // Actualizar contexto local
      if (editingUser) {
        updateUser(user);
      } else {
        addUser(user);
      }
      
      alert('Usuario guardado exitosamente');
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error guardando usuario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // ✅ Función para eliminar usuario con confirmación
  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    // No permitir eliminar usuarios mock del sistema
    const isMockUser = ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'].includes(userId);
    if (isMockUser) {
      alert('No se pueden eliminar usuarios del sistema base');
      return;
    }

    // No permitir auto-eliminación
    if (userId === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar al usuario "${userToDelete.username}"?\n\n` +
      'Esta acción desactivará el usuario y no podrá iniciar sesión.\n' +
      'Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      try {
        await deleteUser(userId);
        alert('Usuario eliminado exitosamente');
      } catch (error) {
        alert('Error eliminando usuario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      }
    }
  };

  // ✅ Resto de modales simplificados (Store, PaymentMethod, etc.)
  const StoreModal = ({ store, onClose, onSave }: {
    store?: Store;
    onClose: () => void;
    onSave: (store: Store) => void;
  }) => {
    const [formData, setFormData] = useState({
      name: store?.name || '',
      address: store?.address || '',
      phone: store?.phone || '',
      email: store?.email || '',
      isActive: store?.isActive ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name) {
        alert('El nombre es requerido');
        return;
      }

      const storeData: Store = {
        id: store?.id || crypto.randomUUID(),
        ...formData
      };

      onSave(storeData);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {store ? 'Editar Tienda' : 'Nueva Tienda'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="storeActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="storeActive" className="ml-2 block text-sm text-gray-700">
                Tienda activa
              </label>
            </div>

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
                {store ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ReceiptTemplateModal = ({ template, onClose, onSave }: {
    template?: ReceiptTemplate;
    onClose: () => void;
    onSave: (template: ReceiptTemplate) => void;
  }) => {
    const [formData, setFormData] = useState({
      name: template?.name || '',
      storeId: template?.storeId || stores[0]?.id || '',
      headerText: template?.headerText || '*** RECIBO DE VENTA ***\nNombre de la Tienda\nNIT: 123456789-1',
      footerText: template?.footerText || '¡Gracias por su compra!\nwww.tienda.com',
      thermalWidth: template?.thermalWidth || 58,
      fontSize: template?.fontSize || 11,
      showDate: template?.showDate ?? true,
      showEmployee: template?.showEmployee ?? true,
      showCustomer: template?.showCustomer ?? true,
      showInvoiceNumber: template?.showInvoiceNumber ?? true,
      showPaymentMethod: template?.showPaymentMethod ?? true,
      showItemDetails: template?.showItemDetails ?? true,
      showTotals: template?.showTotals ?? true,
      isActive: template?.isActive ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name || !formData.storeId) {
        alert('El nombre y la tienda son requeridos');
        return;
      }

      const templateData: ReceiptTemplate = {
        id: template?.id || crypto.randomUUID(),
        ...formData,
        showLogo: false,
        logoUrl: ''
      };

      onSave(templateData);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {template ? 'Editar Plantilla' : 'Nueva Plantilla de Recibo'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tienda *</label>
                <select
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar tienda</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto del Encabezado</label>
              <textarea
                value={formData.headerText}
                onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto del Pie de Página</label>
              <textarea
                value={formData.footerText}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="templateActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="templateActive" className="ml-2 block text-sm text-gray-700">
                Plantilla activa
              </label>
            </div>

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
                {template ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  const SupplierModal = ({ supplier, onClose, onSave }: {
    supplier?: Supplier;
    onClose: () => void;
    onSave: (supplier: Supplier) => void;
  }) => {
    const [formData, setFormData] = useState({
      name: supplier?.name || '',
      email: supplier?.email || '',
      phone: supplier?.phone || '',
      address: supplier?.address || '',
      contactPerson: supplier?.contactPerson || '',
      isActive: supplier?.isActive ?? true
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name) {
        alert('El nombre del proveedor es requerido');
        return;
      }

      setSaving(true);

      try {
        const supplierData: Supplier = {
          id: supplier?.id || crypto.randomUUID(),
          ...formData
        };

        onSave(supplierData);
        onClose();
      } catch (error) {
        alert('Error guardando proveedor: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona de Contacto</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="supplierActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="supplierActive" className="ml-2 block text-sm text-gray-700">
                Proveedor activo
              </label>
            </div>

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
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {saving && <Save className="w-4 h-4 animate-spin" />}
                <span>{saving ? 'Guardando...' : (supplier ? 'Actualizar' : 'Crear')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  const PaymentMethodModal = ({ payment, onClose, onSave }: {
    payment?: PaymentMethod;
    onClose: () => void;
    onSave: (payment: PaymentMethod) => void;
  }) => {
    const [formData, setFormData] = useState({
      name: payment?.name || '',
      discountPercentage: payment?.discountPercentage || 0,
      isActive: payment?.isActive ?? true
    });
    const [saving, setSaving] = useState(false);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
  
      if (!formData.name) {
        alert('El nombre del método de pago es requerido');
        return;
      }
  
      if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
        alert('El descuento debe estar entre 0 y 100%');
        return;
      }
  
      setSaving(true);
  
      try {
        const paymentData: PaymentMethod = {
          id: payment?.id || crypto.randomUUID(),
          ...formData
        };
  
        onSave(paymentData);
        onClose();
      } catch (error) {
        alert('Error guardando método de pago: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      } finally {
        setSaving(false);
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {payment ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
  
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Método *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Efectivo, Tarjeta, Transferencia"
                required
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descuento (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Descuento aplicado automáticamente al usar este método
              </p>
            </div>
  
            <div className="flex items-center">
              <input
                type="checkbox"
                id="paymentActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="paymentActive" className="ml-2 block text-sm text-gray-700">
                Método activo
              </label>
            </div>
  
            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {saving && <Save className="w-4 h-4 animate-spin" />}
                <span>{saving ? 'Guardando...' : (payment ? 'Actualizar' : 'Crear')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  const tabs = [
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'stores', name: 'Tiendas', icon: StoreIcon },
    { id: 'payments', name: 'Métodos de Pago', icon: CreditCard },
    { id: 'suppliers', name: 'Proveedores', icon: Truck },
    { id: 'receipt-templates', name: 'Plantillas de Recibo', icon: FileText },
    { id: 'expense-categories', name: 'Categorías de Egresos', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <p className="text-gray-600 mt-1">Gestión del sistema</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="w-4 h-4" />
          <span>Admin: {currentUser?.username}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* ✅ Tab de Usuarios mejorado */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h3>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nuevo Usuario</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(user => {
                      const userStore = stores.find(s => s.id === user.storeId);
                      const isMockUser = ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'].includes(user.id);
                      
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                user.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                              }`}>
                                {user.role === 'admin' ? (
                                  <Shield className={`w-4 h-4 text-purple-600`} />
                                ) : (
                                  <Users className={`w-4 h-4 text-blue-600`} />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                {isMockUser && (
                                  <div className="text-xs text-gray-500">Usuario del sistema</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{user.email}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{userStore?.name || 'N/A'}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar usuario"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {!isMockUser && user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay usuarios registrados</p>
                </div>
              )}
            </div>
          )}

          {/* ✅ Tab de Tiendas */}
          {activeTab === 'stores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Gestión de Tiendas</h3>
                <button
                  onClick={() => setShowStoreModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Tienda</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map(store => (
                  <div key={store.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{store.name}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingStore(store)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Desactivar tienda "${store.name}"?`)) {
                              deleteStore(store.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{store.address}</p>
                      <p>{store.phone}</p>
                      <p>{store.email}</p>
                    </div>
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        store.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {store.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ Tab de Métodos de Pago */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Métodos de Pago</h3>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Método</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentMethods.map(method => (
                      <tr key={method.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{method.name}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{method.discountPercentage}%</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            method.isActive 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {method.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingPayment(method)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Desactivar método "${method.name}"?`)) {
                                  deletePaymentMethod(method.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ✅ Tab de Proveedores */}
          { activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Proveedores</h3>
                <button
                  onClick={() => setShowSupplierModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Proveedor</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {suppliers.map(supplier => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{supplier.name}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{supplier.email || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{supplier.phone || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{supplier.contactPerson || 'N/A'}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${supplier.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {supplier.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingSupplier(supplier)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar proveedor"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Desactivar proveedor "${supplier.name}"?`)) {
                                  updateSupplier({ ...supplier, isActive: false });
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Desactivar proveedor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {suppliers.length === 0 && (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay proveedores registrados</p>
                </div>
              )}
            </div>
          )}

          {/* Tab de Plantillas de Recibo */}
          {activeTab === 'receipt-templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Plantillas de Recibo</h3>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Plantilla</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {receiptTemplates.map(template => {
                      const templateStore = stores.find(s => s.id === template.storeId);
                      return (
                        <tr key={template.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">{template.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{templateStore?.name || 'N/A'}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              template.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {template.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingTemplate(template)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar plantilla "${template.name}"?`)) {
                                    deleteReceiptTemplate(template.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab de Categorías de Egresos */}
          {activeTab === 'expense-categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Categorías de Egresos</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    placeholder="Nueva categoría"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={async () => {
                      if (newExpenseCategory.trim()) {
                        try {
                          await addExpenseCategory(newExpenseCategory.trim());
                          setNewExpenseCategory('');
                        } catch (error) {
                          alert('Error agregando categoría: ' + (error instanceof Error ? error.message : 'Error desconocido'));
                        }
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseCategories.map(category => (
                  <div key={category} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{category}</span>
                    <button
                      onClick={async () => {
                        if (window.confirm(`¿Eliminar categoría "${category}"?`)) {
                          try {
                            await deleteExpenseCategory(category);
                          } catch (error) {
                            alert('Error eliminando categoría: ' + (error instanceof Error ? error.message : 'Error desconocido'));
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {expenseCategories.length === 0 && (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay categorías de egresos</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Modales */}
      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onSave={async (user, allowedStores) => {
            try {
              await SupabaseService.saveUser(user);
              if (user.role === 'employee' && allowedStores) {
                await SupabaseService.updateUserStores(user.id, allowedStores);
              }
              await indexedDBService.saveUser(user, allowedStores);
              addUser(user);
              alert('Usuario creado exitosamente');
            } catch (error) {
              alert('Error: ' + (error instanceof Error ? error.message : 'Error desconocido'));
            }
          }}
        />
      )}

      {editingUser && (
        <UserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={async (user, allowedStores) => {
            try {
              await SupabaseService.saveUser(user);
              if (user.role === 'employee' && allowedStores) {
                await SupabaseService.updateUserStores(user.id, allowedStores);
              }
              await indexedDBService.saveUser(user, allowedStores);
              updateUser(user);
              alert('Usuario actualizado exitosamente');
            } catch (error) {
              alert('Error: ' + (error instanceof Error ? error.message : 'Error desconocido'));
            }
          }}
        />
      )}

      {showStoreModal && (
        <StoreModal
          onClose={() => setShowStoreModal(false)}
          onSave={(store) => addStore(store)}
        />
      )}

      {editingStore && (
        <StoreModal
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSave={(store) => updateStore(store)}
        />
      )}

      {showTemplateModal && (
        <ReceiptTemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSave={(template) => addReceiptTemplate(template)}
        />
      )}

      {editingTemplate && (
        <ReceiptTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={(template) => updateReceiptTemplate(template)}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          onClose={() => setShowSupplierModal(false)}
          onSave={(supplier) => addSupplier(supplier)}
        />
      )}

      {editingSupplier && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSave={(supplier) => updateSupplier(supplier)}
        />
      )}

      {showPaymentModal && (
        <PaymentMethodModal
          onClose={() => setShowPaymentModal(false)}
          onSave={(payment) => addPaymentMethod(payment)}
        />
      )}

      {editingPayment && (
        <PaymentMethodModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSave={(payment) => updatePaymentMethod(payment)}
        />
      )}
    </div>
  );
}