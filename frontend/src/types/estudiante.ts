export interface Representante {
  id_representante?: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  parentesco?: string;
  es_principal?: boolean;
  es_responsable_economico?: boolean;
  recibe_notificaciones?: boolean;
  autorizado_retiro?: boolean;
  vive_con_estudiante?: boolean;
}

export interface Estudiante {
  id_estudiante?: number;
  codigo?: string;
  cedula?: string;
  tipo_identificacion?: string;
  nombres: string;
  apellidos: string;
  apellidos_nombres?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  nacionalidad?: string;
  pais_nacimiento?: string;
  provincia_nacimiento?: string;
  canton_nacimiento?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  estado?: 'ACTIVO' | 'INACTIVO' | 'RETIRADO';
  es_nuevo?: boolean;
  observaciones?: string;
  created_at?: string;

  // En la vista de lista:
  representante_nombre?: string;
  representante_telefono?: string;

  // En la vista de detalle:
  representantes?: Representante[];
  matricula_activa?: any;
}

export interface HistorialEstudiante {
  id_estudiante: number;
  apellidos_nombres: string;
  curso_anterior?: string;
}

export interface StudentFiltersType {
  estado: string;
  page: number;
  limit: number;
  sortBy: string;
  order: 'ASC' | 'DESC';
}
