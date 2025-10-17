# Debug Test
$baseUrl = "http://localhost:3001"

Write-Host "Debug Test" -ForegroundColor Green
Write-Host "==========" -ForegroundColor Green

# Test registration
Write-Host "1. Registering user..." -ForegroundColor Yellow
try {
    $payload = @{
        email = "debug.test.$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        password = "password123"
        firstName = "Debug"
        lastName = "Test"
        role = "tenant"
        phone = "+27123456789"
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($payload | ConvertTo-Json)
    Write-Host "✅ Registration successful" -ForegroundColor Green
    $token = $response.token
    $email = $payload.email
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test login
Write-Host "2. Logging in..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = $email
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "✅ Login successful" -ForegroundColor Green
    $token = $loginResponse.token
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test me endpoint
Write-Host "3. Testing me endpoint..." -ForegroundColor Yellow
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

try {
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Me endpoint successful" -ForegroundColor Green
    Write-Host "   User ID: $($meResponse.data.userId)" -ForegroundColor White
    Write-Host "   Role: $($meResponse.data.role)" -ForegroundColor White
    Write-Host "   Requires Onboarding: $($meResponse.data.requiresOnboarding)" -ForegroundColor White
} catch {
    Write-Host "❌ Me endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test onboarding requirements first
Write-Host "4. Testing onboarding requirements..." -ForegroundColor Yellow
try {
    $requirementsResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/requirements" -Method GET -Headers $headers
    Write-Host "✅ Onboarding requirements successful" -ForegroundColor Green
    Write-Host "   User Type: $($requirementsResponse.data.userType)" -ForegroundColor White
    Write-Host "   Total Steps: $($requirementsResponse.data.totalSteps)" -ForegroundColor White
} catch {
    Write-Host "❌ Onboarding requirements failed" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    # Try to get the response body
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $errorBody" -ForegroundColor Yellow
    } catch {
        Write-Host "   Could not read response body" -ForegroundColor Yellow
    }
}

# Test onboarding status with detailed error
Write-Host "5. Testing onboarding status..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "✅ Onboarding status successful" -ForegroundColor Green
    Write-Host "   Is Completed: $($statusResponse.data.isCompleted)" -ForegroundColor White
    Write-Host "   Current Step: $($statusResponse.data.currentStep)" -ForegroundColor White
} catch {
    Write-Host "❌ Onboarding status failed" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    # Try to get the response body
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $errorBody" -ForegroundColor Yellow
    } catch {
        Write-Host "   Could not read response body" -ForegroundColor Yellow
    }
}

Write-Host "`nDebug test completed!" -ForegroundColor Green 