#!/bin/bash

# Deploy hyperniche-ai to Render
# Usage: ./deploy-to-render.sh

set -e

echo "🚀 Deploying hyperniche-ai to Render..."

# Check if required variables are set
if [ -z "$RENDER_API_KEY" ]; then
  echo "❌ RENDER_API_KEY environment variable not set"
  echo "💡 Run: export RENDER_API_KEY=***RENDER-API-KEY-REMOVED***"
  exit 1
fi

# Repository details
REPO_URL="https://github.com/federicodeponte/openaeomachine"
OWNER_ID="***RENDER-OWNER-ID-REMOVED***"
SERVICE_NAME="hyperniche-ai"

echo "📋 Service Configuration:"
echo "   Name: $SERVICE_NAME"
echo "   Repository: $REPO_URL"
echo "   Branch: main"
echo "   Runtime: Node.js"
echo "   Plan: Standard (30-minute timeouts)"

# Create service using curl
echo "🔄 Creating Render service..."

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"$SERVICE_NAME\",
    \"ownerId\": \"$OWNER_ID\",
    \"repo\": \"$REPO_URL\",
    \"serviceDetails\": {
      \"branch\": \"main\",
      \"buildCommand\": \"npm install && npm run build\",
      \"startCommand\": \"npm start\",
      \"plan\": \"standard\",
      \"runtime\": \"node\",
      \"envVars\": [
        {\"key\": \"NODE_ENV\", \"value\": \"production\"},
        {\"key\": \"GEMINI_API_KEY\", \"value\": \"[REMOVED_API_KEY]\"},
        {\"key\": \"OPENROUTER_API_KEY\", \"value\": \"***OPENROUTER-API-KEY-REMOVED***\"},
        {\"key\": \"SERANKING_API_KEY\", \"value\": \"***SERANKING-API-KEY-REMOVED***\"},
        {\"key\": \"DATAFORSEO_LOGIN\", \"value\": \"tech@scaile.it\"},
        {\"key\": \"DATAFORSEO_PASSWORD\", \"value\": \"***DATAFORSEO-PASSWORD-REMOVED***\"}
      ]
    }
  }" \
  https://api.render.com/v1/services)

echo "📄 API Response:"
echo "$RESPONSE"

# Parse response for service ID
SERVICE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$SERVICE_ID" ]; then
  echo "✅ Service created successfully!"
  echo "🆔 Service ID: $SERVICE_ID"
  echo "🌐 Expected URL: https://$SERVICE_NAME.onrender.com"
  
  echo "🔄 Monitoring deployment..."
  
  # Monitor deployment status
  for i in {1..20}; do
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
      "https://api.render.com/v1/services/$SERVICE_ID")
    
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "📊 Status ($i/20): $STATUS"
    
    if [ "$STATUS" = "live" ]; then
      echo "🎉 Deployment completed successfully!"
      echo "🌐 Live at: https://$SERVICE_NAME.onrender.com"
      break
    elif [ "$STATUS" = "build_failed" ] || [ "$STATUS" = "failed" ]; then
      echo "❌ Deployment failed!"
      break
    fi
    
    sleep 30
  done
else
  echo "❌ Failed to create service"
  echo "🔍 Check the API response above for error details"
  exit 1
fi

echo "✅ Deployment script completed!"