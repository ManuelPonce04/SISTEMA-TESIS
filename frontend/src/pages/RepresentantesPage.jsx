import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/layout/MainLayout';
import representantesService from '../services/representantesService';
import { FiSearch, FiPlus, FiEdit2, FiPhone, FiMail, FiUser, FiX, FiSave, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';

const emptyForm = { cedula: '', nombres: '', apellidos: '', telefono: '', correo: '', direccion: '' };

const RepresentantesPage = () => {
  const [representantes, setRepresentantes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const searchTimeout = useRef(null);

  useEffect(() => {
    loadData();
  }, [page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await representantesService.getRepresentantes({ search, page, limit: 20 });
      if (res.success) {
        setRepresentantes(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    clearTimeout(searchTimeout.current);
    const v = e.target.value;
    searchTimeout.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (rep) => {
    setEditingId(rep.id_representante);
    setForm({
      cedula: rep.cedula || '',
      nombres: rep.nombres || '',
      apellidos: rep.apellidos || '',
      telefono: rep.telefono || '',
      correo: rep.correo || '',
      direccion: rep.direccion || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      return setFormError('Nombres y apellidos son obligatorios.');
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await representantesService.updateRepresentante(editingId, form);
      } else {
        await representantesService.createRepresentante(form);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const initials = (r) =>
    `${(r.nombres || '').charAt(0)}${(r.apellidos || '').charAt(0)}`.toUpperCase();

  const colorFor = (id) => {
    const colors = ['bg-[#27A9E1]', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
    return colors[id % colors.length];
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Representantes</h1>
            <p className="text-sm text-slate-500">Padres y tutores registrados en el sistema — <span className="font-medium text-[#27A9E1]">{total} en total</span></p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1f8ec0] transition-colors shadow-md shadow-[#27A9E1]/20 text-sm font-semibold"
          >
            <FiPlus /> Nuevo Representante
          </button>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cédula, nombres o apellidos..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1] text-sm"
              onChange={handleSearch}
            />
          </div>
        </div>

        {/* Listado */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  <th className="p-4">Representante</th>
                  <th className="p-4">Cédula</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Dirección</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      <div className="w-8 h-8 border-4 border-[#27A9E1]/30 border-t-[#27A9E1] rounded-full animate-spin mx-auto mb-2"></div>
                      Cargando representantes...
                    </td>
                  </tr>
                ) : representantes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      <FiUser size={32} className="mx-auto mb-2 opacity-30" />
                      No se encontraron representantes.
                    </td>
                  </tr>
                ) : (
                  representantes.map((rep) => (
                    <tr key={rep.id_representante} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${colorFor(rep.id_representante)} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                            {initials(rep)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{rep.apellidos} {rep.nombres}</div>
                            <div className="text-xs text-slate-400">ID #{rep.id_representante}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">{rep.cedula || <span className="text-slate-300 italic">Sin cédula</span>}</td>
                      <td className="p-4">
                        {rep.telefono && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-1">
                            <FiPhone size={12} className="text-slate-400" /> {rep.telefono}
                          </div>
                        )}
                        {rep.correo && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                            <FiMail size={12} className="text-slate-400" /> {rep.correo}
                          </div>
                        )}
                        {!rep.telefono && !rep.correo && <span className="text-slate-300 italic text-xs">Sin datos</span>}
                      </td>
                      <td className="p-4 text-slate-600 text-xs max-w-[180px] truncate">{rep.direccion || <span className="text-slate-300 italic">—</span>}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openEdit(rep)}
                          className="p-1.5 text-slate-400 hover:text-[#27A9E1] hover:bg-[#27A9E1]/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm">
              <span className="text-slate-500">Página {page} de {totalPages} — {total} registros</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 text-slate-600">
                  Anterior
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 text-slate-600">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h2 className="font-bold text-slate-800 text-lg">{editingId ? 'Editar Representante' : 'Nuevo Representante'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><FiX size={22} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <FiAlertCircle size={16} className="mt-0.5 shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={form.nombres}
                    onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={form.apellidos}
                    onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Cédula</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1] text-sm font-mono"
                  placeholder="0000000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
                    placeholder="0999..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Correo</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Dirección</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
                  placeholder="Barrio, calle, referencia..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1f8ec0] transition-colors font-semibold shadow-md shadow-[#27A9E1]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : <><FiSave /> {editingId ? 'Actualizar' : 'Guardar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default RepresentantesPage;
