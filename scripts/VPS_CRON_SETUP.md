# 🖥️ VPS Cron Job Setup Guide

This guide shows you how to set up a cron job on your VPS to trigger the rental reminders endpoint on Vercel.

## 📋 Prerequisites

- A VPS with Linux (Ubuntu/Debian/CentOS)
- SSH access to your VPS
- `curl` installed (usually pre-installed)
- Node.js installed (if using the Node.js script)

---

## 🚀 Quick Setup (Bash Script - Recommended)

### Step 1: Upload the Script

Upload `scripts/cron-rental-reminders.sh` to your VPS (e.g., `/home/youruser/cron-jobs/`)

### Step 2: Make it Executable

```bash
chmod +x /home/youruser/cron-jobs/cron-rental-reminders.sh
```

### Step 3: Edit the Script

Edit the script and set your Vercel URL:

```bash
nano /home/youruser/cron-jobs/cron-rental-reminders.sh
```

Change this line:
```bash
VERCEL_URL="${VERCEL_URL:-https://your-app.vercel.app}"
```

To your actual Vercel URL:
```bash
VERCEL_URL="${VERCEL_URL:-https://khaya-backend.vercel.app}"
```

Or set it as an environment variable (better):
```bash
export VERCEL_URL=https://khaya-backend.vercel.app
```

### Step 4: Create Log Directory

```bash
sudo mkdir -p /var/log
sudo touch /var/log/rental-reminders-cron.log
sudo chmod 666 /var/log/rental-reminders-cron.log
```

### Step 5: Test the Script Manually

```bash
/home/youruser/cron-jobs/cron-rental-reminders.sh
```

Check the log:
```bash
tail -f /var/log/rental-reminders-cron.log
```

### Step 6: Add to Crontab

```bash
crontab -e
```

Add this line to run every minute:
```cron
* * * * * /home/youruser/cron-jobs/cron-rental-reminders.sh
```

Or if you want to set the VERCEL_URL in crontab:
```cron
* * * * * VERCEL_URL=https://khaya-backend.vercel.app /home/youruser/cron-jobs/cron-rental-reminders.sh
```

### Step 7: Verify Cron is Running

```bash
# Check cron logs
tail -f /var/log/rental-reminders-cron.log

# Or check system cron logs
tail -f /var/log/syslog | grep CRON
```

---

## 🟢 Alternative: Node.js Script

If you prefer Node.js:

### Step 1: Upload the Script

Upload `scripts/cron-rental-reminders.js` to your VPS

### Step 2: Make it Executable

```bash
chmod +x /home/youruser/cron-jobs/cron-rental-reminders.js
```

### Step 3: Set Environment Variable

Add to your `~/.bashrc` or `~/.profile`:
```bash
export VERCEL_URL=https://khaya-backend.vercel.app
```

Or set it in crontab:
```cron
* * * * * VERCEL_URL=https://khaya-backend.vercel.app /usr/bin/node /home/youruser/cron-jobs/cron-rental-reminders.js >> /var/log/rental-reminders.log 2>&1
```

### Step 4: Add to Crontab

```bash
crontab -e
```

Add:
```cron
* * * * * /usr/bin/node /home/youruser/cron-jobs/cron-rental-reminders.js >> /var/log/rental-reminders.log 2>&1
```

---

## 📊 Monitoring

### View Logs in Real-Time

```bash
tail -f /var/log/rental-reminders-cron.log
```

### Check Cron Status

```bash
# List your cron jobs
crontab -l

# Check if cron service is running
sudo systemctl status cron
# or
sudo systemctl status crond  # (CentOS/RHEL)
```

### Test Endpoint Manually

```bash
curl https://your-app.vercel.app/api/cron/rental-reminders
```

---

## 🔧 Troubleshooting

### Cron Not Running?

1. **Check cron service:**
   ```bash
   sudo systemctl status cron
   ```

2. **Check cron logs:**
   ```bash
   grep CRON /var/log/syslog
   ```

3. **Verify script path is absolute** (not relative)

4. **Check file permissions:**
   ```bash
   ls -la /home/youruser/cron-jobs/cron-rental-reminders.sh
   ```

### Script Not Executing?

1. **Test manually first:**
   ```bash
   /home/youruser/cron-jobs/cron-rental-reminders.sh
   ```

2. **Check if curl is installed:**
   ```bash
   which curl
   ```

3. **Check network connectivity:**
   ```bash
   curl -I https://your-app.vercel.app
   ```

### No Logs Appearing?

1. **Check log file permissions:**
   ```bash
   ls -la /var/log/rental-reminders-cron.log
   ```

2. **Try writing to home directory instead:**
   ```bash
   LOG_FILE="$HOME/rental-reminders-cron.log"
   ```

---

## ⚙️ Cron Schedule Examples

```cron
# Every minute (for testing)
* * * * * /path/to/script.sh

# Every 5 minutes
*/5 * * * * /path/to/script.sh

# Every hour
0 * * * * /path/to/script.sh

# Every day at 9 AM
0 9 * * * /path/to/script.sh

# Every day at 9 AM and 6 PM
0 9,18 * * * /path/to/script.sh
```

---

## 🔒 Security Notes

1. **Don't commit your Vercel URL** - Use environment variables
2. **Restrict log file permissions** if needed
3. **Consider adding authentication** if you want to secure the endpoint later

---

## ✅ Verification Checklist

- [ ] Script uploaded to VPS
- [ ] Script is executable (`chmod +x`)
- [ ] Vercel URL is set correctly
- [ ] Log file directory exists and is writable
- [ ] Script runs manually without errors
- [ ] Cron job added to crontab
- [ ] Cron service is running
- [ ] Logs are being written
- [ ] Vercel endpoint is responding

---

## 🎯 Next Steps

1. Set up the cron job on your VPS
2. Monitor logs for the first few runs
3. Verify reminders are being sent
4. Once confirmed working, you can remove the Vercel cron from `vercel.json` (or keep it for backup)
