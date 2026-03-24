#!/bin/bash

echo "🚀 MediBook SaaS - Manual Deployment Script"
echo "=========================================="

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Deploy to Render (manual trigger)
echo "🌐 Triggering Render deployment..."
curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": true}' \
  https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys

if [ $? -eq 0 ]; then
    echo "✅ Deployment triggered successfully"
    echo "🌐 Check your Render dashboard for deployment status"
else
    echo "❌ Failed to trigger deployment"
    exit 1
fi

echo "✅ Deployment process completed!"
