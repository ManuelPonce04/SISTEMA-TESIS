import React, { useRef } from 'react';
import { FiUploadCloud, FiX, FiFileText, FiAlertCircle } from 'react-icons/fi';

export default function StepDocumentos({ formData, updateFormData }) {
  const fileInputRef = useRef(null);

  // Beneficios que requieren documento obligatorio
  const requeridos = formData.beneficios.filter(b => b.requiere_documento_snapshot);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newDocs = files.map(file => {
      // Intentar auto-asignar al primer beneficio requerido sin documento
      let asignadoA = null;
      for (const req of requeridos) {
        if (!formData.documentos.some(d => d.beneficio_asignado_id === req.tipo_beneficio_id)) {
          asignadoA = req.tipo_beneficio_id;
          break;
        }
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        tipo_documento: 'Respaldo',
        beneficio_asignado_id: asignadoA || ''
      };
    });

    updateFormData('documentos', [...formData.documentos, ...newDocs]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (id) => {
    updateFormData('documentos', formData.documentos.filter(d => d.id !== id));
  };

  const updateDocumentProp = (id, prop, value) => {
    updateFormData('documentos', formData.documentos.map(d => d.id === id ? { ...d, [prop]: value } : d));
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Documentos de Respaldo</h2>
        <p className="text-sm text-gray-500">Adjunte los documentos necesarios para respaldar becas o descuentos (PDF, JPG, PNG).</p>
      </div>

      {requeridos.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
          <h3 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-2">
            <FiAlertCircle /> Documentos Obligatorios Requeridos
          </h3>
          <ul className="list-disc pl-5 text-sm text-red-700">
            {requeridos.map(r => (
              <li key={r.tipo_beneficio_id}>
                {r.nombre} 
                {formData.documentos.some(d => parseInt(d.beneficio_asignado_id) === r.tipo_beneficio_id) 
                  ? <span className="text-emerald-600 font-bold ml-2">✓ Adjuntado</span>
                  : <span className="font-bold ml-2">(Pendiente)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dropzone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-gray-50 hover:border-[#27A9E1] transition-colors cursor-pointer mb-6"
      >
        <div className="w-16 h-16 bg-blue-50 text-[#27A9E1] rounded-full flex items-center justify-center mx-auto mb-4">
          <FiUploadCloud size={32} />
        </div>
        <h3 className="font-bold text-gray-800 text-lg">Haga clic para seleccionar archivos</h3>
        <p className="text-gray-500 text-sm mt-1">Límite: 10MB por archivo</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          multiple 
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden" 
        />
      </div>

      {/* Lista de archivos */}
      {formData.documentos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-gray-700">Archivos seleccionados ({formData.documentos.length})</h3>
          {formData.documentos.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 flex-shrink-0">
                  <FiFileText size={20} />
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm text-gray-800 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              <div className="flex-1 w-full flex gap-2">
                <select 
                  value={doc.tipo_documento}
                  onChange={e => updateDocumentProp(doc.id, 'tipo_documento', e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                >
                  <option value="Respaldo">Respaldo</option>
                  <option value="Solicitud">Solicitud</option>
                  <option value="Certificado Médico">Certificado Médico</option>
                  <option value="Certificado Discapacidad">Certificado Discapacidad</option>
                  <option value="Otro">Otro</option>
                </select>
                
                {formData.beneficios.length > 0 && (
                  <select 
                    value={doc.beneficio_asignado_id}
                    onChange={e => updateDocumentProp(doc.id, 'beneficio_asignado_id', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                  >
                    <option value="">-- Sin vincular --</option>
                    {formData.beneficios.map(b => (
                      <option key={b.tipo_beneficio_id} value={b.tipo_beneficio_id}>Vincular a: {b.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              <button 
                onClick={() => removeDocument(doc.id)}
                className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
