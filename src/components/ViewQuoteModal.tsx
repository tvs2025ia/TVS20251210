import React from 'react';
import { Quote, Customer } from '../types';
import { X, Check, Zap } from 'lucide-react';

interface ViewQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  storeCustomers: Customer[];
  updateQuote: (quote: Quote) => void;
  convertToSale: (quote: Quote) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: Quote['status']) => string;
  getStatusText: (status: Quote['status']) => string;
}

export function ViewQuoteModal({ 
  quote, 
  onClose, 
  storeCustomers, 
  updateQuote, 
  convertToSale,
  formatCurrency,
  getStatusColor,
  getStatusText
}: ViewQuoteModalProps) {
  const customer = storeCustomers.find(c => c.id === quote.customerId);
  const isExpired = new Date() > new Date(quote.validUntil);

  const updateStatus = (newStatus: Quote['status']) => {
    updateQuote({ ...quote, status: newStatus });
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConvertToSale = () => {
    if (confirm('¿Estás seguro de convertir esta cotización en una venta?')) {
      convertToSale(quote);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] overflow-auto" id="quote-print">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Cotización #{quote.id}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 no-print p-1">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Información de la cotización */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                  {getStatusText(quote.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Creación</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  {new Date(quote.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Válida Hasta</p>
                <p className={`font-medium text-sm sm:text-base ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {new Date(quote.validUntil).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Productos */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
              <div className="space-y-2">
                {quote.items.map(item => (
                  <div key={item.productId} className="flex flex-col sm:flex-row justify-between bg-gray-50 p-3 rounded-lg gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{item.productName}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base text-right">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(quote.discount)}</span>
                </div>
              )}
              {quote.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Envío:</span>
                  <span>{formatCurrency(quote.shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>

            {/* Botón imprimir */}
            <button
              onClick={handlePrint}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors no-print"
            >
              Imprimir Cotización
            </button>

            {/* Botón convertir en venta (solo para cotizaciones pendientes o aceptadas) */}
            {(quote.status === 'accepted' || quote.status === 'pending') && !isExpired && (
              <button
                onClick={handleConvertToSale}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors no-print flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Convertir en Venta</span>
              </button>
            )}

            {/* Acciones para cotizaciones pendientes */}
            {quote.status === 'pending' && !isExpired && (
              <div className="flex flex-col sm:flex-row gap-3 no-print">
                <button
                  onClick={() => updateStatus('accepted')}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Aceptar</span>
                </button>
                <button
                  onClick={() => updateStatus('rejected')}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Rechazar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}