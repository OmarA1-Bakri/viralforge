#!/bin/bash

# ViralForge Mobile Development Helper
# This script sets up live reload development for mobile testing

echo "🚀 Starting ViralForge Mobile Development Setup..."

# Get local IP address
LOCAL_IP=$(ip route get 8.8.8.8 | head -1 | cut -d' ' -f7)
echo "📱 Local IP: $LOCAL_IP"

# Update Capacitor config with current IP
sed -i "s|url: 'http://.*:5000'|url: 'http://$LOCAL_IP:5000'|g" capacitor.config.ts

echo "⚙️ Building app for mobile..."
npm run build

echo "🔄 Syncing with Capacitor..."
npx cap sync

echo "✅ Setup complete!"
echo ""
echo "📱 Mobile Testing Options:"
echo "1. Start dev server with mobile access:"
echo "   npm run dev -- --host 0.0.0.0"
echo ""
echo "2. Run on Android device with live reload:"
echo "   npx cap run android --livereload --external"
echo ""
echo "3. Open in Android Studio for manual testing:"
echo "   npx cap open android"
echo ""
echo "💡 Make sure your phone is on the same Wi-Fi network!"
echo "🔗 Your app will be available at: http://$LOCAL_IP:5000"