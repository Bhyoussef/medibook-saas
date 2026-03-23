import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody, CardFooter } from './ui/Card';
import Button from './ui/Button';
import StatusBadge from './ui/StatusBadge';

const DoctorCard = ({ doctor }) => {
  const navigate = useNavigate();

  const handleBookAppointment = () => {
    navigate(`/booking/${doctor.id}`);
  };

  const handleViewProfile = () => {
    navigate(`/doctors/${doctor.id}`);
  };

  return (
    <Card variant="elevated" hover className="group">
      {/* Doctor Image and Basic Info */}
      <CardHeader>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <span className="text-xl font-bold text-white">
                  {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                </span>
              </div>
              {doctor.available && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
              Dr. {doctor.firstName} {doctor.lastName}
            </h3>
            <p className="text-sm text-gray-600 mt-1 font-medium">{doctor.specialty}</p>
            
            {/* Rating and Experience */}
            <div className="flex items-center mt-3 space-x-4">
              <div className="flex items-center">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 transition-colors duration-200 ${
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
                <span className="ml-2 text-sm font-semibold text-gray-700">
                  {doctor.rating.toFixed(1)}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{doctor.experience}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {/* Bio */}
        {doctor.bio && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {doctor.bio}
          </p>
        )}

        {/* Additional Info */}
        <div className="mt-4 space-y-3">
          {doctor.education && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span>{doctor.education}</span>
            </div>
          )}
          
          {doctor.consultationFee && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">${doctor.consultationFee}</span>
              <span className="ml-1 text-gray-500">consultation fee</span>
            </div>
          )}
        </div>
      </CardBody>

      {/* Availability Status and Actions */}
      <CardFooter className="space-y-3">
        <div className="flex items-center">
          <StatusBadge 
            status={doctor.available ? 'available' : 'unavailable'} 
            size="sm"
          />
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleBookAppointment}
            disabled={!doctor.available}
            loading={false}
            variant="primary"
            size="sm"
            className="flex-1"
          >
            {doctor.available ? 'Book Appointment' : 'Not Available'}
          </Button>
          
          <Button
            onClick={handleViewProfile}
            variant="outline"
            size="sm"
          >
            View Profile
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DoctorCard;
