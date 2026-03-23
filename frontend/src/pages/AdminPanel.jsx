import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorsAPI, appointmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    availableDoctors: 0
  });

  // Doctor form state
  const [doctorForm, setDoctorForm] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    experience: '',
    rating: 0,
    available: true,
    bio: '',
    education: '',
    phone: '',
    email: '',
    consultationFee: 0
  });
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [showDoctorForm, setShowDoctorForm] = useState(false);

  useEffect(() => {
    // Check if user is admin (in real app, check role)
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (activeTab === 'doctors') {
        const response = await doctorsAPI.getAll();
        setDoctors(response.data || []);
        calculateStats(response.data || [], appointments);
      } else if (activeTab === 'appointments') {
        const response = await appointmentAPI.getAllAdmin();
        setAppointments(response.data || []);
        calculateStats(doctors, response.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (doctorsData, appointmentsData) => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      totalDoctors: doctorsData.length,
      totalAppointments: appointmentsData.length,
      todayAppointments: appointmentsData.filter(a => a.date === today).length,
      availableDoctors: doctorsData.filter(d => d.available).length
    };
    setStats(stats);
  };

  // Doctor CRUD operations
  const handleCreateDoctor = async () => {
    try {
      await doctorsAPI.create(doctorForm);
      setShowDoctorForm(false);
      setDoctorForm({
        firstName: '',
        lastName: '',
        specialty: '',
        experience: '',
        rating: 0,
        available: true,
        bio: '',
        education: '',
        phone: '',
        email: '',
        consultationFee: 0
      });
      fetchData();
    } catch (error) {
      console.error('Error creating doctor:', error);
      setError('Failed to create doctor');
    }
  };

  const handleUpdateDoctor = async () => {
    try {
      await doctorsAPI.update(editingDoctor.id, doctorForm);
      setShowDoctorForm(false);
      setEditingDoctor(null);
      setDoctorForm({
        firstName: '',
        lastName: '',
        specialty: '',
        experience: '',
        rating: 0,
        available: true,
        bio: '',
        education: '',
        phone: '',
        email: '',
        consultationFee: 0
      });
      fetchData();
    } catch (error) {
      console.error('Error updating doctor:', error);
      setError('Failed to update doctor');
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await doctorsAPI.delete(doctorId);
        fetchData();
      } catch (error) {
        console.error('Error deleting doctor:', error);
        setError('Failed to delete doctor');
      }
    }
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorForm(doctor);
    setShowDoctorForm(true);
  };

  const handleDoctorFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDoctorForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  if (loading && doctors.length === 0 && appointments.length === 0) {
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
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-white">A</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-sm text-gray-600">Management Console</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('doctors')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'doctors'
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Manage Doctors</span>
              </button>
              
              <button
                onClick={() => setActiveTab('appointments')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'appointments'
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Manage Appointments</span>
              </button>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Analytics</span>
              </button>
            </nav>
          </div>

          {/* Stats */}
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Doctors</span>
                <span className="font-medium text-gray-900">{stats.totalDoctors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Available</span>
                <span className="font-medium text-green-600">{stats.availableDoctors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Appointments</span>
                <span className="font-medium text-gray-900">{stats.totalAppointments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Today</span>
                <span className="font-medium text-purple-600">{stats.todayAppointments}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600 mt-2">Manage doctors and appointments</p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300"
              >
                Back to Dashboard
              </button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {activeTab === 'doctors' && (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Manage Doctors</h2>
                    <button
                      onClick={() => {
                        setShowDoctorForm(true);
                        setEditingDoctor(null);
                        setDoctorForm({
                          firstName: '',
                          lastName: '',
                          specialty: '',
                          experience: '',
                          rating: 0,
                          available: true,
                          bio: '',
                          education: '',
                          phone: '',
                          email: '',
                          consultationFee: 0
                        });
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add New Doctor
                    </button>
                  </div>

                  {/* Doctor Form Modal */}
                  {showDoctorForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                              type="text"
                              name="firstName"
                              value={doctorForm.firstName}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                              type="text"
                              name="lastName"
                              value={doctorForm.lastName}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                            <input
                              type="text"
                              name="specialty"
                              value={doctorForm.specialty}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                            <input
                              type="text"
                              name="experience"
                              value={doctorForm.experience}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                            <input
                              type="number"
                              name="rating"
                              value={doctorForm.rating}
                              onChange={handleDoctorFormChange}
                              min="0"
                              max="5"
                              step="0.1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                            <input
                              type="number"
                              name="consultationFee"
                              value={doctorForm.consultationFee}
                              onChange={handleDoctorFormChange}
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                              type="email"
                              name="email"
                              value={doctorForm.email}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                              type="tel"
                              name="phone"
                              value={doctorForm.phone}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                            <input
                              type="text"
                              name="education"
                              value={doctorForm.education}
                              onChange={handleDoctorFormChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                            <textarea
                              name="bio"
                              value={doctorForm.bio}
                              onChange={handleDoctorFormChange}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                name="available"
                                checked={doctorForm.available}
                                onChange={handleDoctorFormChange}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">Available for appointments</span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            onClick={() => {
                              setShowDoctorForm(false);
                              setEditingDoctor(null);
                            }}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={editingDoctor ? handleUpdateDoctor : handleCreateDoctor}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          >
                            {editingDoctor ? 'Update' : 'Create'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctors Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Doctor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Specialty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Experience
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rating
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
                        {doctors.length > 0 ? (
                          doctors.map((doctor) => (
                            <tr key={doctor.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-white">
                                      {doctor.firstName[0]}{doctor.lastName[0]}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      Dr. {doctor.firstName} {doctor.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {doctor.email || doctor.phone}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {doctor.specialty}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {doctor.experience}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <svg
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < Math.floor(doctor.rating)
                                            ? 'text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                  <span className="ml-1 text-sm text-gray-600">
                                    {doctor.rating.toFixed(1)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  doctor.available
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {doctor.available ? 'Available' : 'Unavailable'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditDoctor(doctor)}
                                    className="text-purple-600 hover:text-purple-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDoctor(doctor.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center">
                              <div className="text-gray-500">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p>No doctors found</p>
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

            {activeTab === 'appointments' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Appointments</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doctor
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
                          Fee
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {appointments.length > 0 ? (
                        appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.userFirstName} {appointment.userLastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.email || appointment.phone}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                Dr. {appointment.doctorFirstName} {appointment.doctorLastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.specialty}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDateTime(appointment.date, appointment.time)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {appointment.reason}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(appointment.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${appointment.consultationFee || 0}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
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
            )}

            {activeTab === 'analytics' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-purple-50 rounded-lg p-6">
                    <div className="text-purple-600 text-2xl font-bold">{stats.totalDoctors}</div>
                    <div className="text-purple-900 text-sm font-medium">Total Doctors</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="text-green-600 text-2xl font-bold">{stats.availableDoctors}</div>
                    <div className="text-green-900 text-sm font-medium">Available Doctors</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="text-blue-600 text-2xl font-bold">{stats.totalAppointments}</div>
                    <div className="text-blue-900 text-sm font-medium">Total Appointments</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-6">
                    <div className="text-orange-600 text-2xl font-bold">{stats.todayAppointments}</div>
                    <div className="text-orange-900 text-sm font-medium">Today's Appointments</div>
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

export default AdminPanel;
