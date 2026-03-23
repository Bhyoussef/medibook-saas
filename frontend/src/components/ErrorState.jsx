import React from 'react';

const ErrorState = ({ 
  title = 'Something went wrong', 
  description, 
  actionText = 'Try Again', 
  actionHandler,
  className = '',
  error = null 
}) => {
  const handleCopyError = () => {
    if (error) {
      navigator.clipboard.writeText(JSON.stringify(error, null, 2));
      alert('Error details copied to clipboard');
    }
  };

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {description || 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
        </p>
        
        <div className="flex gap-3 justify-center">
          {actionText && actionHandler && (
            <button
              onClick={actionHandler}
              className="btn-primary"
            >
              {actionText}
            </button>
          )}
          
          {error && (
            <button
              onClick={handleCopyError}
              className="btn-secondary"
              title="Copy error details"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Error
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
