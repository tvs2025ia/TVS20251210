import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, Customer, Expense, Quote, Purchase, PaymentMethod, User, Supplier, CashRegister, CashMovement, ReceiptTemplate, Layaway, LayawayPayment, Transfer } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { OfflineService } from '../services/offlineService';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  transfers: Transfer[];
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
  loadCriticalData: () => Promise<void>;
  loadSecondaryData: () => Promise<void>;
  addTransfer: (transfer: Transfer) => Promise<void>;
  updateTransfer: (transfer: Transfer) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
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

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [receiptTemplates, setReceiptTemplates] = useState<ReceiptTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [layaways, setLayaways] = useState<Layaway[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función para cargar datos críticos desde Supabase
  const loadCriticalData = async () => {
    if (!user?.storeId) {
      console.log('No hay storeId disponible para cargar datos críticos');
      return;
    }

    try {
      console.log('🔄 Cargando datos críticos desde Supabase...', { storeId: user.storeId });
      setLoadingProgress(prev => ({ ...prev, critical: 10 }));

      // Cargar productos
      setLoadingProgress(prev => ({ ...prev, critical: 30 }));
      const productsResult = await SupabaseService.getAllProducts(user.storeId);
      if (productsResult) {
        setProducts(productsResult);
        console.log(`✅ Productos cargados: ${productsResult.length}`);
      }

      // Cargar clientes
      setLoadingProgress(prev => ({ ...prev, critical: 60 }));
      const customersResult = await SupabaseService.getAllCustomers(user.storeId);
      if (customersResult) {
        setCustomers(customersResult);
        console.log(`✅ Clientes cargados: ${customersResult.length}`);
      }

      setLoadingProgress(prev => ({ ...prev, critical: 100 }));
      setCriticalDataLoaded(true);
      setHasInitialData(true);
      setIsConnected(true);
      setConnectionError(null);

      console.log('✅ Datos críticos cargados exitosamente');

      // Iniciar carga de datos secundarios en segundo plano
      setTimeout(() => {
        loadSecondaryData();
      }, 500);

    } catch (error) {
      console.error('❌ Error cargando datos críticos:', error);
      setConnectionError('Error cargando datos críticos');
      setIsConnected(false);
    }
  };

  // Función para cargar datos secundarios desde Supabase
  const loadSecondaryData = async () => {
    if (!user?.storeId) {
      console.log('No hay storeId disponible para cargar datos secundarios');
      return;
    }

    try {
      console.log('🔄 Cargando datos secundarios desde Supabase...');
      setLoadingProgress(prev => ({ ...prev, secondary: 10 }));

      // Cargar ventas
      setLoadingProgress(prev => ({ ...prev, secondary: 15 }));
      try {
        const salesResult = await SupabaseService.getAllSales(user.storeId);
        if (salesResult) {
          setSales(salesResult);
          console.log(`✅ Ventas cargadas: ${salesResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando ventas:', error);
      }

      // Cargar compras
      setLoadingProgress(prev => ({ ...prev, secondary: 25 }));
      try {
        const purchasesResult = await SupabaseService.getAllPurchases(user.storeId);
        if (purchasesResult) {
          setPurchases(purchasesResult);
          console.log(`✅ Compras cargadas: ${purchasesResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando compras:', error);
      }

      // Cargar transferencias
      setLoadingProgress(prev => ({ ...prev, secondary: 35 }));
      try {
        const transfersResult = await SupabaseService.getAllTransfers();
        if (transfersResult) {
          setTransfers(transfersResult);
          console.log(`✅ Transferencias cargadas: ${transfersResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando transferencias:', error);
      }

      // Cargar gastos
      setLoadingProgress(prev => ({ ...prev, secondary: 45 }));
      try {
        const expensesResult = await SupabaseService.getAllExpenses(user.storeId);
        if (expensesResult) {
          setExpenses(expensesResult);
          console.log(`✅ Gastos cargados: ${expensesResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando gastos:', error);
      }

      // Cargar cotizaciones
      setLoadingProgress(prev => ({ ...prev, secondary: 55 }));
      try {
        const quotesResult = await SupabaseService.getAllQuotes(user.storeId);
        if (quotesResult) {
          setQuotes(quotesResult);
          console.log(`✅ Cotizaciones cargadas: ${quotesResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando cotizaciones:', error);
      }

      // Cargar cajas registradoras
      setLoadingProgress(prev => ({ ...prev, secondary: 65 }));
      try {
        const cashRegistersResult = await SupabaseService.getAllCashRegisters(user.storeId);
        if (cashRegistersResult) {
          setCashRegisters(cashRegistersResult);
          console.log(`✅ Cajas registradoras cargadas: ${cashRegistersResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando cajas registradoras:', error);
      }

      // Cargar separados
      setLoadingProgress(prev => ({ ...prev, secondary: 75 }));
      try {
        const layawaysResult = await SupabaseService.getAllLayaways(user.storeId);
        if (layawaysResult) {
          setLayaways(layawaysResult);
          console.log(`✅ Separados cargados: ${layawaysResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando separados:', error);
      }

      // Cargar usuarios
      setLoadingProgress(prev => ({ ...prev, secondary: 82 }));
      try {
        const usersResult = await SupabaseService.getAllUsers();
        if (usersResult.length > 0) {
          setUsers(usersResult);
          console.log(`✅ Usuarios cargados: ${usersResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando usuarios:', error);
      }

      // Cargar proveedores
      setLoadingProgress(prev => ({ ...prev, secondary: 88 }));
      try {
        const suppliersResult = await SupabaseService.getAllSuppliers();
        if (suppliersResult.length > 0) {
          setSuppliers(suppliersResult);
          console.log(`✅ Proveedores cargados: ${suppliersResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando proveedores:', error);
      }

      // Cargar métodos de pago
      setLoadingProgress(prev => ({ ...prev, secondary: 94 }));
      try {
        const paymentMethodsResult = await SupabaseService.getAllPaymentMethods();
        if (paymentMethodsResult.length > 0) {
          setPaymentMethods(paymentMethodsResult);
          console.log(`✅ Métodos de pago cargados: ${paymentMethodsResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando métodos de pago:', error);
      }

      // Cargar plantillas de recibo
      setLoadingProgress(prev => ({ ...prev, secondary: 97 }));
      try {
        const templatesResult = await SupabaseService.getAllReceiptTemplates(user.storeId);
        if (templatesResult.length > 0) {
          setReceiptTemplates(templatesResult);
          console.log(`✅ Plantillas de recibo cargadas: ${templatesResult.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando plantillas de recibo:', error);
      }

      setLoadingProgress(prev => ({ ...prev, secondary: 100 }));
      setSecondaryDataLoaded(true);
      console.log('✅ Datos secundarios cargados exitosamente');

    } catch (error) {
      console.error('❌ Error cargando datos secundarios:', error);
    }
  };

  useEffect(() => {
    // Initialize offline service
    OfflineService.init().catch(console.error);
    
    if (!authLoading) {
      if (user) {
        console.log('👤 Usuario autenticado, iniciando carga de datos...', { userId: user.id, storeId: user.storeId });
        connectToDatabase();
      } else {
        console.log('🚪 Usuario no autenticado, limpiando datos...');
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
    setPaymentMethods([]);
    setExpenseCategories([]);
    setReceiptTemplates([]);
    setUsers([]);
    setSuppliers([]);
    setTransfers([]);
  };

  const connectToDatabase = async () => {
    if (!user) {
      console.log('❌ No hay usuario autenticado para conectar');
      return;
    }

    try {
      setIsLoading(true);
      setIsConnected(false);
      setConnectionError(null);
      
      console.log('🔌 Conectando a Supabase...', { storeId: user.storeId });
      
      // Cargar datos críticos directamente desde Supabase
      await loadCriticalData();
      
    } catch (error) {
      console.error('❌ Error conectando a base de datos:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const retryConnection = async () => {
    console.log('🔄 Reintentando conexión...');
    await connectToDatabase();
  };

  const refreshData = async () => {
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return;
    }

    console.log('🔄 Refrescando todos los datos desde Supabase...');
    await loadCriticalData();
  };

  // ===================== PRODUCTOS =====================
  const addProduct = async (product: Product) => {
    const normalized: Product = {
      ...product,
      id: isValidUUID(product.id) ? product.id : crypto.randomUUID(),
      storeId: isValidUUID(product.storeId) ? product.storeId : (user?.storeId || DEFAULT_STORE_ID)
    };

    try {
      // Guardar directamente en Supabase
      const savedProduct = await SupabaseService.saveProduct(normalized);
      setProducts(prev => [...prev, savedProduct]);
      console.log('✅ Producto guardado en Supabase:', savedProduct.name);
      
      // Guardar en IndexedDB como respaldo
      await OfflineService.saveProductOffline(savedProduct);
    } catch (error) {
      console.error('❌ Error guardando producto:', error);
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
      // Actualizar en Supabase
      const savedProduct = await SupabaseService.saveProduct(normalized);
      setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
      console.log('✅ Producto actualizado en Supabase:', savedProduct.name);
      
      // Actualizar en IndexedDB
      await OfflineService.saveProductOffline(savedProduct);
    } catch (error) {
      console.error('❌ Error actualizando producto:', error);
      throw error;
    }
  };

  // ===================== VENTAS =====================
  const addSale = async (sale: Sale) => {
    const normalized: Sale = {
      ...sale,
      id: isValidUUID(sale.id) ? sale.id : crypto.randomUUID(),
      storeId: isValidUUID(sale.storeId) ? sale.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(sale.employeeId) ? sale.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      customerId: sale.customerId && isValidUUID(sale.customerId) ? sale.customerId : undefined
    };
    
    try {
      // Guardar en Supabase primero
      await SupabaseService.saveSale(normalized);
      setSales(prev => [normalized, ...prev]);
      
      // Actualizar stock de productos
      setProducts(prev => 
        prev.map(p => {
          const saleItem = normalized.items.find(item => item.productId === p.id);
          if (saleItem) {
            return { ...p, stock: p.stock - saleItem.quantity };
          }
          return p;
        })
      );

      // Crear movimiento de caja
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

      console.log('✅ Venta guardada en Supabase:', normalized.invoiceNumber);
      
      // Guardar en IndexedDB como respaldo
      await OfflineService.saveSaleOffline(normalized);
    } catch (error) {
      console.error('❌ Error guardando venta:', error);
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
      await SupabaseService.updateSale(normalized);
      setSales(prev => prev.map(s => s.id === normalized.id ? normalized : s));
      console.log('✅ Venta actualizada en Supabase:', normalized.invoiceNumber);
    } catch (error) {
      console.error('❌ Error actualizando venta:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await SupabaseService.deleteSale(id);
      setSales(prev => prev.filter(s => s.id !== id));
      setCashMovements(prev => prev.filter(m => m.referenceId !== id));
      console.log('✅ Venta eliminada');
    } catch (error) {
      console.error('❌ Error eliminando venta:', error);
      throw error;
    }
  };

  // ===================== CLIENTES =====================
  const addCustomer = async (customer: Customer) => {
    const normalizedCustomer = {
      ...customer,
      storeId: customer.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    
    try {
      const savedCustomer = await SupabaseService.saveCustomer(normalizedCustomer);
      setCustomers(prev => [...prev, savedCustomer]);
      console.log('✅ Cliente guardado en Supabase:', savedCustomer.name);
    } catch (error) {
      console.error('❌ Error guardando cliente:', error);
      throw error;
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    try {
      const savedCustomer = await SupabaseService.saveCustomer(updatedCustomer);
      setCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
      console.log('✅ Cliente actualizado en Supabase:', savedCustomer.name);
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      throw error;
    }
  };

  // ===================== GASTOS =====================
  const addExpense = async (expense: Expense) => {
    const normalizedExpense = {
      ...expense,
      storeId: expense.storeId || user?.storeId || DEFAULT_STORE_ID,
      employeeId: expense.employeeId || user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };
    
    try {
      await SupabaseService.saveExpense(normalizedExpense);
      setExpenses(prev => [normalizedExpense, ...prev]);
      
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
      
      console.log('✅ Gasto guardado en Supabase:', expense.description);
      await OfflineService.saveExpenseOffline(normalizedExpense);
    } catch (error) {
      console.error('❌ Error guardando gasto:', error);
      throw error;
    }
  };

  // ===================== COTIZACIONES =====================
  const addQuote = async (quote: Quote) => {
    const normalized: Quote = {
      ...quote,
      id: isValidUUID(quote.id) ? quote.id : crypto.randomUUID(),
      storeId: isValidUUID(quote.storeId) ? quote.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(quote.employeeId) ? quote.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    };

    try {
      await SupabaseService.saveQuote(normalized);
      setQuotes(prev => [normalized, ...prev]);
      console.log('✅ Cotización guardada en Supabase');
    } catch (error) {
      console.error('❌ Error guardando cotización:', error);
      throw error;
    }
  };

  const updateQuote = async (updatedQuote: Quote) => {
    const normalized: Quote = {
      ...updatedQuote,
      id: isValidUUID(updatedQuote.id) ? updatedQuote.id : crypto.randomUUID(),
      storeId: isValidUUID(updatedQuote.storeId) ? updatedQuote.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(updatedQuote.employeeId) ? updatedQuote.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    };

    try {
      await SupabaseService.updateQuote(normalized);
      setQuotes(prev => prev.map(q => q.id === normalized.id ? normalized : q));
      console.log('✅ Cotización actualizada en Supabase');
    } catch (error) {
      console.error('❌ Error actualizando cotización:', error);
      throw error;
    }
  };

  // ===================== COMPRAS =====================
  const addPurchase = async (purchase: Purchase) => {
    try {
      await SupabaseService.savePurchase(purchase);
      setPurchases(prev => [purchase, ...prev]);

      // Actualizar stock de productos
      const stockUpdates = new Map<string, number>();
      purchase.items.forEach(item => {
        const current = products.find(p => p.id === item.productId)?.stock || 0;
        stockUpdates.set(item.productId, current + item.quantity);
      });

      setProducts(prev => 
        prev.map(p => stockUpdates.has(p.id) ? { ...p, stock: stockUpdates.get(p.id)! } : p)
      );

      // Actualizar stock en Supabase
      await Promise.all(
        Array.from(stockUpdates.entries()).map(([productId, stock]) =>
          SupabaseService.updateProductStock(productId, stock)
        )
      );

      console.log('✅ Compra guardada en Supabase');
    } catch (error) {
      console.error('❌ Error guardando compra:', error);
      throw error;
    }
  };

  const updatePurchase = async (updatedPurchase: Purchase) => {
    try {
      const original = purchases.find(p => p.id === updatedPurchase.id);
      if (!original) throw new Error('Compra no encontrada');

      // Calcular diferencias de stock
      const oldMap = new Map<string, number>();
      original.items.forEach(it => oldMap.set(it.productId, (oldMap.get(it.productId) || 0) + it.quantity));
      const newMap = new Map<string, number>();
      updatedPurchase.items.forEach(it => newMap.set(it.productId, (newMap.get(it.productId) || 0) + it.quantity));

      const affected = new Set<string>([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())]);

      // Actualizar stock local
      const productNewStocks = new Map<string, number>();
      setProducts(prev => 
        prev.map(prod => {
          if (!affected.has(prod.id)) return prod;
          const delta = (newMap.get(prod.id) || 0) - (oldMap.get(prod.id) || 0);
          const newStock = prod.stock + delta;
          productNewStocks.set(prod.id, newStock);
          return { ...prod, stock: newStock };
        })
      );

      // Actualizar en Supabase
      await SupabaseService.savePurchase(updatedPurchase);
      await Promise.all(
        Array.from(productNewStocks.entries()).map(([productId, stock]) =>
          SupabaseService.updateProductStock(productId, stock)
        )
      );

      setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p));
      console.log('✅ Compra actualizada en Supabase');
    } catch (error) {
      console.error('❌ Error actualizando compra:', error);
      await refreshData();
      throw error;
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const original = purchases.find(p => p.id === id);
      if (!original) throw new Error('Compra no encontrada');

      // Calcular stock resultante después de eliminar la compra
      const affected = new Map<string, number>();
      original.items.forEach(it => {
        const current = products.find(p => p.id === it.productId)?.stock || 0;
        const newStock = current - it.quantity;
        affected.set(it.productId, newStock);
      });

      // Eliminar de Supabase
      await SupabaseService.deletePurchase(id);
      
      // Actualizar stock en Supabase
      await Promise.all(
        Array.from(affected.entries()).map(([productId, stock]) =>
          SupabaseService.updateProductStock(productId, stock)
        )
      );

      // Actualizar estado local
      setPurchases(prev => prev.filter(p => p.id !== id));
      setProducts(prev => prev.map(p => affected.has(p.id) ? { ...p, stock: affected.get(p.id)! } : p));
      
      console.log('✅ Compra eliminada');
    } catch (error) {
      console.error('❌ Error eliminando compra:', error);
      await refreshData();
      throw error;
    }
  };

  // ===================== USUARIOS =====================
  const addUser = async (user: User) => {
    try {
      const savedUser = await SupabaseService.saveUser(user);
      setUsers(prev => [...prev, savedUser]);
      console.log('✅ Usuario guardado en Supabase:', user.username);
    } catch (error) {
      console.error('❌ Error guardando usuario:', error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const savedUser = await SupabaseService.saveUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
      console.log('✅ Usuario actualizado en Supabase:', updatedUser.username);
    } catch (error) {
      console.error('❌ Error actualizando usuario:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await SupabaseService.deleteUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: false } : u));
      console.log('✅ Usuario desactivado en Supabase');
    } catch (error) {
      console.error('❌ Error desactivando usuario:', error);
      throw error;
    }
  };

  // ===================== PROVEEDORES =====================
  const addSupplier = async (supplier: Supplier) => {
    try {
      const savedSupplier = await SupabaseService.saveSupplier(supplier);
      setSuppliers(prev => [...prev, savedSupplier]);
      console.log('✅ Proveedor guardado en Supabase:', supplier.name);
    } catch (error) {
      console.error('❌ Error guardando proveedor:', error);
      throw error;
    }
  };

  const updateSupplier = async (updatedSupplier: Supplier) => {
    try {
      const savedSupplier = await SupabaseService.saveSupplier(updatedSupplier);
      setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
      console.log('✅ Proveedor actualizado en Supabase:', updatedSupplier.name);
    } catch (error) {
      console.error('❌ Error actualizando proveedor:', error);
      throw error;
    }
  };

  // ===================== MÉTODOS DE PAGO =====================
  const addPaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      const savedPaymentMethod = await SupabaseService.savePaymentMethod(paymentMethod);
      setPaymentMethods(prev => [...prev, savedPaymentMethod]);
      console.log('✅ Método de pago guardado en Supabase:', paymentMethod.name);
    } catch (error) {
      console.error('❌ Error guardando método de pago:', error);
      throw error;
    }
  };

  const updatePaymentMethod = async (updatedPaymentMethod: PaymentMethod) => {
    try {
      const savedPaymentMethod = await SupabaseService.savePaymentMethod(updatedPaymentMethod);
      setPaymentMethods(prev => prev.map(pm => pm.id === savedPaymentMethod.id ? savedPaymentMethod : pm));
      console.log('✅ Método de pago actualizado en Supabase:', updatedPaymentMethod.name);
    } catch (error) {
      console.error('❌ Error actualizando método de pago:', error);
      throw error;
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      await SupabaseService.deletePaymentMethod(id);
      setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, isActive: false } : pm));
      console.log('✅ Método de pago desactivado en Supabase');
    } catch (error) {
      console.error('❌ Error desactivando método de pago:', error);
      throw error;
    }
  };

  // ===================== CATEGORÍAS DE GASTOS =====================
  const addExpenseCategory = (category: string) => {
    if (!expenseCategories.includes(category)) {
      setExpenseCategories(prev => [...prev, category].sort());
    }
  };

  const deleteExpenseCategory = (category: string) => {
    setExpenseCategories(prev => prev.filter(c => c !== category));
  };

  // ===================== PLANTILLAS DE RECIBO =====================
  const addReceiptTemplate = async (template: ReceiptTemplate) => {
    try {
      const normalizedTemplate = {
        ...template,
        storeId: template.storeId || user?.storeId || DEFAULT_STORE_ID
      };
      const savedTemplate = await SupabaseService.saveReceiptTemplate(normalizedTemplate);
      setReceiptTemplates(prev => [...prev, savedTemplate]);
      console.log('✅ Plantilla de recibo guardada en Supabase:', template.name);
    } catch (error) {
      console.error('❌ Error guardando plantilla de recibo:', error);
      throw error;
    }
  };

  const updateReceiptTemplate = async (updatedTemplate: ReceiptTemplate) => {
    try {
      const savedTemplate = await SupabaseService.saveReceiptTemplate(updatedTemplate);
      setReceiptTemplates(prev => prev.map(rt => rt.id === savedTemplate.id ? savedTemplate : rt));
      console.log('✅ Plantilla de recibo actualizada en Supabase:', updatedTemplate.name);
    } catch (error) {
      console.error('❌ Error actualizando plantilla de recibo:', error);
      throw error;
    }
  };

  const deleteReceiptTemplate = async (id: string) => {
    try {
      await SupabaseService.deleteReceiptTemplate(id);
      setReceiptTemplates(prev => prev.map(rt => rt.id === id ? { ...rt, isActive: false } : rt));
      console.log('✅ Plantilla de recibo desactivada en Supabase');
    } catch (error) {
      console.error('❌ Error desactivando plantilla de recibo:', error);
      throw error;
    }
  };

  const getActiveReceiptTemplate = (storeId: string): ReceiptTemplate | null => {
    return receiptTemplates.find(rt => rt.storeId === storeId && rt.isActive) || null;
  };

  // ===================== CAJA REGISTRADORA =====================
  const openCashRegister = async (register: CashRegister) => {
    const normalizedRegister = {
      ...register,
      storeId: register.storeId || user?.storeId || DEFAULT_STORE_ID,
      employeeId: register.employeeId || user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };
    
    try {
      const savedRegister = await SupabaseService.saveCashRegister(normalizedRegister);
      setCashRegisters(prev => [...prev, savedRegister]);
      
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
      
      console.log('✅ Caja abierta');
    } catch (error) {
      console.error('❌ Error abriendo caja:', error);
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

      const savedRegister = await SupabaseService.saveCashRegister(updatedRegister);
      setCashRegisters(prev => prev.map(r => r.id === registerId ? savedRegister : r));

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
      
      console.log('✅ Caja cerrada');
    } catch (error) {
      console.error('❌ Error cerrando caja:', error);
      throw error;
    }
  };

  const addCashMovement = async (movement: CashMovement) => {
    setCashMovements(prev => [...prev, movement]);
  };

  // ===================== SEPARADOS / LAYAWAYS =====================
  const addLayaway = async (layaway: Layaway) => {
    const normalizedLayaway = {
      ...layaway,
      storeId: layaway.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    
    try {
      const savedLayaway = await SupabaseService.saveLayaway(normalizedLayaway);
      setLayaways(prev => [...prev, savedLayaway]);
      
      // Actualizar stock de productos
      normalizedLayaway.items.forEach(item => {
        setProducts(prev => 
          prev.map(p => 
            p.id === item.productId 
              ? { ...p, stock: p.stock - item.quantity }
              : p
          )
        );
      });
      
      console.log('✅ Separado guardado');
    } catch (error) {
      console.error('❌ Error guardando separado:', error);
      throw error;
    }
  };

  const updateLayaway = async (updatedLayaway: Layaway) => {
    try {
      const savedLayaway = await SupabaseService.saveLayaway(updatedLayaway);
      setLayaways(prev => prev.map(l => l.id === savedLayaway.id ? savedLayaway : l));
      console.log('✅ Separado actualizado');
    } catch (error) {
      console.error('❌ Error actualizando separado:', error);
      throw error;
    }
  };

  const addLayawayPayment = async (layawayId: string, payment: LayawayPayment) => {
    try {
      // Guardar en Supabase
      const savedPayment = await SupabaseService.addLayawayPayment(layawayId, payment);
      
      // Actualizar estado local
      setLayaways(prev => prev.map(layaway => {
        if (layaway.id === layawayId) {
          const newTotalPaid = layaway.totalPaid + payment.amount;
          const newRemainingBalance = layaway.total - newTotalPaid;
          const newStatus = newRemainingBalance <= 0 ? 'completed' : 'active';
          return {
            ...layaway,
            payments: [...layaway.payments, savedPayment],
            totalPaid: newTotalPaid,
            remainingBalance: newRemainingBalance,
            status: newStatus
          };
        }
        return layaway;
      }));

      // Crear movimiento de caja
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

      console.log('✅ Abono guardado');
    } catch (error) {
      console.error('❌ Error guardando abono:', error);
      throw error;
    }
  };

  // ===================== TRANSFERENCIAS =====================
  const addTransfer = async (transfer: Transfer) => {
    try {
      await SupabaseService.saveTransfer(transfer);
      setTransfers(prev => [transfer, ...prev]);

      // Ajustar stock origen/destino
      const stockUpdates: Record<string, number> = {};

      transfer.items.forEach(item => {
        const origin = products.find(p => p.id === item.productId && p.storeId === transfer.fromStoreId);
        const dest = products.find(p => p.sku === item.productSku && p.storeId === transfer.toStoreId);

        if (origin) {
          const newStock = Math.max(0, origin.stock - item.quantity);
          stockUpdates[origin.id] = newStock;
        }

        if (dest) {
          const newStock = dest.stock + item.quantity;
          stockUpdates[dest.id] = newStock;
        }
      });

      // Actualizar stock local
      setProducts(prev =>
        prev.map(p => stockUpdates[p.id] !== undefined ? { ...p, stock: stockUpdates[p.id] } : p)
      );

      // Actualizar stock en Supabase
      for (const [productId, stock] of Object.entries(stockUpdates)) {
        await SupabaseService.updateProductStock(productId, stock);
      }

      console.log('✅ Transferencia guardada:', transfer.id);
    } catch (error) {
      console.error('❌ Error guardando transferencia:', error);
      throw error;
    }
  };

  const updateTransfer = async (updated: Transfer) => {
    try {
      await SupabaseService.saveTransfer(updated);
      setTransfers(prev => prev.map(t => t.id === updated.id ? updated : t));
      console.log('✅ Transferencia actualizada:', updated.id);
    } catch (error) {
      console.error('❌ Error actualizando transferencia:', error);
      throw error;
    }
  };

  const deleteTransfer = async (id: string) => {
    try {
      await SupabaseService.deleteTransfer(id);
      setTransfers(prev => prev.filter(t => t.id !== id));
      console.log('✅ Transferencia eliminada:', id);
    } catch (error) {
      console.error('❌ Error eliminando transferencia:', error);
      throw error;
    }
  };

  // Solo marcar como loading cuando realmente esté bloqueando la UI
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
    transfers,
    isLoading: isLoadingCombined,
    isConnected,
    connectionError,
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
    loadCriticalData,
    loadSecondaryData,
    addTransfer,
    updateTransfer,
    deleteTransfer,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}