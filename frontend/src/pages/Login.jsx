import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Alert from '../components/ui/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

console.log('🔍 Login.jsx imports loaded successfully');

const Login = () => {
  console.log('🔍 Login component mounting...');
  
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
  });
  
  const { loginWithOTP, completeProfile } = useAuth();
  const navigate = useNavigate();
  
  console.log('✅ Auth context and navigate loaded successfully');

  const handlePhoneSubmit = async (e) => {
    console.log('🔍 handlePhoneSubmit called with phone:', formData.phone);
    e.preventDefault();
    setLoading(true);
    
    if (!formData.phone) {
      console.error('❌ Phone number is required');
      setError('Phone number is required');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Sending OTP request...');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://medibook-saas.onrender.com/api';
      console.log('🔍 API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone }),
      });

      console.log('🔍 Response status:', response.status);
      const result = await response.json();
      console.log('🔍 Response result:', result);
      
      if (response.ok) {
        console.log('✅ OTP sent successfully');
        setError('');
        setMessage('OTP sent successfully! Check console for OTP.');
        setShowOTP(true);
      } else {
        console.error('❌ OTP send failed:', result);
        setMessage('');
        setError(result.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('❌ Network error in OTP send:', err);
      setMessage('');
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!formData.otp) {
      setError('OTP is required');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://medibook-saas.onrender.com/api'}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, code: formData.otp }),
      });

      const result = await response.json();
      
      if (response.ok) {
        if (result.isNewUser) {
          setShowProfileForm(true);
          setMessage('OTP verified! Please complete your profile.');
        } else {
          localStorage.setItem('token', result.token);
          navigate('/dashboard');
        }
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const { firstName, lastName, email, dateOfBirth } = profileData;
    
    if (!firstName || !lastName || !email || !dateOfBirth) {
      setError('All fields are required');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://medibook-saas.onrender.com/api'}/auth/complete-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          firstName,
          lastName,
          email,
          dateOfBirth,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', result.token);
        navigate('/dashboard');
      } else {
        setError(result.message || 'Failed to complete profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    const { login } = useAuth();
    const result = await login({
      email: formData.email,
      password: formData.password,
    });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const resetForm = () => {
    setFormData({ phone: '', otp: '', email: '', password: '' });
    setError('');
    setMessage('');
    setShowOTP(false);
    setShowProfileForm(false);
    setProfileData({ firstName: '', lastName: '', email: '', dateOfBirth: '' });
  };

  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Welcome to MediBook</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in to manage your healthcare</p>
          </div>

          {/* Main Card */}
          <Card variant="elevated" className="p-8">
            {/* Alerts */}
            {error && (
              <Alert type="error" dismissible onDismiss={() => setError('')} className="mb-6">
                {error}
              </Alert>
            )}
            
            {message && (
              <Alert type="success" dismissible onDismiss={() => setMessage('')} className="mb-6">
                {message}
              </Alert>
            )}

            {/* Phone/OTP Form */}
            {!showOTP && !showProfileForm && (
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Login with Phone</h3>
                  <FormInput
                    id="phone"
                    label="Phone Number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    helperText="We'll send you a verification code"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Send OTP
                </Button>
              </form>
            )}

            {/* OTP Verification Form */}
            {showOTP && !showProfileForm && (
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify OTP</h3>
                  <FormInput
                    id="otp"
                    label="Verification Code"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                    helperText="Enter the 6-digit code sent to your phone"
                    maxLength={6}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    }
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    loading={loading}
                    variant="primary"
                    size="lg"
                    className="flex-1"
                  >
                    Verify OTP
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => setShowOTP(false)}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </form>
            )}

            {/* Profile Completion Form */}
            {showProfileForm && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Your Profile</h3>
                  <div className="space-y-4">
                    <FormInput
                      id="firstName"
                      label="First Name"
                      type="text"
                      placeholder="John"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      required
                    />
                    
                    <FormInput
                      id="lastName"
                      label="Last Name"
                      type="text"
                      placeholder="Doe"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      required
                    />
                    
                    <FormInput
                      id="email"
                      label="Email Address"
                      type="email"
                      placeholder="john.doe@example.com"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      helperText="We'll use this to send appointment reminders"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      }
                      required
                    />
                    
                    <FormInput
                      id="dateOfBirth"
                      label="Date of Birth"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                      helperText="You must be at least 18 years old"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    loading={loading}
                    variant="primary"
                    size="lg"
                    className="flex-1"
                  >
                    Complete Profile
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => setShowProfileForm(false)}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or</span>
              </div>
            </div>

            {/* Traditional Login */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Login with Email</h3>
              </div>
              
              <form onSubmit={handleTraditionalLogin} className="space-y-4">
                <FormInput
                  id="email"
                  label="Email Address"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                  required
                />
                
                <FormInput
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  required
                />

                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Sign In
                </Button>
              </form>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Welcome to MediBook</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your healthcare</p>
        </div>

        {/* Main Card */}
        <Card variant="elevated" className="p-8">
          {/* Alerts */}
          {error && (
            <Alert type="error" dismissible onDismiss={() => setError('')} className="mb-6">
              {error}
            </Alert>
          )}
          
          {message && (
            <Alert type="success" dismissible onDismiss={() => setMessage('')} className="mb-6">
              {message}
            </Alert>
          )}

          {/* Phone/OTP Form */}
          {!showOTP && !showProfileForm && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Login with Phone</h3>
                <FormInput
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  helperText="We'll send you a verification code"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                loading={loading}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Send OTP
              </Button>
            </form>
          )}

          {/* OTP Verification Form */}
          {showOTP && !showProfileForm && (
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify OTP</h3>
                <FormInput
                  id="otp"
                  label="Verification Code"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  helperText="Enter the 6-digit code sent to your phone"
                  maxLength={6}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  required
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="flex-1"
                >
                  Verify OTP
                </Button>
                
                <Button
                  type="button"
                  onClick={() => setShowOTP(false)}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {/* Profile Completion Form */}
          {showProfileForm && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Your Profile</h3>
                <div className="space-y-4">
                  <FormInput
                    id="firstName"
                    label="First Name"
                    type="text"
                    placeholder="John"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    required
                  />
                  
                  <FormInput
                    id="lastName"
                    label="Last Name"
                    type="text"
                    placeholder="Doe"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    required
                  />
                  
                  <FormInput
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    helperText="We'll use this to send appointment reminders"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    }
                    required
                  />
                  
                  <FormInput
                    id="dateOfBirth"
                    label="Date of Birth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    helperText="You must be at least 18 years old"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="flex-1"
                >
                  Complete Profile
                </Button>
                
                <Button
                  type="button"
                  onClick={() => setShowProfileForm(false)}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or</span>
            </div>
          </div>

          {/* Traditional Login */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Login with Email</h3>
            </div>
            
            <form onSubmit={handleTraditionalLogin} className="space-y-4">
              <FormInput
                id="email"
                label="Email Address"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
                required
              />
              
              <FormInput
                id="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                required
              />

              <Button
                type="submit"
                loading={loading}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Sign In
              </Button>
            </form>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
