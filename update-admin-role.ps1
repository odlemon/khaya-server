# Script to update admin user role
Write-Host "=== Updating Admin User Role ===" -ForegroundColor Green

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
        $currentRole = $loginResponse.data.user.role
        
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "User ID: $userId" -ForegroundColor White
        Write-Host "Current Role: $currentRole" -ForegroundColor White
        
        if ($currentRole -eq "admin") {
            Write-Host "✅ User is already an admin!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  User role needs to be updated to 'admin' in the database" -ForegroundColor Yellow
            Write-Host "Please run this MongoDB command:" -ForegroundColor Cyan
            Write-Host "db.users.updateOne({email: 'admin@khayalami.com'}, {`$set: {role: 'admin'}})" -ForegroundColor White
        }
        
        Write-Host "`n=== Testing Admin Endpoints ===" -ForegroundColor Cyan
        
        # Test admin dashboard
        $headers = @{ Authorization = "Bearer $token" }
        
        try {
            $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/dashboard/stats" -Method GET -Headers $headers
            Write-Host "✅ Admin dashboard accessible!" -ForegroundColor Green
            Write-Host "Total Tenants: $($dashboardResponse.data.overview.totalTenants)" -ForegroundColor White
            Write-Host "Total Landlords: $($dashboardResponse.data.overview.totalLandlords)" -ForegroundColor White
            Write-Host "Total Properties: $($dashboardResponse.data.overview.totalProperties)" -ForegroundColor White
            Write-Host "Rented Properties: $($dashboardResponse.data.overview.rentedProperties)" -ForegroundColor White
        } catch {
            if ($_.Exception.Response.StatusCode -eq 403) {
                Write-Host "❌ Access denied - user role needs to be updated to 'admin'" -ForegroundColor Red
            } else {
                Write-Host "❌ Error accessing admin dashboard: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Admin Setup Complete ===" -ForegroundColor Green











