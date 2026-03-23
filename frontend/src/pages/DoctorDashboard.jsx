import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { mockDoctors } from '../data/mockDoctors';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('appointments');
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    today: 0
  });

  // Mock doctor data - in real app, this would come from user context or API
  const [doctor] = useState(mockDoctors[0]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // In a real app, you'd use the actual doctor ID from auth context
      const doctorId = doctor.id; // Using mock doctor ID
      const response = await appointmentAPI.getDoctorAppointments(doctorId);
      setAppointments(response.data || []);
      calculateStats(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appointments) => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      today: appointments.filter(a => a.date === today).length
    };
    setStats(stats);
  };

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      await appointmentAPI.update(appointmentId, { status: 'confirmed' });
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt
        )
      );
      calculateStats(appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt
      ));
    } catch (error) {
      console.error('Error confirming appointment:', error);
      setError('Failed to confirm appointment');
    }
  };

  const handleRejectAppointment = async (appointmentId) => {
    try {
      await appointmentAPI.update(appointmentId, { status: 'cancelled' });
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
        )
      );
      calculateStats(appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      ));
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      setError('Failed to reject appointment');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'no-show': { color: 'bg-orange-100 text-orange-800', label: 'No Show' }
    };
    
    const config = statusConfig[status] || statusConfig.scheduled;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDateTime = (date, time) => {
    const dateObj = new Date(date + 'T' + time);
    return dateObj.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'all') return true;
    if (activeTab === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return apt.date === today;
    }
    return apt.status === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-white">
                  {doctor.firstName[0]}{doctor.lastName[0]}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h2>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'appointments' || activeTab === 'all' || activeTab === 'today' || activeTab === 'scheduled' || activeTab === 'completed' || activeTab === 'cancelled'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Appointments</span>
              </button>
              
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Stats */}
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Appointments</span>
                <span className="font-medium text-gray-900">{stats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Today</span>
                <span className="font-medium text-blue-600">{stats.today}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-orange-600">{stats.scheduled}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your appointments and patient schedule</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {activeTab === 'appointments' && (
              <>
                {/* Appointment Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All ({stats.total})
                    </button>
                    <button
                      onClick={() => setActiveTab('today')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'today'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Today ({stats.today})
                    </button>
                    <button
                      onClick={() => setActiveTab('scheduled')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'scheduled'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Scheduled ({stats.scheduled})
                    </button>
                    <button
                      onClick={() => setActiveTab('completed')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'completed'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Completed ({stats.completed})
                    </button>
                    <button
                      onClick={() => setActiveTab('cancelled')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'cancelled'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Cancelled ({stats.cancelled})
                    </button>
                  </div>
                </div>

                {/* Appointments Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reason
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAppointments.length > 0 ? (
                          filteredAppointments.map((appointment) => (
                            <tr key={appointment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {appointment.userFirstName} {appointment.userLastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {appointment.email || appointment.phone}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatDateTime(appointment.date, appointment.time)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(appointment.date).toLocaleDateString('en-US', { 
                                    weekday: 'long' 
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs truncate">
                                  {appointment.reason}
                                </div>
                                {appointment.notes && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    Notes: {appointment.notes}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(appointment.status)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  {appointment.status === 'scheduled' && (
                                    <>
                                      <button
                                        onClick={() => handleConfirmAppointment(appointment.id)}
                                        className="text-green-600 hover:text-green-900 font-medium"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => handleRejectAppointment(appointment.id)}
                                        className="text-red-600 hover:text-red-900 font-medium"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {appointment.status === 'confirmed' && (
                                    <button
                                      onClick={() => handleConfirmAppointment(appointment.id)}
                                      className="text-blue-600 hover:text-blue-900 font-medium"
                                    >
                                      Complete
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                                    className="text-gray-600 hover:text-gray-900 font-medium"
                                  >
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center">
                              <div className="text-gray-500">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p>No appointments found</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Personal Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> Dr. {doctor.firstName} {doctor.lastName}</p>
                      <p><span className="font-medium">Specialty:</span> {doctor.specialty}</p>
                      <p><span className="font-medium">Experience:</span> {doctor.experience}</p>
                      <p><span className="font-medium">Rating:</span> {doctor.rating.toFixed(1)} ⭐</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Email:</span> {doctor.email}</p>
                      <p><span className="font-medium">Phone:</span> {doctor.phone}</p>
                      <p><span className="font-medium">Consultation Fee:</span> ${doctor.consultationFee}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Bio</h3>
                  <p className="text-gray-600">{doctor.bio}</p>
                </div>
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Education</h3>
                  <p className="text-gray-600">{doctor.education}</p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Availability Status</h3>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doctor.available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doctor.available ? 'Available' : 'Unavailable'}
                      </span>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Update Status
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Consultation Fee</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">${doctor.consultationFee}</span>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Update Fee
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Notification Preferences</h3>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-600">Email notifications for new appointments</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-600">SMS reminders for appointments</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
