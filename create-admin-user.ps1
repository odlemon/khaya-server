# Script to create admin user
Write-Host "=== Creating Admin User ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Admin user data
$adminData = @{
    firstName = "Admin"
    lastName = "User"
    email = "admin@khayalami.com"
    password = "admin123"
    role = "admin"
    phoneNumber = "+254700000000"
    isVerified = $true
    isActive = $true
} | ConvertTo-Json

try {
    Write-Host "Creating admin user..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $adminData -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
        Write-Host "Email: admin@khayalami.com" -ForegroundColor White
        Write-Host "Password: admin123" -ForegroundColor White
        Write-Host "Role: admin" -ForegroundColor White
        Write-Host "User ID: $($response.data.user._id)" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to create admin user: $($response.message)" -ForegroundColor Red
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠️  Admin user already exists!" -ForegroundColor Yellow
        Write-Host "Email: admin@khayalami.com" -ForegroundColor White
        Write-Host "Password: admin123" -ForegroundColor White
    } else {
        Write-Host "❌ Error creating admin user: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Admin User Setup Complete ===" -ForegroundColor Green
















