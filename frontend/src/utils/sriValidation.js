/**
 * Validación de identificación ecuatoriana (Cédula y RUC)
 */

export function validarCedula(cedula) {
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

export function validarRuc(ruc) {
  if (!ruc || typeof ruc !== 'string') return false;
  const clean = ruc.trim();
  if (!/^\d{13}$/.test(clean)) return false;

  // Consumidor final
  if (clean === '9999999999999') return true;

  const prov = parseInt(clean.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  const tercerDigito = parseInt(clean[2], 10);

  // Persona natural
  if (tercerDigito < 6) {
    const cedula = clean.substring(0, 10);
    const sucursal = clean.substring(10, 13);
    if (!validarCedula(cedula)) return false;
    return parseInt(sucursal, 10) >= 1;
  }

  // Sociedades privadas / extranjeros
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

  // Entidades públicas
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

export function validarIdentificacion(tipo, identificacion) {
  if (!identificacion?.trim()) {
    return { valido: false, mensaje: 'La identificación es obligatoria.' };
  }
  const clean = identificacion.trim();

  if (tipo === 'CONSUMIDOR_FINAL') {
    return { valido: clean === '9999999999999', mensaje: clean !== '9999999999999' ? 'Consumidor final debe ser 9999999999999' : '' };
  }
  if (tipo === 'CEDULA') {
    return { valido: validarCedula(clean), mensaje: !validarCedula(clean) ? 'Cédula no válida (10 dígitos y algoritmo mod 10).' : '' };
  }
  if (tipo === 'RUC') {
    return { valido: validarRuc(clean), mensaje: !validarRuc(clean) ? 'RUC no válido (13 dígitos y algoritmo SRI).' : '' };
  }
  if (tipo === 'PASAPORTE') {
    return { valido: clean.length >= 3 && clean.length <= 20, mensaje: clean.length < 3 ? 'Pasaporte inválido.' : '' };
  }
  return { valido: false, mensaje: 'Tipo de documento no válido.' };
}
