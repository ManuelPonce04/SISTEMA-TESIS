import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layout/MainLayout';
import StepMatricula from './StepMatricula';
import StepTarifa from './StepTarifa';
import StepBeneficios from './StepBeneficios';
import StepVigencia from './StepVigencia';
import StepDocumentos from './StepDocumentos';
import StepRevision from './StepRevision';
import { getResumenMatricula, simularAsignacion, crearAsignacion, subirDocumento } from '../../../services/asignacionPensionService';
import Swal from 'sweetalert2';
import { FiCheck, FiChevronRight, FiChevronLeft } from 'react-icons/fi';

const STEPS = [
  { id: 1, label: 'Matrícula' },
  { id: 2, label: 'Vigencia' },
  { id: 3, label: 'Tarifa' },
  { id: 4, label: 'Beneficios' },
  { id: 5, label: 'Documentos' },
  { id: 6, label: 'Revisión' },
];

export default function WizardAsignacion() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estado global del wizard
  const [formData, setFormData] = useState({
    matriculaId: null,
    matriculaData: null,
    mesDesde: '',
    mesHasta: '',
    tarifa: null,
    tarifaError: null,
    beneficios: [], // { tipo_beneficio_id, tipo_calculo_snapshot, ... }
    beneficiosData: [], // catalog full data
    documentos: [], // Files to upload
    motivo: '',
    observacion: '',
    calculoFinal: null, // { valor_final, descuento_fijo, monto_descuento_pct }
  });

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Cuando cambia la matrícula, cargar sus datos
  useEffect(() => {
    if (formData.matriculaId && currentStep === 1) {
      loadMatricula(formData.matriculaId);
    }
  }, [formData.matriculaId]);

  // Cuando cambia (matricula, vigencia, beneficios), simular
  useEffect(() => {
    if (formData.matriculaData && formData.mesDesde && (currentStep === 3 || currentStep === 4 || currentStep === 6)) {
      simular();
    }
  }, [formData.matriculaId, formData.mesDesde, formData.beneficios]);

  const loadMatricula = async (id) => {
    setLoading(true);
    try {
      const res = await getResumenMatricula(id);
      if (res.success) {
        updateFormData('matriculaData', res.matricula);
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar la matrícula', 'error');
      updateFormData('matriculaId', null);
    }
    setLoading(false);
  };

  const simular = async () => {
    if (!formData.matriculaData?.periodo_lectivo_id || !formData.mesDesde) return;
    try {
      const payload = {
        periodo_lectivo_id: formData.matriculaData.periodo_lectivo_id,
        nivel_id: formData.matriculaData.nivel_id,
        subnivel_id: formData.matriculaData.subnivel_id,
        curso_id: formData.matriculaData.curso_id,
        mes: formData.mesDesde,
        beneficio_ids: formData.beneficios.map(b => b.tipo_beneficio_id),
      };
      const res = await simularAsignacion(payload);
      if (res.success) {
        updateFormData('tarifa', res.simulacion.tarifa);
        updateFormData('tarifaError', null);
        updateFormData('calculoFinal', res.simulacion.calculo);
      }
    } catch (error) {
      if (error.response?.status === 409) {
         updateFormData('tarifaError', error.response.data.error || 'Conflicto de tarifas');
         updateFormData('tarifa', null);
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.matriculaId) return Swal.fire('Atención', 'Seleccione una matrícula', 'warning');
    if (currentStep === 2 && (!formData.mesDesde || !formData.mesHasta)) return Swal.fire('Atención', 'Seleccione la vigencia', 'warning');
    if (currentStep === 3 && !formData.tarifa) return Swal.fire('Atención', 'No hay tarifa resuelta. Corrija la configuración de tarifas primero.', 'error');
    
    // Validar documentos obligatorios
    if (currentStep === 5) {
      const requeridos = formData.beneficios.filter(b => b.requiere_documento_snapshot);
      const docsMap = {};
      formData.documentos.forEach(d => { if (d.beneficio_asignado_id) docsMap[d.beneficio_asignado_id] = true; });
      const faltantes = requeridos.filter(b => !docsMap[b.tipo_beneficio_id]);
      if (faltantes.length > 0) {
        return Swal.fire('Atención', `Falta documento para: ${faltantes.map(f => f.nombre).join(', ')}`, 'warning');
      }
    }

    if (currentStep < 6) setCurrentStep(c => c + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        matricula_id: formData.matriculaId,
        mes_desde: formData.mesDesde,
        mes_hasta: formData.mesHasta,
        tarifa_pension_id: formData.tarifa.id,
        motivo: formData.motivo,
        observacion: formData.observacion,
        beneficios: formData.beneficios,
      };

      const res = await crearAsignacion(payload);
      const asignacionId = res.id;

      // Subir documentos si hay
      if (formData.documentos.length > 0) {
        for (const doc of formData.documentos) {
          const fd = new FormData();
          fd.append('documento', doc.file);
          if (doc.tipo_documento) fd.append('tipo_documento', doc.tipo_documento);
          if (doc.beneficio_asignado_id) fd.append('beneficio_asignado_id', doc.beneficio_asignado_id);
          await subirDocumento(asignacionId, fd);
        }
      }

      Swal.fire({
        title: '¡Asignación Creada!',
        text: 'La asignación se guardó en estado BORRADOR.',
        icon: 'success',
        confirmButtonColor: '#27A9E1',
      }).then(() => {
        navigate(`/pensiones/asignaciones/${asignacionId}`);
      });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout title="Nueva Asignación" subtitle="Inicio / Pensiones y cobranzas / Asignaciones / Nueva">
      <div className="max-w-5xl mx-auto">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 z-0 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#27A9E1] z-0 rounded-full transition-all duration-300" style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}></div>
            
            {STEPS.map((step, index) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  currentStep === step.id ? 'bg-[#27A9E1] text-white ring-4 ring-blue-100' :
                  currentStep > step.id ? 'bg-[#27A9E1] text-white' : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}>
                  {currentStep > step.id ? <FiCheck size={20} /> : step.id}
                </div>
                <span className={`text-xs mt-2 font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Formularios */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
          {loading ? (
             <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#27A9E1]"></div></div>
          ) : (
            <>
              {currentStep === 1 && <StepMatricula formData={formData} updateFormData={updateFormData} />}
              {currentStep === 2 && <StepVigencia formData={formData} updateFormData={updateFormData} />}
              {currentStep === 3 && <StepTarifa formData={formData} />}
              {currentStep === 4 && <StepBeneficios formData={formData} updateFormData={updateFormData} />}
              {currentStep === 5 && <StepDocumentos formData={formData} updateFormData={updateFormData} />}
              {currentStep === 6 && <StepRevision formData={formData} />}
            </>
          )}
        </div>

        {/* Controles */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <FiChevronLeft /> Atrás
          </button>
          
          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#27A9E1] text-white font-bold hover:bg-[#1E8BBF] shadow-sm transition-colors"
            >
              Siguiente <FiChevronRight />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !formData.tarifa}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Finalizar y Crear'} <FiCheck />
            </button>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
