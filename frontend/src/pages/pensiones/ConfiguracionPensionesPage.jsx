import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { getCatalogosApoyo } from '../../services/pensionesConfigService';
import TabTarifas from '../../components/pensiones/config/TabTarifas';
import TabMeses from '../../components/pensiones/config/TabMeses';
import TabBeneficios from '../../components/pensiones/config/TabBeneficios';
import TabCompatibilidades from '../../components/pensiones/config/TabCompatibilidades';
import TabConfigFinanciera from '../../components/pensiones/config/TabConfigFinanciera';
import TabSimulador from '../../components/pensiones/config/TabSimulador';
import {
  FiDollarSign, FiCalendar, FiAward, FiLink,
  FiSettings, FiPlay, FiGrid
} from 'react-icons/fi';

const TABS = [
  { id: 'tarifas',        label: 'Tarifas mensuales',     icon: FiDollarSign,   desc: 'Configura el valor mensual por nivel, subnivel o curso.' },
  { id: 'meses',          label: 'Meses cobrables',        icon: FiCalendar,     desc: 'Define qué meses generan pensión en cada periodo.' },
  { id: 'beneficios',     label: 'Becas y descuentos',     icon: FiAward,        desc: 'Catálogo de beneficios: becas, descuentos y exoneraciones.' },
  { id: 'compatibilidades', label: 'Compatibilidades',     icon: FiLink,         desc: 'Define qué beneficios pueden combinarse.' },
  { id: 'financiera',     label: 'Config. financiera',     icon: FiSettings,     desc: 'Vincula operaciones con el catálogo de movimientos.' },
  { id: 'simulador',      label: 'Simulador',              icon: FiPlay,         desc: 'Calcula el valor final de pensión con cualquier combinación.' },
];

export default function ConfiguracionPensionesPage() {
  const { usuario } = useAuth();
  const isAdmin = !!usuario?.es_admin;
  const [activeTab, setActiveTab] = useState('tarifas');
  const [catalogos, setCatalogos] = useState(null);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  useEffect(() => {
    getCatalogosApoyo()
      .then(res => { if (res.success) setCatalogos(res); })
      .catch(() => {})
      .finally(() => setLoadingCatalogos(false));
  }, []);

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <MainLayout
      title="Configuración de Pensiones"
      subtitle="Inicio / Control Financiero / Pensiones y cobranzas / Configuración"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#27A9E1] to-[#1E8BBF] flex items-center justify-center shadow-lg shadow-[#27A9E1]/30 flex-shrink-0">
            <FiGrid size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Pensiones</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {currentTab?.desc}
              {!isAdmin && <span className="ml-2 text-amber-600 font-medium">· Solo lectura</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar — scroll horizontal en móvil */}
        <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                  isActive
                    ? 'border-[#27A9E1] text-[#27A9E1] bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-[#27A9E1]' : 'text-gray-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido de la pestaña */}
        <div className="p-4 md:p-6">
          {loadingCatalogos ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-[#27A9E1] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Cargando catálogos...</p>
            </div>
          ) : (
            <>
              {activeTab === 'tarifas'          && <TabTarifas catalogos={catalogos} isAdmin={isAdmin} />}
              {activeTab === 'meses'            && <TabMeses catalogos={catalogos} isAdmin={isAdmin} />}
              {activeTab === 'beneficios'       && <TabBeneficios isAdmin={isAdmin} />}
              {activeTab === 'compatibilidades' && <TabCompatibilidades isAdmin={isAdmin} />}
              {activeTab === 'financiera'       && <TabConfigFinanciera isAdmin={isAdmin} />}
              {activeTab === 'simulador'        && <TabSimulador catalogos={catalogos} />}
            </>
          )}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .border-3 { border-width: 3px; }
      `}</style>
    </MainLayout>
  );
}
