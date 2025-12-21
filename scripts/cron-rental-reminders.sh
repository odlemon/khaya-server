#!/bin/bash

# VPS Cron Job Script for Rental Reminders
# This script hits the Vercel endpoint to trigger rental reminder checks
# Replace YOUR_VERCEL_URL with your actual Vercel deployment URL

VERCEL_URL="${VERCEL_URL:-https://your-app.vercel.app}"
ENDPOINT="/api/cron/rental-reminders"
FULL_URL="${VERCEL_URL}${ENDPOINT}"

# Log file location (adjust path as needed)
LOG_FILE="/var/log/rental-reminders-cron.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Make the request
echo "[$TIMESTAMP] Triggering rental reminders cron..." >> "$LOG_FILE"

# Use curl to hit the endpoint
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$FULL_URL" 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "[$TIMESTAMP] ✅ Success - HTTP $HTTP_CODE" >> "$LOG_FILE"
    echo "[$TIMESTAMP] Response: $BODY" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ❌ Failed - HTTP $HTTP_CODE" >> "$LOG_FILE"
    echo "[$TIMESTAMP] Response: $BODY" >> "$LOG_FILE"
fi

echo "[$TIMESTAMP] ---" >> "$LOG_FILE"


