import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props
}) => {
  const getVariantClasses = (variant) => {
    const variants = {
      primary: `
        bg-gradient-to-r from-blue-600 to-blue-700 text-white
        border border-blue-600 hover:from-blue-700 hover:to-blue-800
        shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `,
      secondary: `
        bg-white text-gray-700 border-2 border-gray-300
        hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900
        shadow-md hover:shadow-lg
        focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
      `,
      outline: `
        bg-transparent text-blue-600 border-2 border-blue-600
        hover:bg-blue-50 hover:text-blue-700
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `,
      ghost: `
        bg-transparent text-gray-700 border-2 border-transparent
        hover:bg-gray-100 hover:text-gray-900
        focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-red-700 text-white
        border border-red-600 hover:from-red-700 hover:to-red-800
        shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30
        focus:ring-2 focus:ring-red-500 focus:ring-offset-2
      `,
      success: `
        bg-gradient-to-r from-green-600 to-green-700 text-white
        border border-green-600 hover:from-green-700 hover:to-green-800
        shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30
        focus:ring-2 focus:ring-green-500 focus:ring-offset-2
      `
    };

    return variants[variant] || variants.primary;
  };

  const getSizeClasses = (size) => {
    const sizes = {
      sm: 'px-3 py-2 text-sm font-medium rounded-lg',
      md: 'px-4 py-3 text-sm font-semibold rounded-xl',
      lg: 'px-6 py-4 text-base font-semibold rounded-2xl',
      xl: 'px-8 py-5 text-lg font-semibold rounded-2xl'
    };

    return sizes[size] || sizes.md;
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    transition-all duration-200 transform hover:-translate-y-0.5
    focus:outline-none disabled:transform-none disabled:cursor-not-allowed
    disabled:opacity-50 disabled:hover:transform-none
    ${getVariantClasses(variant)}
    ${getSizeClasses(size)}
    ${className}
  `;

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </>
      );
    }

    if (icon && iconPosition === 'left') {
      return (
        <>
          {icon}
          <span>{children}</span>
        </>
      );
    }

    if (icon && iconPosition === 'right') {
      return (
        <>
          <span>{children}</span>
          {icon}
        </>
      );
    }

    return <span>{children}</span>;
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={baseClasses}
      onClick={onClick}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
