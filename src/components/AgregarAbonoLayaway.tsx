import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Layaway, LayawayPayment, PaymentMethod } from '../types';
import { X, CheckCircle } from 'lucide-react';

interface AgregarAbonoLayawayProps {
  layaway: Layaway;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  paymentMethods: PaymentMethod[]; 
}

export function AgregarAbonoLayaway({ layaway, isOpen, onClose, onSuccess, paymentMethods }: AgregarAbonoLayawayProps) {
  const { addLayawayPayment } = useData();
  const { user } = useAuth();
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcular totales actualizados
  const calculateLayawayTotals = (layaway: Layaway) => {
    const totalPaid = layaway.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingBalance = layaway.total - totalPaid;
    
    return {
      totalPaid,
      remainingBalance: Math.max(0, remainingBalance)
    };
  };

  const updatedTotals = calculateLayawayTotals(layaway);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Limpiar campos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setPaymentAmount('');
      setPaymentNotes('');
      setIsProcessing(false);
      // Asegurar que hay un método de pago seleccionado
      const activePaymentMethods = paymentMethods.filter(m => m.isActive);
      if (activePaymentMethods.length > 0) {
        setSelectedPaymentMethod(activePaymentMethods[0]);
      }
      
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll del body cuando el modal se cierra
      document.body.style.overflow = 'unset';
    }

    // Cleanup function para restaurar scroll si el componente se desmonta
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, paymentMethods]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir solo números y punto decimal
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setPaymentAmount(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (Number(paymentAmount) > updatedTotals.remainingBalance) {
      alert('El monto no puede ser mayor al saldo pendiente');
      return;
    }

    setIsProcessing(true);

    try {
      const payment: LayawayPayment = {
        id: crypto.randomUUID(),
        amount: Number(paymentAmount),
        paymentMethod: selectedPaymentMethod.name,
        date: new Date(),
        employeeId: user?.id || '1',
        notes: paymentNotes
      };

      await addLayawayPayment(layaway.id, payment);
      
      // Llamar callbacks
      onSuccess?.();
      onClose();
      
      alert('Abono registrado exitosamente');
    } catch (error) {
      console.error('Error al registrar abono:', error);
      alert('Error al registrar el abono. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  // Cerrar modal al hacer clic en el backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  };

  // Prevenir cierre accidental con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isProcessing, onClose]);

  // No renderizar si no está abierto
  if (!isOpen) return null;

  // Renderizar usando Portal para asegurar que esté por encima de todo
  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevenir cierre al hacer clic dentro del modal
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Agregar Abono</h3>
          <button 
            onClick={handleClose} 
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-700 p-1 disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumen de saldos */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Saldo Pendiente:</span>
              <span className="font-bold text-orange-600 text-sm sm:text-base">
                {formatCurrency(updatedTotals.remainingBalance)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Total Pagado:</span>
              <span className="font-bold text-green-600 text-sm sm:text-base">
                {formatCurrency(updatedTotals.totalPaid)}
              </span>
            </div>
          </div>

          {/* Campo de monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto del Abono *
            </label>
            <input
              type="text"
              value={paymentAmount}
              onChange={handleAmountChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              placeholder="Monto a abonar"
              disabled={isProcessing}
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo: {formatCurrency(updatedTotals.remainingBalance)}
            </p>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago *
            </label>
            <select
              value={selectedPaymentMethod?.id || ''}
              onChange={(e) => {
                const method = paymentMethods.find(m => m.id === e.target.value);
                if (method) setSelectedPaymentMethod(method);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              disabled={isProcessing}
              required
            >
              {paymentMethods.filter(m => m.isActive).map(method => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-none"
              rows={3}
              placeholder="Observaciones del abono..."
              disabled={isProcessing}
            />
          </div>

          {/* Alerta de completado */}
          {paymentAmount && Number(paymentAmount) === updatedTotals.remainingBalance && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2 flex-shrink-0" />
                <span className="text-green-800 font-medium text-sm sm:text-base">
                  Este abono completará el separado
                </span>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || !paymentAmount || Number(paymentAmount) <= 0}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Procesando...
                </>
              ) : (
                'Registrar Abono'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // Renderizar directamente en el body
  );
}
