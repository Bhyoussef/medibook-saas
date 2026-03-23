# Clinic Appointment Booking System

A full-stack web application for booking clinic appointments with doctors. Built with React, Node.js, Express, and MySQL.

## Features

- User authentication (login/register)
- Doctor profiles and search
- Appointment booking and management
- User profile management
- Responsive design with Tailwind CSS

## Tech Stack

### Frontend
- React 18
- React Router
- Axios for API calls
- Tailwind CSS
- Vite

### Backend
- Node.js
- Express.js
- MySQL
- JWT authentication
- bcryptjs for password hashing
- Express middleware for security

## Project Structure

```
clinic_pro/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # React context
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/                  # Node.js backend
│   ├── config/              # Database configuration
│   ├── controllers/         # Route controllers
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── models/              # Data models
│   ├── middlewares/         # Express middleware
│   ├── server.js            # Server entry point
│   └── package.json
├── database/                 # Database schema
│   └── schema.sql
└── README.md
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MySQL Server
- npm or yarn

### Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE clinic_booking;
```

2. Import the schema:
```bash
mysql -u your_username -p clinic_booking < database/schema.sql
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=clinic_booking
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

4. Start the frontend development server:
```bash
npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Browse available doctors and book appointments
4. Manage your appointments and profile

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/specialty/:specialty` - Get doctors by specialty

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests (if configured)
cd frontend
npm test
```

### Building for Production
```bash
# Frontend build
cd frontend
npm run build

# Backend production
cd backend
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
