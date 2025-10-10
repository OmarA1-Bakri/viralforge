#!/bin/bash

echo "🔐 Firebase Secrets Configuration Script"
echo "=========================================="
echo ""
echo "This script will help you configure all required secrets for Firebase Functions."
echo "You'll be prompted to paste each secret value."
echo ""
echo "⚠️  IMPORTANT: Have your .env file ready with all the required values"
echo ""

# Required secrets
SECRETS=(
  "DATABASE_URL"
  "SESSION_SECRET"
  "JWT_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "OPENROUTER_API_KEY"
  "YOUTUBE_API_KEY"
  "YOUTUBE_CLIENT_ID"
  "YOUTUBE_CLIENT_SECRET"
  "REDIS_HOST"
  "REDIS_PORT"
)

# Optional secrets
OPTIONAL_SECRETS=(
  "REDIS_PASSWORD"
  "CLOUDFLARE_ACCOUNT_ID"
  "CLOUDFLARE_R2_ACCESS_KEY_ID"
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY"
  "CLOUDFLARE_R2_BUCKET"
  "SENTRY_DSN"
  "POSTHOG_API_KEY"
)

echo "📋 Required secrets (${#SECRETS[@]} total):"
for secret in "${SECRETS[@]}"; do
  echo "   - $secret"
done

echo ""
echo "📋 Optional secrets (${#OPTIONAL_SECRETS[@]} total):"
for secret in "${OPTIONAL_SECRETS[@]}"; do
  echo "   - $secret"
done

echo ""
read -p "Do you want to configure secrets now? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Exiting. You can run this script later to configure secrets."
  exit 0
fi

echo ""
echo "🔐 Configuring required secrets..."
echo ""

for secret in "${SECRETS[@]}"; do
  echo "Setting $secret..."
  firebase functions:secrets:set "$secret"
  if [ $? -ne 0 ]; then
    echo "❌ Failed to set $secret"
    exit 1
  fi
  echo ""
done

echo ""
read -p "Do you want to configure optional secrets? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "🔐 Configuring optional secrets..."
  echo ""

  for secret in "${OPTIONAL_SECRETS[@]}"; do
    read -p "Configure $secret? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      firebase functions:secrets:set "$secret"
    else
      echo "Skipped $secret"
    fi
    echo ""
  done
fi

echo ""
echo "✅ Secrets configuration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Redeploy functions: firebase deploy --only functions"
echo "   2. Test API health: curl https://us-central1-viralforge-de120.cloudfunctions.net/api/health"
echo "   3. View logs: firebase functions:log --only api"
