import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockDoctors, specialties } from '../data/mockDoctors';
import DoctorCard from '../components/DoctorCard';
import LoadingSpinner from '../components/LoadingSpinner';
import useErrorHandler from '../hooks/useErrorHandler';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { error, handleError, clearError } = useErrorHandler();

  useEffect(() => {
    filterDoctors();
  }, [searchQuery, selectedSpecialty]);

  const filterDoctors = () => {
    setLoading(true);
    clearError();
    
    try {
      let filtered = mockDoctors;

      // Filter by specialty
      if (selectedSpecialty) {
        filtered = filtered.filter(doctor => doctor.specialty === selectedSpecialty);
      }

      // Filter by search term
      if (searchQuery) {
        filtered = filtered.filter(doctor =>
          doctor.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doctor.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doctor.bio?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sort by rating (highest first) and availability
      filtered.sort((a, b) => {
        if (a.available !== b.available) {
          return b.available - a.available;
        }
        return b.rating - a.rating;
      });

      setFilteredDoctors(filtered);
    } catch (err) {
      handleError(err, 'Failed to filter doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSpecialtyChange = (specialty) => {
    setSelectedSpecialty(specialty);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="section-sm">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 fade-in">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight text-balance">
                  Find Your Perfect
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {" "}Doctor
                  </span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed text-pretty max-w-lg">
                  Connect with top healthcare professionals in your area. Book appointments online and manage your health journey with ease.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/doctors" className="btn-primary text-lg px-8 py-4">
                  Find Doctors
                </Link>
                <Link to="/booking" className="btn-outline text-lg px-8 py-4">
                  Book Appointment
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-gray-600 mt-1">Expert Doctors</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">50K+</div>
                  <div className="text-sm text-gray-600 mt-1">Happy Patients</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">24/7</div>
                  <div className="text-sm text-gray-600 mt-1">Support Available</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                  alt="Healthcare professionals" 
                  className="rounded-3xl shadow-2xl w-full"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-3xl"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="section-sm bg-white/80 backdrop-blur-sm">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto">
            <div className="card-elevated">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Search for Doctors</h2>
                <div className="space-y-4">
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, specialty, or condition..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field pl-12"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSelectedSpecialty('')}
                      className={`btn-ghost ${selectedSpecialty === '' ? 'bg-blue-100 text-blue-700' : ''}`}
                    >
                      All Specialties
                    </button>
                    {specialties.map((specialty) => (
                      <button
                        key={specialty}
                        onClick={() => setSelectedSpecialty(specialty)}
                        className={`btn-ghost ${selectedSpecialty === specialty ? 'bg-blue-100 text-blue-700' : ''}`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="section">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Doctors</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Meet our top-rated healthcare professionals dedicated to providing you with the best care
            </p>
          </div>

          {loading ? (
            <div className="flex-center py-12">
              <LoadingSpinner size="lg" text="Loading doctors..." />
            </div>
          ) : filteredDoctors.length > 0 ? (
            <div className="grid-responsive">
              {filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="slide-up">
                  <DoctorCard doctor={doctor} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No doctors found</h3>
                <p className="text-gray-600">
                  {searchQuery || selectedSpecialty
                    ? 'Try adjusting your search criteria'
                    : 'No doctors available at the moment'}
                </p>
                {(searchQuery || selectedSpecialty) && (
                  <button
                    onClick={clearFilters}
                    className="btn-secondary mt-4"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
                <button
                  onClick={clearError}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-white/80 backdrop-blur-sm">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose MediBook?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience healthcare made simple with our innovative platform
            </p>
          </div>

          <div className="grid-responsive-4">
            <div className="card-interactive text-center group">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Booking</h3>
              <p className="text-gray-600">Book appointments in seconds with our streamlined process</p>
            </div>

            <div className="card-interactive text-center group">
              <div className="w-16 h-16 gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Doctors</h3>
              <p className="text-gray-600">All our doctors are certified and experienced professionals</p>
            </div>

            <div className="card-interactive text-center group">
              <div className="w-16 h-16 gradient-success rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Care</h3>
              <p className="text-gray-600">Get personalized care from specialists in your area</p>
            </div>

            <div className="card-interactive text-center group">
              <div className="w-16 h-16 gradient-warning rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock assistance for all your healthcare needs</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container-wide">
          <div className="card-elevated bg-gradient-to-br from-blue-600 to-purple-600 text-white overflow-hidden">
            <div className="relative p-12 text-center">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Ready to Take Control of Your Health?</h2>
                <p className="text-xl mb-8 text-blue-100">
                  Join thousands of satisfied patients who trust MediBook for their healthcare needs
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/doctors" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                    Get Started Now
                  </Link>
                  <Link to="/about" className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
