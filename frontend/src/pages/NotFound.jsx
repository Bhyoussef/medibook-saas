import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl font-bold text-primary-600 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. The page might have been removed, renamed, or is temporarily unavailable.
        </p>
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Go back home
          </Link>
          <div>
            <Link
              to="/dashboard"
              className="text-primary-600 hover:text-primary-500"
            >
              Or go to your dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
