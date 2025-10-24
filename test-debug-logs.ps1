# Test Debug Logs
$baseUrl = "http://localhost:3001"

Write-Host "Testing Debug Logs" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green

# Login as tenant
Write-Host "1. Logging in as tenant..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "nyasha@tenant.io"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "Tenant login successful!" -ForegroundColor Green
    $tenantToken = $loginResponse.token
} catch {
    Write-Host "Failed to login tenant: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$tenantHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $tenantToken"
}

# Get properties (this will trigger debug logs)
Write-Host "`n2. Getting properties (check server console for debug logs)..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    
    if ($propertiesResponse.data.Count -gt 0) {
        $firstProperty = $propertiesResponse.data[0]
        Write-Host "First property response:" -ForegroundColor White
        Write-Host "  Is Connected: $($firstProperty.isConnected)" -ForegroundColor White
        Write-Host "  Connection State: $($firstProperty.connectionState)" -ForegroundColor White
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCheck your server terminal for debug logs!" -ForegroundColor Cyan




















