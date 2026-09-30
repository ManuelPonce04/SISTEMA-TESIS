import { useState, useCallback } from 'react';
import estudiantesService from '../services/estudiantesService';
import { Estudiante, HistorialEstudiante, StudentFiltersType } from '../types/estudiante';

export const useEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [historico, setHistorico] = useState<HistorialEstudiante[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchEstudiantes = useCallback(async (filters: Partial<StudentFiltersType> & { query?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        query: filters.query || '',
        estado: filters.estado || 'Todos',
        page: filters.page || 1,
        limit: filters.limit || 10,
        sortBy: filters.sortBy || 'Fecha',
        order: filters.order || 'DESC'
      };

      const res = await estudiantesService.getAll(params);
      if (res.success) {
        setEstudiantes(res.data);
        setTotalRecords(res.total || 0);
      }
    } catch (err: any) {
      console.error("Error cargando estudiantes:", err);
      setError(err.message || 'No se pudieron cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCursos = useCallback(async () => {
    try {
      const res = await estudiantesService.getCursos();
      if (res.success) {
        setCursos(res.data);
      }
    } catch (err: any) {
      console.error("Error cargando cursos:", err);
    }
  }, []);

  const fetchHistorico = useCallback(async () => {
    try {
      const res = await estudiantesService.getHistorico();
      if (res.success) {
        setHistorico(res.data);
      }
    } catch (err: any) {
      console.error("Error cargando estudiantes históricos:", err);
    }
  }, []);

  const createEstudiante = async (data: Omit<Estudiante, 'id_estudiante'>) => {
    setLoading(true);
    try {
      const res = await estudiantesService.create(data);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const updateEstudiante = async (id: number, data: Partial<Estudiante>) => {
    setLoading(true);
    try {
      const res = await estudiantesService.update(id, data);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const deleteEstudiante = async (id: number) => {
    setLoading(true);
    try {
      const res = await estudiantesService.delete(id);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return {
    estudiantes,
    historico,
    cursos,
    loading,
    totalRecords,
    error,
    fetchEstudiantes,
    fetchCursos,
    fetchHistorico,
    createEstudiante,
    updateEstudiante,
    deleteEstudiante
  };
};
export default useEstudiantes;
