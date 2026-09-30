import { FiUserPlus, FiDollarSign, FiFileText, FiPieChart, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const QuickActions = () => {
  return (
    <div className="quick-actions-wrap">
      <h3 className="quick-actions-title">Accesos Rápidos</h3>
      <div className="quick-actions-grid">
        <Link to="/estudiantes/nuevo" className="action-btn">
          <div className="action-icon action-blue"><FiUserPlus size={20} /></div>
          <span>Nuevo estudiante</span>
        </Link>
        <Link to="/cobranzas/nuevo" className="action-btn">
          <div className="action-icon action-green"><FiDollarSign size={20} /></div>
          <span>Registrar pago</span>
        </Link>
        <Link to="/reportes/nuevo" className="action-btn">
          <div className="action-icon action-purple"><FiFileText size={20} /></div>
          <span>Nuevo reporte</span>
        </Link>
        <Link to="/kpi" className="action-btn">
          <div className="action-icon action-orange"><FiPieChart size={20} /></div>
          <span>Ver KPI</span>
        </Link>
        <Link to="/usuarios/nuevo" className="action-btn">
          <div className="action-icon action-gray"><FiUsers size={20} /></div>
          <span>Nuevo usuario</span>
        </Link>
      </div>
    </div>
  );
};

export default QuickActions;
