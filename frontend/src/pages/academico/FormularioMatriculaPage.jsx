import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import matriculaService from '../../services/matriculaService';
import academicoService from '../../services/academicoService';
import estudiantesService from '../../services/estudiantesService';
import { 
  FiArrowLeft, FiArrowRight, FiCheck, FiSearch, FiSave, 
  FiAlertCircle, FiUser, FiUserCheck, FiRefreshCw, FiBookOpen, FiDollarSign, FiX 
} from 'react-icons/fi';
import Swal from 'sweetalert2';

const FormularioMatriculaPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [error, setError] = useState(null);

  // Datos base
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [tiposMatricula, setTiposMatricula] = useState([]);
  
  // Paso 1: Estudiantes
  const [searchEstudiante, setSearchEstudiante] = useState('');
  const [estudiantesList, setEstudiantesList] = useState([]);
  const [estudiante, setEstudiante] = useState(null);
  
  // Paso 2: Oferta Académica
  const [ofertas, setOfertas] = useState([]);
  const [selectedOferta, setSelectedOferta] = useState(null);
  const [loadingOfertas, setLoadingOfertas] = useState(false);
  
  // Paso 3: Económico
  const [tarifaBase, setTarifaBase] = useState(0);
  const [tipoDescuento, setTipoDescuento] = useState('');
  const [valorDescuento, setValorDescuento] = useState(0);
  const [tipoRecargo, setTipoRecargo] = useState('');
  const [valorRecargo, setValorRecargo] = useState(0);
  const [tipoMatriculaId, setTipoMatriculaId] = useState('');
  const [observacion, setObservacion] = useState('');

  // Helpers de nombres e iniciales seguros
  const getNombreCompleto = (est) => {
    if (!est) return '';
    if (est.apellidos_nombres) return est.apellidos_nombres;
    const nom = `${est.apellidos || ''} ${est.nombres || ''}`.trim();
    return nom || 'Estudiante sin nombre';
  };

  const getIniciales = (est) => {
    const nombre = getNombreCompleto(est);
    const parts = nombre.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return 'ES';
  };

  // Carga inicial de datos
  useEffect(() => {
    loadInitialData();
    loadEstudiantesIniciales();
  }, []);

  const loadInitialData = async () => {
    try {
      const pRes = await academicoService.getPeriodos();
      if (pRes.success && pRes.data) {
        const activo = pRes.data.find(p => p.es_activo === 1);
        if (activo) setPeriodoActivo(activo);
        else if (pRes.data.length > 0) setPeriodoActivo(pRes.data[0]);
      }

      const tRes = await matriculaService.getTiposMatricula();
      if (tRes.success && tRes.data) {
        setTiposMatricula(tRes.data);
        if (tRes.data.length > 0) {
          setTipoMatriculaId(tRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
    }
  };

  // Cargar lista inicial de estudiantes registrados
  const loadEstudiantesIniciales = async () => {
    setLoadingEstudiantes(true);
    try {
      const res = await estudiantesService.getAll({ limit: 25, estado: 'Todos' });
      if (res.success && res.data) {
        setEstudiantesList(res.data);
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  // Buscar estudiantes con debounce
  const buscarEstudiantes = useCallback(async (query) => {
    setLoadingEstudiantes(true);
    setError(null);
    try {
      const params = {
        query: query.trim(),
        limit: 50,
        estado: 'Todos'
      };
      const res = await estudiantesService.getAll(params);
      if (res.success && res.data) {
        setEstudiantesList(res.data);
        if (res.data.length === 0 && query.trim()) {
          setError(`No se encontraron estudiantes registrados con "${query}".`);
        }
      }
    } catch (err) {
      console.error('Error al buscar estudiantes:', err);
      setError('Error al conectar con la base de datos de estudiantes.');
    } finally {
      setLoadingEstudiantes(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchEstudiante.trim().length >= 2) {
        buscarEstudiantes(searchEstudiante);
      } else if (searchEstudiante.trim().length === 0) {
        loadEstudiantesIniciales();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchEstudiante, buscarEstudiantes]);

  const handleManualSearch = () => {
    buscarEstudiantes(searchEstudiante);
  };

  // Cargar ofertas académicas del periodo activo
  const loadOfertas = async () => {
    if (!periodoActivo) return;
    setLoadingOfertas(true);
    try {
      const res = await academicoService.getOfertaAcademica({ periodo_lectivo_id: periodoActivo.id });
      if (res.success && res.data) {
        // Permitir ofertas activas o planificadas
        const validas = res.data.filter(o => !o.estado || o.estado === 'ACTIVA' || o.estado === 'PLANIFICADA' || o.estado === 'ABIERTA');
        setOfertas(validas.length > 0 ? validas : res.data);
      }
    } catch (err) {
      console.error('Error cargando ofertas:', err);
      setError('Error al cargar la oferta académica del periodo.');
    } finally {
      setLoadingOfertas(false);
    }
  };

  // Selección de estudiante
  const handleSelectEstudiante = (est) => {
    setEstudiante(est);
    setError(null);
  };

  const handleNextStep1 = () => {
    if (!estudiante) {
      setError('Por favor seleccione un estudiante de la lista o realice una búsqueda.');
      return;
    }
    setError(null);
    loadOfertas();
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!selectedOferta) {
      setError('Debe seleccionar una oferta académica (curso y paralelo) para continuar.');
      return;
    }
    setError(null);
    if (!tipoMatriculaId && tiposMatricula.length > 0) {
      setTipoMatriculaId(tiposMatricula[0].id);
    }
    setStep(3);
  };

  // Cargar tarifa de matrícula
  useEffect(() => {
    if (step === 3 && selectedOferta && tipoMatriculaId && periodoActivo) {
      fetchTarifa();
    }
  }, [step, selectedOferta, tipoMatriculaId, periodoActivo]);

  const fetchTarifa = async () => {
    try {
      const res = await matriculaService.getTarifa({
        periodo_lectivo_id: periodoActivo.id,
        nivel_id: selectedOferta.nivel_id,
        tipo_matricula_id: tipoMatriculaId
      });
      if (res.success && res.valor !== undefined) {
        setTarifaBase(res.valor);
      }
    } catch (err) {
      console.error('Error al obtener tarifa base:', err);
    }
  };

  const calcularTotal = () => {
    let base = parseFloat(tarifaBase) || 0;
    let desc = parseFloat(valorDescuento) || 0;
    let rec = parseFloat(valorRecargo) || 0;

    if (tipoDescuento === 'PORCENTAJE') desc = base * (desc / 100);
    if (tipoRecargo === 'PORCENTAJE') rec = base * (rec / 100);

    const total = base - desc + rec;
    return Math.max(0, total).toFixed(2);
  };

  const handleSave = async (confirmar = false) => {
    if (!tipoMatriculaId) return setError('Seleccione un tipo de matrícula');
    if (!selectedOferta) return setError('Seleccione un curso y paralelo');
    if (!estudiante) return setError('Seleccione un estudiante');

    setLoading(true);
    setError(null);
    try {
      const payload = {
        estudiante_id: estudiante.id_estudiante,
        periodo_lectivo_id: periodoActivo.id,
        oferta_academica_id: selectedOferta.id,
        tipo_matricula_id: tipoMatriculaId,
        representante_principal_id: estudiante.id_representante || null,
        responsable_economico_id: estudiante.id_representante || null,
        tarifa_base: parseFloat(tarifaBase) || 0,
        tipo_descuento: tipoDescuento || null,
        valor_descuento: parseFloat(valorDescuento) || 0,
        tipo_recargo: tipoRecargo || null,
        valor_recargo: parseFloat(valorRecargo) || 0,
        observacion: observacion || ''
      };

      const res = await matriculaService.createMatricula(payload);
      if (res.success) {
        if (confirmar) {
          await matriculaService.confirmarMatricula(res.id);
        }
        await Swal.fire({
          icon: 'success',
          title: confirmar ? '¡Matrícula Confirmada!' : '¡Borrador Guardado!',
          text: `La matrícula de ${getNombreCompleto(estudiante)} se registró correctamente.`,
          confirmButtonColor: '#27A9E1',
        });
        navigate('/gestion-academica/matriculas');
      } else {
        setError(res.message || 'Error al guardar la matrícula');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al procesar la matrícula');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto animate-fade-in">
        
        {/* Header Superior */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/gestion-academica/matriculas')} 
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
              title="Volver al listado"
            >
              <FiArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Nueva Matrícula</h1>
              <p className="text-sm text-slate-500">
                Periodo Lectivo:{' '}
                <span className="font-semibold text-[#27A9E1]">
                  {periodoActivo ? periodoActivo.nombre : 'Cargando...'}
                </span>
                {periodoActivo?.es_activo ? ' (Activo)' : ''}
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs bg-blue-50 text-[#27A9E1] px-3 py-1.5 rounded-full font-medium border border-blue-100">
              Paso {step} de 3
            </span>
          </div>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center justify-between gap-2 text-sm border border-red-200">
            <div className="flex items-center gap-2">
              <FiAlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* Stepper Header Moderno */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            
            {/* Paso 1 */}
            <div 
              onClick={() => setStep(1)}
              className={`flex items-center gap-3 cursor-pointer ${step === 1 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                step >= 1 ? 'bg-[#27A9E1] text-white shadow-md shadow-[#27A9E1]/20' : 'bg-slate-100 text-slate-400'
              }`}>
                {step > 1 ? <FiCheck size={18} /> : '1'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paso 1</p>
                <p className="text-sm font-bold text-slate-800">Estudiante</p>
              </div>
            </div>

            <div className={`flex-1 h-0.5 mx-4 rounded-full transition-all ${step > 1 ? 'bg-[#27A9E1]' : 'bg-slate-200'}`} />

            {/* Paso 2 */}
            <div 
              onClick={() => estudiante && setStep(2)}
              className={`flex items-center gap-3 ${estudiante ? 'cursor-pointer' : 'cursor-not-allowed'} ${step === 2 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                step >= 2 ? 'bg-[#27A9E1] text-white shadow-md shadow-[#27A9E1]/20' : 'bg-slate-100 text-slate-400'
              }`}>
                {step > 2 ? <FiCheck size={18} /> : '2'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paso 2</p>
                <p className="text-sm font-bold text-slate-800">Oferta Académica</p>
              </div>
            </div>

            <div className={`flex-1 h-0.5 mx-4 rounded-full transition-all ${step > 2 ? 'bg-[#27A9E1]' : 'bg-slate-200'}`} />

            {/* Paso 3 */}
            <div 
              onClick={() => estudiante && selectedOferta && setStep(3)}
              className={`flex items-center gap-3 ${estudiante && selectedOferta ? 'cursor-pointer' : 'cursor-not-allowed'} ${step === 3 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                step === 3 ? 'bg-[#27A9E1] text-white shadow-md shadow-[#27A9E1]/20' : 'bg-slate-100 text-slate-400'
              }`}>
                3
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paso 3</p>
                <p className="text-sm font-bold text-slate-800">Económico y Confirmación</p>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PASO 1: SELECCIÓN DE ESTUDIANTE
        ═══════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">1. Seleccionar Estudiante para Matrícula</h2>
                <p className="text-sm text-slate-500">Busca por cédula, código, nombres o apellidos del estudiante registrado.</p>
              </div>
              {estudiante && (
                <button 
                  onClick={() => setEstudiante(null)}
                  className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                >
                  <FiX size={14} /> Cambiar Estudiante
                </button>
              )}
            </div>
            
            {/* Si ya hay estudiante seleccionado */}
            {estudiante ? (
              <div className="p-5 border-2 border-[#27A9E1] bg-blue-50/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#27A9E1] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#27A9E1]/20">
                    {getIniciales(estudiante)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg">{getNombreCompleto(estudiante)}</h3>
                      <span className={`text-[0.7rem] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        estudiante.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {estudiante.estado || 'Activo'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Cédula: <span className="font-semibold text-slate-800">{estudiante.cedula || 'N/A'}</span> &nbsp;|&nbsp; 
                      Código: <span className="font-semibold text-slate-800">{estudiante.codigo || 'N/A'}</span>
                    </p>
                    {estudiante.representante_nombre && (
                      <p className="text-xs text-slate-500 mt-1">
                        Representante: <span className="font-medium text-slate-700">{estudiante.representante_nombre}</span>
                        {estudiante.representante_telefono ? ` (${estudiante.representante_telefono})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <FiUserCheck size={14} /> Estudiante Seleccionado
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Barra de Búsqueda */}
                <div className="flex gap-3 mb-6">
                  <div className="flex-1 relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por cédula, nombres, apellidos o código..."
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] focus:ring-2 focus:ring-[#27A9E1]/20 text-sm font-medium transition-all"
                      value={searchEstudiante}
                      onChange={(e) => setSearchEstudiante(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                    />
                    {searchEstudiante && (
                      <button 
                        onClick={() => { setSearchEstudiante(''); loadEstudiantesIniciales(); }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <FiX size={16} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={handleManualSearch}
                    disabled={loadingEstudiantes}
                    className="px-6 py-3 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1a85b5] transition-colors font-semibold text-sm shadow-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    {loadingEstudiantes ? <FiRefreshCw className="animate-spin" /> : <FiSearch />}
                    <span>Buscar</span>
                  </button>
                </div>

                {/* Listado de Resultados de Estudiantes */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <span>Estudiantes Registrados ({estudiantesList.length})</span>
                    <span>Acción</span>
                  </div>

                  {loadingEstudiantes ? (
                    <div className="p-12 text-center text-slate-400">
                      <FiRefreshCw className="animate-spin inline-block mb-2 text-[#27A9E1]" size={24} />
                      <p className="text-sm">Buscando en la base de datos...</p>
                    </div>
                  ) : estudiantesList.length === 0 ? (
                    <div className="p-12 text-center">
                      <FiUser className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-slate-600 font-semibold">No se encontraron estudiantes</p>
                      <p className="text-xs text-slate-400 mt-1">Verifica los términos de búsqueda o registra al estudiante en el módulo de Estudiantes.</p>
                      <button 
                        onClick={() => navigate('/estudiantes/nuevo')}
                        className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Registrar Nuevo Estudiante
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                      {estudiantesList.map(est => (
                        <div 
                          key={est.id_estudiante} 
                          onClick={() => handleSelectEstudiante(est)} 
                          className="p-3.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex justify-between items-center group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#27A9E1] group-hover:text-white text-slate-600 font-bold flex items-center justify-center text-sm transition-colors">
                              {getIniciales(est)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm group-hover:text-[#27A9E1] transition-colors">
                                {getNombreCompleto(est)}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                                <span>Cédula: <strong className="text-slate-700">{est.cedula || 'S/N'}</strong></span>
                                <span>Código: <strong className="text-slate-700">{est.codigo || 'S/N'}</strong></span>
                                {est.representante_nombre && (
                                  <span className="hidden sm:inline">Rep: {est.representante_nombre}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSelectEstudiante(est); }}
                            className="px-3.5 py-1.5 bg-[#27A9E1]/10 text-[#27A9E1] hover:bg-[#27A9E1] hover:text-white rounded-lg font-bold text-xs transition-all shadow-sm"
                          >
                            Seleccionar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Footer Paso 1 */}
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleNextStep1}
                disabled={!estudiante}
                className="flex items-center gap-2 px-6 py-3 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1a85b5] transition-all font-semibold text-sm shadow-md shadow-[#27A9E1]/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continuar a Oferta Académica</span>
                <FiArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PASO 2: SELECCIÓN DE OFERTA ACADÉMICA
        ═══════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">2. Selección de Curso y Paralelo</h2>
                <p className="text-sm text-slate-500">
                  Estudiante:{' '}
                  <span className="font-bold text-slate-800">{getNombreCompleto(estudiante)}</span>
                </p>
              </div>
            </div>

            {loadingOfertas ? (
              <div className="p-12 text-center text-slate-400">
                <FiRefreshCw className="animate-spin inline-block mb-2 text-[#27A9E1]" size={24} />
                <p className="text-sm">Cargando cursos y paralelos...</p>
              </div>
            ) : ofertas.length === 0 ? (
              <div className="p-10 bg-slate-50 rounded-2xl text-center border border-slate-200 mb-6">
                <FiBookOpen size={36} className="mx-auto text-slate-400 mb-3" />
                <h3 className="font-bold text-slate-700">No hay ofertas académicas configuradas</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  No se han configurado cursos ni paralelos para el periodo lectivo actual ({periodoActivo?.nombre}).
                </p>
                <button
                  onClick={() => navigate('/gestion-academica/estructura')}
                  className="px-4 py-2 bg-[#27A9E1] text-white rounded-xl text-xs font-bold hover:bg-[#1a85b5] transition-colors"
                >
                  Configurar Estructura Académica
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {ofertas.map(o => {
                  const isSelected = selectedOferta?.id === o.id;
                  const cupos = o.cupos_disponibles !== undefined ? o.cupos_disponibles : o.cupo_maximo;
                  
                  return (
                    <div 
                      key={o.id}
                      onClick={() => setSelectedOferta(o)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-[#27A9E1] bg-blue-50/50 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-base">{o.curso_nombre}</h4>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-[#27A9E1] text-white flex items-center justify-center text-xs shadow-sm">
                            <FiCheck />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs mb-3">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
                          Paralelo: {o.paralelo_nombre}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                          {o.jornada_nombre || 'Matutina'}
                        </span>
                        {o.aula && (
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                            Aula: {o.aula}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500">
                          Cupo Máximo: <strong className="text-slate-700">{o.cupo_maximo || 'Sin límite'}</strong>
                        </span>
                        <span className={`font-semibold ${cupos <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {cupos !== null && cupos !== undefined ? `${cupos} cupos disponibles` : 'Disponible'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Paso 2 */}
            <div className="mt-8 flex justify-between">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-sm"
              >
                <FiArrowLeft /> Volver a Estudiante
              </button>
              <button 
                onClick={handleNextStep2}
                disabled={!selectedOferta}
                className="flex items-center gap-2 px-6 py-3 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1a85b5] transition-all font-semibold text-sm shadow-md shadow-[#27A9E1]/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continuar a Económico</span>
                <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PASO 3: INFORMACIÓN ECONÓMICA Y CONFIRMACIÓN
        ═══════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">3. Información Económica y Confirmación</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              
              {/* Formulario de Configuración de Cobro */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tipo de Matrícula
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-medium"
                    value={tipoMatriculaId}
                    onChange={(e) => setTipoMatriculaId(e.target.value)}
                  >
                    {tiposMatricula.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                    {tiposMatricula.length === 0 && (
                      <option value="1">Ordinaria</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tarifa Base ($)
                  </label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-bold text-slate-800"
                      value={tarifaBase}
                      onChange={(e) => setTarifaBase(e.target.value)}
                    />
                  </div>
                  <p className="text-[0.7rem] text-slate-400 mt-1">
                    Puedes ajustar el valor base de matrícula para este estudiante si aplica.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Descuento o Beca
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-medium"
                      value={tipoDescuento}
                      onChange={(e) => setTipoDescuento(e.target.value)}
                    >
                      <option value="">Sin Descuento</option>
                      <option value="FIJO">Fijo ($)</option>
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                    </select>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!tipoDescuento}
                      className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-semibold disabled:bg-slate-50"
                      value={valorDescuento}
                      onChange={(e) => setValorDescuento(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Recargo (Extemporánea / Especial)
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-medium"
                      value={tipoRecargo}
                      onChange={(e) => setTipoRecargo(e.target.value)}
                    >
                      <option value="">Sin Recargo</option>
                      <option value="FIJO">Fijo ($)</option>
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                    </select>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!tipoRecargo}
                      className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-semibold disabled:bg-slate-50"
                      value={valorRecargo}
                      onChange={(e) => setValorRecargo(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Observaciones
                  </label>
                  <textarea
                    rows="2"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm font-normal"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Detalles adicionales sobre la inscripción o cobro..."
                  ></textarea>
                </div>
              </div>

              {/* Resumen Final de la Matrícula */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base mb-4 pb-3 border-b border-slate-200">
                    Resumen de Matrícula
                  </h3>
                  
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Estudiante:</span>
                      <span className="font-bold text-slate-800 text-right">{getNombreCompleto(estudiante)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Cédula:</span>
                      <span className="font-medium text-slate-700">{estudiante?.cedula || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Curso Asignado:</span>
                      <span className="font-bold text-slate-800 text-right">
                        {selectedOferta?.curso_nombre} "{selectedOferta?.paralelo_nombre}"
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Jornada:</span>
                      <span className="font-medium text-slate-700">{selectedOferta?.jornada_nombre || 'Matutina'}</span>
                    </div>

                    <div className="flex justify-between border-t border-slate-200 pt-3 mt-3">
                      <span className="text-slate-500">Tarifa Base:</span>
                      <span className="font-semibold text-slate-800">${parseFloat(tarifaBase || 0).toFixed(2)}</span>
                    </div>

                    {valorDescuento > 0 && tipoDescuento && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento aplicado:</span>
                        <span className="font-semibold">
                          - {tipoDescuento === 'PORCENTAJE' ? `${valorDescuento}%` : `$${parseFloat(valorDescuento).toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    {valorRecargo > 0 && tipoRecargo && (
                      <div className="flex justify-between text-amber-600">
                        <span>Recargo adicional:</span>
                        <span className="font-semibold">
                          + {tipoRecargo === 'PORCENTAJE' ? `${valorRecargo}%` : `$${parseFloat(valorRecargo).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-dashed border-slate-200 mt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Total a Pagar</span>
                      <span className="text-sm font-semibold text-slate-700">Valor de Matrícula</span>
                    </div>
                    <span className="text-3xl font-black text-[#27A9E1]">
                      ${calcularTotal()}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Paso 3 con Botones de Acción */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3">
              <button 
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                <FiArrowLeft /> Volver a Curso
              </button>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-[#27A9E1] text-[#27A9E1] rounded-xl hover:bg-blue-50 transition-colors font-bold text-sm disabled:opacity-50"
                >
                  <FiSave /> Guardar Borrador
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1a85b5] transition-all font-bold text-sm shadow-md shadow-[#27A9E1]/20 disabled:opacity-50"
                >
                  <FiCheck size={18} /> Confirmar Matrícula
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default FormularioMatriculaPage;
