import React from 'react';

const Button = ({ children, variant = 'primary', className = '', icon: Icon, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-[#27A9E1] text-white hover:bg-[#1E8BBF] hover:shadow-[0_4px_12px_rgba(39,169,225,0.3)] focus:ring-[#27A9E1]",
    secondary: "bg-[#F4C542] text-gray-900 hover:bg-[#E3B431] hover:shadow-[0_4px_12px_rgba(244,197,66,0.3)] focus:ring-[#F4C542]",
    outline: "border-2 border-gray-200 text-gray-700 hover:border-[#27A9E1] hover:text-[#27A9E1] bg-white focus:ring-gray-200",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-200",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626] hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)] focus:ring-[#EF4444]"
  };

  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button className={`${baseStyle} ${selectedVariant} ${className}`} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export default Button;
