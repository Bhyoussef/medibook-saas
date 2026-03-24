import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Doctors from './pages/Doctors'
import Profile from './pages/Profile'
import Booking from './pages/Booking'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/doctors" element={<Doctors />} />
                <Route path="/booking/:doctorId" element={<Booking />} />
                
                {/* Protected routes - require authentication */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/appointments" 
                  element={
                    <ProtectedRoute>
                      <Appointments />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Doctor-only routes */}
                <Route 
                  path="/doctor-dashboard" 
                  element={
                    <ProtectedRoute requiredRole="doctor">
                      <DoctorDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin routes - temporary access for setup */}
                <Route path="/admin" element={<AdminPanel />} />
                <Route 
                  path="/admin-protected" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminPanel />
                    </ProtectedRoute>
                  } 
                />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
