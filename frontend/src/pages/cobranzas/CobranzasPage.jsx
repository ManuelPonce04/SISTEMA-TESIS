import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import StudentSearchPayment from '../../components/cobranzas/StudentSearchPayment';
import StudentPaymentSummary from '../../components/cobranzas/StudentPaymentSummary';
import PensionSelectionTable from '../../components/cobranzas/PensionSelectionTable';
import PaymentPanel from '../../components/cobranzas/PaymentPanel';
import PaymentConfirmationModal from '../../components/cobranzas/PaymentConfirmationModal';
import ReceiptModal from '../../components/cobranzas/ReceiptModal';
import { getResumenFinancieroEstudiante, registrarPagoGlobal, descargarReciboPDF } from '../../services/cobranzasService';
import { getPensionesByEstudiante } from '../../services/pensionesService';

const CobranzasPage = () => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Datos del estudiante
  const [resumen, setResumen] = useState(null);
  const [pensiones, setPensiones] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Flujo de Pago
  const [selectedPensionIds, setSelectedPensionIds] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pagoPendiente, setPagoPendiente] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Recibo
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Al seleccionar estudiante
  useEffect(() => {
    if (selectedStudent) {
      cargarDatosEstudiante(selectedStudent.id_estudiante);
      setSelectedPensionIds([]);
    }
  }, [selectedStudent]);

  const cargarDatosEstudiante = async (id_estudiante) => {
    setLoadingData(true);
    try {
      const [resResumen, resPensiones] = await Promise.all([
        getResumenFinancieroEstudiante(id_estudiante),
        getPensionesByEstudiante(id_estudiante)
      ]);

      if (resResumen.success) setResumen(resResumen.resumen);
      if (resPensiones.success) setPensiones(resPensiones.pensiones);
    } catch (error) {
      console.error('Error cargando datos del estudiante:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Calcular saldo total seleccionado
  const getSaldoSeleccionado = () => {
    return selectedPensionIds.reduce((total, id) => {
      const p = pensiones.find(pen => pen.id_pension === id);
      if (p) {
        return total + (parseFloat(p.valor) - parseFloat(p.valor_pagado));
      }
      return total;
    }, 0);
  };

  const handleProcessPayment = (data) => {
    setPagoPendiente(data);
    setShowConfirmModal(true);
  };

  const confirmPayment = async () => {
    setIsProcessing(true);
    try {
      const res = await registrarPagoGlobal({
        ids_pensiones: selectedPensionIds,
        monto_total: pagoPendiente.montoAbonado,
        metodo_pago: pagoPendiente.metodoPago,
        numero_recibo: pagoPendiente.numeroComprobante,
        observacion: pagoPendiente.observacion
      });

      if (res.success) {
        setShowConfirmModal(false);
        setPagoPendiente(null);
        setSelectedPensionIds([]);
        // Recargar info
        await cargarDatosEstudiante(selectedStudent.id_estudiante);
        
        // Simular un ID de pago devuelto o usar el backend
        // Como el endpoint actual no devuelve el id_pago global (crea varios),
        // en este diseño pedimos el historial reciente o mostramos modal genérico.
        setShowReceiptModal(true);
      }
    } catch (error) {
      console.error('Error al pagar:', error);
      alert('Ocurrió un error al procesar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    // Si tuviéramos un id global real lo pasaríamos aquí
    alert('Función de descarga PDF en construcción.');
    setShowReceiptModal(false);
  };

  return (
    <MainLayout title="Registro de Cobranzas" subtitle="Inicio / Cobranzas">
      <div className="max-w-7xl mx-auto py-2">
            
            {/* Cabecera */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Registro de Cobranzas</h1>
              <p className="mt-1 text-sm text-gray-500">
                Busca estudiantes, registra pagos de pensiones y genera recibos de manera rápida y segura.
              </p>
            </div>

            {/* Buscador */}
            <div className="mb-8">
              <StudentSearchPayment onSelectStudent={setSelectedStudent} />
            </div>

            {selectedStudent ? (
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Columna Izquierda (Info y Tabla) */}
                <div className="flex-1 flex flex-col gap-6">
                  <StudentPaymentSummary student={selectedStudent} resumen={resumen} />
                  
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pensiones del Estudiante</h3>
                    {loadingData ? (
                      <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div>
                      </div>
                    ) : (
                      <PensionSelectionTable 
                        pensiones={pensiones} 
                        selectedIds={selectedPensionIds} 
                        onSelectionChange={setSelectedPensionIds} 
                      />
                    )}
                  </div>
                </div>

                {/* Columna Derecha (Panel de Pago) */}
                <div className="w-full lg:w-96 flex-shrink-0">
                  <PaymentPanel 
                    pensionesSeleccionadas={selectedPensionIds}
                    saldoTotal={getSaldoSeleccionado()}
                    onConfirmPayment={handleProcessPayment}
                  />
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-[#27A9E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Ningún estudiante seleccionado</h3>
                <p>Utiliza el buscador superior para encontrar un estudiante y procesar sus pagos.</p>
              </div>
            )}
      </div>
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmPayment}
        student={selectedStudent}
        pagoData={pagoPendiente}
        saldoTotal={getSaldoSeleccionado()}
        isProcessing={isProcessing}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onPrint={() => window.print()}
        onDownload={handleDownloadPdf}
        isProcessingPdf={isProcessingPdf}
      />
    </MainLayout>
  );
};

export default CobranzasPage;
