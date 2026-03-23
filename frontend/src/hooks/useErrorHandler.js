import { useState, useCallback } from 'react';

const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error, fallbackMessage = 'An error occurred') => {
    console.error('Error handled by useErrorHandler:', error);
    
    let errorMessage = fallbackMessage;
    
    if (error?.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error?.code === 'TIMEOUT_ERROR') {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error?.code === 'FORBIDDEN') {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (error?.code === 'NOT_FOUND') {
      errorMessage = 'The requested resource was not found.';
    } else if (error?.code === 'SERVER_ERROR') {
      errorMessage = 'Server error. Please try again later.';
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async (asyncFunction, options = {}) => {
    const { 
      loadingMessage = 'Loading...', 
      successMessage = null,
      onSuccess = null,
      onError = null 
    } = options;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      
      if (successMessage) {
        // You could integrate with a toast notification system here
        console.log('Success:', successMessage);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      handleError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
    setIsLoading
  };
};

export default useErrorHandler;
