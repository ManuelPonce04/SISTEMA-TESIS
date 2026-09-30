import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { FiCalendar, FiLayers, FiBookOpen, FiUsers, FiClock, FiGrid } from 'react-icons/fi';
import PeriodosTab from '../../components/academico/PeriodosTab';
import NivelesSubnivelesTab from '../../components/academico/NivelesSubnivelesTab';
import CursosTab from '../../components/academico/CursosTab';
import ParalelosTab from '../../components/academico/ParalelosTab';
import JornadasTab from '../../components/academico/JornadasTab';
import OfertaAcademicaTab from '../../components/academico/OfertaAcademicaTab';

const EstructuraAcademicaPage = () => {
  const [activeTab, setActiveTab] = useState('periodos');

  const tabs = [
    { id: 'periodos', label: 'Periodos Lectivos', icon: FiCalendar },
    { id: 'niveles', label: 'Niveles', icon: FiLayers },
    { id: 'cursos', label: 'Cursos', icon: FiBookOpen },
    { id: 'paralelos', label: 'Paralelos', icon: FiUsers },
    { id: 'jornadas', label: 'Jornadas', icon: FiClock },
    { id: 'oferta', label: 'Oferta Académica', icon: FiGrid },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Estructura Académica</h1>
          <p className="text-slate-500 mt-2 text-sm">Gestiona periodos, niveles, cursos, paralelos, jornadas y la oferta académica de la institución.</p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex-1 min-w-[150px] justify-center ${
                  isActive 
                    ? 'bg-[#27A9E1] text-white shadow-md shadow-[#27A9E1]/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
          {activeTab === 'periodos' && <PeriodosTab />}
          {activeTab === 'niveles' && <NivelesSubnivelesTab />}
          {activeTab === 'cursos' && <CursosTab />}
          {activeTab === 'paralelos' && <ParalelosTab />}
          {activeTab === 'jornadas' && <JornadasTab />}
          {activeTab === 'oferta' && <OfertaAcademicaTab />}
        </div>
      </div>
    </MainLayout>
  );
};

export default EstructuraAcademicaPage;
