# 🔧 Systemd Service Setup for Rental Reminders Cron

This will keep your cron script running even after SSH disconnects or server reboots.

## Step 1: Create the service file on your server

```bash
# Create systemd service file
sudo nano /etc/systemd/system/rental-reminders.service
```

Paste this (replace `YOUR_USERNAME` with your actual username):

```ini
[Unit]
Description=Rental Reminders Cron Job (30s interval)
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/cron-jobs
ExecStart=/home/YOUR_USERNAME/cron-jobs/cron-rental-reminders-test.sh
Restart=always
RestartSec=10
StandardOutput=append:/home/YOUR_USERNAME/rental-reminders-service.log
StandardError=append:/home/YOUR_USERNAME/rental-reminders-service-error.log

[Install]
WantedBy=multi-user.target
```

**Important:** Replace `YOUR_USERNAME` with your actual username (run `whoami` to check)

Save and exit (Ctrl+X, Y, Enter)

## Step 2: Reload systemd

```bash
sudo systemctl daemon-reload
```

## Step 3: Enable the service (starts on boot)

```bash
sudo systemctl enable rental-reminders.service
```

## Step 4: Start the service

```bash
sudo systemctl start rental-reminders.service
```

## Step 5: Check status

```bash
# Check if it's running
sudo systemctl status rental-reminders.service

# View live logs
sudo journalctl -u rental-reminders.service -f

# Or check the log files
tail -f ~/rental-reminders-service.log
```

## Useful Commands

```bash
# Stop the service
sudo systemctl stop rental-reminders.service

# Restart the service
sudo systemctl restart rental-reminders.service

# Disable auto-start on boot
sudo systemctl disable rental-reminders.service

# View logs
sudo journalctl -u rental-reminders.service --since "1 hour ago"
```

## Verify It's Working

1. Check service status: `sudo systemctl status rental-reminders.service`
2. Check logs: `tail -f ~/rental-reminders-service.log`
3. Check Vercel logs to see if endpoint is being hit
4. Disconnect SSH and reconnect - service should still be running

---

## Alternative: PM2 (if you prefer)

If you want to use PM2 instead:

```bash
# Install PM2
npm install -g pm2

# Start the script with PM2
pm2 start ~/cron-jobs/cron-rental-reminders-test.sh --name rental-reminders --interpreter bash

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

But systemd is more standard for Linux services.


