# Render Deployment Guide

## 🚀 Step 3: Create Render Web Service

### 1. Sign up for Render
- Go to: https://render.com
- Sign up with GitHub (recommended)

### 2. Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `Bhyoussef/medibook-saas`
3. Configure the service:

**Basic Settings:**
- **Name**: `medibook-api`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

## 🔧 Step 4: Environment Variables

### Add these environment variables in Render dashboard:

### Basic Configuration
```
NODE_ENV=production
PORT=3001
```

### Database (Choose Option A or B)

#### Option A: Render PostgreSQL (Recommended)
1. Create PostgreSQL service first
2. Render will auto-populate these:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=your-db-username (from Render)
DB_PASSWORD=your-db-password (from Render)
DB_NAME=medibook_prod
```

#### Option B: External MySQL
```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=medibook_prod
```

### JWT Configuration
```
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=medibook-system
JWT_AUDIENCE=medibook-users
```

### CORS Configuration
```
FRONTEND_URL=https://medibook-saas-1.onrender.com
```

### Email Configuration (Optional but recommended)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@medibook.com
```

### SMS Configuration (Optional)
```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Performance & Security
```
PERFORMANCE_MONITORING_ENABLED=true
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## 🗄️ Database Setup

### Option A: Render PostgreSQL (Easiest)
1. In Render: "New +" → "PostgreSQL"
2. Name: `medibook-db`
3. Plan: Free
4. Region: Same as your web service
5. Click "Create PostgreSQL"
6. Copy the internal connection string details
7. Add those details to your web service environment variables

### Option B: External MySQL
1. Use your existing MySQL database
2. Ensure it's accessible from Render
3. Add connection details to environment variables

## 📊 Run Demo Data

After deployment, run the seed data:

1. Connect to your database (Render PostgreSQL or MySQL)
2. Run the `seed_data.sql` file from your repository
3. This will create demo doctors, users, and appointments

## 🔍 Health Check

Your backend will have a health check at:
```
https://your-service-name.onrender.com/api/health
```

## 🌐 Final Steps

1. **Deploy Web Service**: Click "Create Web Service"
2. **Wait for Build**: Render will build and deploy
3. **Copy URL**: Get your backend URL (e.g., `https://medibook-api.onrender.com`)
4. **Update Frontend**: In your frontend service, set `VITE_API_URL` to your Render URL
5. **Test**: Visit your deployed application

## 🚨 Troubleshooting

### Common Issues:
1. **Build Fails**: Check `package.json` has correct start script
2. **Database Connection**: Verify database credentials
3. **CORS Errors**: Ensure `FRONTEND_URL` matches your Render frontend URL (https://medibook-saas-1.onrender.com)
4. **Port Issues**: Use `PORT=3001` (Render provides port via env var)

### Logs:
- Check Render logs for deployment issues
- All console.log output appears in Render logs

## 📞 Support

If you need help:
1. Check Render logs in dashboard
2. Verify all environment variables
3. Ensure database is running and accessible
4. Test health check endpoint first

## ✅ Success Indicators

You'll know it's working when:
- ✅ Health check returns `{"status": "OK"}`
- ✅ Frontend can connect to backend API
- ✅ Demo data loads correctly
- ✅ Appointments can be created
- ✅ Users can register/login
