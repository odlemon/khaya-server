# Test Complete Connection Flow
$baseUrl = "http://localhost:3001"

Write-Host "Testing Complete Connection Flow" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

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

# 2. Get properties (before connection)
Write-Host "`n2. Getting properties (before connection)..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    
    if ($propertiesResponse.data.Count -gt 0) {
        $firstProperty = $propertiesResponse.data[0]
        $propertyId = $firstProperty._id
        $landlordId = $firstProperty.landlordId._id
        
        Write-Host "First property details:" -ForegroundColor White
        Write-Host "  Property ID: $propertyId" -ForegroundColor White
        Write-Host "  Landlord ID: $landlordId" -ForegroundColor White
        Write-Host "  Title: $($firstProperty.title)" -ForegroundColor White
        Write-Host "  Is Connected: $($firstProperty.isConnected)" -ForegroundColor White
        Write-Host "  Connection State: $($firstProperty.connectionState)" -ForegroundColor White
    } else {
        Write-Host "No properties found!" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Create connection request
Write-Host "`n3. Creating connection request..." -ForegroundColor Yellow
try {
    $connectionPayload = @{
        landlordId = $landlordId
        propertyId = $propertyId
        message = "Hi, I'm interested in this property. Can we schedule a viewing?"
    }
    $connectionResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/send-request" -Method POST -Headers $tenantHeaders -Body ($connectionPayload | ConvertTo-Json)
    Write-Host "Connection request created successfully!" -ForegroundColor Green
    Write-Host "Response: $($connectionResponse.message)" -ForegroundColor White
} catch {
    Write-Host "Failed to create connection: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit
}

# 4. Get properties again (after connection)
Write-Host "`n4. Getting properties (after connection)..." -ForegroundColor Yellow
try {
    $propertiesResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    
    if ($propertiesResponse2.data.Count -gt 0) {
        $firstProperty2 = $propertiesResponse2.data[0]
        
        Write-Host "Updated property details:" -ForegroundColor White
        Write-Host "  Title: $($firstProperty2.title)" -ForegroundColor White
        Write-Host "  Is Connected: $($firstProperty2.isConnected)" -ForegroundColor White
        Write-Host "  Connection State: $($firstProperty2.connectionState)" -ForegroundColor White
        
        # Check if connection status changed
        if ($firstProperty2.isConnected -eq $true -and $firstProperty2.connectionState -eq "pending") {
            Write-Host "  ✅ Connection status updated correctly!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Connection status not updated as expected" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`nTest complete!" -ForegroundColor Green















