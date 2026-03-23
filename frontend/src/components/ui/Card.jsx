import React from 'react';

const Card = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
  ...props
}) => {
  const getVariantClasses = (variant) => {
    const variants = {
      default: 'bg-white border border-gray-200',
      elevated: 'bg-white border border-gray-100 shadow-xl',
      glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg',
      gradient: 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100',
      dark: 'bg-gray-800 border border-gray-700'
    };

    return variants[variant] || variants.default;
  };

  const getPaddingClasses = (padding) => {
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    };

    return paddings[padding] || paddings.md;
  };

  const baseClasses = `
    rounded-2xl transition-all duration-300
    ${getVariantClasses(variant)}
    ${getPaddingClasses(padding)}
    ${hover ? 'hover:shadow-2xl hover:-translate-y-1' : ''}
    ${clickable ? 'cursor-pointer hover:shadow-lg active:scale-95' : ''}
    ${className}
  `;

  return (
    <div
      className={baseClasses}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const CardBody = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
    {children}
  </div>
);

export { CardHeader, CardBody, CardFooter };
export default Card;
