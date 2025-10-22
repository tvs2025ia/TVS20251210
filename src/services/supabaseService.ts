import { supabase } from '../lib/supabase';
import {
  Product, Sale, Customer, Expense, Purchase, PurchasePayment,
  User, Supplier, CashRegister,
  ReceiptTemplate, Layaway, LayawayPayment, LayawayItem, PaymentMethod, Store,
  Quote, Transfer
} from '../types';

  export class SupabaseService {
    private static productsTable: 'products' | 'prestashop_products' | null = null;
    private static layawayPaymentsTable: 'layaway_payments' | 'Layaway_payments' | null = null;
    private static purchasePaymentsTable: 'purchase_payments' | 'purchase_abonos' | null = null;

    private static async resolveProductsTable(): Promise<'products' | 'prestashop_products'> {
      if (this.productsTable) return this.productsTable;
      // Try modern table first
      const { error } = await supabase.from('products').select('id').limit(1);
      if (!error) {
        this.productsTable = 'products';
        return this.productsTable;
      }
      // Fallback to legacy prestashop table
      const { error: legacyError } = await supabase.from('prestashop_products').select('id').limit(1);
      if (!legacyError) {
        this.productsTable = 'prestashop_products';
        return this.productsTable;
      }
      // Default to products to surface original error later
      this.productsTable = 'products';
      return this.productsTable;
    }

    // Check if table exists
    private static async tableExists(tableName: string): Promise<boolean> {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        return !error;
      } catch {
        return false;
      }
    }

    private static async resolveLayawayPaymentsTable(): Promise<'layaway_payments' | 'Layaway_payments'> {
      if (this.layawayPaymentsTable) return this.layawayPaymentsTable;
      if (await this.tableExists('layaway_payments')) {
        this.layawayPaymentsTable = 'layaway_payments';
        return this.layawayPaymentsTable;
      }
      if (await this.tableExists('Layaway_payments')) {
        this.layawayPaymentsTable = 'Layaway_payments';
        return this.layawayPaymentsTable;
      }
      this.layawayPaymentsTable = 'layaway_payments';
      return this.layawayPaymentsTable;
    }

    private static async resolvePurchasePaymentsTable(): Promise<'purchase_payments' | 'purchase_abonos' | null> {
      if (this.purchasePaymentsTable) return this.purchasePaymentsTable;
      if (await this.tableExists('purchase_payments')) {
        this.purchasePaymentsTable = 'purchase_payments';
        return this.purchasePaymentsTable;
      }
      if (await this.tableExists('purchase_abonos')) {
        this.purchasePaymentsTable = 'purchase_abonos';
        return this.purchasePaymentsTable;
      }
      return null;
    }

    // Products
    static async getAllProducts(storeId?: string): Promise<Product[]> {
      try {
        const table = await this.resolveProductsTable();

        if (table === 'products') {
          let query = supabase.from('products').select('*');
          if (storeId) query = query.eq('store_id', storeId);
          const { data, error } = await query;
          if (error) throw new Error(`Error fetching products: ${error.message}`);
          return (data || []).map(this.mapSupabaseToProduct);
        }

        // prestashop_products fallback
        const { data, error } = await supabase
          .from('prestashop_products')
          .select('id, name, reference, price, stock_quantity, active');
        if (error) throw new Error(`Error fetching products: ${error.message}`);
        return (data || [])
          .filter((row: any) => row.active)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            sku: item.reference || `SKU-${item.id}`,
            category: 'General',
            price: item.price || 0,
            cost: item.price ? item.price * 0.7 : 0,
            stock: item.stock_quantity || 0,
            minStock: 5,
            storeId: storeId || '1',
            imageUrl: undefined
          }));
      } catch (error) {
        console.error('Error in getAllProducts:', error);
        return []; // Return empty array instead of throwing
      }
    }

    static async saveProduct(product: Product): Promise<Product> {
      const table = await this.resolveProductsTable();

      if (table === 'products') {
        const supabaseProduct = this.mapProductToSupabase(product);
        const { data, error } = await supabase
          .from('products')
          .upsert(supabaseProduct)
          .select()
          .single();
        if (error) throw new Error(`Error saving product: ${error.message}`);
        return this.mapSupabaseToProduct(data);
      }

      // prestashop_products fallback (limited fields)
      const { data, error } = await supabase
        .from('prestashop_products')
        .upsert({
          id: product.id,
          name: product.name,
          reference: product.sku,
          price: product.price,
          stock_quantity: product.stock,
          active: true
        })
        .select('id, name, reference, price, stock_quantity, active')
        .single();
      if (error) throw new Error(`Error saving product: ${error.message}`);
      return {
        id: data.id,
        name: data.name,
        sku: data.reference,
        category: product.category,
        price: data.price || product.price,
        cost: product.cost,
        stock: data.stock_quantity || product.stock,
        minStock: product.minStock,
        storeId: product.storeId,
        imageUrl: product.imageUrl
      };
    }

    static async deleteProduct(id: string): Promise<void> {
      const table = await this.resolveProductsTable();
      const fromTable = table === 'products' ? 'products' : 'prestashop_products';
      const { error } = await supabase.from(fromTable).delete().eq('id', id);
      if (error) throw new Error(`Error deleting product: ${error.message}`);
    }

    // Sales
    static async getAllSales(storeId?: string): Promise<Sale[]> {
      try {
        // Check if sales table exists
        const salesExists = await this.tableExists('sales');
        if (!salesExists) {
          console.warn('Sales table does not exist');
          return [];
        }

        let query = supabase.from('sales').select('*, sale_items(*)');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) {
          try {
            console.error('Error fetching sales:', {
              message: error.message,
              details: (error as any).details,
              hint: (error as any).hint,
              code: (error as any).code
            });
          } catch (e) {
            console.error('Error fetching sales (unable to parse error object):', error);
          }
          return [];
        }
        return (data || []).map(this.mapSupabaseToSale);
      } catch (error) {
        console.error('Error in getAllSales:', error instanceof Error ? error.message : JSON.stringify(error));
        return [];
      }
    }

    static async saveSale(sale: Sale): Promise<Sale> {
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          id: sale.id,
          store_id: sale.storeId,
          employee_id: sale.employeeId,
          customer_id: sale.customerId,
          subtotal: sale.subtotal,
          discount: sale.discount,
          shipping_cost: sale.shippingCost,
          total: sale.total,
          net_total: sale.netTotal,
          payment_method: sale.paymentMethod,
          payment_method_discount: sale.paymentMethodDiscount,
          date: sale.date.toISOString(),
          invoice_number: sale.invoiceNumber
        })
        .select()
        .single();

      if (saleError) throw new Error(`Error saving sale: ${saleError.message}`);

      // Save sale items
      const saleItems = sale.items.map(item => ({
        sale_id: sale.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw new Error(`Error saving sale items: ${itemsError.message}`);

      return sale;
    }

    static async updateSale(sale: Sale): Promise<Sale> {
      // First, update the sale record
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          store_id: sale.storeId,
          employee_id: sale.employeeId,
          customer_id: sale.customerId,
          subtotal: sale.subtotal,
          discount: sale.discount,
          shipping_cost: sale.shippingCost,
          total: sale.total,
          net_total: sale.netTotal,
          payment_method: sale.paymentMethod,
          payment_method_discount: sale.paymentMethodDiscount,
          date: sale.date.toISOString(),
          invoice_number: sale.invoiceNumber
        })
        .eq('id', sale.id);

      if (saleError) throw new Error(`Error updating sale: ${saleError.message}`);

      // Delete existing sale items
      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.id);

      if (deleteItemsError) throw new Error(`Error deleting sale items: ${deleteItemsError.message}`);

      // Insert updated sale items
      const saleItems = sale.items.map(item => ({
        sale_id: sale.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw new Error(`Error updating sale items: ${itemsError.message}`);

      return sale;
    }

    static async deleteSale(id: string): Promise<void> {
      // Delete sale items first (due to foreign key constraint)
      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);

      if (deleteItemsError) throw new Error(`Error deleting sale items: ${deleteItemsError.message}`);

      // Delete the sale record
      const { error: deleteSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (deleteSaleError) throw new Error(`Error deleting sale: ${deleteSaleError.message}`);
    }

    // Purchases
    static async getAllPurchases(storeId?: string): Promise<Purchase[]> {
      try {
        const exists = await this.tableExists('purchases');
        if (!exists) {
          console.warn('Purchases table does not exist');
          return [];
        }

        const paymentsTable = await this.resolvePurchasePaymentsTable();
        const relations = paymentsTable ? `, ${paymentsTable}(*)` : '';

        let query = supabase.from('purchases').select(`*, purchase_items(*)${relations}`);
        if (storeId) query = query.eq('store_id', storeId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) {
          console.error('Error fetching purchases:', error);
          return [];
        }

        return (data || []).map((row: any) => {
          const paymentsRows = row.purchase_payments || row.purchase_abonos || [];
          const payments: PurchasePayment[] | undefined = paymentsRows.length > 0
            ? paymentsRows.map((p: any) => ({
                id: p.id,
                amount: p.amount,
                paymentMethod: p.payment_method,
                date: new Date(p.date),
                employeeId: p.employee_id,
                notes: p.notes
              }))
            : undefined;
          return {
            id: row.id,
            storeId: row.store_id,
            supplierId: row.supplier_id || undefined,
            items: (row.purchase_items || []).map((it: any) => ({
              productId: it.product_id,
              productName: it.product_name,
              quantity: it.quantity,
              unitCost: it.unit_cost,
              total: it.total
            })),
            total: row.total,
            date: new Date(row.date),
            employeeId: row.employee_id,
            invoiceNumber: row.invoice_number || undefined,
            payments
          } as Purchase;
        });
      } catch (error) {
        console.error('Error in getAllPurchases:', error);
        return [];
      }
    }

    static async savePurchase(purchase: Purchase): Promise<Purchase> {
      // Upsert purchase header
      const { error: purchaseError } = await supabase
        .from('purchases')
        .upsert({
          id: purchase.id,
          store_id: purchase.storeId,
          supplier_id: purchase.supplierId,
          total: purchase.total,
          date: purchase.date.toISOString(),
          employee_id: purchase.employeeId,
          invoice_number: purchase.invoiceNumber
        })
        .select()
        .single();

      if (purchaseError) throw new Error(`Error saving purchase: ${purchaseError.message}`);

      // Replace items to support both create and update flows
      const { error: deleteItemsError } = await supabase
        .from('purchase_items')
        .delete()
        .eq('purchase_id', purchase.id);
      if (deleteItemsError && deleteItemsError.code !== 'PGRST116') {
        // Ignore not found; otherwise throw
        throw new Error(`Error clearing purchase items: ${deleteItemsError.message}`);
      }

      const items = purchase.items.map(it => ({
        purchase_id: purchase.id,
        product_id: it.productId,
        product_name: it.productName,
        quantity: it.quantity,
        unit_cost: it.unitCost,
        total: it.total
      }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_items')
          .insert(items);
        if (itemsError) throw new Error(`Error saving purchase items: ${itemsError.message}`);
      }

      return purchase;
    }

    static async deletePurchase(id: string): Promise<void> {
      // Delete purchase items first due to FK constraints
      const { error: deleteItemsError } = await supabase
        .from('purchase_items')
        .delete()
        .eq('purchase_id', id);
      if (deleteItemsError && deleteItemsError.code !== 'PGRST116') {
        throw new Error(`Error deleting purchase items: ${deleteItemsError.message}`);
      }

      // Delete related payments if table exists
      const paymentsTable = await this.resolvePurchasePaymentsTable();
      if (paymentsTable) {
        const { error: deletePaymentsError } = await supabase
          .from(paymentsTable)
          .delete()
          .eq('purchase_id', id);
        if (deletePaymentsError && deletePaymentsError.code !== 'PGRST116') {
          throw new Error(`Error deleting purchase payments: ${deletePaymentsError.message}`);
        }
      }

      // Delete the purchase header
      const { error: deletePurchaseError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
      if (deletePurchaseError) throw new Error(`Error deleting purchase: ${deletePurchaseError.message}`);
    }

    // 🟢 TRANSFERS (NUEVO)
static async getAllTransfers(): Promise<Transfer[]> {
  try {
    const exists = await this.tableExists('transfers');
    if (!exists) {
      console.warn('Transfers table does not exist');
      return [];
    }

    const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .order('created_at', { ascending: false }); // ✅ Cambio aquí

  if (error) {
    console.error('Error fetching transfers:', error);
    return [];
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    fromStoreId: t.from_store_id || t.fromStoreId, // ✅ Cambio aquí
    toStoreId: t.to_store_id || t.toStoreId, // ✅ Cambio aquí
    items: t.items,
    status: t.status,
    createdAt: new Date(t.created_at || t.createdAt), // ✅ Cambio aquí
    completedAt: t.completed_at || t.completedAt ? new Date(t.completed_at || t.completedAt) : undefined, // ✅ Cambio aquí
    employeeId: t.employee_id || t.employeeId, // ✅ Cambio aquí
    notes: t.notes
  }));
  } catch (error) {
    console.error('Error in getAllTransfers:', error);
    return [];
  }
}

static async saveTransfer(transfer: Transfer): Promise<void> {
  try {
    const { error } = await supabase.from('transfers').upsert({
      id: transfer.id,
      from_store_id: transfer.fromStoreId, // ✅ Cambio aquí
      to_store_id: transfer.toStoreId, // ✅ Cambio aquí
      items: transfer.items,
      status: transfer.status,
      created_at: transfer.createdAt.toISOString(), // ✅ Cambio aquí
      completed_at: transfer.completedAt ? transfer.completedAt.toISOString() : null, // ✅ Cambio aquí
      employee_id: transfer.employeeId, // ✅ Cambio aquí
      notes: transfer.notes
    });
    if (error) throw new Error(`Error saving transfer: ${error.message}`);
  } catch (error) {
    console.error('Error in saveTransfer:', error);
    throw error; // ✅ Cambio aquí (agregamos throw)
  }
}

static async deleteTransfer(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('transfers').delete().eq('id', id);
    if (error) throw new Error(`Error deleting transfer: ${error.message}`);
  } catch (error) {
    console.error('Error in deleteTransfer:', error);
  }
}

static async updateProductStock(productId: string, newStock: number): Promise<void> {
  try {
    const table = await this.resolveProductsTable();
    
    if (table === 'products') {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);
      
      if (error) {
        console.error('Error updating product stock:', error);
        throw new Error(`Error updating product stock: ${error.message}`);
      }
    } else {
      // Para prestashop_products
      const { error } = await supabase
        .from('prestashop_products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);
      
      if (error) {
        console.error('Error updating prestashop product stock:', error);
        throw new Error(`Error updating product stock: ${error.message}`);
      }
    }
    
    console.log(`✅ Stock actualizado para producto ${productId}: ${newStock}`);
  } catch (error) {
    console.error('Error in updateProductStock:', error);
    throw error;
  }
}

    // Customers
    static async getAllCustomers(storeId?: string): Promise<Customer[]> {
      try {
        const customersExists = await this.tableExists('customers');
        if (!customersExists) {
          console.warn('Customers table does not exist');
          return [];
        }

        let query = supabase.from('customers').select('*');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching customers:', error);
          return [];
        }
        return (data || []).map(this.mapSupabaseToCustomer);
      } catch (error) {
        console.error('Error in getAllCustomers:', error);
        return [];
      }
    }

    static async saveCustomer(customer: Customer): Promise<Customer> {
      const supabaseCustomer = this.mapCustomerToSupabase(customer);
      const { data, error } = await supabase
        .from('customers')
        .upsert(supabaseCustomer)
        .select()
        .single();
      if (error) throw new Error(`Error saving customer: ${error.message}`);
      return this.mapSupabaseToCustomer(data);
    }

    // Expenses
    static async getAllExpenses(storeId?: string): Promise<Expense[]> {
      try {
        const expensesExists = await this.tableExists('expenses');
        if (!expensesExists) {
          console.warn('Expenses table does not exist');
          return [];
        }

        let query = supabase.from('expenses').select('*');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) {
          console.error('Error fetching expenses:', error);
          return [];
        }
        return (data || []).map(this.mapSupabaseToExpense);
      } catch (error) {
        console.error('Error in getAllExpenses:', error);
        return [];
      }
    }

    static async saveExpense(expense: Expense): Promise<Expense> {
      const supabaseExpense = this.mapExpenseToSupabase(expense);
      const { data, error } = await supabase
        .from('expenses')
        .upsert(supabaseExpense)
        .select()
        .single();
      if (error) throw new Error(`Error saving expense: ${error.message}`);
      return this.mapSupabaseToExpense(data);
    }

    // Quotes
    static async getAllQuotes(storeId?: string): Promise<Quote[]> {
      try {
        const quotesExists = await this.tableExists('quotes');
        if (!quotesExists) {
          console.warn('Quotes table does not exist');
          return [];
        }

        let query = supabase.from('quotes').select('*, quote_items(*)');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching quotes:', error);
          return [];
        }
        return (data || []).map(this.mapSupabaseToQuote);
      } catch (error) {
        console.error('Error in getAllQuotes:', error);
        return [];
      }
    }

    static async saveQuote(quote: Quote): Promise<Quote> {
      const { error: quoteError } = await supabase
        .from('quotes')
        .upsert({
          id: quote.id,
          store_id: quote.storeId,
          customer_id: quote.customerId,
          employee_id: quote.employeeId,
          subtotal: quote.subtotal,
          discount: quote.discount,
          shipping_cost: quote.shippingCost,
          total: quote.total,
          status: quote.status,
          valid_until: quote.validUntil.toISOString(),
          created_at: quote.createdAt.toISOString()
        })
        .select()
        .single();

      if (quoteError) throw new Error(`Error saving quote: ${quoteError.message}`);

      // Delete existing items before inserting new ones
      const { error: deleteItemsError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quote.id);

      if (deleteItemsError && deleteItemsError.code !== 'PGRST116') {
        console.warn('Error deleting quote items:', deleteItemsError);
      }

      // Save quote items
      const quoteItems = quote.items.map(item => ({
        quote_id: quote.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      if (quoteItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems);

        if (itemsError) throw new Error(`Error saving quote items: ${itemsError.message}`);
      }

      return quote;
    }

    static async updateQuote(quote: Quote): Promise<Quote> {
      return this.saveQuote(quote);
    }

    private static mapSupabaseToQuote(data: any): Quote {
      return {
        id: data.id,
        storeId: data.store_id,
        customerId: data.customer_id,
        employeeId: data.employee_id,
        items: (data.quote_items || []).map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        shippingCost: data.shipping_cost,
        total: data.total,
        status: data.status,
        validUntil: new Date(data.valid_until),
        createdAt: new Date(data.created_at)
      };
    }
    
    private static mapSupabaseToCashRegister(data: any): CashRegister {
      return {
        id: data.id,
        storeId: data.store_id,
        employeeId: data.employee_id,
        closingEmployeeId: data.closing_employee_id,
        openingAmount: data.opening_amount,
        closingAmount: data.closing_amount,
        expectedAmount: data.expected_amount,
        difference: data.difference,
        expensesTurno: data.expenses_turno,
        openedAt: new Date(data.opened_at),
        closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
        status: data.status || 'open'
      };
    }
    
    
    // Cash Registers
    static async getAllCashRegisters(storeId?: string): Promise<CashRegister[]> {
      try {
        const cashRegistersExists = await this.tableExists('cash_registers');
        if (!cashRegistersExists) {
          console.warn('Cash registers table does not exist');
          return [];
        }

        let query = supabase.from('cash_registers').select('*');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data, error } = await query.order('opened_at', { ascending: false });
        if (error) {
          console.error('Error fetching cash registers:', error);
          return [];
        }
        return (data || []).map(item => this.mapSupabaseToCashRegister(item));
      } catch (error) {
        console.error('Error in getAllCashRegisters:', error);
        return [];
      }
    }

    static async saveCashRegister(register: CashRegister): Promise<CashRegister> {
      const supabaseRegister = this.mapCashRegisterToSupabase(register);
      const { data, error } = await supabase
        .from('cash_registers')
        .upsert(supabaseRegister)
        .select()
        .single();
      if (error) throw new Error(`Error saving cash register: ${error.message}`);
      return this.mapSupabaseToCashRegister(data);
    }

    // Layaways
    static async getAllLayaways(storeId?: string): Promise<Layaway[]> {
      try {
        const layawaysExists = await this.tableExists('layaways');
        if (!layawaysExists) {
          console.warn('Layaways table does not exist');
          return [];
        }
      
        // ✅ INCLUIR los pagos en la consulta
        let query = supabase
          .from('layaways')
          .select(`
            *,
            layaway_payments(*)
          `);
        
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching layaways:', error);
          return [];
        }
        
        return (data || []).map(this.mapSupabaseToLayaway);
      } catch (error) {
        console.error('Error in getAllLayaways:', error);
        return [];
      }
    }

    static async saveLayaway(layaway: Layaway): Promise<Layaway> {
      const isValidUUID = (str?: string) => {
        if (!str) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      };
    
      // ✅ Convertir items a JSON
      const itemsJson = layaway.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));
    
      const payload: any = {
        store_id: layaway.storeId,
        customer_id: layaway.customerId,
        subtotal: layaway.subtotal,
        discount: layaway.discount,
        total: layaway.total,
        total_paid: layaway.totalPaid,
        remaining_balance: layaway.remainingBalance,
        status: layaway.status,
        created_at: layaway.createdAt.toISOString(),
        employee_id: layaway.employeeId,
        due_date: layaway.dueDate?.toISOString(),
        notes: layaway.notes,
        items_json: itemsJson  // ✅ NUEVO: Guardar items como JSON
      };
    
      if (isValidUUID(layaway.id)) {
        payload.id = layaway.id;
      }
    
      const { data, error: layawayError } = await supabase
        .from('layaways')
        .upsert(payload)
        .select()
        .single();
    
      if (layawayError) throw new Error(`Error saving layaway: ${layawayError.message}`);
    
      return this.mapSupabaseToLayaway(data);
    }

    static async addLayawayPayment(layawayId: string, payment: LayawayPayment): Promise<LayawayPayment> {
      const insertPayload = {
        id: payment.id,
        layaway_id: layawayId,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        date: payment.date.toISOString(),
        employee_id: payment.employeeId,
        notes: payment.notes
      };
    
      const { data, error } = await supabase
        .from('layaway_payments') // ✅ Usar el nombre directo
        .insert(insertPayload)
        .select('*')
        .single();
    
      if (error) throw new Error(`Error saving layaway payment: ${error.message}`);
    
      return {
        id: data.id,
        amount: data.amount,
        paymentMethod: data.payment_method,
        date: new Date(data.date),
        employeeId: data.employee_id,
        notes: data.notes
      };
    }

    // Bulk operations for better performance
    static async bulkUpsertProducts(products: Product[]): Promise<Product[]> {
      const table = await this.resolveProductsTable();

      if (table === 'products') {
        const supabaseProducts = products.map(this.mapProductToSupabase);
        const { data, error } = await supabase
          .from('products')
          .upsert(supabaseProducts)
          .select();
        if (error) throw new Error(`Error bulk upserting products: ${error.message}`);
        return (data || []).map(this.mapSupabaseToProduct);
      }

      // prestashop_products fallback (limited fields)
      const { data, error } = await supabase
        .from('prestashop_products')
        .upsert(products.map(p => ({
          id: p.id,
          name: p.name,
          reference: p.sku,
          price: p.price,
          stock_quantity: p.stock,
          active: true
        })))
        .select('id, name, reference, price, stock_quantity, active');
      if (error) throw new Error(`Error bulk upserting products: ${error.message}`);

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.reference,
        category: 'General',
        price: item.price || 0,
        cost: 0,
        stock: item.stock_quantity || 0,
        minStock: 5,
        storeId: products[0]?.storeId || '11111111-1111-1111-1111-111111111111',
        imageUrl: undefined
      }));
    }

    // Image upload to Supabase Storage
    static async uploadProductImage(file: File, productId: string): Promise<string> {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const bucket = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || 'product-images';

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('bucket not found')) {
          throw new Error(`Error uploading image: Bucket "${bucket}" not found. Create a public Storage bucket with this name or set VITE_SUPABASE_IMAGE_BUCKET.`);
        }
        throw new Error(`Error uploading image: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    }

    // ✅ Autenticación de usuarios con contraseña
    static async authenticateUser(username: string, password: string): Promise<User | null> {
      try {
        const usersExists = await this.tableExists('users');
        if (!usersExists) {
          console.warn('Users table does not exist');
          return null;
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          return null;
        }

        // ✅ Verificar contraseña (por ahora simple, en producción usar bcrypt)
        const isValidPassword = data.password_hash === password || 
                              (password === '123456' && !data.password_hash);
        
        if (!isValidPassword) {
          return null;
        }

        return this.mapSupabaseToUser(data);
      } catch (error) {
        console.error('Error authenticating user:', error);
        return null;
      }
    }

    // ✅ Actualizar último login
    static async updateUserLastLogin(userId: string): Promise<void> {
      try {
        const { error } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
        
        if (error) {
          console.warn('Error updating last login:', error);
        }
      } catch (error) {
        console.warn('Error updating last login:', error);
      }
    }

    // ✅ Eliminar usuario (desactivar)
    static async deleteUser(id: string): Promise<void> {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(`Error deactivating user: ${error.message}`);
    }

    // ✅ Crear hash simple de contraseña (en producción usar bcrypt)
    static hashPassword(password: string): string {
      // Por simplicidad, usamos un hash básico
      // En producción deberías usar bcrypt o similar
      return btoa(password + 'salt_pos_system');
    }

    // Stores
    static async getAllStores(): Promise<Store[]> {
      try {
        const storesExists = await this.tableExists('stores');
        if (!storesExists) {
          console.warn('Stores table does not exist');
          return [];
        }

        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          console.error('Error fetching stores:', error);
          return [];
        }
        
        return (data || []).map(this.mapSupabaseToStore);
      } catch (error) {
        console.error('Error in getAllStores:', error);
        return [];
      }
    }

    static async saveStore(store: Store): Promise<Store> {
      const supabaseStore = this.mapStoreToSupabase(store);
      const { data, error } = await supabase
        .from('stores')
        .upsert(supabaseStore)
        .select()
        .single();
      if (error) throw new Error(`Error saving store: ${error.message}`);
      return this.mapSupabaseToStore(data);
    }

    private static mapSupabaseToUser(data: any): User {
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        passwordHash: data.password_hash,
        role: data.role,
        storeId: data.store_id,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined
      };
    }

    private static mapUserToSupabase(user: User): any {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
        store_id: user.storeId,
        is_active: user.isActive,
        created_at: user.createdAt.toISOString(),
        last_login: user.lastLogin?.toISOString()
      };
    }

    private static mapSupabaseToSupplier(data: any): Supplier {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        contactPerson: data.contact_person,
        isActive: data.is_active
      };
    }

    private static mapSupplierToSupabase(supplier: Supplier): any {
      return {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        contact_person: supplier.contactPerson,
        is_active: supplier.isActive
      };
    }

    private static mapSupabaseToPaymentMethod(data: any): PaymentMethod {
      return {
        id: data.id,
        name: data.name,
        discountPercentage: data.discount_percentage,
        isActive: data.is_active
      };
    }

    private static mapPaymentMethodToSupabase(paymentMethod: PaymentMethod): any {
      return {
        id: paymentMethod.id,
        name: paymentMethod.name,
        discount_percentage: paymentMethod.discountPercentage,
        is_active: paymentMethod.isActive
      };
    }

    private static mapSupabaseToReceiptTemplate(data: any): ReceiptTemplate {
      return {
        id: data.id,
        name: data.name,
        storeId: data.store_id,
        headerText: data.header_text,
        footerText: data.footer_text,
        showLogo: data.show_logo,
        logoUrl: data.logo_url,
        thermalWidth: data.thermal_width,
        fontSize: data.font_size,
        showDate: data.show_date,
        showEmployee: data.show_employee,
        showCustomer: data.show_customer,
        showInvoiceNumber: data.show_invoice_number,
        showPaymentMethod: data.show_payment_method,
        showItemDetails: data.show_item_details,
        showTotals: data.show_totals,
        isActive: data.is_active
      };
    }

    private static mapReceiptTemplateToSupabase(template: ReceiptTemplate): any {
      return {
        id: template.id,
        name: template.name,
        store_id: template.storeId,
        header_text: template.headerText,
        footer_text: template.footerText,
        show_logo: template.showLogo,
        logo_url: template.logoUrl,
        thermal_width: template.thermalWidth,
        font_size: template.fontSize,
        show_date: template.showDate,
        show_employee: template.showEmployee,
        show_customer: template.showCustomer,
        show_invoice_number: template.showInvoiceNumber,
        show_payment_method: template.showPaymentMethod,
        show_item_details: template.showItemDetails,
        show_totals: template.showTotals,
        is_active: template.isActive
      };
    }
    static async deleteStore(id: string): Promise<void> {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(`Error deactivating store: ${error.message}`);
    }

    // Users
    static async getAllUsers(): Promise<User[]> {
      try {
        const usersExists = await this.tableExists('users');
        if (!usersExists) {
          console.warn('Users table does not exist');
          return [];
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('username');
        
        if (error) {
          console.error('Error fetching users:', error);
          return [];
        }
        
        return (data || []).map(this.mapSupabaseToUser);
      } catch (error) {
        console.error('Error in getAllUsers:', error);
        return [];
      }
    }

    static async saveUser(user: User): Promise<User> {
      const supabaseUser = this.mapUserToSupabase(user);
      const { data, error } = await supabase
        .from('users')
        .upsert(supabaseUser)
        .select()
        .single();
      if (error) throw new Error(`Error saving user: ${error.message}`);
      return this.mapSupabaseToUser(data);
    }

    // Suppliers
    static async getAllSuppliers(): Promise<Supplier[]> {
      try {
        const suppliersExists = await this.tableExists('suppliers');
        if (!suppliersExists) {
          console.warn('Suppliers table does not exist');
          return [];
        }

        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching suppliers:', error);
          return [];
        }
        
        return (data || []).map(this.mapSupabaseToSupplier);
      } catch (error) {
        console.error('Error in getAllSuppliers:', error);
        return [];
      }
    }

    static async saveSupplier(supplier: Supplier): Promise<Supplier> {
      const supabaseSupplier = this.mapSupplierToSupabase(supplier);
      const { data, error } = await supabase
        .from('suppliers')
        .upsert(supabaseSupplier)
        .select()
        .single();
      if (error) throw new Error(`Error saving supplier: ${error.message}`);
      return this.mapSupabaseToSupplier(data);
    }

    // Payment Methods
    static async getAllPaymentMethods(): Promise<PaymentMethod[]> {
      try {
        const paymentMethodsExists = await this.tableExists('payment_methods');
        if (!paymentMethodsExists) {
          console.warn('Payment methods table does not exist');
          return [];
        }

        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching payment methods:', error);
          return [];
        }
        
        return (data || []).map(this.mapSupabaseToPaymentMethod);
      } catch (error) {
        console.error('Error in getAllPaymentMethods:', error);
        return [];
      }
    }

    static async savePaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
      const supabasePaymentMethod = this.mapPaymentMethodToSupabase(paymentMethod);
      const { data, error } = await supabase
        .from('payment_methods')
        .upsert(supabasePaymentMethod)
        .select()
        .single();
      if (error) throw new Error(`Error saving payment method: ${error.message}`);
      return this.mapSupabaseToPaymentMethod(data);
    }

    static async deletePaymentMethod(id: string): Promise<void> {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(`Error deactivating payment method: ${error.message}`);
    }

    // Receipt Templates
    static async getAllReceiptTemplates(storeId?: string): Promise<ReceiptTemplate[]> {
      try {
        const templatesExists = await this.tableExists('receipt_templates');
        if (!templatesExists) {
          console.warn('Receipt templates table does not exist');
          return [];
        }

        let query = supabase.from('receipt_templates').select('*');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data, error } = await query.order('name');
        
        if (error) {
          console.error('Error fetching receipt templates:', error);
          return [];
        }
        
        return (data || []).map(this.mapSupabaseToReceiptTemplate);
      } catch (error) {
        console.error('Error in getAllReceiptTemplates:', error);
        return [];
      }
    }

    static async saveReceiptTemplate(template: ReceiptTemplate): Promise<ReceiptTemplate> {
      const supabaseTemplate = this.mapReceiptTemplateToSupabase(template);
      const { data, error } = await supabase
        .from('receipt_templates')
        .upsert(supabaseTemplate)
        .select()
        .single();
      if (error) throw new Error(`Error saving receipt template: ${error.message}`);
      return this.mapSupabaseToReceiptTemplate(data);
    }

    static async deleteReceiptTemplate(id: string): Promise<void> {
      const { error } = await supabase
        .from('receipt_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(`Error deactivating receipt template: ${error.message}`);
    }

    // Check Supabase connection with better error handling
    static async testConnection(): Promise<boolean> {
      try {
        // Fallback tests
        const { error: productsError } = await supabase.from('products').select('id').limit(1);
        if (!productsError) return true;
        
        const { error: legacyError } = await supabase.from('prestashop_products').select('id').limit(1);
        return !legacyError;
      } catch (error) {
        console.error('Connection test failed:', error);
        return false;
      }
    }

    // Helper to fetch existing SKUs regardless of table
    static async getExistingSkus(skus: string[], storeId?: string): Promise<Set<string>> {
      const table = await this.resolveProductsTable();
      if (table === 'products') {
        let query = supabase.from('products').select('sku').in('sku', skus);
        
        // ✅ Si se proporciona storeId, filtrar por tienda
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return new Set((data || []).map((d: any) => d.sku));
      }
      const { data, error } = await supabase.from('prestashop_products').select('reference').in('reference', skus);
      if (error) throw new Error(error.message);
      return new Set((data || []).map((d: any) => d.reference));
    }

    // Mapping functions (unchanged)
    private static mapSupabaseToProduct(data: any): Product {
      return {
        id: data.id,
        name: data.name,
        sku: data.sku,
        category: data.category,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        minStock: data.min_stock,
        storeId: data.store_id,
        imageUrl: data.image_url
      };
    }

    private static mapProductToSupabase(product: Product): any {
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        store_id: product.storeId,
        image_url: product.imageUrl
      };
    }

    private static mapSupabaseToSale(data: any): Sale {
      return {
        id: data.id,
        storeId: data.store_id,
        employeeId: data.employee_id,
        customerId: data.customer_id,
        items: data.sale_items?.map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total
        })) || [],
        subtotal: data.subtotal,
        discount: data.discount,
        shippingCost: data.shipping_cost,
        total: data.total,
        netTotal: data.net_total,
        paymentMethod: data.payment_method,
        paymentMethodDiscount: data.payment_method_discount,
        date: new Date(data.date),
        invoiceNumber: data.invoice_number
      };
    }

    private static mapSupabaseToCustomer(data: any): Customer {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        storeId: data.store_id,
        totalPurchases: data.total_purchases,
        lastPurchase: data.last_purchase ? new Date(data.last_purchase) : undefined
      };
    }

    private static mapCustomerToSupabase(customer: Customer): any {
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        store_id: customer.storeId,
        total_purchases: customer.totalPurchases,
        last_purchase: customer.lastPurchase?.toISOString()
      };
    }

    private static mapSupabaseToExpense(data: any): Expense {
      return {
        id: data.id,
        storeId: data.store_id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        paymentMethod: data.payment_method,
        date: new Date(data.date),
        employeeId: data.employee_id
      };
    }

    private static mapExpenseToSupabase(expense: Expense): any {
      return {
        id: expense.id,
        store_id: expense.storeId,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        payment_method: expense.paymentMethod,
        date: expense.date.toISOString(),
        employee_id: expense.employeeId
      };
    }

    private static mapCashRegisterToSupabase(register: CashRegister): any {
      return {
        id: register.id,
        store_id: register.storeId,
        employee_id: register.employeeId,
        closing_employee_id: register.closingEmployeeId,
        opening_amount: register.openingAmount,
        closing_amount: register.closingAmount,
        expected_amount: register.expectedAmount,
        difference: register.difference,
        expenses_turno: register.expensesTurno,
        opened_at: register.openedAt.toISOString(),
        closed_at: register.closedAt?.toISOString(),
        status: register.status
      };
    }

    private static mapSupabaseToLayaway(data: any): Layaway {
      // ✅ Los pagos vendrán en data.layaway_payments
      const payments = data.layaway_payments || [];
      
      let items: LayawayItem[] = [];
      
      if (data.items_json) {
        items = data.items_json.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }));
      } else if (data.layaway_items) {
        items = data.layaway_items.map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total
        }));
      }
    
      return {
        id: data.id,
        storeId: data.store_id,
        customerId: data.customer_id,
        items: items,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        totalPaid: data.total_paid,
        remainingBalance: data.remaining_balance,
        status: data.status,
        createdAt: new Date(data.created_at),
        employeeId: data.employee_id,
        // ✅ Esto debería capturar los pagos correctamente
        payments: payments.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          paymentMethod: payment.payment_method,
          date: new Date(payment.date),
          employeeId: payment.employee_id,
          notes: payment.notes
        })),
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        notes: data.notes
      };
    }

    private static mapSupabaseToStore(data: any): Store {
      return {
        id: data.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        isActive: data.is_active
      };
    }

    private static mapStoreToSupabase(store: Store): any {
      return {
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        is_active: store.isActive
      };
    }
    // ============== GESTIÓN MULTI-TIENDA ==============

    static async getUserStores(userId: string): Promise<string[]> {
      try {
        const userStoresExists = await this.tableExists('user_stores');
        if (!userStoresExists) {
          console.warn('user_stores table does not exist');
          return [];
        }

        const { data, error } = await supabase
          .from('user_stores')
          .select('store_id')
          .eq('user_id', userId)
          .eq('is_active', true);
        
        if (error) {
          console.error('Error fetching user stores:', error);
          return [];
        }
        
        return (data || []).map(row => row.store_id);
      } catch (error) {
        console.error('Error in getUserStores:', error);
        return [];
      }
    }

    static async verifyStoreAccess(userId: string, storeId: string): Promise<boolean> {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();
        
        if (userError) {
          console.error('Error checking user role:', userError);
          return false;
        }

        if (userData?.role === 'admin') {
          return true;
        }

        const userStoresExists = await this.tableExists('user_stores');
        if (!userStoresExists) {
          console.warn('user_stores table does not exist');
          return false;
        }

        const { data, error } = await supabase
          .from('user_stores')
          .select('*')
          .eq('user_id', userId)
          .eq('store_id', storeId)
          .eq('is_active', true)
          .single();
        
        if (error) {
          return false;
        }
        
        return !!data;
      } catch (error) {
        console.error('Error in verifyStoreAccess:', error);
        return false;
      }
    }

    static async updateUserStores(userId: string, storeIds: string[]): Promise<boolean> {
      try {
        const userStoresExists = await this.tableExists('user_stores');
        if (!userStoresExists) {
          console.error('user_stores table does not exist');
          return false;
        }

        const { error: deleteError } = await supabase
          .from('user_stores')
          .delete()
          .eq('user_id', userId);
        
        if (deleteError && deleteError.code !== 'PGRST116') {
          console.error('Error deleting existing user stores:', deleteError);
          return false;
        }

        if (storeIds.length > 0) {
          const userStores = storeIds.map(storeId => ({
            user_id: userId,
            store_id: storeId,
            is_active: true
          }));

          const { error: insertError } = await supabase
            .from('user_stores')
            .insert(userStores);
          
          if (insertError) {
            console.error('Error inserting user stores:', insertError);
            return false;
          }
        }

        console.log('✅ User stores updated successfully');
        return true;
      } catch (error) {
        console.error('Error in updateUserStores:', error);
        return false;
      }
    }

    static async authenticateUserMultiStore(
      username: string, 
      password: string, 
      storeId: string
    ): Promise<User | null> {
      try {
        const usersExists = await this.tableExists('users');
        if (!usersExists) {
          console.warn('Users table does not exist');
          return null;
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          return null;
        }

        const isValidPassword = data.password_hash === password || 
                              data.password_hash === this.hashPassword(password) ||
                              (password === '123456' && !data.password_hash);
        
        if (!isValidPassword) {
          return null;
        }

        if (data.role === 'admin') {
          return {
            ...this.mapSupabaseToUser(data),
            storeId
          };
        }

        const hasAccess = await this.verifyStoreAccess(data.id, storeId);
        if (!hasAccess) {
          console.log('❌ Employee does not have access to this store');
          return null;
        }

        return {
          ...this.mapSupabaseToUser(data),
          storeId
        };
      } catch (error) {
        console.error('Error authenticating user:', error);
        return null;
      }
    }

    static async getAvailableStoresForUser(username: string): Promise<string[]> {
      try {
        const usersExists = await this.tableExists('users');
        if (!usersExists) {
          return [];
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .eq('username', username)
          .eq('is_active', true)
          .single();
        
        if (userError || !userData) {
          return [];
        }

        if (userData.role === 'admin') {
          const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id')
            .eq('is_active', true);
          
          if (storesError) {
            return [];
          }
          
          return (stores || []).map(s => s.id);
        }

        return await this.getUserStores(userData.id);
      } catch (error) {
        console.error('Error in getAvailableStoresForUser:', error);
        return [];
      }
    }
  }
