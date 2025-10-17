# Debug Connections
$baseUrl = "http://localhost:3001"

Write-Host "Debugging Connections" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

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

# 2. Get properties to get property and landlord IDs
Write-Host "2. Getting properties..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $tenantHeaders
    Write-Host "Properties retrieved successfully!" -ForegroundColor Green
    
    if ($propertiesResponse.data.Count -gt 0) {
        $firstProperty = $propertiesResponse.data[0]
        $propertyId = $firstProperty._id
        $landlordId = $firstProperty.landlordId._id
        
        Write-Host "Property ID: $propertyId" -ForegroundColor Cyan
        Write-Host "Landlord ID: $landlordId" -ForegroundColor Cyan
        Write-Host "Tenant ID: $tenantUserId" -ForegroundColor Cyan
        Write-Host "Connection Status: $($firstProperty.connectionStatus)" -ForegroundColor Cyan
        Write-Host "Is Connected: $($firstProperty.isConnected)" -ForegroundColor Cyan
        Write-Host "Connection State: $($firstProperty.connectionState)" -ForegroundColor Cyan
    } else {
        Write-Host "No properties found!" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "Failed to get properties: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Try to create a connection and see the exact error
Write-Host "3. Attempting to create connection..." -ForegroundColor Yellow
try {
    $connectionPayload = @{
        propertyId = $propertyId
        landlordId = $landlordId
        message = "Debug test connection request"
    }
    
    $connectionResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections" -Method POST -Headers $tenantHeaders -Body ($connectionPayload | ConvertTo-Json -Depth 3)
    Write-Host "Connection created successfully!" -ForegroundColor Green
    Write-Host "Connection ID: $($connectionResponse.data._id)" -ForegroundColor Cyan
    Write-Host "Status: $($connectionResponse.data.status)" -ForegroundColor Cyan
    Write-Host "Is Active: $($connectionResponse.data.isActive)" -ForegroundColor Cyan
} catch {
    Write-Host "Connection creation failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details from the error response
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Response: $errorBody" -ForegroundColor Red
    }
}

Write-Host "Debug complete!" -ForegroundColor Green















