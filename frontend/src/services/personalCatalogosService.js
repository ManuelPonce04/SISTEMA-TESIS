/**
 * personalCatalogosService.js
 * Alias for the catalog-specific methods in personalService.
 * Some pages import this separately; it re-exports from personalService for compatibility.
 */
import personalService from './personalService';

const personalCatalogosService = {
  getTiposContrato: personalService.getTiposContrato,
  getFunciones: personalService.getFunciones,
  getCargos: personalService.getCargos
};

export default personalCatalogosService;
