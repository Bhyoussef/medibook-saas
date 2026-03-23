import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="container-wide">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="group flex items-center space-x-3 transition-all duration-200">
              <div className="relative">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">MediBook</span>
                <div className="text-xs text-gray-500">Healthcare Management</div>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all duration-200">
              Home
            </Link>
            <Link to="/doctors" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all duration-200">
              Doctors
            </Link>
            <Link to="/appointments" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all duration-200">
              Appointments
            </Link>
            
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 pl-4 border-l border-gray-200">
                  <NotificationPanel />
                  <div className="relative group">
                    <button className="flex items-center space-x-3 px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs font-semibold text-white">
                          {user?.firstName?.[0] || 'U'}
                        </span>
                      </div>
                      <span className="hidden md:block">{user?.firstName} {user?.lastName}</span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-2">
                      <div className="p-2">
                        <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                          Dashboard
                        </Link>
                        <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                          Profile
                        </Link>
                        <div className="border-t border-gray-100 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all duration-200">
                  Login
                </Link>
                <Link to="/login" className="btn-primary">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-3">
            {isAuthenticated && <NotificationPanel />}
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/80 backdrop-blur-xl">
            <div className="py-4 space-y-2">
              <Link to="/" className="block px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                Home
              </Link>
              <Link to="/doctors" className="block px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                Doctors
              </Link>
              <Link to="/appointments" className="block px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                Appointments
              </Link>
              
              {isAuthenticated && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center space-x-3 px-4 py-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {user?.firstName?.[0] || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-base font-medium text-gray-900">{user?.firstName} {user?.lastName}</div>
                        <div className="text-sm text-gray-500">{user?.email}</div>
                      </div>
                    </div>
                    <Link to="/dashboard" className="block px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                      Dashboard
                    </Link>
                    <Link to="/profile" className="block px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-base font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
              
              {!isAuthenticated && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                  <Link to="/login" className="block px-4 py-3 text-base font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-center">
                    Login
                  </Link>
                  <Link to="/login" className="block px-4 py-3 text-base font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors text-center">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
