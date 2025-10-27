# Database Cleanup Script (PowerShell)
# Deletes all data except for admin@khaya.com account
# 
# Usage: .\cleanup-database.ps1

Write-Host "🚀 Starting database cleanup..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if the cleanup script exists
if (-not (Test-Path "cleanup-database.js")) {
    Write-Host "❌ cleanup-database.js not found in current directory" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create one with MONGODB_URI" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Checking environment..." -ForegroundColor Yellow

# Load .env file to check MONGODB_URI
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "MONGODB_URI") {
    Write-Host "❌ MONGODB_URI not found in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment configuration found" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
Write-Host "⚠️  WARNING: This will delete ALL data except admin@khaya.com account!" -ForegroundColor Red
Write-Host "   - All users (except admin)" -ForegroundColor Yellow
Write-Host "   - All properties" -ForegroundColor Yellow
Write-Host "   - All connections" -ForegroundColor Yellow
Write-Host "   - All agreements" -ForegroundColor Yellow
Write-Host "   - All chats and messages" -ForegroundColor Yellow
Write-Host "   - All payments and bills" -ForegroundColor Yellow
Write-Host "   - All other data" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🗑️  Proceeding with cleanup..." -ForegroundColor Yellow
Write-Host ""

# Run the Node.js cleanup script
try {
    node cleanup-database.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Database cleanup completed successfully!" -ForegroundColor Green
        Write-Host "🔐 Admin account preserved: admin@khaya.com" -ForegroundColor Cyan
        Write-Host "💡 You can now start fresh with only the admin account" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Cleanup script failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running cleanup script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Cleanup completed! Your database now contains only the admin account." -ForegroundColor Green




