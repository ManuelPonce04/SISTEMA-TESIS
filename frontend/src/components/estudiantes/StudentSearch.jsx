import React from 'react';
import { FiSearch } from 'react-icons/fi';

const StudentSearch = ({ value, onChange }) => {
  return (
    <div className="search-wrapper relative">
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Buscar por código, cédula, nombre o representante..."
        className="form-input pl-10 w-full md:w-96"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default StudentSearch;
