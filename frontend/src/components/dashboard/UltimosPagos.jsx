const UltimosPagos = ({ data = [] }) => {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3 className="table-title">💳 Últimos Pagos</h3>
        <span className="table-badge">{data.length} registros</span>
      </div>
      <div className="table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estudiante</th>
              <th>Mes</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={i}>
                <td><span className="badge-fecha">{p.fecha}</span></td>
                <td className="td-estudiante">{p.estudiante}</td>
                <td>{p.mes}</td>
                <td><span className="badge-valor verde">${p.valor}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UltimosPagos;
