import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, Customer, Expense, Quote, Purchase, PaymentMethod, User, Supplier, CashRegister, CashMovement, ReceiptTemplate, Layaway, LayawayPayment } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { OfflineService } from '../services/offlineService';
import { SyncService } from '../services/syncService';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  quotes: Quote[];
  purchases: Purchase[];
  paymentMethods: PaymentMethod[];
  users: User[];
  suppliers: Supplier[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  expenseCategories: string[];
  receiptTemplates: ReceiptTemplate[];
  layaways: Layaway[];
  isLoading: boolean;
  isConnected: boolean;
  connectionError: string | null;
  // ✅ Nuevos estados para carga progresiva
  hasInitialData: boolean;
  loadingProgress: {
    critical: number;
    secondary: number;
  };
  criticalDataLoaded: boolean;
  secondaryDataLoaded: boolean;
  dbService: any;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addQuote: (quote: Quote) => Promise<void>;
  updateQuote: (quote: Quote) => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  updatePurchase: (purchase: Purchase) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addPaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
  updatePaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  addExpenseCategory: (category: string) => void;
  deleteExpenseCategory: (category: string) => void;
  addReceiptTemplate: (template: ReceiptTemplate) => Promise<void>;
  updateReceiptTemplate: (template: ReceiptTemplate) => Promise<void>;
  deleteReceiptTemplate: (id: string) => Promise<void>;
  getActiveReceiptTemplate: (storeId: string) => ReceiptTemplate | null;
  openCashRegister: (register: CashRegister) => Promise<void>;
  closeCashRegister: (registerId: string, closingAmount: number, expensesTurno?: any[], closingEmployeeId?: string) => Promise<void>;
  addCashMovement: (movement: CashMovement) => Promise<void>;
  addLayaway: (layaway: Layaway) => Promise<void>;
  updateLayaway: (layaway: Layaway) => Promise<void>;
  addLayawayPayment: (layawayId: string, payment: LayawayPayment) => Promise<void>;
  formatCurrency: (amount: number) => string;
  refreshData: () => Promise<void>;
  connectToDatabase: () => Promise<void>;
  retryConnection: () => Promise<void>;
  // ✅ Nuevas funciones para carga progresiva
  loadCriticalData: () => Promise<void>;
  loadSecondaryData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_STORE_ID = '11111111-1111-1111-1111-111111111111';

function isValidUUID(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Mock data for fallback
const mockProducts: Product[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Laptop HP Pavilion',
    sku: 'LP001',
    category: 'Computadores',
    price: 2500000,
    cost: 2000000,
    stock: 5,
    minStock: 2,
    storeId: DEFAULT_STORE_ID,
    imageUrl: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

const mockPaymentMethods: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', discountPercentage: 0, isActive: true },
  { id: '2', name: 'Tarjeta Débito', discountPercentage: 2.5, isActive: true },
  { id: '3', name: 'Tarjeta Crédito', discountPercentage: 3.8, isActive: true },
  { id: '4', name: 'Transferencia', discountPercentage: 1.2, isActive: true },
  { id: '5', name: 'PayPal', discountPercentage: 4.2, isActive: true },
  { id: '6', name: 'Nequi', discountPercentage: 1.8, isActive: true }
];

const mockExpenseCategories: string[] = [
  'Servicios',
  'Mantenimiento',
  'Suministros',
  'Marketing',
  'Transporte',
  'Seguridad',
  'Limpieza',
  'Otros'
];

const mockReceiptTemplates: ReceiptTemplate[] = [
  {
    id: '1',
    name: 'Plantilla Principal',
    storeId: DEFAULT_STORE_ID,
    headerText: '*** RECIBO DE VENTA ***\nTienda Principal\nNIT: 123456789-1\nDir: Calle Principal 123',
    footerText: '¡Gracias por su compra!\nVisite nuestra web: www.tienda.com\nTel: +57 300 123 4567',
    showLogo: true,
    logoUrl: '',
    thermalWidth: 58,
    fontSize: 11,
    showDate: true,
    showEmployee: true,
    showCustomer: true,
    showInvoiceNumber: true,
    showPaymentMethod: true,
    showItemDetails: true,
    showTotals: true,
    isActive: true
  }
];

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@email.com',
    phone: '+57 300 123 4567',
    address: 'Calle 123, Ciudad',
    storeId: DEFAULT_STORE_ID,
    totalPurchases: 5500000,
    lastPurchase: new Date('2024-01-15')
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@tienda.com',
    role: 'admin',
    storeId: DEFAULT_STORE_ID,
    createdAt: new Date(),
    isActive: true
  }
];

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Proveedor Tech SA',
    email: 'ventas@proveedortech.com',
    phone: '+57 300 555 0001',
    address: 'Zona Industrial, Ciudad',
    contactPerson: 'Carlos Mendoza',
    isActive: true
  }
];

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // ✅ Nuevos estados para carga progresiva
  const [hasInitialData, setHasInitialData] = useState(false);
  const [criticalDataLoaded, setCriticalDataLoaded] = useState(false);
  const [secondaryDataLoaded, setSecondaryDataLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    critical: 0,
    secondary: 0
  });
  
  const dbService = SupabaseService;
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(mockExpenseCategories);
  const [receiptTemplates, setReceiptTemplates] = useState<ReceiptTemplate[]>(mockReceiptTemplates);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [layaways, setLayaways] = useState<Layaway[]>([]);

  // Load all data including users, suppliers, etc.
  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.storeId) return;

      try {
        // Load users
        const usersResult = await SupabaseService.getAllUsers();
        if (usersResult.length > 0) {
          setUsers([...mockUsers, ...usersResult]);
          localStorage.setItem('cached_users', JSON.stringify(usersResult));
        }

        // Load suppliers
        const suppliersResult = await SupabaseService.getAllSuppliers();
        if (suppliersResult.length > 0) {
          setSuppliers([...mockSuppliers, ...suppliersResult]);
        }

        // Load payment methods
        const paymentMethodsResult = await SupabaseService.getAllPaymentMethods();
        if (paymentMethodsResult.length > 0) {
          setPaymentMethods(paymentMethodsResult);
        }

        // Load receipt templates
        const templatesResult = await SupabaseService.getAllReceiptTemplates(user.storeId);
        if (templatesResult.length > 0) {
          setReceiptTemplates([...mockReceiptTemplates, ...templatesResult]);
        }

      } catch (error) {
        console.warn('Error cargando datos adicionales:', error);
      }
    };

    if (isConnected && user?.storeId) {
      loadAllData();
    }
  }, [isConnected, user?.storeId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // ✅ Función para cargar datos desde cache inmediatamente
  const loadCachedData = async () => {
    try {
      console.log('Cargando datos desde cache...');
      
      const cachedProducts = localStorage.getItem('cached_products');
      const cachedCustomers = localStorage.getItem('cached_customers');
      const cachedSales = localStorage.getItem('cached_sales');

      let hasCache = false;

      if (cachedProducts) {
        const products = JSON.parse(cachedProducts);
        setProducts(products);
        hasCache = true;
        console.log(`Productos cargados desde cache: ${products.length}`);
      }

      if (cachedCustomers) {
        const customers = JSON.parse(cachedCustomers);
        setCustomers(customers);
        hasCache = true;
        console.log(`Clientes cargados desde cache: ${customers.length}`);
      }

      if (cachedSales) {
        const sales = JSON.parse(cachedSales);
        setSales(sales);
        hasCache = true;
        console.log(`Ventas cargadas desde cache: ${sales.length}`);
      }

      if (hasCache) {
        setHasInitialData(true);
        setCriticalDataLoaded(true);
        setLoadingProgress(prev => ({ ...prev, critical: 100 }));
        console.log('Datos críticos disponibles desde cache');
      }

    } catch (error) {
      console.warn('Error cargando datos desde cache:', error);
    }
  };

  // ✅ Función para guardar en cache
  const saveToCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Error guardando ${key} en cache:`, error);
    }
  };

  // ✅ Función para cargar datos críticos
  const loadCriticalData = async () => {
    if (!user?.storeId) {
      console.log('No hay storeId disponible para cargar datos críticos');
      return;
    }

    try {
      console.log('Cargando datos críticos...', { storeId: user.storeId });
      setLoadingProgress(prev => ({ ...prev, critical: 10 }));

      // Cargar productos
      setLoadingProgress(prev => ({ ...prev, critical: 30 }));
      const productsResult = await SupabaseService.getAllProducts(user.storeId);
      if (productsResult) {
        setProducts(productsResult);
        saveToCache('cached_products', productsResult);
        console.log(`Productos cargados: ${productsResult.length}`);
      }

      // Cargar clientes
      setLoadingProgress(prev => ({ ...prev, critical: 60 }));
      const customersResult = await SupabaseService.getAllCustomers(user.storeId);
      if (customersResult) {
        setCustomers(customersResult);
        saveToCache('cached_customers', customersResult);
        console.log(`Clientes cargados: ${customersResult.length}`);
      }

      setLoadingProgress(prev => ({ ...prev, critical: 100 }));
      setCriticalDataLoaded(true);
      setHasInitialData(true);
      setIsConnected(true);
      setConnectionError(null);

      console.log('Datos críticos cargados exitosamente');

      // ✅ Iniciar carga de datos secundarios en segundo plano
      setTimeout(() => {
        loadSecondaryData();
      }, 500);

    } catch (error) {
      console.error('Error cargando datos críticos:', error);
      setConnectionError('Error cargando datos críticos');
      
      // Si hay datos en cache, usarlos
      if (products.length > 0 || customers.length > 0) {
        setHasInitialData(true);
        setCriticalDataLoaded(true);
        console.log('Usando datos críticos desde cache debido a error de conexión');
      }
    }
  };

  // ✅ Función para cargar datos secundarios
  const loadSecondaryData = async () => {
    if (!user?.storeId) {
      console.log('No hay storeId disponible para cargar datos secundarios');
      return;
    }

    try {
      console.log('Cargando datos secundarios en segundo plano...');
      setLoadingProgress(prev => ({ ...prev, secondary: 10 }));

      // Cargar ventas
      setLoadingProgress(prev => ({ ...prev, secondary: 25 }));
      try {
        const salesResult = await SupabaseService.getAllSales(user.storeId);
        if (salesResult) {
          setSales(salesResult);
          saveToCache('cached_sales', salesResult);
          console.log(`Ventas cargadas: ${salesResult.length}`);
        }
      } catch (error) {
        console.warn('Error cargando ventas:', error);
      }

      // Cargar compras
      setLoadingProgress(prev => ({ ...prev, secondary: 40 }));
      try {
        const purchasesResult = await SupabaseService.getAllPurchases(user.storeId);
        if (purchasesResult) {
          setPurchases(purchasesResult);
          console.log(`Compras cargadas: ${purchasesResult.length}`);
        }
      } catch (error) {
        console.warn('Error cargando compras:', error);
      }

      // Cargar gastos
      setLoadingProgress(prev => ({ ...prev, secondary: 50 }));
      try {
        const expensesResult = await SupabaseService.getAllExpenses(user.storeId);
        if (expensesResult) {
          setExpenses(expensesResult);
          console.log(`Gastos cargados: ${expensesResult.length}`);
        }
      } catch (error) {
        console.warn('Error cargando gastos:', error);
      }

      // Cargar cajas registradoras
      setLoadingProgress(prev => ({ ...prev, secondary: 75 }));
      try {
        const cashRegistersResult = await SupabaseService.getAllCashRegisters(user.storeId);
        if (cashRegistersResult) {
          setCashRegisters(cashRegistersResult);
          console.log(`Cajas registradoras cargadas: ${cashRegistersResult.length}`);
        }
      } catch (error) {
        console.warn('Error cargando cajas registradoras:', error);
      }

      // Cargar separados
      setLoadingProgress(prev => ({ ...prev, secondary: 90 }));
      try {
        const layawaysResult = await SupabaseService.getAllLayaways(user.storeId);
        if (layawaysResult) {
          setLayaways(layawaysResult);
          console.log(`Separados cargados: ${layawaysResult.length}`);
        }
      } catch (error) {
        console.warn('Error cargando separados:', error);
      }

      setLoadingProgress(prev => ({ ...prev, secondary: 100 }));
      setSecondaryDataLoaded(true);
      console.log('Datos secundarios cargados exitosamente');

    } catch (error) {
      console.error('Error cargando datos secundarios:', error);
      // No marcar como error crítico, los datos secundarios pueden fallar sin bloquear la app
    }
  };

  useEffect(() => {
    // Initialize offline service
    OfflineService.init().catch(console.error);
    
    if (!authLoading) {
      if (user) {
        console.log('Usuario autenticado, iniciando carga de datos...', { userId: user.id, storeId: user.storeId });
        connectToDatabase();
      } else {
        console.log('Usuario no autenticado, limpiando datos...');
        clearAllData();
        setIsLoading(false);
        setIsConnected(false);
        setConnectionError(null);
        setHasInitialData(false);
        setCriticalDataLoaded(false);
        setSecondaryDataLoaded(false);
      }
    }
  }, [user, authLoading]);

  const clearAllData = () => {
    setProducts([]);
    setSales([]);
    setCustomers([]);
    setExpenses([]);
    setQuotes([]);
    setPurchases([]);
    setCashRegisters([]);
    setCashMovements([]);
    setLayaways([]);
    setPaymentMethods(mockPaymentMethods);
    setExpenseCategories(mockExpenseCategories);
    setReceiptTemplates(mockReceiptTemplates);
  };

  const connectToDatabase = async () => {
    if (!user) {
      console.log('No hay usuario autenticado para conectar');
      return;
    }

    try {
      setIsLoading(true);
      setIsConnected(false);
      setConnectionError(null);
      
      console.log('Conectando a Supabase...', { storeId: user.storeId });
      
      // ✅ Paso 1: Cargar datos desde cache inmediatamente
      await loadCachedData();
      
      // ✅ Paso 2: Permitir acceso inmediato si hay cache, sino cargar datos críticos
      if (!hasInitialData) {
        console.log('No hay datos en cache, cargando datos críticos...');
        await loadCriticalData();
      } else {
        console.log('Datos disponibles desde cache, actualizando en segundo plano...');
        setIsConnected(true);
        // Cargar datos críticos frescos en segundo plano
        setTimeout(() => {
          loadCriticalData();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error conectando a base de datos:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Error de conexión');
      
      // Si no hay datos en absoluto, cargar mock data
      if (!hasInitialData) {
        loadMockData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const retryConnection = async () => {
    console.log('Reintentando conexión...');
    await connectToDatabase();
  };

  const loadMockData = () => {
    console.log('Cargando datos mock como fallback');
    setProducts(mockProducts);
    setSales([]);
    setCustomers(mockCustomers);
    setExpenses([]);
    setCashRegisters([]);
    setCashMovements([]);
    setLayaways([]);
    setHasInitialData(true);
    setCriticalDataLoaded(true);
  };

  const refreshData = async () => {
    if (!user) {
      console.log('No hay usuario autenticado');
      return;
    }

    console.log('Refrescando todos los datos...');
    await loadCriticalData();
  };

  // ✅ El resto de las funciones CRUD se mantienen igual pero con mejor manejo de cache
  const addProduct = async (product: Product) => {
    const normalized: Product = {
      ...product,
      id: isValidUUID(product.id) ? product.id : crypto.randomUUID(),
      storeId: isValidUUID(product.storeId) ? product.storeId : (user?.storeId || DEFAULT_STORE_ID)
    };

    try {
      // Optimistic update
      setProducts(prev => {
        const updated = [...prev, normalized];
        saveToCache('cached_products', updated);
        return updated;
      });

      if (isConnected) {
        try {
          const savedProduct = await SupabaseService.saveProduct(normalized);
          setProducts(prev => {
            const updated = prev.map(p => p.id === normalized.id ? savedProduct : p);
            saveToCache('cached_products', updated);
            return updated;
          });
          console.log('Producto guardado en Supabase:', normalized.name);
        } catch (error) {
          console.warn('Error guardando en Supabase, manteniendo local:', error);
        }
      } else {
        console.log('Producto guardado offline:', normalized.name);
      }
      
    } catch (error) {
      setProducts(prev => {
        const updated = prev.filter(p => p.id !== normalized.id);
        saveToCache('cached_products', updated);
        return updated;
      });
      console.error('Error guardando producto:', error);
      throw error;
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    const normalized: Product = {
      ...updatedProduct,
      id: isValidUUID(updatedProduct.id) ? updatedProduct.id : crypto.randomUUID(),
      storeId: isValidUUID(updatedProduct.storeId) ? updatedProduct.storeId : (user?.storeId || DEFAULT_STORE_ID)
    };

    try {
      const originalProduct = products.find(p => p.id === normalized.id);
      setProducts(prev => {
        const updated = prev.map(p => p.id === normalized.id ? normalized : p);
        saveToCache('cached_products', updated);
        return updated;
      });

      if (isConnected) {
        const savedProduct = await SupabaseService.saveProduct(normalized);
        setProducts(prev => {
          const updated = prev.map(p => p.id === savedProduct.id ? savedProduct : p);
          saveToCache('cached_products', updated);
          return updated;
        });
        console.log('Producto actualizado en Supabase:', normalized.name);
      }
    } catch (error) {
      const originalProduct = products.find(p => p.id === normalized.id);
      if (originalProduct) {
        setProducts(prev => {
          const updated = prev.map(p => p.id === normalized.id ? originalProduct : p);
          saveToCache('cached_products', updated);
          return updated;
        });
      }
      console.error('Error actualizando producto:', error);
      throw error;
    }
  };

  const addSale = async (sale: Sale) => {
    const normalized: Sale = {
      ...sale,
      id: isValidUUID(sale.id) ? sale.id : crypto.randomUUID(),
      storeId: isValidUUID(sale.storeId) ? sale.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(sale.employeeId) ? sale.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      customerId: sale.customerId && isValidUUID(sale.customerId) ? sale.customerId : undefined
    };
    
    try {
      setSales(prev => {
        const updated = [...prev, normalized];
        saveToCache('cached_sales', updated);
        return updated;
      });

      setProducts(prev => {
        const updated = prev.map(p => {
          const saleItem = normalized.items.find(item => item.productId === p.id);
          if (saleItem) {
            return { ...p, stock: p.stock - saleItem.quantity };
          }
          return p;
        });
        saveToCache('cached_products', updated);
        return updated;
      });

      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: normalized.storeId,
        employeeId: normalized.employeeId,
        type: 'sale',
        amount: normalized.total,
        description: `Venta ${normalized.invoiceNumber}`,
        date: normalized.date,
        referenceId: normalized.id
      };
      setCashMovements(prev => [...prev, cashMovement]);

      if (isConnected) {
        try {
          await SupabaseService.saveSale(normalized);
          console.log('Venta guardada en Supabase:', normalized.invoiceNumber);
        } catch (error) {
          console.warn('Error guardando en Supabase, guardando offline:', error);
          await OfflineService.saveSaleOffline(normalized);
        }
      } else {
        await OfflineService.saveSaleOffline(normalized);
        console.log('Venta guardada offline:', normalized.invoiceNumber);
      }
    } catch (error) {
      setSales(prev => {
        const updated = prev.filter(s => s.id !== normalized.id);
        saveToCache('cached_sales', updated);
        return updated;
      });
      setCashMovements(prev => prev.filter(m => m.referenceId !== normalized.id));
      console.error('Error guardando venta:', error);
      throw error;
    }
  };

  const updateSale = async (updatedSale: Sale) => {
    const normalized: Sale = {
      ...updatedSale,
      id: isValidUUID(updatedSale.id) ? updatedSale.id : crypto.randomUUID(),
      storeId: isValidUUID(updatedSale.storeId) ? updatedSale.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(updatedSale.employeeId) ? updatedSale.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      customerId: updatedSale.customerId && isValidUUID(updatedSale.customerId) ? updatedSale.customerId : undefined
    };

    try {
      const originalSale = sales.find(s => s.id === normalized.id);
      setSales(prev => {
        const updated = prev.map(s => s.id === normalized.id ? normalized : s);
        saveToCache('cached_sales', updated);
        return updated;
      });

      if (isConnected) {
        await SupabaseService.updateSale(normalized);
        console.log('Venta actualizada en Supabase:', normalized.invoiceNumber);
      }
    } catch (error) {
      const originalSale = sales.find(s => s.id === normalized.id);
      if (originalSale) {
        setSales(prev => {
          const updated = prev.map(s => s.id === normalized.id ? originalSale : s);
          saveToCache('cached_sales', updated);
          return updated;
        });
      }
      console.error('Error actualizando venta:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const originalSale = sales.find(s => s.id === id);
      if (!originalSale) {
        throw new Error('Venta no encontrada');
      }

      setSales(prev => {
        const updated = prev.filter(s => s.id !== id);
        saveToCache('cached_sales', updated);
        return updated;
      });

      if (isConnected) {
        await SupabaseService.deleteSale(id);
      }

      setCashMovements(prev => prev.filter(m => m.referenceId !== id));
      console.log('Venta eliminada:', originalSale.invoiceNumber);
    } catch (error) {
      const originalSale = sales.find(s => s.id === id);
      if (originalSale) {
        setSales(prev => {
          const updated = [...prev, originalSale];
          saveToCache('cached_sales', updated);
          return updated;
        });
      }
      console.error('Error eliminando venta:', error);
      throw error;
    }
  };

  const addCustomer = async (customer: Customer) => {
    const normalizedCustomer = {
      ...customer,
      storeId: customer.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    
    try {
      setCustomers(prev => {
        const updated = [...prev, normalizedCustomer];
        saveToCache('cached_customers', updated);
        return updated;
      });
      
      if (isConnected) {
        try {
          const savedCustomer = await SupabaseService.saveCustomer(normalizedCustomer);
          setCustomers(prev => {
            const updated = prev.map(c => c.id === savedCustomer.id ? savedCustomer : c);
            saveToCache('cached_customers', updated);
            return updated;
          });
          console.log('Cliente guardado en Supabase:', customer.name);
        } catch (error) {
          console.warn('Error guardando en Supabase, manteniendo local:', error);
        }
      } else {
        console.log('Cliente guardado offline:', customer.name);
      }
      
    } catch (error) {
      setCustomers(prev => {
        const updated = prev.filter(c => c.id !== normalizedCustomer.id);
        saveToCache('cached_customers', updated);
        return updated;
      });
      console.error('Error guardando cliente:', error);
      throw error;
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    try {
      if (isConnected) {
        const savedCustomer = await SupabaseService.saveCustomer(updatedCustomer);
        setCustomers(prev => {
          const updated = prev.map(c => c.id === savedCustomer.id ? savedCustomer : c);
          saveToCache('cached_customers', updated);
          return updated;
        });
        console.log('Cliente actualizado en Supabase:', updatedCustomer.name);
      } else {
        setCustomers(prev => {
          const updated = prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
          saveToCache('cached_customers', updated);
          return updated;
        });
        console.log('Cliente actualizado offline:', updatedCustomer.name);
      }
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      throw error;
    }
  };

  const addExpense = async (expense: Expense) => {
    const normalizedExpense = {
      ...expense,
      storeId: expense.storeId || user?.storeId || DEFAULT_STORE_ID,
      employeeId: expense.employeeId || user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };
    
    try {
      setExpenses(prev => [...prev, normalizedExpense]);
      
      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: normalizedExpense.storeId,
        employeeId: normalizedExpense.employeeId,
        type: 'expense',
        amount: -normalizedExpense.amount,
        description: normalizedExpense.description,
        date: normalizedExpense.date,
        referenceId: normalizedExpense.id
      };
      setCashMovements(prev => [...prev, cashMovement]);
      
      if (isConnected) {
        try {
          await SupabaseService.saveExpense(normalizedExpense);
          console.log('Gasto guardado en Supabase:', expense.description);
        } catch (error) {
          console.warn('Error guardando en Supabase, guardando offline:', error);
          await OfflineService.saveExpenseOffline(normalizedExpense);
        }
      } else {
        await OfflineService.saveExpenseOffline(normalizedExpense);
        console.log('Gasto guardado offline:', expense.description);
      }
      
    } catch (error) {
      setExpenses(prev => prev.filter(e => e.id !== normalizedExpense.id));
      setCashMovements(prev => prev.filter(m => m.referenceId !== normalizedExpense.id));
      console.error('Error guardando gasto:', error);
      throw error;
    }
  };

  // Mock implementations for other features
  const addQuote = async (quote: Quote) => {
    setQuotes(prev => [...prev, quote]);
  };

  const updateQuote = async (updatedQuote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };

  const addPurchase = async (purchase: Purchase) => {
    // Optimistic UI
    setPurchases(prev => [...prev, purchase]);

    // Compute new stocks from current products snapshot
    const currentProducts = products;
    const newStocks = new Map<string, number>();
    purchase.items.forEach(item => {
      const current = currentProducts.find(p => p.id === item.productId)?.stock || 0;
      newStocks.set(item.productId, current + item.quantity);
    });

    // Update local products
    setProducts(prev => {
      const updated = prev.map(p => newStocks.has(p.id) ? { ...p, stock: newStocks.get(p.id)! } : p);
      saveToCache('cached_products', updated);
      return updated;
    });

    // Persist to Supabase
    if (isConnected) {
      try {
        await SupabaseService.savePurchase(purchase);
        // Update product stock in Supabase
        await Promise.all(
          Array.from(newStocks.entries()).map(([productId, stock]) =>
            SupabaseService.updateProductStock(productId, stock)
          )
        );
      } catch (error) {
        console.error('Error guardando compra en Supabase:', error);
      }
    }
  };

  const updatePurchase = async (updatedPurchase: Purchase) => {
    try {
      const original = purchases.find(p => p.id === updatedPurchase.id);
      if (!original) throw new Error('Compra no encontrada');

      // Compute stock deltas per product
      const oldMap = new Map<string, number>();
      original.items.forEach(it => oldMap.set(it.productId, (oldMap.get(it.productId) || 0) + it.quantity));
      const newMap = new Map<string, number>();
      updatedPurchase.items.forEach(it => newMap.set(it.productId, (newMap.get(it.productId) || 0) + it.quantity));

      const affected = new Set<string>([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())]);

      // Capture previous products snapshot for rollback
      const prevProducts = products;

      // Apply local stock updates
      const productNewStocks = new Map<string, number>();
      setProducts(prev => {
        return prev.map(prod => {
          if (!affected.has(prod.id)) return prod;
          const delta = (newMap.get(prod.id) || 0) - (oldMap.get(prod.id) || 0);
          const newStock = prod.stock + delta;
          productNewStocks.set(prod.id, newStock);
          return { ...prod, stock: newStock };
        });
      });

      // Optimistically update purchase
      setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p));

      if (isConnected) {
        await SupabaseService.savePurchase(updatedPurchase);
        await Promise.all(
          Array.from(productNewStocks.entries()).map(([productId, stock]) =>
            SupabaseService.updateProductStock(productId, stock)
          )
        );
      }
    } catch (error) {
      console.error('Error actualizando compra:', error);
      // Rollback local state if needed by reloading from refreshData
      await refreshData();
      throw error;
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const original = purchases.find(p => p.id === id);
      if (!original) throw new Error('Compra no encontrada');

      // Compute resulting stocks after removing this purchase
      const affected = new Map<string, number>();
      original.items.forEach(it => {
        const current = products.find(p => p.id === it.productId)?.stock || 0;
        const newStock = current - it.quantity;
        affected.set(it.productId, newStock);
      });

      // Optimistic UI: remove purchase and update stocks
      setPurchases(prev => prev.filter(p => p.id !== id));
      setProducts(prev => prev.map(p => affected.has(p.id) ? { ...p, stock: affected.get(p.id)! } : p));

      if (isConnected) {
        await SupabaseService.deletePurchase(id);
        await Promise.all(
          Array.from(affected.entries()).map(([productId, stock]) =>
            SupabaseService.updateProductStock(productId, stock)
          )
        );
      }
    } catch (error) {
      console.error('Error eliminando compra:', error);
      await refreshData();
      throw error;
    }
  };

  const addUser = async (user: User) => {
    try {
      setUsers(prev => {
        const updated = [...prev, user];
        const nonMockUsers = updated.filter(u => !mockUsers.find(m => m.id === u.id));
        localStorage.setItem('cached_users', JSON.stringify(nonMockUsers));
        return updated;
      });
      
      if (isConnected) {
        const savedUser = await SupabaseService.saveUser(user);
        setUsers(prev => {
          const updated = prev.map(u => u.id === savedUser.id ? savedUser : u);
          const nonMockUsers = updated.filter(u => !mockUsers.find(m => m.id === u.id));
          localStorage.setItem('cached_users', JSON.stringify(nonMockUsers));
          return updated;
        });
        console.log('Usuario guardado en Supabase:', user.username);
      }
    } catch (error) {
      setUsers(prev => {
        const updated = prev.filter(u => u.id !== user.id);
        const nonMockUsers = updated.filter(u => !mockUsers.find(m => m.id === u.id));
        localStorage.setItem('cached_users', JSON.stringify(nonMockUsers));
        return updated;
      });
      console.error('Error guardando usuario:', error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      setUsers(prev => {
        const updated = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
        const nonMockUsers = updated.filter(u => !mockUsers.find(m => m.id === u.id));
        localStorage.setItem('cached_users', JSON.stringify(nonMockUsers));
        return updated;
      });
      
      if (isConnected) {
        const savedUser = await SupabaseService.saveUser(updatedUser);
        setUsers(prev => {
          const updated = prev.map(u => u.id === savedUser.id ? savedUser : u);
          const nonMockUsers = updated.filter(u => !mockUsers.find(m => m.id === u.id));
          localStorage.setItem('cached_users', JSON.stringify(nonMockUsers));
          return updated;
        });
        console.log('Usuario actualizado en Supabase:', updatedUser.username);
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  };

  // ✅ Eliminar usuario
  const deleteUser = async (id: string) => {
    try {
      // No permitir eliminar usuarios mock
      const isMockUser = mockUsers.find(u => u.id === id);
      if (isMockUser) {
        throw new Error('No se pueden eliminar usuarios del sistema');
      }

      setUsers(prev => {
        const updated = prev.map(u => u.id === id ? { ...u, isActive: false } : u);
        const nonMockUsers = updated.filter(u => !mockUsers.find(m => m.id === u.id));
        localStorage.setItem('cached_users', JSON.stringify(nonMockUsers));
        return updated;
      });
      
      if (isConnected) {
        await SupabaseService.deleteUser(id);
        console.log('Usuario eliminado en Supabase');
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  };

  const addSupplier = async (supplier: Supplier) => {
    try {
      setSuppliers(prev => [...prev, supplier]);
      
      if (isConnected) {
        const savedSupplier = await SupabaseService.saveSupplier(supplier);
        setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
        console.log('Proveedor guardado en Supabase:', supplier.name);
      }
    } catch (error) {
      setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
      console.error('Error guardando proveedor:', error);
      throw error;
    }
  };

  const updateSupplier = async (updatedSupplier: Supplier) => {
    try {
      setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
      
      if (isConnected) {
        const savedSupplier = await SupabaseService.saveSupplier(updatedSupplier);
        setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
        console.log('Proveedor actualizado en Supabase:', updatedSupplier.name);
      }
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      throw error;
    }
  };

  const openCashRegister = async (register: CashRegister) => {
    const normalizedRegister = {
      ...register,
      storeId: register.storeId || user?.storeId || DEFAULT_STORE_ID,
      employeeId: register.employeeId || user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };
    
    try {
      if (isConnected) {
        const savedRegister = await SupabaseService.saveCashRegister(normalizedRegister);
        setCashRegisters(prev => [...prev, savedRegister]);
      } else {
        setCashRegisters(prev => [...prev, normalizedRegister]);
      }
      
      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: normalizedRegister.storeId,
        employeeId: normalizedRegister.employeeId,
        type: 'opening',
        amount: normalizedRegister.openingAmount,
        description: 'Apertura de caja',
        date: normalizedRegister.openedAt,
        referenceId: normalizedRegister.id
      };
      setCashMovements(prev => [...prev, cashMovement]);
      
      console.log('Caja abierta');
    } catch (error) {
      console.error('Error abriendo caja:', error);
      throw error;
    }
  };

  const closeCashRegister = async (registerId: string, closingAmount: number, expensesTurno?: any[]) => {
    try {
      const register = cashRegisters.find(r => r.id === registerId);
      if (!register) return;

      const openedAt = new Date(register.openedAt);
      const closedAt = new Date();

      const salesTurno = sales.filter(sale =>
        sale.storeId === register.storeId &&
        new Date(sale.date) >= openedAt &&
        new Date(sale.date) <= closedAt
      );
      const salesTotal = salesTurno.reduce((sum, s) => sum + s.total, 0);

      const expensesTurnoArr = expenses.filter(exp =>
        exp.storeId === register.storeId &&
        new Date(exp.date) >= openedAt &&
        new Date(exp.date) <= closedAt
      );
      const expensesTotal = expensesTurnoArr.reduce((sum, e) => sum + e.amount, 0);

      const expectedAmount = register.openingAmount + salesTotal - expensesTotal;
      const difference = closingAmount - expectedAmount;

      const updatedRegister: CashRegister = {
        ...register,
        closingAmount,
        closedAt,
        status: 'closed',
        expectedAmount,
        difference,
        expensesTurno: expensesTurnoArr
      };

      if (isConnected) {
        const savedRegister = await SupabaseService.saveCashRegister(updatedRegister);
        setCashRegisters(prev => prev.map(r => r.id === registerId ? savedRegister : r));
      } else {
        setCashRegisters(prev => prev.map(r => r.id === registerId ? updatedRegister : r));
      }

      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: register.storeId,
        employeeId: register.employeeId,
        type: 'closing',
        amount: 0,
        description: `Cierre de caja - Conteo: ${formatCurrency(closingAmount)}`,
        date: new Date(),
        referenceId: registerId
      };
      setCashMovements(prev => [...prev, cashMovement]);
      
      console.log('Caja cerrada');
    } catch (error) {
      console.error('Error cerrando caja:', error);
      throw error;
    }
  };

  const addCashMovement = async (movement: CashMovement) => {
    setCashMovements(prev => [...prev, movement]);
  };

  const addLayaway = async (layaway: Layaway) => {
    const normalizedLayaway = {
      ...layaway,
      storeId: layaway.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    
    try {
      if (isConnected) {
        const savedLayaway = await SupabaseService.saveLayaway(normalizedLayaway);
        setLayaways(prev => [...prev, savedLayaway]);
      } else {
        setLayaways(prev => [...prev, normalizedLayaway]);
      }
      
      normalizedLayaway.items.forEach(item => {
        setProducts(prev => {
          const updated = prev.map(p => 
            p.id === item.productId 
              ? { ...p, stock: p.stock - item.quantity }
              : p
          );
          saveToCache('cached_products', updated);
          return updated;
        });
      });
      
      console.log('Separado guardado');
    } catch (error) {
      console.error('Error guardando separado:', error);
      throw error;
    }
  };

  const updateLayaway = async (updatedLayaway: Layaway) => {
    try {
      if (isConnected) {
        const savedLayaway = await SupabaseService.saveLayaway(updatedLayaway);
        setLayaways(prev => prev.map(l => l.id === savedLayaway.id ? savedLayaway : l));
      } else {
        setLayaways(prev => prev.map(l => l.id === updatedLayaway.id ? updatedLayaway : l));
      }
      console.log('Separado actualizado');
    } catch (error) {
      console.error('Error actualizando separado:', error);
      throw error;
    }
  };

  const addLayawayPayment = async (layawayId: string, payment: LayawayPayment) => {
    // Optimistic update
    setLayaways(prev => prev.map(layaway => {
      if (layaway.id === layawayId) {
        const newTotalPaid = layaway.totalPaid + payment.amount;
        const newRemainingBalance = layaway.total - newTotalPaid;
        const newStatus = newRemainingBalance <= 0 ? 'completed' : 'active';
        return {
          ...layaway,
          payments: [...layaway.payments, payment],
          totalPaid: newTotalPaid,
          remainingBalance: newRemainingBalance,
          status: newStatus
        };
      }
      return layaway;
    }));

    // Persist in Supabase when connected, then reconcile
    if (isConnected) {
      try {
        const saved = await SupabaseService.addLayawayPayment(layawayId, payment);
        setLayaways(prev => prev.map(layaway => {
          if (layaway.id !== layawayId) return layaway;
          const payments = layaway.payments.map(p => (p.id === payment.id ? saved : p));
          return { ...layaway, payments };
        }));
      } catch (error) {
        console.error('Error guardando abono en Supabase:', error);
      }
    }

    const layaway = layaways.find(l => l.id === layawayId);
    if (layaway) {
      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: layaway.storeId,
        employeeId: payment.employeeId,
        type: 'sale',
        amount: payment.amount,
        description: `Abono separado #${layawayId}`,
        date: payment.date,
        referenceId: layawayId
      };
      setCashMovements(prev => [...prev, cashMovement]);
    }
  };

  const addPaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      setPaymentMethods(prev => [...prev, paymentMethod]);
      
      if (isConnected) {
        const savedPaymentMethod = await SupabaseService.savePaymentMethod(paymentMethod);
        setPaymentMethods(prev => prev.map(pm => pm.id === savedPaymentMethod.id ? savedPaymentMethod : pm));
        console.log('Método de pago guardado en Supabase:', paymentMethod.name);
      }
    } catch (error) {
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethod.id));
      console.error('Error guardando método de pago:', error);
      throw error;
    }
  };

  const updatePaymentMethod = async (updatedPaymentMethod: PaymentMethod) => {
    try {
      setPaymentMethods(prev => prev.map(pm =>
        pm.id === updatedPaymentMethod.id ? updatedPaymentMethod : pm
      ));
      
      if (isConnected) {
        const savedPaymentMethod = await SupabaseService.savePaymentMethod(updatedPaymentMethod);
        setPaymentMethods(prev => prev.map(pm => pm.id === savedPaymentMethod.id ? savedPaymentMethod : pm));
        console.log('Método de pago actualizado en Supabase:', updatedPaymentMethod.name);
      }
    } catch (error) {
      console.error('Error actualizando método de pago:', error);
      throw error;
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      setPaymentMethods(prev => prev.map(pm => 
        pm.id === id ? { ...pm, isActive: false } : pm
      ));
      
      if (isConnected) {
        await SupabaseService.deletePaymentMethod(id);
        console.log('Método de pago desactivado en Supabase');
      }
    } catch (error) {
      console.error('Error desactivando método de pago:', error);
      throw error;
    }
  };

  const addExpenseCategory = (category: string) => {
    if (!expenseCategories.includes(category)) {
      setExpenseCategories(prev => [...prev, category].sort());
    }
  };

  const deleteExpenseCategory = (category: string) => {
    setExpenseCategories(prev => prev.filter(c => c !== category));
  };

  const addReceiptTemplate = async (template: ReceiptTemplate) => {
    try {
      const normalizedTemplate = {
        ...template,
        storeId: template.storeId || user?.storeId || DEFAULT_STORE_ID
      };
      setReceiptTemplates(prev => [...prev, normalizedTemplate]);
      
      if (isConnected) {
        const savedTemplate = await SupabaseService.saveReceiptTemplate(normalizedTemplate);
        setReceiptTemplates(prev => prev.map(rt => rt.id === savedTemplate.id ? savedTemplate : rt));
        console.log('Plantilla de recibo guardada en Supabase:', template.name);
      }
    } catch (error) {
      setReceiptTemplates(prev => prev.filter(rt => rt.id !== template.id));
      console.error('Error guardando plantilla de recibo:', error);
      throw error;
    }
  };

  const updateReceiptTemplate = async (updatedTemplate: ReceiptTemplate) => {
    try {
      setReceiptTemplates(prev => prev.map(rt =>
        rt.id === updatedTemplate.id ? updatedTemplate : rt
      ));
      
      if (isConnected) {
        const savedTemplate = await SupabaseService.saveReceiptTemplate(updatedTemplate);
        setReceiptTemplates(prev => prev.map(rt => rt.id === savedTemplate.id ? savedTemplate : rt));
        console.log('Plantilla de recibo actualizada en Supabase:', updatedTemplate.name);
      }
    } catch (error) {
      console.error('Error actualizando plantilla de recibo:', error);
      throw error;
    }
  };

  const deleteReceiptTemplate = async (id: string) => {
    try {
      setReceiptTemplates(prev => prev.map(rt => 
        rt.id === id ? { ...rt, isActive: false } : rt
      ));
      
      if (isConnected) {
        await SupabaseService.deleteReceiptTemplate(id);
        console.log('Plantilla de recibo desactivada en Supabase');
      }
    } catch (error) {
      console.error('Error desactivando plantilla de recibo:', error);
      throw error;
    }
  };

  const getActiveReceiptTemplate = (storeId: string): ReceiptTemplate | null => {
    return receiptTemplates.find(rt => rt.storeId === storeId && rt.isActive) || null;
  };

  // ✅ Solo marcar como loading cuando realmente esté bloqueando la UI
  const isLoadingCombined = authLoading || (isLoading && !hasInitialData);

  const value = {
    products,
    sales,
    customers,
    expenses,
    quotes,
    purchases,
    paymentMethods,
    users,
    suppliers,
    cashRegisters,
    cashMovements,
    expenseCategories,
    receiptTemplates,
    layaways,
    isLoading: isLoadingCombined,
    isConnected,
    connectionError,
    // ✅ Nuevas propiedades
    hasInitialData,
    loadingProgress,
    criticalDataLoaded,
    secondaryDataLoaded,
    dbService,
    addProduct,
    updateProduct,
    addSale,
    updateSale,
    deleteSale,
    addCustomer,
    updateCustomer,
    addExpense,
    addQuote,
    updateQuote,
    addPurchase,
    updatePurchase,
    deletePurchase,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addUser,
    updateUser,
    deleteUser,
    addSupplier,
    updateSupplier,
    addExpenseCategory,
    deleteExpenseCategory,
    addReceiptTemplate,
    updateReceiptTemplate,
    deleteReceiptTemplate,
    getActiveReceiptTemplate,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
    addLayaway,
    updateLayaway,
    addLayawayPayment,
    formatCurrency,
    refreshData,
    connectToDatabase,
    retryConnection,
    // ✅ Nuevas funciones
    loadCriticalData,
    loadSecondaryData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
