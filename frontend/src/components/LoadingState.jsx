import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingState = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '',
  fullScreen = false 
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <LoadingSpinner size={size} text={text} />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingState;
