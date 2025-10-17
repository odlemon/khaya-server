# Simple server status test
$baseUrl = "http://localhost:3001/api"

Write-Host "Server Status Test" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# 1. Test basic connectivity
Write-Host "1. Testing server connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/properties" -Method GET
    Write-Host "Server is responding!" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 1)" -ForegroundColor Gray
} catch {
    Write-Host "Server connectivity failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Response Body: $($_.Exception.Response)" -ForegroundColor Red
    exit
}

# 2. Test user registration
Write-Host "2. Testing user registration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$testEmail = "test_status_$timestamp@test.com"
$userData = @{
    firstName = "Test"
    lastName = "User"
    email = $testEmail
    password = "TestPassword123!"
    role = "landlord"
    phone = "+1234567890"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body ($userData | ConvertTo-Json)
    Write-Host "User registration successful!" -ForegroundColor Green
    Write-Host "   User ID: $($response._id)" -ForegroundColor Gray
    Write-Host "   Token: $($response.token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "User registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "   Response Body: $($_.Exception.Response)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Write-Host "Server Status Test Complete!" -ForegroundColor Green
Write-Host "The server is running and responding correctly!" -ForegroundColor Green 