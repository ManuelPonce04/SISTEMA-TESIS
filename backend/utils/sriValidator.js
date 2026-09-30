/**
 * Utilidades de validación para Cédula y RUC de Ecuador (SRI)
 */

/**
 * Valida una cédula ecuatoriana usando algoritmo Módulo 10.
 * @param {string} cedula - Cadena de 10 dígitos.
 * @returns {boolean}
 */
function validarCedula(cedula) {
  if (!cedula || typeof cedula !== 'string') return false;
  const clean = cedula.trim();
  if (!/^\d{10}$/.test(clean)) return false;

  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  const tercerDigito = parseInt(clean[2], 10);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(clean[i], 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(clean[9], 10);
}

/**
 * Valida un RUC ecuatoriano de 13 dígitos.
 * Soporta:
 * - Personas naturales (10 dígitos de cédula válida + '001'...)
 * - Sociedades privadas o extranjeros (tercer dígito = 9, módulo 11)
 * - Entidades públicas (tercer dígito = 6, módulo 11)
 * @param {string} ruc - Cadena de 13 dígitos.
 * @returns {boolean}
 */
function validarRuc(ruc) {
  if (!ruc || typeof ruc !== 'string') return false;
  const clean = ruc.trim();
  if (!/^\d{13}$/.test(clean)) return false;

  // Consumidor final
  if (clean === '9999999999999') return true;

  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  const tercerDigito = parseInt(clean[2], 10);

  // 1. Personas naturales: Tercer dígito < 6 (cédula + sucursal '001')
  if (tercerDigito < 6) {
    const cedula = clean.substring(0, 10);
    const sucursal = clean.substring(10, 13);
    if (!validarCedula(cedula)) return false;
    return parseInt(sucursal, 10) >= 1;
  }

  // 2. Sociedades privadas / extranjeros: Tercer dígito = 9
  if (tercerDigito === 9) {
    const sucursal = clean.substring(10, 13);
    if (parseInt(sucursal, 10) < 1) return false;

    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      suma += parseInt(clean[i], 10) * coeficientes[i];
    }
    const residuo = suma % 11;
    const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
    return digitoVerificador === parseInt(clean[9], 10);
  }

  // 3. Entidades públicas: Tercer dígito = 6
  if (tercerDigito === 6) {
    const sucursal = clean.substring(9, 13);
    if (parseInt(sucursal, 10) < 1) return false;

    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += parseInt(clean[i], 10) * coeficientes[i];
    }
    const residuo = suma % 11;
    const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
    return digitoVerificador === parseInt(clean[8], 10);
  }

  return false;
}

/**
 * Validador genérico por tipo de identificación.
 * @param {string} tipo - 'CEDULA', 'RUC', 'PASAPORTE', 'CONSUMIDOR_FINAL'
 * @param {string} identificacion - Número de documento
 * @returns {{ valido: boolean, mensaje?: string }}
 */
function validarIdentificacion(tipo, identificacion) {
  if (!identificacion) {
    return { valido: false, mensaje: 'La identificación es obligatoria.' };
  }

  const id = identificacion.trim();

  switch (tipo) {
    case 'CONSUMIDOR_FINAL':
      return { valido: id === '9999999999999', mensaje: id !== '9999999999999' ? 'Consumidor final debe ser 9999999999999' : undefined };

    case 'CEDULA':
      if (!validarCedula(id)) {
        return { valido: false, mensaje: 'La cédula ingresada no es válida según el algoritmo de verificación ecuatoriano.' };
      }
      return { valido: true };

    case 'RUC':
      if (!validarRuc(id)) {
        return { valido: false, mensaje: 'El RUC ingresado no es válido (debe tener 13 dígitos y cumplir el módulo de verificación del SRI).' };
      }
      return { valido: true };

    case 'PASAPORTE':
      if (id.length < 3 || id.length > 20) {
        return { valido: false, mensaje: 'El pasaporte debe tener entre 3 y 20 caracteres.' };
      }
      return { valido: true };

    default:
      return { valido: false, mensaje: 'Tipo de identificación no reconocido.' };
  }
}

module.exports = {
  validarCedula,
  validarRuc,
  validarIdentificacion
};
