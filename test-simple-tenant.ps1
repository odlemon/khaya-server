# Simple Tenant Features Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Testing Tenant Features..." -ForegroundColor Green

# 1. Register tenant
$tenantEmail = "tenant_test_$timestamp@test.com"
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
} catch {
    Write-Host "❌ Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Register landlord
$landlordEmail = "landlord_test_$timestamp@test.com"
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
} catch {
    Write-Host "❌ Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Test favorites endpoint
$headers = @{ Authorization = "Bearer $tenantToken" }

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/favorites" -Method GET -Headers $headers
    Write-Host "✅ Favorites endpoint working" -ForegroundColor Green
} catch {
    Write-Host "❌ Favorites endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test agreements endpoint
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method GET -Headers $headers
    Write-Host "✅ Agreements endpoint working" -ForegroundColor Green
} catch {
    Write-Host "❌ Agreements endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test completed!" -ForegroundColor Green 