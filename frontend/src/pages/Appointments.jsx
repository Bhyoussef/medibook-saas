import React from 'react';

const Appointments = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-2 text-gray-600">
            Manage your upcoming and past appointments.
          </p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Appointments</h2>
            <button className="btn-primary">
              Book New Appointment
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-primary-500 pl-4 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Dr. Sarah Johnson</h3>
                  <p className="text-gray-600">General Checkup</p>
                  <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                    <span>📅 March 25, 2024</span>
                    <span>🕐 10:00 AM</span>
                    <span>📍 Room 201</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-primary-600 hover:text-primary-800">Reschedule</button>
                  <button className="text-red-600 hover:text-red-800">Cancel</button>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Dr. Michael Chen</h3>
                  <p className="text-gray-600">Dental Cleaning</p>
                  <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                    <span>📅 March 28, 2024</span>
                    <span>🕐 2:30 PM</span>
                    <span>📍 Room 105</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-primary-600 hover:text-primary-800">Reschedule</button>
                  <button className="text-red-600 hover:text-red-800">Cancel</button>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-gray-300 pl-4 py-4 opacity-60">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Dr. Emily Davis</h3>
                  <p className="text-gray-600">Eye Examination</p>
                  <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                    <span>📅 March 15, 2024</span>
                    <span>🕐 11:00 AM</span>
                    <span>📍 Room 302</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <span className="text-gray-500">Completed</span>
                  <button className="text-primary-600 hover:text-primary-800">View Details</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
