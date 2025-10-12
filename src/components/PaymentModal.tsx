import React from "react";
import { X } from "lucide-react";
import { PaymentMethod } from "../types";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (m: PaymentMethod) => void;
  finalTotal: number;
  textAmountReceived: string;
  setTextAmountReceived: (v: string) => void;
  amountReceived: number;
  processingPayment: boolean;
  formatCurrency: (n: number) => string;
}

const PaymentModal: React.FC<PaymentModalProps> = React.memo(({
  open,
  onClose,
  onConfirm,
  paymentMethods,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  finalTotal,
  textAmountReceived,
  setTextAmountReceived,
  amountReceived,
  processingPayment,
  formatCurrency
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Procesar Pago</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago
            </label>
            <select
              value={selectedPaymentMethod.id}
              onChange={(e) => {
                const method = paymentMethods.find(m => m.id === e.target.value);
                if (method) setSelectedPaymentMethod(method);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {paymentMethods.filter(m => m.isActive).map(method => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto recibido
            </label>
            <input
              type="text"
              value={textAmountReceived}
              onChange={(e) => setTextAmountReceived(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="¿Cuánto paga el cliente?"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total a cobrar al cliente:</span>
              <span className="font-semibold">{formatCurrency(finalTotal)}</span>
            </div>
            {(textAmountReceived !== "" && amountReceived >= finalTotal) && (
              <div className="flex justify-between text-sm text-green-700 pt-2 border-t border-gray-200">
                <span>Cambio a devolver:</span>
                <span>{formatCurrency(amountReceived - finalTotal)}</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={processingPayment || textAmountReceived === "" || amountReceived < finalTotal}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {processingPayment ? "Procesando..." : "Confirmar Pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PaymentModal;
