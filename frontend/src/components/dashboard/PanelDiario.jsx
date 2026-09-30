import { FiCalendar, FiDollarSign, FiUserPlus, FiAlertCircle, FiUsers } from 'react-icons/fi';

const PanelDiario = ({ data = {} }) => {
  const items = [
    { icon: FiDollarSign,   label: 'Cobros realizados',    value: data.cobrosRealizados   || 0, color: '#10B981' },
    { icon: FiUserPlus,     label: 'Nuevos estudiantes',   value: data.nuevosEstudiantes  || 0, color: '#00AEEF' },
    { icon: FiAlertCircle,  label: 'Pensiones vencidas',   value: data.pensionesVencidas  || 0, color: '#EF4444' },
    { icon: FiUsers,        label: 'Usuarios conectados',  value: data.usuariosConectados || 0, color: '#8B5CF6' },
  ];

  return (
    <div className="panel-diario">
      {/* Fecha */}
      <div className="panel-fecha">
        <FiCalendar size={16} />
        <div>
          <div className="panel-fecha-label">Hoy</div>
          <div className="panel-fecha-valor">{data.fecha || '—'}</div>
        </div>
      </div>

      {/* Items del día */}
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="panel-item">
            <div className="panel-item-icon" style={{ color: item.color, background: `${item.color}15` }}>
              <Icon size={16} />
            </div>
            <div className="panel-item-info">
              <span className="panel-item-label">{item.label}</span>
              <span className="panel-item-value" style={{ color: item.color }}>{item.value}</span>
            </div>
          </div>
        );
      })}

      {/* Accesos rápidos */}
      <div className="panel-accesos">
        <div className="panel-accesos-title">Accesos Rápidos</div>
        {[
          { icon: '👨‍🎓', label: 'Nuevo Estudiante' },
          { icon: '💰',    label: 'Registrar Pago'   },
          { icon: '📄',    label: 'Generar Reporte'  },
          { icon: '📊',    label: 'Ver KPI'          },
        ].map((a, i) => (
          <button key={i} className="acceso-btn">
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PanelDiario;
