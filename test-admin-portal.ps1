# Test script for admin portal functionality
Write-Host "=== Testing Admin Portal ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Login as admin user
$loginData = @{
    email = "admin@khayalami.com"
    password = "admin123"
} | ConvertTo-Json

try {
    Write-Host "Logging in as admin user..." -ForegroundColor Yellow
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        $userId = $loginResponse.data.user._id
        $userRole = $loginResponse.data.user.role
        
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "User ID: $userId" -ForegroundColor White
        Write-Host "Role: $userRole" -ForegroundColor White
        
        $headers = @{ Authorization = "Bearer $token" }
        
        # Test 1: Dashboard Stats
        Write-Host "`n1. Testing Dashboard Stats..." -ForegroundColor Cyan
        try {
            $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/dashboard/stats" -Method GET -Headers $headers
            Write-Host "✅ Dashboard stats retrieved!" -ForegroundColor Green
            Write-Host "   Total Tenants: $($dashboardResponse.data.overview.totalTenants)" -ForegroundColor White
            Write-Host "   Total Landlords: $($dashboardResponse.data.overview.totalLandlords)" -ForegroundColor White
            Write-Host "   Total Properties: $($dashboardResponse.data.overview.totalProperties)" -ForegroundColor White
            Write-Host "   Rented Properties: $($dashboardResponse.data.overview.rentedProperties)" -ForegroundColor White
            Write-Host "   Total Connections: $($dashboardResponse.data.overview.totalConnections)" -ForegroundColor White
            Write-Host "   Total Chats: $($dashboardResponse.data.overview.totalChats)" -ForegroundColor White
        } catch {
            Write-Host "❌ Dashboard stats failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test 2: Get Users
        Write-Host "`n2. Testing User Management..." -ForegroundColor Cyan
        try {
            $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/users?limit=5" -Method GET -Headers $headers
            Write-Host "✅ Users retrieved!" -ForegroundColor Green
            Write-Host "   Total Users: $($usersResponse.data.pagination.total)" -ForegroundColor White
            Write-Host "   Users on page: $($usersResponse.data.users.Count)" -ForegroundColor White
        } catch {
            Write-Host "❌ Users retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test 3: Get Properties
        Write-Host "`n3. Testing Property Management..." -ForegroundColor Cyan
        try {
            $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/properties?limit=5" -Method GET -Headers $headers
            Write-Host "✅ Properties retrieved!" -ForegroundColor Green
            Write-Host "   Total Properties: $($propertiesResponse.data.pagination.total)" -ForegroundColor White
            Write-Host "   Properties on page: $($propertiesResponse.data.properties.Count)" -ForegroundColor White
        } catch {
            Write-Host "❌ Properties retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test 4: Get Connections
        Write-Host "`n4. Testing Connection Management..." -ForegroundColor Cyan
        try {
            $connectionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/connections?limit=5" -Method GET -Headers $headers
            Write-Host "✅ Connections retrieved!" -ForegroundColor Green
            Write-Host "   Total Connections: $($connectionsResponse.data.pagination.total)" -ForegroundColor White
            Write-Host "   Connections on page: $($connectionsResponse.data.connections.Count)" -ForegroundColor White
        } catch {
            Write-Host "❌ Connections retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test 5: Analytics
        Write-Host "`n5. Testing Analytics..." -ForegroundColor Cyan
        try {
            $analyticsResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/analytics?period=30" -Method GET -Headers $headers
            Write-Host "✅ Analytics retrieved!" -ForegroundColor Green
            Write-Host "   Period: $($analyticsResponse.data.period)" -ForegroundColor White
            Write-Host "   User Growth Data Points: $($analyticsResponse.data.userGrowth.Count)" -ForegroundColor White
        } catch {
            Write-Host "❌ Analytics failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Admin Portal Test Complete ===" -ForegroundColor Green
Write-Host "`nAvailable Admin Endpoints:" -ForegroundColor Yellow
Write-Host "GET /api/admin/dashboard/stats - Dashboard statistics" -ForegroundColor White
Write-Host "GET /api/admin/analytics - System analytics" -ForegroundColor White
Write-Host "GET /api/admin/users - User management" -ForegroundColor White
Write-Host "GET /api/admin/properties - Property management" -ForegroundColor White
Write-Host "GET /api/admin/connections - Connection management" -ForegroundColor White
Write-Host "PUT /api/admin/users/:userId/status - Update user status" -ForegroundColor White
Write-Host "PUT /api/admin/properties/:propertyId/status - Update property status" -ForegroundColor White



























