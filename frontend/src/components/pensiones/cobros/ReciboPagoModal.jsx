import React from 'react';
import { FiX, FiPrinter, FiDownload, FiCheckCircle } from 'react-icons/fi';

export default function ReciboPagoModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden print:shadow-none print:w-full print:max-w-none">
        
        {/* Header Modal - Hidden when printing */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500" /> Cobro Registrado Exitosamente
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><FiX size={20} /></button>
        </div>

        {/* Contenido del Recibo */}
        <div className="p-8 print:p-4 bg-white" id="recibo-imprimible">
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Unidad Educativa Particular</h1>
            <h2 className="text-xl font-bold text-[#27A9E1]">"Juan León Mera"</h2>
            <p className="text-gray-500 text-sm mt-1">Jaramijó, Manabí, Ecuador</p>
            <div className="mt-4 inline-block border-2 border-gray-800 px-4 py-1 font-mono font-bold text-lg">
              RECIBO DE INGRESO
            </div>
            <p className="font-mono text-gray-500 mt-2">No. {data.numero_recibo}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-sm">
            <div>
              <p className="text-gray-500">Fecha de Pago</p>
              <p className="font-bold text-gray-800">{new Date().toLocaleString('es-EC', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
            </div>
            <div>
              <p className="text-gray-500">Código de Transacción</p>
              <p className="font-bold text-gray-800 font-mono">{data.codigo}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Estudiante</p>
              <p className="font-bold text-gray-800 uppercase text-base">{data.estudiante.nombres} {data.estudiante.apellidos}</p>
              <p className="text-gray-600">Identificación: {data.estudiante.identificacion} | Curso: {data.estudiante.curso} "{data.estudiante.paralelo}"</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="border-y-2 border-gray-800">
                <th className="py-2 text-left">Concepto / Mes</th>
                <th className="py-2 text-right">Valor Aplicado</th>
              </tr>
            </thead>
            <tbody>
              {data.aplicaciones.map((apl, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 font-medium">Abono a Mensualidad (Ref. ID: {apl.obligacion_id})</td>
                  <td className="py-3 text-right font-mono">${apl.valor_aplicar.toFixed(2)}</td>
                </tr>
              ))}
              {data.excedente > 0 && (
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-3 font-medium text-gray-700">Crédito a Favor (Pago Excedente)</td>
                  <td className="py-3 text-right font-mono">${data.excedente.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-y-2 border-gray-800">
                <td className="py-3 font-bold text-right">TOTAL RECIBIDO:</td>
                <td className="py-3 font-bold text-right font-mono text-lg">${parseFloat(data.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm mb-12">
            <p><span className="font-bold">Método de Pago:</span> {data.metodo}</p>
            {data.comprobante && <p><span className="font-bold">Comprobante / Referencia:</span> {data.comprobante}</p>}
          </div>

          <div className="grid grid-cols-2 gap-12 mt-16 text-center text-sm">
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-gray-800">Firma Autorizada</p>
                <p className="text-gray-500">Recaudación</p>
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-gray-800">Entregué Conforme</p>
                <p className="text-gray-500">{data.estudiante.rep_nombres} {data.estudiante.rep_apellidos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Hidden when printing */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 print:hidden">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl text-sm transition-colors">
            Cerrar
          </button>
          <button onClick={handlePrint} className="px-5 py-2.5 bg-gray-800 hover:bg-black text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2">
            <FiPrinter /> Imprimir Recibo
          </button>
        </div>
      </div>
    </div>
  );
}
