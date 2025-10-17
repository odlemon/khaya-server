# Simple Onboarding Test
$baseUrl = "http://localhost:3001"

Write-Host "Simple Onboarding Test" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

# Test basic registration with role
Write-Host "1. Testing basic registration with role..." -ForegroundColor Yellow
try {
    $payload = @{
        email = "simple.test@example.com"
        password = "password123"
        firstName = "Simple"
        lastName = "Test"
        role = "tenant"
        phone = "+27123456789"
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($payload | ConvertTo-Json)
    Write-Host "✅ Registration successful" -ForegroundColor Green
    Write-Host "   Role: $($response.data.role)" -ForegroundColor White
    Write-Host "   Requires Onboarding: $($response.data.requiresOnboarding)" -ForegroundColor White
    $token = $response.token
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test basic login
Write-Host "2. Testing basic login..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "simple.test@example.com"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "   Requires Onboarding: $($loginResponse.user.requiresOnboarding)" -ForegroundColor White
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test onboarding status
Write-Host "3. Testing onboarding status..." -ForegroundColor Yellow
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "✅ Onboarding status retrieved" -ForegroundColor Green
    Write-Host "   Is Completed: $($statusResponse.data.isCompleted)" -ForegroundColor White
    Write-Host "   Current Step: $($statusResponse.data.currentStep)" -ForegroundColor White
    Write-Host "   Total Steps: $($statusResponse.data.totalSteps)" -ForegroundColor White
} catch {
    Write-Host "❌ Onboarding status failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nSimple onboarding test completed!" -ForegroundColor Green 