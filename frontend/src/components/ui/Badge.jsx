import React from 'react';

const Badge = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-[#dcfce7] text-[#16a34a]', // Success
    red: 'bg-[#fee2e2] text-[#dc2626]', // Error
    yellow: 'bg-[#fef3c7] text-[#d97706]', // Warning
    orange: 'bg-orange-100 text-orange-700',
    celeste: 'bg-[#e0f7ff] text-[#00AEEF]', // Primary
  };

  const selectedVariant = variants[variant] || variants.gray;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedVariant} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
