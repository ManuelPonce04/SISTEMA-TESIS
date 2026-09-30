import React from 'react';
import { FiPrinter, FiDownload, FiX, FiCheckCircle } from 'react-icons/fi';

const ReceiptModal = ({ isOpen, onClose, onPrint, onDownload, isProcessingPdf }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-6 text-center pt-8">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Pago Registrado</h3>
          <p className="text-sm text-gray-500 mb-6">
            El pago ha sido registrado correctamente en el sistema. Los saldos han sido actualizados.
          </p>
          
          <h4 className="text-gray-700 font-medium mb-4">¿Desea generar el recibo?</h4>

          <div className="space-y-3">
            <button
              onClick={onPrint}
              disabled={isProcessingPdf}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-[#27A9E1] hover:bg-[#208ab8] text-white rounded-xl font-medium transition-colors disabled:opacity-70"
            >
              {isProcessingPdf ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FiPrinter />
              )}
              Imprimir / Ver Recibo
            </button>
            <button
              onClick={onDownload}
              disabled={isProcessingPdf}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isProcessingPdf ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              ) : (
                <FiDownload />
              )}
              Descargar PDF
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 hover:text-gray-800 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <FiX /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
