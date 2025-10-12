import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface NuevoSeparadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function NuevoSeparadoModal({ isOpen, onClose, title = 'Nuevo Separado', children }: NuevoSeparadoModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={handleBackdrop}>
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
