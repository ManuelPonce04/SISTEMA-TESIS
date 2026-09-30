const CURSOS = ['Todos', 'Inicial', 'EGB', 'Bachillerato'];
const MESES  = ['Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ANIOS  = ['2026', '2025', '2024'];

const PeriodoSelector = ({ periodo, onChange }) => {
  return (
    <div className="periodo-selector">
      <div className="periodo-group">
        <label className="periodo-label">Año lectivo</label>
        <select
          className="periodo-select"
          value={periodo.anio}
          onChange={e => onChange({ ...periodo, anio: e.target.value })}
        >
          {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="periodo-group">
        <label className="periodo-label">Mes</label>
        <select
          className="periodo-select"
          value={periodo.mes}
          onChange={e => onChange({ ...periodo, mes: e.target.value })}
        >
          {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>
      <div className="periodo-group">
        <label className="periodo-label">Nivel / Curso</label>
        <select
          className="periodo-select"
          value={periodo.curso}
          onChange={e => onChange({ ...periodo, curso: e.target.value })}
        >
          {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
};

export default PeriodoSelector;
