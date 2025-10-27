# Simple script to fix admin user role
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
            
            # Update role to admin using setup endpoint
            $updateData = @{
                email = "admin@khayalami.com"
                role = "admin"
            } | ConvertTo-Json
            
            $headers = @{ Authorization = "Bearer $token" }
            
            $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/setup/update-role" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers
            
            if ($updateResponse.success) {
                Write-Host "✅ Role updated to admin successfully!" -ForegroundColor Green
                Write-Host "New Role: $($updateResponse.data.role)" -ForegroundColor White
            } else {
                Write-Host "❌ Failed to update role: $($updateResponse.message)" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Admin Role Fix Complete ===" -ForegroundColor Green





















