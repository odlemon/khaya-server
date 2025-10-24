# Test Tenant Properties
$baseUrl = "http://localhost:3001"

Write-Host "Testing Tenant Properties" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

# 1. Login as tenant
Write-Host "1. Logging in as tenant..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "nyasha@tenant.io"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "Tenant login successful!" -ForegroundColor Green
    $tenantToken = $loginResponse.token
    $tenantUserId = $loginResponse.user.userId
    $tenantRole = $loginResponse.user.role
    
    Write-Host "User ID: $tenantUserId" -ForegroundColor Cyan
    Write-Host "User Role: $tenantRole" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to login tenant: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$tenantHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $tenantToken"
}

# 2. Get properties
Write-Host "2. Getting properties..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    
    if ($propertiesResponse.data.Count -gt 0) {
        $firstProperty = $propertiesResponse.data[0]
        Write-Host "First property details:" -ForegroundColor White
        Write-Host "  Title: $($firstProperty.title)" -ForegroundColor White
        Write-Host "  Is Connected: $($firstProperty.isConnected)" -ForegroundColor White
        Write-Host "  Connection State: $($firstProperty.connectionState)" -ForegroundColor White
        
        # Check if connectionStatus field exists (it shouldn't)
        if ($firstProperty.PSObject.Properties.Name -contains "connectionStatus") {
            Write-Host "  ❌ connectionStatus field still exists: $($firstProperty.connectionStatus)" -ForegroundColor Red
        } else {
            Write-Host "  ✅ connectionStatus field removed successfully" -ForegroundColor Green
        }
        
        # Check if we have the 2 fields we want
        if ($firstProperty.PSObject.Properties.Name -contains "isConnected" -and $firstProperty.PSObject.Properties.Name -contains "connectionState") {
            Write-Host "  ✅ isConnected and connectionState fields present" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Missing required fields" -ForegroundColor Red
        }
    } else {
        Write-Host "No properties found!" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "Test complete!" -ForegroundColor Green




















