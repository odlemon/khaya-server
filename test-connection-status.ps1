# Test Connection Status
$baseUrl = "http://localhost:3001"

Write-Host "Testing Connection Status" -ForegroundColor Green
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
} catch {
    Write-Host "Failed to login tenant: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$tenantHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $tenantToken"
}

# 2. Get properties first to see current connection status
Write-Host "2. Getting properties (should show null connection status)..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    Write-Host "Found $($propertiesResponse.data.Count) properties" -ForegroundColor Cyan
    
    # Show connection status for first property
    if ($propertiesResponse.data.Count -gt 0) {
        $firstProperty = $propertiesResponse.data[0]
                 Write-Host "First property connection status:" -ForegroundColor White
         Write-Host "  Property: $($firstProperty.title)" -ForegroundColor White
         Write-Host "  Connection Status: $($firstProperty.connectionStatus)" -ForegroundColor White
         Write-Host "  Is Connected: $($firstProperty.isConnected)" -ForegroundColor White
         Write-Host "  Connection State: $($firstProperty.connectionState)" -ForegroundColor White
         Write-Host "  (Should be 'false' if no active connection exists)" -ForegroundColor Gray
        
        $propertyId = $firstProperty._id
        $landlordId = $firstProperty.landlordId._id
    } else {
        Write-Host "No properties found!" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Create a connection request
Write-Host "3. Creating connection request..." -ForegroundColor Yellow
try {
    $connectionPayload = @{
        propertyId = $propertyId
        landlordId = $landlordId
        message = "I'm interested in this property and would like to schedule a viewing."
    }
    
    $connectionResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections" -Method POST -Headers $tenantHeaders -Body ($connectionPayload | ConvertTo-Json -Depth 3)
    Write-Host "Connection request created successfully!" -ForegroundColor Green
    Write-Host "Connection status: $($connectionResponse.data.status)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to create connection: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Get properties again to see updated connection status
Write-Host "4. Getting properties again (should show pending connection status)..." -ForegroundColor Yellow
try {
    $propertiesResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    
    # Show connection status for the property we connected to
    $connectedProperty = $propertiesResponse2.data | Where-Object { $_._id -eq $propertyId }
    if ($connectedProperty) {
        Write-Host "Updated property connection status:" -ForegroundColor White
        Write-Host "  Property: $($connectedProperty.title)" -ForegroundColor White
        Write-Host "  Connection Status: $($connectedProperty.connectionStatus.status)" -ForegroundColor White
        Write-Host "  Is Connected: $($connectedProperty.isConnected)" -ForegroundColor White
        Write-Host "  Connection State: $($connectedProperty.connectionState)" -ForegroundColor White
        Write-Host "  Can Chat: $($connectedProperty.connectionStatus.canChat)" -ForegroundColor White
        Write-Host "  Message: $($connectedProperty.connectionStatus.message)" -ForegroundColor White
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Connection Status test complete!" -ForegroundColor Green
