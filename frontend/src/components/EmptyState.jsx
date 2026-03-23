import React from 'react';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  actionText, 
  actionHandler,
  className = '' 
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="max-w-md mx-auto">
        {icon && (
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
        )}
        
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h3>
        )}
        
        {description && (
          <p className="text-gray-600 mb-6">
            {description}
          </p>
        )}
        
        {actionText && actionHandler && (
          <button
            onClick={actionHandler}
            className="btn-primary"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
