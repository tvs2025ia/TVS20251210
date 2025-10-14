// Types for the POS system
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  role: 'admin' | 'employee';
  storeId: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  storeId: string;
  imageUrl?: string;
  image?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  discountPercentage: number;
  isActive: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  storeId: string;
  employeeId: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  netTotal: number; // After payment method deductions
  paymentMethod: string;
  paymentMethodDiscount: number;
  date: Date;
  invoiceNumber: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  storeId: string;
  totalPurchases: number;
  lastPurchase?: Date;
}

export interface Expense {
  id: string;
  storeId: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
  date: Date;
  employeeId: string;
}

export interface Quote {
  id: string;
  storeId: string;
  customerId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  validUntil: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  employeeId: string;
}

export interface PurchasePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  employeeId: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  storeId: string;
  supplierId?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  total: number;
  date: Date;
  employeeId: string;
  invoiceNumber?: string;
  payments?: PurchasePayment[];
}

export interface CashRegister {
  id: string;
  storeId: string;
  employeeId: string;
  closingEmployeeId?: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  expensesTurno?: any[];
  openedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
}

export interface CashMovement {
  id: string;
  storeId: string;
  employeeId: string;
  type: 'sale' | 'expense' | 'opening' | 'closing' | 'adjustment';
  amount: number;
  description: string;
  date: Date;
  referenceId?: string; // ID of related sale, expense, etc.
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  storeId: string;
  headerText: string;
  footerText: string;
  showLogo: boolean;
  logoUrl?: string;
  thermalWidth: number; // in mm (58 or 80)
  fontSize: number;
  showDate: boolean;
  showEmployee: boolean;
  showCustomer: boolean;
  showInvoiceNumber: boolean;
  showPaymentMethod: boolean;
  showItemDetails: boolean;
  showTotals: boolean;
  isActive: boolean;
}

export interface LayawayItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface LayawayPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  employeeId: string;
  notes?: string;
}

export interface Layaway {
  id: string;
  storeId: string;
  customerId: string;
  items: LayawayItem[];
  subtotal: number;
  discount: number;
  total: number;
  totalPaid: number;
  remainingBalance: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  employeeId: string;
  payments: LayawayPayment[];
  dueDate?: Date;
  notes?: string;
}
