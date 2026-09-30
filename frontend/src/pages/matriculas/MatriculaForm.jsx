import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSearchBox from '../../components/matriculas/StudentSearchBox';
import { getCursos, getParalelos, getAniosLectivos, getConfigPensiones, createMatricula } from '../../services/matriculasService';
import { FiSave, FiX, FiCalendar, FiDollarSign } from 'react-icons/fi';
import Swal from 'sweetalert2';

const MatriculaForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Catálogos
  const [cursos, setCursos] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [aniosLectivos, setAniosLectivos] = useState([]);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    id_curso: '',
    paralelo: '',
    anio_lectivo: '',
    jornada: 'Matutina',
    fecha_matricula: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  // Configuración de pensiones pre-visualizada
  const [pensionesConfig, setPensionesConfig] = useState(null);

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [resCursos, resParalelos, resAnios] = await Promise.all([
          getCursos(),
          getParalelos(),
          getAniosLectivos()
        ]);
        
        if (resCursos.success) setCursos(resCursos.cursos);
        if (resParalelos.success) setParalelos(resParalelos.paralelos);
        if (resAnios.success) {
          setAniosLectivos(resAnios.anios);
          // Set anio_lectivo actual by default
          const anioActual = resAnios.anios.find(a => a.actual)?.id || resAnios.anios[0]?.id;
          if (anioActual) {
            setFormData(prev => ({ ...prev, anio_lectivo: anioActual }));
          }
        }
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    fetchCatalogos();
  }, []);

  // Obtener config de pensiones cuando cambien curso y año
  useEffect(() => {
    if (formData.id_curso && formData.anio_lectivo) {
      const fetchConfig = async () => {
        try {
          const res = await getConfigPensiones(formData.id_curso, formData.anio_lectivo);
          if (res.success) {
            setPensionesConfig(res.config);
          }
        } catch (error) {
          console.error(error);
        }
      };
      fetchConfig();
    } else {
      setPensionesConfig(null);
    }
  }, [formData.id_curso, formData.anio_lectivo]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      Swal.fire('Atención', 'Debe seleccionar un estudiante', 'warning');
      return;
    }
    if (!formData.id_curso || !formData.paralelo || !formData.anio_lectivo) {
      Swal.fire('Atención', 'Debe completar todos los datos académicos obligatorios', 'warning');
      return;
    }
    if (!pensionesConfig) {
      Swal.fire('Atención', 'No se ha podido generar la configuración de pensiones', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id_estudiante: selectedStudent.id_estudiante,
        ...formData,
        pensionesConfig: pensionesConfig // enviamos la configuración para que el backend la genere
      };

      const res = await createMatricula(payload);
      if (res.success) {
        Swal.fire('¡Éxito!', 'Matrícula registrada correctamente y pensiones generadas.', 'success').then(() => {
          navigate('/matriculas');
        });
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al guardar la matrícula';
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Nueva Matrícula" subtitle="Matrículas / Registrar">
      <div className="max-w-4xl mx-auto pb-10">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Proceso de Matriculación</h2>
          <Button variant="secondary" onClick={() => navigate('/matriculas')} icon={FiX}>Cancelar</Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Paso 1: Buscar Estudiante */}
          <StudentSearchBox onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />

          {/* Paso 2: Datos de Matrícula */}
          {selectedStudent && (
            <Card title="2. Información Académica" icon={FiCalendar}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Año Lectivo <span className="text-red-500">*</span></label>
                  <select 
                    name="anio_lectivo"
                    value={formData.anio_lectivo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#27A9E1]"
                    required
                  >
                    <option value="">Seleccione...</option>
                    {aniosLectivos.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso <span className="text-red-500">*</span></label>
                  <select 
                    name="id_curso"
                    value={formData.id_curso}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#27A9E1]"
                    required
                  >
                    <option value="">Seleccione un curso...</option>
                    {cursos.map(c => (
                      <option key={c.id_curso} value={c.id_curso}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Paralelo <span className="text-red-500">*</span></label>
                  <select 
                    name="paralelo"
                    value={formData.paralelo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#27A9E1]"
                    required
                  >
                    <option value="">Seleccione...</option>
                    {paralelos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jornada</label>
                  <select 
                    name="jornada"
                    value={formData.jornada}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#27A9E1]"
                  >
                    <option value="Matutina">Matutina</option>
                    <option value="Vespertina">Vespertina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Registro</label>
                  <input 
                    type="date" 
                    name="fecha_matricula"
                    value={formData.fecha_matricula}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#27A9E1] bg-gray-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                  <textarea 
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#27A9E1]"
                    rows="2"
                    placeholder="Alguna nota adicional..."
                  ></textarea>
                </div>
              </div>
            </Card>
          )}

          {/* Paso 3: Resumen de Pensiones */}
          {selectedStudent && formData.id_curso && pensionesConfig && (
            <Card title="3. Generación Automática de Pensiones" icon={FiDollarSign} className="border-l-4 border-l-[#F4C542]">
              <p className="text-sm text-gray-600 mb-4">
                El sistema generará automáticamente las siguientes obligaciones de pago para el período académico.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-700">Valor Mensual Fijo:</span>
                  <span className="text-lg font-bold text-[#27A9E1]">${Number(pensionesConfig.valor_mensual).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Plan de Pagos (Meses)</h4>
                  <div className="flex flex-wrap gap-2">
                    {pensionesConfig.meses.map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                        {m.mes}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {selectedStudent && (
            <div className="flex justify-end gap-4 mt-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/matriculas')}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={FiSave} disabled={loading || !formData.id_curso}>
                {loading ? 'Guardando...' : 'Completar Matrícula'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </MainLayout>
  );
};

export default MatriculaForm;
