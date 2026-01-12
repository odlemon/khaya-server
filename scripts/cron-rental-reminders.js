#!/usr/bin/env node

/**
 * VPS Cron Job Script for Rental Reminders (Node.js version)
 * This script hits the Vercel endpoint to trigger rental reminder checks
 * 
 * Usage:
 *   1. Set VERCEL_URL environment variable: export VERCEL_URL=https://your-app.vercel.app
 *   2. Make executable: chmod +x cron-rental-reminders.js
 *   3. Add to crontab: * * * * * /usr/bin/node /path/to/cron-rental-reminders.js >> /var/log/rental-reminders.log 2>&1
 */

const https = require('https');
const http = require('http');

// Get Vercel URL from environment variable
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';
const ENDPOINT = '/api/cron/rental-reminders';
const FULL_URL = `${VERCEL_URL}${ENDPOINT}`;

const timestamp = new Date().toISOString();

// Parse URL
const url = new URL(FULL_URL);
const client = url.protocol === 'https:' ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'GET',
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'VPS-Cron-Job/1.0'
  }
};

console.log(`[${timestamp}] 🔄 Triggering rental reminders cron...`);
console.log(`[${timestamp}] URL: ${FULL_URL}`);

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`[${timestamp}] ✅ Success - HTTP ${res.statusCode}`);
      console.log(`[${timestamp}] Response: ${data.substring(0, 200)}...`); // First 200 chars
    } else {
      console.log(`[${timestamp}] ⚠️  Warning - HTTP ${res.statusCode}`);
      console.log(`[${timestamp}] Response: ${data.substring(0, 200)}...`);
    }
    console.log(`[${timestamp}] ---`);
  });
});

req.on('error', (error) => {
  console.error(`[${timestamp}] ❌ Error: ${error.message}`);
  console.log(`[${timestamp}] ---`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error(`[${timestamp}] ❌ Timeout: Request took longer than 30 seconds`);
  req.destroy();
  process.exit(1);
});

req.end();




