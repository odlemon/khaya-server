# Script to create admin user directly via database
Write-Host "=== Creating Admin User Directly ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# First, let's try to register as a landlord, then we'll update the role
$adminData = @{
    firstName = "Admin"
    lastName = "User"
    email = "admin@khayalami.com"
    password = "admin123"
    role = "landlord"
    phone = "+254700000000"
} | ConvertTo-Json

try {
    Write-Host "Creating admin user as landlord first..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $adminData -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ User created successfully!" -ForegroundColor Green
        Write-Host "Now updating role to admin..." -ForegroundColor Yellow
        
        # Get the token for the created user
        $loginData = @{
            email = "admin@khayalami.com"
            password = "admin123"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        
        if ($loginResponse.success) {
            $token = $loginResponse.data.token
            $userId = $loginResponse.data.user._id
            
            Write-Host "✅ Login successful! Token obtained." -ForegroundColor Green
            Write-Host "User ID: $userId" -ForegroundColor White
            
            # Now we need to manually update the user role in the database
            # Since we don't have a direct admin endpoint, we'll create a simple script
            Write-Host "`n=== Admin User Created ===" -ForegroundColor Green
            Write-Host "Email: admin@khayalami.com" -ForegroundColor White
            Write-Host "Password: admin123" -ForegroundColor White
            Write-Host "Current Role: landlord (needs to be updated to admin in database)" -ForegroundColor Yellow
            Write-Host "User ID: $userId" -ForegroundColor White
            Write-Host "Token: $token" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Failed to create user: $($response.message)" -ForegroundColor Red
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠️  User already exists!" -ForegroundColor Yellow
        
        # Try to login
        $loginData = @{
            email = "admin@khayalami.com"
            password = "admin123"
        } | ConvertTo-Json
        
        try {
            $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
            if ($loginResponse.success) {
                Write-Host "✅ Login successful!" -ForegroundColor Green
                Write-Host "Email: admin@khayalami.com" -ForegroundColor White
                Write-Host "Password: admin123" -ForegroundColor White
                Write-Host "User ID: $($loginResponse.data.user._id)" -ForegroundColor White
                Write-Host "Current Role: $($loginResponse.data.user.role)" -ForegroundColor White
            }
        } catch {
            Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Error creating user: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Update the user role to 'admin' in the database" -ForegroundColor White
Write-Host "2. Create admin portal endpoints" -ForegroundColor White
Write-Host "3. Test admin functionality" -ForegroundColor White











