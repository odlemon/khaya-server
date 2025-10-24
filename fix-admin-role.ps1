# Script to fix admin user role
Write-Host "=== Fixing Admin User Role ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Login as admin user first
$loginData = @{
    email = "admin@khayalami.com"
    password = "admin123"
} | ConvertTo-Json

try {
    Write-Host "Logging in as admin user..." -ForegroundColor Yellow
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        $currentRole = $loginResponse.data.user.role
        
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "Current Role: $currentRole" -ForegroundColor White
        
        if ($currentRole -eq "admin") {
            Write-Host "✅ User is already an admin!" -ForegroundColor Green
        } else {
            Write-Host "Updating role to admin..." -ForegroundColor Yellow
            
            # Update role to admin
            $updateData = @{
                email = "admin@khayalami.com"
                role = "admin"
            } | ConvertTo-Json
            
            $headers = @{ Authorization = "Bearer $token" }
            
            $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/update-role" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers
            
            if ($updateResponse.success) {
                Write-Host "✅ Role updated to admin successfully!" -ForegroundColor Green
                Write-Host "New Role: $($updateResponse.data.role)" -ForegroundColor White
            } else {
                Write-Host "❌ Failed to update role: $($updateResponse.message)" -ForegroundColor Red
            }
        }
        
        # Test admin dashboard access
        Write-Host "`nTesting admin dashboard access..." -ForegroundColor Cyan
        
        try {
            $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/dashboard/stats" -Method GET -Headers $headers
            Write-Host "✅ Admin dashboard accessible!" -ForegroundColor Green
            Write-Host "Total Tenants: $($dashboardResponse.data.overview.totalTenants)" -ForegroundColor White
            Write-Host "Total Landlords: $($dashboardResponse.data.overview.totalLandlords)" -ForegroundColor White
            Write-Host "Total Properties: $($dashboardResponse.data.overview.totalProperties)" -ForegroundColor White
            Write-Host "Rented Properties: $($dashboardResponse.data.overview.rentedProperties)" -ForegroundColor White
        } catch {
            Write-Host "❌ Admin dashboard still not accessible: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Admin Role Fix Complete ===" -ForegroundColor Green
















