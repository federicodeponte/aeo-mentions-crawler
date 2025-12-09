#!/bin/bash
# Deploy and test on VM

set -e

echo "🚀 Deploying to VM and running E2E test..."

# VM details
VM_NAME="claude-code-vm"
PROJECT="claude-code-vm-1759487455"
ZONE="europe-west1-b"

# Step 1: Sync code to VM
echo "📦 Step 1: Syncing code to VM..."
gcloud compute scp --recurse \
  --project=$PROJECT \
  --zone=$ZONE \
  --tunnel-through-iap \
  . \
  $VM_NAME:~/content-manager/ \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude=".git" \
  --exclude="*.log" || {
  echo "❌ Failed to sync. Make sure you're authenticated: gcloud auth login"
  exit 1
}

# Step 2: Install dependencies and start server
echo "🔧 Step 2: Installing dependencies and starting server..."
gcloud compute ssh $VM_NAME \
  --project=$PROJECT \
  --zone=$ZONE \
  --tunnel-through-iap \
  --command="
    cd ~/content-manager && \
    npm install && \
    npm run build && \
    PORT=3002 npm run dev > /tmp/dev-server.log 2>&1 &
    echo \$! > /tmp/dev-server.pid
    sleep 5
    echo 'Server started on port 3002'
  "

# Step 3: Wait for server to be ready
echo "⏳ Step 3: Waiting for server to be ready..."
sleep 10

# Step 4: Run E2E test
echo "🧪 Step 4: Running E2E test..."
gcloud compute ssh $VM_NAME \
  --project=$PROJECT \
  --zone=$ZONE \
  --tunnel-through-iap \
  --command="
    cd ~/content-manager && \
    python3 test_e2e_ui.py
  "

echo "✅ Test complete!"
echo "📋 To view logs: gcloud compute ssh $VM_NAME --project=$PROJECT --zone=$ZONE --tunnel-through-iap --command='tail -f /tmp/dev-server.log'"
echo "🛑 To stop server: gcloud compute ssh $VM_NAME --project=$PROJECT --zone=$ZONE --tunnel-through-iap --command='kill \$(cat /tmp/dev-server.pid)'"

