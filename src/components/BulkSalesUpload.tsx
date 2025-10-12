import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Sale, SaleItem } from '../types';
import Papa from 'papaparse';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader,
  ShoppingCart,
  Eye,
  EyeOff
} from 'lucide-react';

interface BulkSaleData {
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  employeeId?: string;
  employeeName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  date: string;
}

interface BulkSalesUploadProps {
  onClose: () => void;
  onSuccess: (sales: Sale[]) => void;
}

export function BulkSalesUpload({ onClose, onSuccess }: BulkSalesUploadProps) {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const { addSale, customers, users, paymentMethods } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<BulkSaleData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: Sale[];
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV');
      return;
    }

    setFile(selectedFile);
    setUploadResults(null);

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const parsedData: BulkSaleData[] = data.map(row => {
          // Parse items from comma-separated format: "producto1:qty:price,producto2:qty:price"
          const itemsStr = row.productos || row.items || '';
          const items = itemsStr.split(',').map((item: string) => {
            const parts = item.trim().split(':');
            if (parts.length >= 3) {
              return {
                productName: parts[0],
                quantity: parseInt(parts[1]) || 1,
                unitPrice: parseFloat(parts[2]) || 0,
                total: (parseInt(parts[1]) || 1) * (parseFloat(parts[2]) || 0)
              };
            }
            return null;
          }).filter(Boolean);

          const subtotal = parseFloat(row.subtotal || '0') || items.reduce((sum, item) => sum + item.total, 0);
          const discount = parseFloat(row.descuento || row.discount || '0');
          const shippingCost = parseFloat(row.envio || row.shipping || '0');
          const total = parseFloat(row.total || '0') || (subtotal - discount + shippingCost);

          return {
            invoiceNumber: row.factura || row.invoice || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            customerId: row.cliente_id || row.customerId || '',
            customerName: row.cliente || row.customer || '',
            employeeId: row.empleado_id || row.employeeId || user?.id || '',
            employeeName: row.empleado || row.employee || '',
            items,
            subtotal,
            discount,
            shippingCost,
            total,
            paymentMethod: row.metodo_pago || row.paymentMethod || 'Efectivo',
            date: row.fecha || row.date || new Date().toISOString().split('T')[0]
          };
        });
        setPreview(parsedData);
      },
      error: (error) => {
        alert(`Error al leer el archivo: ${error.message}`);
      }
    });
  };

  const findCustomerByName = (customerName: string) => {
    if (!customerName) return undefined;
    return customers.find(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase()) ||
      customerName.toLowerCase().includes(c.name.toLowerCase())
    );
  };

  const findEmployeeByName = (employeeName: string) => {
    if (!employeeName) return undefined;
    return users.find(u => 
      u.username.toLowerCase().includes(employeeName.toLowerCase()) ||
      employeeName.toLowerCase().includes(u.username.toLowerCase())
    );
  };

  const handleUpload = async () => {
    if (!file || !currentStore || !user) return;

    setUploading(true);
    const success: Sale[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < preview.length; i++) {
        const saleData = preview[i];
        const rowNumber = i + 2; // +2 because CSV starts at row 2 (after header)

        try {
          // Validate required fields
          if (!saleData.invoiceNumber || saleData.items.length === 0) {
            errors.push(`Fila ${rowNumber}: Faltan datos requeridos (factura o productos)`);
            continue;
          }

          if (saleData.total <= 0) {
            errors.push(`Fila ${rowNumber}: El total debe ser mayor a 0`);
            continue;
          }

          // Find customer if provided
          let customerId: string | undefined;
          if (saleData.customerId) {
            customerId = saleData.customerId;
          } else if (saleData.customerName) {
            const customer = findCustomerByName(saleData.customerName);
            customerId = customer?.id;
          }

          // Find employee if provided
          let employeeId = user.id; // Default to current user
          if (saleData.employeeId) {
            employeeId = saleData.employeeId;
          } else if (saleData.employeeName) {
            const employee = findEmployeeByName(saleData.employeeName);
            if (employee) {
              employeeId = employee.id;
            }
          }

          // Validate payment method
          const validPaymentMethod = paymentMethods.find(pm => 
            pm.name.toLowerCase() === saleData.paymentMethod.toLowerCase()
          );
          const paymentMethod = validPaymentMethod ? validPaymentMethod.name : 'Efectivo';
          const paymentMethodDiscount = validPaymentMethod ? validPaymentMethod.discountPercentage : 0;

          // Convert items to SaleItem format
          const saleItems: SaleItem[] = saleData.items.map(item => ({
            productId: crypto.randomUUID(), // Generate fake product ID for bulk upload
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }));

          // Calculate net total
          const paymentDeduction = saleData.total * (paymentMethodDiscount / 100);
          const netTotal = saleData.total - paymentDeduction;

          // Create sale object
          const sale: Sale = {
            id: crypto.randomUUID(),
            storeId: currentStore.id,
            employeeId,
            customerId,
            items: saleItems,
            subtotal: saleData.subtotal,
            discount: saleData.discount,
            shippingCost: saleData.shippingCost,
            total: saleData.total,
            netTotal,
            paymentMethod,
            paymentMethodDiscount,
            date: new Date(saleData.date),
            invoiceNumber: saleData.invoiceNumber
          };

          // Add sale
          await addSale(sale);
          success.push(sale);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          errors.push(`Fila ${rowNumber}: ${errorMessage}`);
        }
      }

      setUploadResults({ success, errors });
      
      if (success.length > 0) {
        onSuccess(success);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(`Error general del sistema: ${errorMessage}`);
      setUploadResults({ success, errors });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `factura,cliente,empleado,productos,subtotal,descuento,envio,total,metodo_pago,fecha
INV-001,Juan Pérez,admin,"Laptop HP:1:2500000,Mouse:2:80000",2660000,0,0,2660000,Efectivo,2024-01-15
INV-002,María García,empleado1,"Monitor 24:1:800000,Teclado:1:150000",950000,50000,0,900000,Tarjeta Débito,2024-01-15
INV-003,,admin,"Auriculares:1:200000",200000,0,0,200000,Transferencia,2024-01-16`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'plantilla_ventas.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Carga Masiva de Ventas</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {!uploadResults ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Instrucciones:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• El archivo debe ser en formato CSV</li>
                  <li>• Los productos deben estar en formato: "nombre:cantidad:precio,nombre2:cantidad:precio"</li>
                  <li>• Las fechas deben estar en formato AAAA-MM-DD</li>
                  <li>• Los clientes y empleados se buscarán por nombre si no se proporciona ID</li>
                  <li>• Descarga la plantilla para ver el formato correcto</li>
                </ul>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={downloadTemplate}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Descargar Plantilla</span>
                  </button>

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-600">
                        {file ? file.name : 'Seleccionar archivo CSV'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Haz clic para seleccionar un archivo
                      </p>
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {preview.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        Vista Previa ({preview.length} ventas)
                      </h4>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{showPreview ? 'Ocultar' : 'Mostrar'}</span>
                      </button>
                    </div>

                    {showPreview && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left">Factura</th>
                                <th className="px-4 py-2 text-left">Cliente</th>
                                <th className="px-4 py-2 text-left">Empleado</th>
                                <th className="px-4 py-2 text-left">Productos</th>
                                <th className="px-4 py-2 text-left">Total</th>
                                <th className="px-4 py-2 text-left">Método Pago</th>
                                <th className="px-4 py-2 text-left">Fecha</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {preview.slice(0, 10).map((sale, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2">{sale.invoiceNumber}</td>
                                  <td className="px-4 py-2">{sale.customerName || 'Venta rápida'}</td>
                                  <td className="px-4 py-2">{sale.employeeName || user?.username}</td>
                                  <td className="px-4 py-2">{sale.items.length} productos</td>
                                  <td className="px-4 py-2">{formatCurrency(sale.total)}</td>
                                  <td className="px-4 py-2">{sale.paymentMethod}</td>
                                  <td className="px-4 py-2">{sale.date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {preview.length > 10 && (
                            <div className="p-3 text-center text-gray-500 text-sm bg-gray-50">
                              ... y {preview.length - 10} ventas más
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={uploading || preview.length === 0}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        {uploading && <Loader className="w-4 h-4 animate-spin" />}
                        <span>{uploading ? 'Procesando...' : `Cargar ${preview.length} Ventas`}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Results */
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-lg font-medium text-green-600">
                      {uploadResults.success.length} ventas cargadas
                    </span>
                  </div>
                  {uploadResults.errors.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <span className="text-lg font-medium text-red-600">
                        {uploadResults.errors.length} errores
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {uploadResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Errores encontrados:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
