import React from 'react';

const MESES = [
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
];

export default function StepVigencia({ formData, updateFormData }) {
  // Generar lista de meses basada en el periodo lectivo seleccionado
  // Asumimos formato: YYYY-YYYY (ej. 2026-2027)
  const periodo = formData.matriculaData?.periodo_nombre || '2026-2027';
  const anioInicio = parseInt(periodo.split('-')[0]) || new Date().getFullYear();
  const anioFin = parseInt(periodo.split('-')[1]) || anioInicio + 1;

  const opcionesMeses = MESES.map((m, index) => {
    // Si el mes es Enero o Febrero (los últimos en el ciclo costa), usamos anioFin
    const anio = index >= 8 ? anioFin : anioInicio;
    return {
      value: `${anio}-${m.value}-01`,
      label: `${m.label} ${anio}`
    };
  });

  // Si no hay valores predeterminados, establecer el rango completo por defecto
  React.useEffect(() => {
    if (!formData.mesDesde && opcionesMeses.length > 0) {
      updateFormData('mesDesde', opcionesMeses[0].value);
    }
    if (!formData.mesHasta && opcionesMeses.length > 0) {
      updateFormData('mesHasta', opcionesMeses[opcionesMeses.length - 1].value);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Periodo de Vigencia</h2>
        <p className="text-sm text-gray-500 mt-2">
          Defina el rango de meses para los cuales esta configuración de pensión será válida.
        </p>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2">Válido Desde:</label>
            <select
              value={formData.mesDesde}
              onChange={e => updateFormData('mesDesde', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none"
            >
              <option value="">Seleccione...</option>
              {opcionesMeses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          
          <div className="hidden md:block text-gray-400 font-bold px-2 mt-6">Hacia</div>
          
          <div className="w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2">Válido Hasta:</label>
            <select
              value={formData.mesHasta}
              onChange={e => updateFormData('mesHasta', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none"
            >
              <option value="">Seleccione...</option>
              {opcionesMeses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Motivo de Asignación / Observaciones (Opcional)</label>
        <textarea
          rows={4}
          value={formData.observacion || ''}
          onChange={e => updateFormData('observacion', e.target.value)}
          placeholder="Ingrese cualquier observación general relevante para esta asignación de pensión..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none resize-none"
        ></textarea>
      </div>
    </div>
  );
}
