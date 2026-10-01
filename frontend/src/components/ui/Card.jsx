import React from 'react';

const Card = ({ children, className = '', noPadding = false, ...props }) => {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-full min-w-0 ${noPadding ? '' : 'p-4 sm:p-6'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
