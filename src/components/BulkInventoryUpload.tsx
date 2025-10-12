import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { ProductService, BulkProductData } from '../services/productService';
import Papa from 'papaparse';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader,
  Package,
  Eye,
  EyeOff
} from 'lucide-react';

interface BulkInventoryUploadProps {
  onClose: () => void;
  onSuccess: (products: any[]) => void;
}

export function BulkInventoryUpload({ onClose, onSuccess }: BulkInventoryUploadProps) {
  const { currentStore } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<BulkProductData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: any[];
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
        const parsedData: BulkProductData[] = data.map(row => ({
          name: row.nombre || row.name || '',
          sku: row.sku || row.codigo || '',
          category: row.categoria || row.category || '',
          price: parseFloat(row.precio || row.price || '0'),
          cost: parseFloat(row.costo || row.cost || '0'),
          stock: parseInt(row.stock || row.inventario || '0'),
          minStock: parseInt(row.stock_minimo || row.minStock || '5'),
          imageUrl: row.imagen || row.imageUrl || ''
        }));
        setPreview(parsedData);
      },
      error: (error) => {
        alert(`Error al leer el archivo: ${error.message}`);
      }
    });
  };

  const handleUpload = async () => {
    if (!file || !currentStore) return;

    setUploading(true);
    try {
      const results = await ProductService.uploadBulkProducts(preview, currentStore.id);
      setUploadResults(results);
      
      if (results.success.length > 0) {
        onSuccess(results.success);
      }
    } catch (error) {
      alert(`Error durante la carga: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `nombre,sku,categoria,precio,costo,stock,stock_minimo,imagen
Laptop HP Pavilion,LP001,Computadores,2500000,2000000,5,2,https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg
Mouse Logitech,MS001,Accesorios,80000,60000,25,10,
Teclado Mecánico,KB001,Accesorios,150000,120000,15,5,
Monitor 24",MN001,Monitores,800000,650000,8,3,
Auriculares Bluetooth,AU001,Audio,200000,150000,12,4,
Webcam HD,WC001,Accesorios,120000,90000,10,3,`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_inventario.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetUpload = () => {
    setFile(null);
    setPreview([]);
    setShowPreview(false);
    setUploadResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Carga Masiva de Inventario</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {!uploadResults ? (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Instrucciones</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Descarga la plantilla CSV de ejemplo</li>
                  <li>Completa los datos de tus productos en el archivo</li>
                  <li>Sube el archivo completado</li>
                  <li>Revisa la vista previa y confirma la carga</li>
                </ol>
              </div>

              {/* Download Template */}
              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Descargar Plantilla CSV</span>
                </button>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {file ? file.name : 'Selecciona tu archivo CSV'}
                </p>
                <p className="text-gray-500 mb-4">
                  Arrastra y suelta o haz clic para seleccionar
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Seleccionar Archivo
                </button>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Vista Previa ({preview.length} productos)
                    </h4>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{showPreview ? 'Ocultar' : 'Mostrar'} Vista Previa</span>
                    </button>
                  </div>

                  {showPreview && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Nombre</th>
                              <th className="px-4 py-2 text-left">SKU</th>
                              <th className="px-4 py-2 text-left">Categoría</th>
                              <th className="px-4 py-2 text-right">Precio</th>
                              <th className="px-4 py-2 text-right">Costo</th>
                              <th className="px-4 py-2 text-right">Stock</th>
                              <th className="px-4 py-2 text-right">Min Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {preview.slice(0, 10).map((product, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{product.name}</td>
                                <td className="px-4 py-2">{product.sku}</td>
                                <td className="px-4 py-2">{product.category}</td>
                                <td className="px-4 py-2 text-right">${product.price.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right">${product.cost.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right">{product.stock}</td>
                                <td className="px-4 py-2 text-right">{product.minStock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {preview.length > 10 && (
                        <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 text-center">
                          Mostrando 10 de {preview.length} productos
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={resetUpload}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      {uploading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Subir {preview.length} Productos</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Upload Results */
            <div className="space-y-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  uploadResults.errors.length === 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {uploadResults.errors.length === 0 ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  )}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Carga Completada
                </h4>
                <p className="text-gray-600">
                  {uploadResults.success.length} productos subidos exitosamente
                  {uploadResults.errors.length > 0 && `, ${uploadResults.errors.length} errores`}
                </p>
              </div>

              {/* Success Summary */}
              {uploadResults.success.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h5 className="font-medium text-green-900">
                      Productos Subidos Exitosamente ({uploadResults.success.length})
                    </h5>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-green-800 space-y-1">
                      {uploadResults.success.map((product, index) => (
                        <li key={index} className="flex items-center">
                          <Package className="w-4 h-4 mr-2" />
                          {product.name} (SKU: {product.sku})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Errors */}
              {uploadResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h5 className="font-medium text-red-900">
                      Errores Encontrados ({uploadResults.errors.length})
                    </h5>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={resetUpload}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Subir Otro Archivo
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Formato del Archivo CSV</h5>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Columnas requeridas:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>nombre</code> - Nombre del producto (requerido)</li>
                <li><code>sku</code> - Código único del producto (requerido)</li>
                <li><code>categoria</code> - Categoría del producto (requerido)</li>
                <li><code>precio</code> - Precio de venta (número)</li>
                <li><code>costo</code> - Costo del producto (número)</li>
                <li><code>stock</code> - Cantidad en inventario (número entero)</li>
                <li><code>stock_minimo</code> - Stock mínimo (número entero)</li>
                <li><code>imagen</code> - URL de imagen (opcional)</li>
              </ul>
              <p className="mt-2"><strong>Nota:</strong> Los números deben usar punto (.) como separador decimal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}