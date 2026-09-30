import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { getMatriculaById, getPensionesByMatricula } from '../../services/matriculasService';
import { FiArrowLeft, FiPrinter, FiUser, FiCalendar, FiDollarSign, FiFileText } from 'react-icons/fi';
import Swal from 'sweetalert2';

const DetalleMatricula = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState(null);
  const [pensiones, setPensiones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resMat, resPen] = await Promise.all([
          getMatriculaById(id),
          getPensionesByMatricula(id)
        ]);
        
        if (resMat.success) setMatricula(resMat.matricula);
        if (resPen.success) setPensiones(resPen.pensiones);
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo cargar la información de la matrícula', 'error').then(() => {
          navigate('/matriculas');
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <MainLayout title="Detalle Matrícula" subtitle="Cargando...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#27A9E1]"></div>
        </div>
      </MainLayout>
    );
  }

  if (!matricula) return null;

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'Activa': return <Badge type="success">Activa</Badge>;
      case 'Anulada': return <Badge type="danger">Anulada</Badge>;
      case 'Finalizada': return <Badge type="info">Finalizada</Badge>;
      case 'Pendiente': return <Badge type="warning">Pendiente</Badge>;
      default: return <Badge>{estado}</Badge>;
    }
  };

  const getPensionBadge = (estado) => {
    switch (estado) {
      case 'Pagado': return <Badge type="success">Pagado</Badge>;
      case 'Pendiente': return <Badge type="warning">Pendiente</Badge>;
      case 'Vencido': return <Badge type="danger">Vencido</Badge>;
      case 'Parcial': return <Badge type="info">Parcial</Badge>;
      default: return <Badge>{estado}</Badge>;
    }
  };

  return (
    <MainLayout title={`Matrícula ${matricula.codigo_matricula}`} subtitle="Matrículas / Detalle">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <button 
          onClick={() => navigate('/matriculas')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FiArrowLeft /> Volver a lista
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" icon={FiPrinter}>Imprimir Comprobante</Button>
          {matricula.estado === 'Activa' && (
            <Button variant="primary" onClick={() => navigate(`/matriculas/${id}/editar`)}>
              Editar Matrícula
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Info principal */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          <Card title="Información del Estudiante" icon={FiUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Estudiante</span>
                <span className="block text-gray-800 font-medium">{matricula.estudiante_nombres} {matricula.estudiante_apellidos}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Cédula</span>
                <span className="block text-gray-800">{matricula.estudiante_cedula}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Código Estudiante</span>
                <span className="block text-gray-800">{matricula.codigo_estudiante}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Estado Estudiante</span>
                <span className="block mt-1">{getEstadoBadge(matricula.estudiante_estado)}</span>
              </div>
            </div>
            
            {matricula.rep_nombres && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Representante Legal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase">Nombre</span>
                    <span className="block text-gray-800">{matricula.rep_nombres} {matricula.rep_apellidos}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase">Teléfono</span>
                    <span className="block text-gray-800">{matricula.rep_telefono || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card title="Plan de Pensiones Generado" icon={FiDollarSign}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-gray-500 font-semibold">Mes</th>
                    <th className="py-2 text-gray-500 font-semibold">Vencimiento</th>
                    <th className="py-2 text-gray-500 font-semibold text-right">Valor</th>
                    <th className="py-2 text-gray-500 font-semibold text-right">Pagado</th>
                    <th className="py-2 text-gray-500 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pensiones.map(p => (
                    <tr key={p.id_pension} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-800">{p.mes} {p.anio}</td>
                      <td className="py-3 text-gray-600">{new Date(p.fecha_vencimiento).toLocaleDateString('es-EC')}</td>
                      <td className="py-3 text-right font-medium text-gray-900">${Number(p.valor).toFixed(2)}</td>
                      <td className="py-3 text-right text-gray-600">${Number(p.valor_pagado).toFixed(2)}</td>
                      <td className="py-3 text-center">{getPensionBadge(p.estado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-4 text-sm bg-gray-50 p-4 rounded-lg">
              <div className="text-right">
                <span className="block text-gray-500 font-semibold">Total Pensión Anual</span>
                <span className="block text-lg font-bold text-gray-800">
                  ${pensiones.reduce((acc, curr) => acc + Number(curr.valor), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

        </div>

        {/* Columna Derecha: Resumen Matrícula */}
        <div className="flex flex-col gap-6">
          
          <Card className="bg-gradient-to-br from-[#27A9E1] to-[#1E8BBF] text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="block text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Código de Matrícula</span>
                <h3 className="text-2xl font-bold">{matricula.codigo_matricula}</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <FiFileText size={24} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20">
              <span className="block text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Estado Actual</span>
              <div className="bg-white px-3 py-1 rounded-full text-sm font-bold text-[#1E8BBF] inline-block">
                {matricula.estado.toUpperCase()}
              </div>
            </div>
          </Card>

          <Card title="Datos Académicos" icon={FiCalendar}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Año Lectivo</span>
                <span className="font-semibold text-gray-800">{matricula.anio_lectivo}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Curso</span>
                <span className="font-semibold text-gray-800">{matricula.curso_nombre}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Nivel</span>
                <span className="font-semibold text-gray-800">{matricula.curso_nivel}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Paralelo</span>
                <span className="font-semibold text-gray-800 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {matricula.paralelo}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Jornada</span>
                <span className="font-semibold text-gray-800">{matricula.jornada}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Fecha Registro</span>
                <span className="font-medium text-gray-800">
                  {new Date(matricula.fecha_matricula).toLocaleDateString('es-EC')}
                </span>
              </div>
            </div>
          </Card>

          {matricula.observaciones && (
            <Card title="Observaciones">
              <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 p-3 rounded-lg italic">
                "{matricula.observaciones}"
              </p>
            </Card>
          )}

          {matricula.estado === 'Anulada' && matricula.motivo_anulacion && (
            <Card title="Información de Anulación" className="border-l-4 border-l-red-500">
              <p className="text-sm text-red-700 mb-2 font-medium">Motivo:</p>
              <p className="text-sm text-gray-700">{matricula.motivo_anulacion}</p>
              <p className="text-xs text-gray-500 mt-2">
                Fecha: {new Date(matricula.fecha_anulacion).toLocaleString('es-EC')}
              </p>
            </Card>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default DetalleMatricula;
