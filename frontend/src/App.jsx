import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EstudiantesPage from './pages/EstudiantesPage';
import NuevoEstudiante from './pages/NuevoEstudiante';
import DetalleEstudiante from './pages/DetalleEstudiante';
import MatriculasAcademicoPage from './pages/academico/MatriculasPage';
import FormularioMatriculaPage from './pages/academico/FormularioMatriculaPage';

import UsuariosPage from './pages/UsuariosPage';
import PerfilPage from './pages/PerfilPage';
import CatalogoMovimientosPage from './pages/financiero/CatalogoMovimientosPage';
import CuentasFinancierasPage from './pages/financiero/CuentasFinancierasPage';
import IngresosEgresosPage from './pages/financiero/IngresosEgresosPage';
import PersonalPage from './pages/financiero/PersonalPage';
import SueldosAnticiposPage from './pages/financiero/SueldosAnticiposPage';
import RolPagosPage from './pages/financiero/RolPagosPage';
import NominaDetailPage from './pages/financiero/NominaDetailPage';
import ConsolidadoPage from './pages/financiero/ConsolidadoPage';
import EstructuraAcademicaPage from './pages/academico/EstructuraAcademicaPage';
import RepresentantesPage from './pages/RepresentantesPage';
import ReportesPage from './pages/ReportesPage';
import KPIPage from './pages/KPIPage';
import CobrarPensionesPage from './pages/pensiones/CobrarPensionesPage';
import EstadoCuentaPage from './pages/pensiones/EstadoCuentaPage';
import MorososPage from './pages/pensiones/MorososPage';
import ConfiguracionPensionesPage from './pages/pensiones/ConfiguracionPensionesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/estudiantes" element={<EstudiantesPage />} />
            <Route path="/estudiantes/nuevo" element={<NuevoEstudiante />} />
            <Route path="/estudiantes/detalle/:id" element={<DetalleEstudiante />} />
            <Route path="/representantes" element={<RepresentantesPage />} />
            <Route path="/personal" element={<PersonalPage />} />
            {/* Rutas antiguas de matriculas omitidas/movidas */}
            


            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/perfil" element={<PerfilPage />} />

            {/* Control Financiero */}
            <Route path="/financiero/movimientos" element={<CatalogoMovimientosPage />} />
            <Route path="/financiero/cuentas" element={<CuentasFinancierasPage />} />
            <Route path="/financiero/ingresos-egresos" element={<IngresosEgresosPage />} />
            <Route path="/financiero/personal" element={<PersonalPage />} />
            <Route path="/financiero/sueldos-anticipos" element={<SueldosAnticiposPage />} />
            <Route path="/financiero/rol-pagos" element={<RolPagosPage />} />
            <Route path="/financiero/rol-pagos/:id" element={<NominaDetailPage />} />
            <Route path="/financiero/consolidado" element={<ConsolidadoPage />} />

            {/* Gestión Académica */}
            <Route path="/gestion-academica/estructura" element={<EstructuraAcademicaPage />} />
            <Route path="/gestion-academica/matriculas" element={<MatriculasAcademicoPage />} />
            <Route path="/gestion-academica/matriculas/nueva" element={<FormularioMatriculaPage />} />

            {/* Reportes y KPI */}
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/kpi" element={<KPIPage />} />

            {/* Control Financiero → Pensiones & Facturación */}
            <Route path="/control-financiero/pensiones/cobrar"        element={<CobrarPensionesPage defaultTab="cobro" />} />
            <Route path="/control-financiero/facturacion"            element={<CobrarPensionesPage defaultTab="facturar" />} />
            <Route path="/control-financiero/facturacion/historial"  element={<CobrarPensionesPage defaultTab="historial" />} />
            <Route path="/control-financiero/pensiones/estado-cuenta" element={<EstadoCuentaPage />} />
            <Route path="/control-financiero/pensiones/morosos"       element={<MorososPage />} />

            {/* Configuración */}
            <Route path="/configuracion" element={<ConfiguracionPage />} />
            <Route path="/control-financiero/pensiones/configuracion" element={<ConfiguracionPensionesPage />} />

          </Route>

          {/* Ruta de acceso no autorizado */}
          <Route
            path="/no-autorizado"
            element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-red-500 mb-2">403</h1>
                  <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
                </div>
              </div>
            }
          />

          {/* Redirigir raíz al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
