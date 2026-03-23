#!/bin/bash

# MediBook Quick Deployment Script
# Deploys frontend to Vercel and backend to Render

echo "🚀 MediBook Quick Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Vercel CLI is installed
check_vercel() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Installing..."
        npm install -g vercel
    else
        print_status "Vercel CLI found"
    fi
}

# Check if Render CLI is installed
check_render() {
    if ! command -v render &> /dev/null; then
        print_warning "Render CLI not found. You'll need to deploy via web dashboard."
    else
        print_status "Render CLI found"
    fi
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_step "Deploying Frontend to Vercel..."
    
    # Navigate to frontend directory
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Build project
    print_status "Building frontend..."
    npm run build
    
    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    vercel --prod
    
    cd ..
    print_status "Frontend deployed successfully!"
}

# Deploy backend to Render (instructions)
deploy_backend() {
    print_step "Backend Deployment Instructions for Render:"
    echo ""
    echo "1. Go to https://render.com"
    echo "2. Sign up or login"
    echo "3. Click 'New +'"
    echo "4. Select 'Web Service'"
    echo "5. Connect your GitHub repository: Bhyoussef/medibook-saas"
    echo "6. Configure:"
    echo "   - Name: medibook-api"
    echo "   - Root Directory: backend"
    echo "   - Runtime: Node"
    echo "   - Build Command: npm install"
    echo "   - Start Command: npm start"
    echo "   - Environment Variables: (see render.yaml)"
    echo ""
    print_warning "Don't forget to set up your database on Render!"
}

# Update environment files
update_env_files() {
    print_step "Updating environment files..."
    
    # Create production frontend env
    cat > frontend/.env.production << EOF
VITE_API_URL=https://your-render-backend-url.onrender.com
VITE_APP_NAME=MediBook
EOF
    
    # Create production backend env template
    cat > backend/.env.production << EOF
NODE_ENV=production
PORT=3001
DB_HOST=your-render-db-host
DB_PORT=5432
DB_NAME=medibook_prod
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EOF
    
    print_status "Environment files updated"
}

# Commit and push changes
commit_changes() {
    print_step "Committing deployment configurations..."
    
    git add .
    git commit -m "Add deployment configurations and demo data

- Add vercel.json for frontend deployment
- Add render.yaml for backend deployment
- Add seed_data.sql for demo data
- Add deploy.sh for quick deployment"
    
    git push origin main
    
    print_status "Changes pushed to GitHub"
}

# Main deployment flow
main() {
    echo ""
    print_step "Starting deployment process..."
    echo ""
    
    # Check prerequisites
    check_vercel
    check_render
    
    echo ""
    print_step "Updating deployment configurations..."
    update_env_files
    
    echo ""
    print_step "Committing changes to Git..."
    commit_changes
    
    echo ""
    print_step "Deploying Frontend..."
    deploy_frontend
    
    echo ""
    deploy_backend
    
    echo ""
    print_status "🎉 Deployment process completed!"
    echo ""
    echo "Next Steps:"
    echo "1. Set up your Render backend service"
    echo "2. Update VITE_API_URL in Vercel with your Render URL"
    echo "3. Set up your database and run seed_data.sql"
    echo "4. Test your deployed application!"
    echo ""
    print_status "Your app will be live at: https://your-vercel-app.vercel.app"
}

# Run main function
main
