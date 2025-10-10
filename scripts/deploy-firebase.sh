#!/bin/bash
set -e

echo "🔥 ViralForge Firebase Deployment"
echo "=================================="
echo ""

# Step 1: Build the application for Firebase
echo "📦 Building frontend and backend..."
npm run build:firebase

# Step 2: Copy built backend to functions directory
echo ""
echo "📂 Copying backend to functions directory..."
cp dist/firebase.js functions/app.js

# Step 3: Install functions dependencies
echo ""
echo "📥 Installing Firebase Functions dependencies..."
cd functions
npm install
cd ..

# Step 4: Set environment variables (if .env.production exists)
if [ -f ".env.production" ]; then
  echo ""
  echo "🔐 Setting Firebase environment variables..."
  echo "⚠️  Note: You may need to set secrets manually:"
  echo "   firebase functions:secrets:set DATABASE_URL"
  echo "   firebase functions:secrets:set SESSION_SECRET"
  echo "   firebase functions:secrets:set GOOGLE_CLIENT_SECRET"
  echo "   firebase functions:secrets:set STRIPE_SECRET_KEY"
  echo "   firebase functions:secrets:set OPENAI_API_KEY"
fi

# Step 5: Deploy to Firebase
echo ""
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting,functions

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is now live:"
echo "   Frontend: https://viralforge-de120.web.app"
echo "   Backend:  https://us-central1-viralforge-de120.cloudfunctions.net/api"
echo ""
echo "📝 Next steps:"
echo "   1. Set environment secrets: firebase functions:secrets:set SECRET_NAME"
echo "   2. Monitor logs: firebase functions:log"
echo "   3. Check status: firebase functions:list"
