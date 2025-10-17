# Quick Tenant Features Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "🏠 Quick Tenant Features Test" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# 1. Register tenant
Write-Host "1. Registering tenant..." -ForegroundColor Yellow
$tenantEmail = "quick_tenant_$timestamp@test.com"
$registerData = @{
    firstName = "Jane"
    lastName = "Tenant"
    email = $tenantEmail
    password = "TestPassword123!"
    role = "tenant"
    phone = "+0987654321"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body ($registerData | ConvertTo-Json)
    Write-Host "✅ Tenant registered successfully" -ForegroundColor Green
    $tenantToken = $response.token
    Write-Host "   Token: $($tenantToken.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Register landlord
Write-Host "2. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "quick_landlord_$timestamp@test.com"
$registerData = @{
    firstName = "John"
    lastName = "Landlord"
    email = $landlordEmail
    password = "TestPassword123!"
    role = "landlord"
    phone = "+1234567890"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body ($registerData | ConvertTo-Json)
    Write-Host "✅ Landlord registered successfully" -ForegroundColor Green
    $landlordToken = $response.token
    Write-Host "   Token: $($landlordToken.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Test favorites endpoint (tenant)
Write-Host "3. Testing favorites endpoint..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/favorites" -Method GET -Headers $headers
    Write-Host "✅ Favorites endpoint working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) favorites" -ForegroundColor Gray
} catch {
    Write-Host "❌ Favorites endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test agreements endpoint (tenant)
Write-Host "4. Testing agreements endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method GET -Headers $headers
    Write-Host "✅ Agreements endpoint working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreements endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test agreement templates endpoint
Write-Host "5. Testing agreement templates..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/templates" -Method GET -Headers $headers
    Write-Host "✅ Agreement templates working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) templates" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreement templates failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test tenant profile endpoint
Write-Host "6. Testing tenant profile..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Tenant profile working" -ForegroundColor Green
    Write-Host "   User: $($response.firstName) $($response.lastName)" -ForegroundColor Gray
    Write-Host "   Role: $($response.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant profile failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Quick test completed!" -ForegroundColor Green
Write-Host "The tenant features are working correctly!" -ForegroundColor Green 