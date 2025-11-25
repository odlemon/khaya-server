# Debug Landlord Connections Issue
$baseUrl = "http://localhost:3001"

Write-Host "Debugging Landlord Connections Issue" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# 1. Login as landlord
Write-Host "1. Logging in as landlord..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "test.landlord@khayalami.com"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "Landlord login successful!" -ForegroundColor Green
    $landlordToken = $loginResponse.token
    $landlordUserId = $loginResponse.user.userId
    $landlordRole = $loginResponse.user.role
    
    Write-Host "User ID: $landlordUserId" -ForegroundColor Cyan
    Write-Host "Role: $landlordRole" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to login landlord: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$landlordHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $landlordToken"
}

# 2. Check if there are any connections in the database
Write-Host "`n2. Checking all connections in database..." -ForegroundColor Yellow
try {
    # First, let's check if there are any connections at all
    $allConnectionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/stats" -Method GET -Headers $landlordHeaders
    Write-Host "Connection stats:" -ForegroundColor Cyan
    Write-Host "  Total: $($allConnectionsResponse.data.total)" -ForegroundColor White
    Write-Host "  Pending: $($allConnectionsResponse.data.pending)" -ForegroundColor White
    Write-Host "  Accepted: $($allConnectionsResponse.data.accepted)" -ForegroundColor White
    Write-Host "  Rejected: $($allConnectionsResponse.data.rejected)" -ForegroundColor White
} catch {
    Write-Host "Failed to get connection stats: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Try to get landlord connections
Write-Host "`n3. Getting landlord connections..." -ForegroundColor Yellow
try {
    $connectionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/landlord" -Method GET -Headers $landlordHeaders
    Write-Host "Connections retrieved successfully!" -ForegroundColor Green
    Write-Host "Total connections: $($connectionsResponse.data.Count)" -ForegroundColor Cyan
    
    if ($connectionsResponse.data.Count -gt 0) {
        Write-Host "First connection details:" -ForegroundColor Cyan
        $firstConnection = $connectionsResponse.data[0]
        Write-Host "  ID: $($firstConnection._id)" -ForegroundColor White
        Write-Host "  Status: $($firstConnection.status)" -ForegroundColor White
        Write-Host "  Tenant: $($firstConnection.tenantId.firstName) $($firstConnection.tenantId.lastName)" -ForegroundColor White
        Write-Host "  Property: $($firstConnection.propertyId.title)" -ForegroundColor White
    } else {
        Write-Host "No connections found for this landlord" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to get landlord connections: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

# 4. Check if there are any properties for this landlord
Write-Host "`n4. Checking landlord properties..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $landlordHeaders
    Write-Host "Landlord properties: $($propertiesResponse.data.Count)" -ForegroundColor Cyan
    
    if ($propertiesResponse.data.Count -gt 0) {
        Write-Host "First property:" -ForegroundColor Cyan
        $firstProperty = $propertiesResponse.data[0]
        Write-Host "  ID: $($firstProperty._id)" -ForegroundColor White
        Write-Host "  Title: $($firstProperty.title)" -ForegroundColor White
    }
} catch {
    Write-Host "Failed to get landlord properties: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Check if there are any connections for specific properties
Write-Host "`n5. Checking connections for specific properties..." -ForegroundColor Yellow
try {
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $landlordHeaders
    
    if ($propertiesResponse.data.Count -gt 0) {
        $firstPropertyId = $propertiesResponse.data[0]._id
        Write-Host "Checking connections for property: $firstPropertyId" -ForegroundColor Cyan
        
        $propertyConnectionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/landlord?propertyId=$firstPropertyId" -Method GET -Headers $landlordHeaders
        Write-Host "Connections for this property: $($propertyConnectionsResponse.data.Count)" -ForegroundColor White
    }
} catch {
    Write-Host "Failed to get property-specific connections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Debug completed!" -ForegroundColor Green
Write-Host "`nPossible issues:" -ForegroundColor Yellow
Write-Host "1. No connections exist in the database" -ForegroundColor White
Write-Host "2. Connections exist but not for this landlord" -ForegroundColor White
Write-Host "3. Database query issue" -ForegroundColor White
Write-Host "4. Authentication/authorization issue" -ForegroundColor White





























