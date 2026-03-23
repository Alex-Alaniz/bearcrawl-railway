#!/bin/bash
set -e

echo "🐻 Starting BearCrawl Railway Services"
echo "======================================="

# Start OpenClaw Gateway in background
# Unset DATABASE_URL for gateway — it's for the spawner only, not openclaw
echo "📡 Starting OpenClaw Gateway on port $PORT..."
env -u DATABASE_URL openclaw gateway --port $PORT --bind 0.0.0.0 &
GATEWAY_PID=$!

# Wait for gateway to be ready (up to 60s — Neon free tier may need wake time)
echo "⏳ Waiting for gateway to start..."
READY=0
for i in $(seq 1 60); do
  if curl -sf http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "✅ Gateway is ready after ${i}s"
    READY=1
    break
  fi
  if ! kill -0 $GATEWAY_PID 2>/dev/null; then
    echo "❌ Gateway process died during startup"
    exit 1
  fi
  sleep 1
done

if [ "$READY" = "0" ]; then
  echo "⚠️ Gateway not responding after 60s, continuing anyway..."
fi

# Start Spawner Service
echo "🚀 Starting Spawner Service on port $SESSION_SPAWNER_PORT..."
node --loader tsx services/session-spawner.ts &
SPAWNER_PID=$!

echo "✅ BearCrawl services started!"
echo "   Gateway PID: $GATEWAY_PID"
echo "   Spawner PID: $SPAWNER_PID"

# Wait for either process to exit
wait -n

# If one exits, kill the other
kill $GATEWAY_PID $SPAWNER_PID 2>/dev/null || true
exit 1
