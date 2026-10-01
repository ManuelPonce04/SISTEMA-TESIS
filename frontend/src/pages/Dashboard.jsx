/**
 * Dashboard.jsx — Panel Principal SIGCOP-KPI
 * ─────────────────────────────────────────────────────────────────
 * Módulo central del sistema de cobranzas de pensiones.
 * UE Juan León Mera · Tesis de grado.
 *
 * ESTRUCTURA:
 *  1. Encabezado (saludo + período + refresh)
 *  2. Alertas inteligentes (semáforo accionable)
 *  3. Barra de filtros (año, curso, paralelo, mes, estado, tipo beca)
 *  4. KPIs principales (6 tarjetas con sparkline y variación)
 *  5. Gráficos analíticos (2 columnas desktop)
 *     a. Evolución de recaudación vs meta (área)
 *     b. Cartera por nivel académico (barras apiladas)
 *     c. Distribución por tipo de pensión (dona)
 *     d. Top 5 cursos con mayor morosidad (progreso horizontal)
 *  6. Tabla de actividad reciente (paginación + CSV)
 *  7. Panel lateral de próximos vencimientos
 *
 * MODO MOCK:
 *  Todos los datos provienen de src/data/dashboardMock.js.
 *  Para conectar al backend, reemplazar las asignaciones de estado
 *  por llamadas a dashboardService.js en la función loadData().
 *  Los marcadores "BACKEND:" indican el endpoint correspondiente.
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';

// ── Componentes del Dashboard ─────────────────────────────────────
import DashboardHeader         from '../components/dashboard/DashboardHeader';
import AlertBanner             from '../components/dashboard/AlertBanner';
import DashboardFilters        from '../components/dashboard/DashboardFilters';
import KpiCardV2               from '../components/dashboard/KpiCardV2';
import RevenueTrendChart       from '../components/dashboard/RevenueTrendChart';
import ArrearsByLevelChart     from '../components/dashboard/ArrearsByLevelChart';
import PensionTypeDonut        from '../components/dashboard/PensionTypeDonut';
import TopArrearsCoursesChart  from '../components/dashboard/TopArrearsCoursesChart';
import RecentPaymentsTable     from '../components/dashboard/RecentPaymentsTable';
import UpcomingDueList         from '../components/dashboard/UpcomingDueList';

// ── Datos Mock (reemplazar por llamadas reales al conectar backend) ──
import {
  mockAlertas,
  mockKpis,
  mockRevenueTrend,
  mockArrearsByLevel,
  mockPensionTypeData,
  mockTopArrearsCourses,
  mockRecentPayments,
  mockUpcomingDues,
  FILTROS_DEFAULT,
} from '../data/dashboardMock';

// ── Íconos para KPIs ──────────────────────────────────────────────
// (los iconos reales se asignan dentro de KpiCardV2 según el prop `tipo`)

// ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { usuario } = useAuth();

  // ── Estado de filtros ───────────────────────────────────────────
  const [filtros, setFiltros] = useState(FILTROS_DEFAULT);
  const [periodo, setPeriodo] = useState('mes_actual');

  // ── Estado de datos ─────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [alertas,         setAlertas]         = useState([]);
  const [kpis,            setKpis]            = useState(null);
  const [revenueTrend,    setRevenueTrend]    = useState([]);
  const [arrearsByLevel,  setArrearsByLevel]  = useState([]);
  const [pensionTypes,    setPensionTypes]    = useState([]);
  const [topCourses,      setTopCourses]      = useState([]);
  const [recentPayments,  setRecentPayments]  = useState([]);
  const [upcomingDues,    setUpcomingDues]    = useState([]);

  // ── Carga de datos ───────────────────────────────────────────────
  /**
   * loadData — Carga todos los datos del dashboard.
   *
   * MODO MOCK: Simula un delay de red de 800ms y asigna datos fijos.
   *
   * PARA CONECTAR AL BACKEND:
   * Reemplazar cada bloque de asignación directa por la llamada
   * al servicio correspondiente de dashboardService.js, por ejemplo:
   *
   *   const res = await getDashboardSummary({ ...filtros, periodo });
   *   if (res.success) setKpis(res.kpis);
   *
   * Cada endpoint está documentado en el archivo dashboardMock.js.
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Simular latencia de API
      await new Promise(r => setTimeout(r, 800));

      // BACKEND: GET /api/dashboard/activity → { alertas }
      setAlertas(mockAlertas);

      // BACKEND: GET /api/dashboard/summary → { kpis }
      setKpis(mockKpis);

      // BACKEND: GET /api/dashboard/monthly-collections → { cobrosMensuales }
      setRevenueTrend(mockRevenueTrend);

      // BACKEND: GET /api/dashboard/arrears-by-level → { nivelesCartera }
      setArrearsByLevel(mockArrearsByLevel);

      // BACKEND: GET /api/dashboard/pension-type-distribution → { distribucion }
      setPensionTypes(mockPensionTypeData);

      // BACKEND: GET /api/dashboard/top-arrears-courses → { ranking }
      setTopCourses(mockTopArrearsCourses);

      // BACKEND: GET /api/dashboard/recent-payments → { ultimosPagos }
      setRecentPayments(mockRecentPayments);

      // BACKEND: GET /api/dashboard/upcoming-dues → { pensionesVencer }
      setUpcomingDues(mockUpcomingDues);

    } catch (error) {
      console.error('Error al cargar el dashboard:', error);
      // TODO: Mostrar toast/snackbar de error al usuario
    } finally {
      setLoading(false);
    }
  }, [filtros, periodo]);

  // Cargar al montar y cuando cambien filtros o período
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ────────────────────────────────────────────────────────────────
  return (
    <MainLayout title="Panel Principal" subtitle="Inicio / Dashboard">

      {/* ── 1. Encabezado ─────────────────────────────────────── */}
      <DashboardHeader
        usuario={usuario}
        onRefresh={loadData}
        loading={loading}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
      />

      {/* Divisor sutil */}
      <div className="h-px bg-gray-100 my-5" />

      {/* ── 2. Alertas inteligentes ───────────────────────────── */}
      <AlertBanner alertas={alertas} />

      {/* ── 3. Filtros globales ───────────────────────────────── */}
      <DashboardFilters filtros={filtros} setFiltros={setFiltros} />

      {/* ── 4. KPIs principales ───────────────────────────────── */}
      <section aria-label="Indicadores clave de rendimiento" className="mb-6 w-full min-w-0">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full min-w-0">

          {/* KPI 1: Total estudiantes matriculados */}
          <KpiCardV2
            titulo="Estudiantes"
            valor={kpis?.totalEstudiantes?.valor ?? null}
            subtitulo={kpis?.totalEstudiantes?.subtitulo}
            variacion={kpis?.totalEstudiantes?.variacion}
            sparkline={kpis?.totalEstudiantes?.sparkline}
            tipo="estudiantes"
            color="celeste"
            loading={loading}
          />

          {/* KPI 2: Total recaudado en el período (USD) */}
          <KpiCardV2
            titulo="Recaudado"
            valor={kpis?.totalRecaudado?.valor ?? null}
            subtitulo={kpis?.totalRecaudado?.subtitulo}
            variacion={kpis?.totalRecaudado?.variacion}
            sparkline={kpis?.totalRecaudado?.sparkline}
            tipo="recaudado"
            color="verde"
            prefix="$"
            loading={loading}
          />

          {/* KPI 3: Cartera vencida / saldo pendiente (USD)
              variacionInversa=true porque disminuir la cartera es positivo */}
          <KpiCardV2
            titulo="Cartera Vencida"
            valor={kpis?.carteraVencida?.valor ?? null}
            subtitulo={kpis?.carteraVencida?.subtitulo}
            variacion={kpis?.carteraVencida?.variacion}
            sparkline={kpis?.carteraVencida?.sparkline}
            tipo="pendiente"
            color="rojo"
            prefix="$"
            variacionInversa
            loading={loading}
          />

          {/* KPI 4: Tasa de morosidad (%)
              Fórmula: estudiantes con saldo > 0 / total matriculados × 100
              variacionInversa=true porque menos morosidad es mejor */}
          <KpiCardV2
            titulo="Tasa Morosidad"
            valor={kpis?.tasaMorosidad?.valor ?? null}
            subtitulo={kpis?.tasaMorosidad?.subtitulo}
            variacion={kpis?.tasaMorosidad?.variacion}
            sparkline={kpis?.tasaMorosidad?.sparkline}
            tipo="morosos"
            color="naranja"
            suffix="%"
            variacionInversa
            loading={loading}
          />

          {/* KPI 5: Tasa de recaudación (%)
              Fórmula: total cobrado / total facturado × 100 */}
          <KpiCardV2
            titulo="Tasa Recaudación"
            valor={kpis?.tasaRecaudacion?.valor ?? null}
            subtitulo={kpis?.tasaRecaudacion?.subtitulo}
            variacion={kpis?.tasaRecaudacion?.variacion}
            sparkline={kpis?.tasaRecaudacion?.sparkline}
            tipo="recaudacion"
            color="verde"
            suffix="%"
            loading={loading}
          />

          {/* KPI 6: Días promedio de atraso
              Fórmula: promedio(fecha_cobro − fecha_vencimiento) para cobros tardíos
              variacionInversa=true porque menos días de atraso es mejor */}
          <KpiCardV2
            titulo="Días Promedio Mora"
            valor={kpis?.diasPromedioAtraso?.valor ?? null}
            subtitulo={kpis?.diasPromedioAtraso?.subtitulo}
            variacion={kpis?.diasPromedioAtraso?.variacion}
            sparkline={kpis?.diasPromedioAtraso?.sparkline}
            tipo="atraso"
            color="amarillo"
            suffix=" días"
            variacionInversa
            loading={loading}
          />
        </div>
      </section>

      {/* ── 5. Gráficos analíticos ────────────────────────────── */}
      <section aria-label="Gráficos analíticos" className="mb-6 w-full min-w-0">
        {/* Fila superior: evolución + cartera por nivel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6 w-full min-w-0">
          <div className="w-full min-w-0 overflow-hidden">
            <RevenueTrendChart data={revenueTrend} />
          </div>
          <div className="w-full min-w-0 overflow-hidden">
            <ArrearsByLevelChart data={arrearsByLevel} />
          </div>
        </div>

        {/* Fila inferior: dona + top cursos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 w-full min-w-0">
          <div className="w-full min-w-0 overflow-hidden">
            <PensionTypeDonut data={pensionTypes} />
          </div>
          <div className="w-full min-w-0 overflow-hidden">
            <TopArrearsCoursesChart data={topCourses} />
          </div>
        </div>
      </section>

      {/* ── 6 + 7. Tabla de pagos + Panel de vencimientos ────── */}
      <section aria-label="Actividad reciente y vencimientos" className="mb-6 w-full min-w-0">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 w-full min-w-0">
          {/* Tabla ocupa 2 columnas en XL */}
          <div className="xl:col-span-2 w-full min-w-0 overflow-hidden">
            <RecentPaymentsTable data={recentPayments} loading={loading} />
          </div>
          {/* Panel lateral de vencimientos */}
          <div className="w-full min-w-0 overflow-hidden">
            <UpcomingDueList data={upcomingDues} loading={loading} />
          </div>
        </div>
      </section>

    </MainLayout>
  );
};

export default Dashboard;
