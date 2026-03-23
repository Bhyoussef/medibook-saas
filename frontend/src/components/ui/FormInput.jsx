import React, { forwardRef } from 'react';

const FormInput = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  icon,
  iconPosition = 'left',
  ...props
}, ref) => {
  const inputClasses = `
    w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${icon && iconPosition === 'left' ? 'pl-12' : ''}
    ${icon && iconPosition === 'right' ? 'pr-12' : ''}
    ${error 
      ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 hover:border-gray-400'
    }
    ${className}
  `;

  const labelClasses = `
    block text-sm font-semibold text-gray-700 mb-2
    ${required ? 'after:content-["*"] after:ml-1 after:text-red-500' : ''}
  `;

  const iconClasses = `
    absolute top-1/2 transform -translate-y-1/2 text-gray-400
    ${iconPosition === 'left' ? 'left-4' : 'right-4'}
    ${error ? 'text-red-400' : ''}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={props.id} className={labelClasses}>
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={iconClasses}>
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
