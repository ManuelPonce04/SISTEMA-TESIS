import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { FiDownload, FiSettings } from 'react-icons/fi';
import PensionesFilters from '../../components/pensiones/PensionesFilters';
import PensionSummaryCards from '../../components/pensiones/PensionSummaryCards';
import PensionesTable from '../../components/pensiones/PensionesTable';
import PensionDetailModal from '../../components/pensiones/PensionDetailModal';
import PaymentModal from '../../components/pensiones/PaymentModal';
import { getPensiones, getResumenPensiones, registrarPago } from '../../services/pensionesService';
import { getCursos, getAniosLectivos } from '../../services/matriculasService'; // Reutilizamos catálogos
import Swal from 'sweetalert2';

const PensionesPage = () => {
  const [pensiones, setPensiones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Catálogos para filtros
  const [cursos, setCursos] = useState([]);
  const [anios, setAnios] = useState([]);

  // Estado de los Modales
  const [selectedPensionId, setSelectedPensionId] = useState(null);
  const [pensionParaPagar, setPensionParaPagar] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Estado de Filtros
  const [filtros, setFiltros] = useState({
    search: '',
    anio_lectivo: 'Todos',
    curso: 'Todos',
    paralelo: 'Todos',
    mes: 'Todos',
    estado: 'Todos',
    fecha_desde: '',
    fecha_hasta: ''
  });

  const fetchCatalogos = async () => {
    try {
      const [resCursos, resAnios] = await Promise.all([getCursos(), getAniosLectivos()]);
      if (resCursos.success) setCursos(resCursos.cursos);
      if (resAnios.success) setAnios(resAnios.anios);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const [resPens, resResumen] = await Promise.all([
        getPensiones(filtros),
        getResumenPensiones()
      ]);
      if (resPens.success) setPensiones(resPens.pensiones);
      if (resResumen.success) setResumen(resResumen.resumen);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las pensiones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    fetchDatos();
  };

  const handleClearFilters = () => {
    setFiltros({
      search: '', anio_lectivo: 'Todos', curso: 'Todos',
      paralelo: 'Todos', mes: 'Todos', estado: 'Todos',
      fecha_desde: '', fecha_hasta: ''
    });
    // fetchDatos() se llamará si metemos la limpieza en un estado asíncrono o manual
  };

  const handleRegistrarPagoSubmit = async (id, formData) => {
    setIsSubmittingPayment(true);
    try {
      const response = await registrarPago(id, formData);
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Pago Registrado',
          text: response.message,
          timer: 2000,
          showConfirmButton: false
        });
        setPensionParaPagar(null);
        fetchDatos(); // Refrescar lista
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al procesar el pago', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <MainLayout title="Gestión de Pensiones" subtitle="Inicio / Pensiones">
      
      {/* Header Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Control de Pensiones</h1>
          <p className="text-sm text-gray-500 mt-1">Consulta y controla las pensiones generadas para los estudiantes.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={FiDownload} className="bg-white">Exportar Excel</Button>
          <Button variant="secondary" icon={FiDownload} className="bg-white">Exportar PDF</Button>
          {/* <Button variant="primary" icon={FiSettings} className="bg-[#27A9E1]">Opciones Admin</Button> */}
        </div>
      </div>

      {/* KPI Cards */}
      <PensionSummaryCards resumen={resumen} />

      {/* Filtros */}
      <PensionesFilters 
        filtros={filtros} 
        setFiltros={setFiltros} 
        onApply={handleApplyFilters} 
        onClear={handleClearFilters}
        cursos={cursos}
        anios={anios}
      />

      {/* Tabla de Pensiones */}
      <PensionesTable 
        pensiones={pensiones} 
        loading={loading}
        onViewDetail={(p) => setSelectedPensionId(p.id_pension)}
        onRegistrarPago={(p) => setPensionParaPagar(p)}
      />

      {/* Modales */}
      {selectedPensionId && (
        <PensionDetailModal 
          idPension={selectedPensionId} 
          onClose={() => setSelectedPensionId(null)} 
        />
      )}

      {pensionParaPagar && (
        <PaymentModal 
          pension={pensionParaPagar}
          onClose={() => setPensionParaPagar(null)}
          onSubmit={handleRegistrarPagoSubmit}
          loading={isSubmittingPayment}
        />
      )}

    </MainLayout>
  );
};

export default PensionesPage;
