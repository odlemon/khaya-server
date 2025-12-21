#!/bin/bash

# VPS Cron Job Script for Rental Reminders (TEST MODE - 30 seconds)
# Hardcoded URL for testing

VERCEL_URL="https://khaya-server.vercel.app"
ENDPOINT="/api/cron/rental-reminders"
FULL_URL="${VERCEL_URL}${ENDPOINT}"

# Log file location
LOG_FILE="$HOME/rental-reminders-cron.log"

echo "========================================"
echo "🚀 Starting Rental Reminders Cron (30s interval)"
echo "🚀 URL: $FULL_URL"
echo "🚀 Log file: $LOG_FILE"
echo "🚀 Press Ctrl+C to stop"
echo "========================================"

# Infinite loop - runs every 30 seconds
while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$TIMESTAMP] 🔄 Triggering rental reminders cron..." | tee -a "$LOG_FILE"
    
    # Use curl to hit the endpoint
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$FULL_URL" 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "[$TIMESTAMP] ✅ Success - HTTP $HTTP_CODE" | tee -a "$LOG_FILE"
        echo "[$TIMESTAMP] Response: $BODY" | tee -a "$LOG_FILE"
    else
        echo "[$TIMESTAMP] ❌ Failed - HTTP $HTTP_CODE" | tee -a "$LOG_FILE"
        echo "[$TIMESTAMP] Response: $BODY" | tee -a "$LOG_FILE"
    fi
    
    echo "[$TIMESTAMP] ---" | tee -a "$LOG_FILE"
    
    # Wait 30 seconds before next run
    sleep 30
done


