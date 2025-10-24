# Test Landlord Connection Endpoints
$baseUrl = "http://localhost:3001"

Write-Host "Testing Landlord Connection Endpoints" -ForegroundColor Green
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

# 2. Get all landlord connections
Write-Host "`n2. Getting all landlord connections..." -ForegroundColor Yellow
try {
    $connectionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/landlord" -Method GET -Headers $landlordHeaders
    Write-Host "Connections retrieved successfully!" -ForegroundColor Green
    Write-Host "Total connections: $($connectionsResponse.data.Count)" -ForegroundColor Cyan
    
    if ($connectionsResponse.data.Count -gt 0) {
        $firstConnection = $connectionsResponse.data[0]
        Write-Host "First connection:" -ForegroundColor Cyan
        Write-Host "  ID: $($firstConnection._id)" -ForegroundColor White
        Write-Host "  Status: $($firstConnection.status)" -ForegroundColor White
        Write-Host "  Tenant: $($firstConnection.tenantId.firstName) $($firstConnection.tenantId.lastName)" -ForegroundColor White
        Write-Host "  Property: $($firstConnection.propertyId.title)" -ForegroundColor White
        Write-Host "  Message: $($firstConnection.message)" -ForegroundColor White
        
        $connectionId = $firstConnection._id
        
        # 3. Accept connection (if pending)
        if ($firstConnection.status -eq "pending") {
            Write-Host "`n3. Accepting connection..." -ForegroundColor Yellow
            try {
                $acceptPayload = @{
                    responseMessage = "Welcome! I'd be happy to connect with you."
                }
                $acceptResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/$connectionId/accept" -Method PUT -Headers $landlordHeaders -Body ($acceptPayload | ConvertTo-Json)
                Write-Host "Connection accepted successfully!" -ForegroundColor Green
                Write-Host "Response: $($acceptResponse.message)" -ForegroundColor Cyan
            } catch {
                Write-Host "Failed to accept connection: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "`n3. Connection is not pending (status: $($firstConnection.status)), skipping accept" -ForegroundColor Yellow
        }
        
        # 4. Reject connection (example - would need a pending connection)
        Write-Host "`n4. Example: Rejecting a connection..." -ForegroundColor Yellow
        Write-Host "To reject a connection, use:" -ForegroundColor White
        Write-Host "PUT $baseUrl/api/connections/{connectionId}/reject" -ForegroundColor Gray
        Write-Host "Body: { `"responseMessage`": `"Sorry, not available at the moment.`" }" -ForegroundColor Gray
        
        # 5. Cancel connection (example)
        Write-Host "`n5. Example: Cancelling a connection..." -ForegroundColor Yellow
        Write-Host "To cancel a connection, use:" -ForegroundColor White
        Write-Host "PUT $baseUrl/api/connections/{connectionId}/cancel" -ForegroundColor Gray
        Write-Host "No body required" -ForegroundColor Gray
        
    } else {
        Write-Host "No connections found for this landlord" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Failed to get connections: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Get connections with filters
Write-Host "`n6. Getting pending connections only..." -ForegroundColor Yellow
try {
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/landlord?status=pending" -Method GET -Headers $landlordHeaders
    Write-Host "Pending connections: $($pendingResponse.data.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get pending connections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Landlord connection endpoints test completed!" -ForegroundColor Green
Write-Host "`n📋 Available Landlord Connection Endpoints:" -ForegroundColor Cyan
Write-Host "GET  /api/connections/landlord                    - Get all connections" -ForegroundColor White
Write-Host "GET  /api/connections/landlord?status=pending     - Get pending connections" -ForegroundColor White
Write-Host "GET  /api/connections/landlord?propertyId={id}    - Get connections for specific property" -ForegroundColor White
Write-Host "PUT  /api/connections/{id}/accept                 - Accept connection" -ForegroundColor White
Write-Host "PUT  /api/connections/{id}/reject                 - Reject connection" -ForegroundColor White
Write-Host "PUT  /api/connections/{id}/cancel                 - Cancel connection" -ForegroundColor White




















