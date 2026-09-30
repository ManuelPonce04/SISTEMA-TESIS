const RankingDeudores = ({ data = [] }) => {
  const maxDeuda = data[0]?.deuda || 1;

  return (
    <div className="table-card full-width">
      <div className="table-card-header">
        <h3 className="table-title">🏆 Ranking de Estudiantes con Mayor Deuda</h3>
        <span className="table-badge alerta">{data.length} deudores</span>
      </div>
      <div className="table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Curso</th>
              <th>Deuda</th>
              <th style={{ minWidth: '160px' }}>Progreso</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>
                  <span className={`rank-badge rank-${i < 3 ? i + 1 : 'n'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="td-estudiante">{d.estudiante}</td>
                <td>{d.curso}</td>
                <td><span className="badge-valor rojo">${d.deuda}</span></td>
                <td>
                  <div className="deuda-bar-wrap">
                    <div
                      className="deuda-bar"
                      style={{ width: `${(d.deuda / maxDeuda) * 100}%` }}
                    />
                    <span className="deuda-bar-pct">
                      {Math.round((d.deuda / maxDeuda) * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankingDeudores;
