import React from 'react';

const Doctors = () => {
  const doctors = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      specialty: "General Medicine",
      experience: "10+ years",
      rating: 4.8,
      available: true,
      image: "👩‍⚕️"
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      specialty: "Dentistry",
      experience: "8+ years",
      rating: 4.9,
      available: true,
      image: "👨‍⚕️"
    },
    {
      id: 3,
      name: "Dr. Emily Davis",
      specialty: "Ophthalmology",
      experience: "12+ years",
      rating: 4.7,
      available: false,
      image: "👩‍⚕️"
    },
    {
      id: 4,
      name: "Dr. James Wilson",
      specialty: "Cardiology",
      experience: "15+ years",
      rating: 4.9,
      available: true,
      image: "👨‍⚕️"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Our Doctors</h1>
          <p className="mt-2 text-gray-600">
            Find and book appointments with our experienced healthcare professionals.
          </p>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by name or specialty..."
              className="flex-1 input-field"
            />
            <select className="input-field">
              <option value="">All Specialties</option>
              <option value="general">General Medicine</option>
              <option value="dental">Dentistry</option>
              <option value="eye">Ophthalmology</option>
              <option value="heart">Cardiology</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="card">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">{doctor.image}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                  <p className="text-gray-600">{doctor.specialty}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm text-gray-600 ml-1">{doctor.rating}</span>
                    <span className="text-sm text-gray-500 ml-2">({doctor.experience})</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  doctor.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {doctor.available ? 'Available' : 'Unavailable'}
                </div>
                {doctor.available && (
                  <button className="btn-primary text-sm">
                    Book Appointment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
