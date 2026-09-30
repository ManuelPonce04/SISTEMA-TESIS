const PensionesVencer = ({ data = [] }) => {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3 className="table-title">⏰ Pensiones por Vencer</h3>
        <span className="table-badge alerta">{data.length} próximas</span>
      </div>
      <div className="table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Mes</th>
              <th>Vence</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={i} className="tr-alerta">
                <td className="td-estudiante">{p.estudiante}</td>
                <td>{p.mes}</td>
                <td><span className="badge-fecha naranja">{p.vence}</span></td>
                <td><span className="badge-valor naranja">${p.valor}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PensionesVencer;
