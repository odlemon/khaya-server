# Test admin role fix with detailed error info
Write-Host "=== Testing Admin Role Fix ===" -ForegroundColor Green

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
        $userId = $loginResponse.data.user._id
        
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "User ID: $userId" -ForegroundColor White
        Write-Host "Current Role: '$currentRole'" -ForegroundColor White
        
        # Try to update role
        Write-Host "`nAttempting to update role..." -ForegroundColor Yellow
        
        $updateData = @{
            email = "admin@khayalami.com"
            role = "admin"
        } | ConvertTo-Json
        
        $headers = @{ Authorization = "Bearer $token" }
        
        try {
            $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/setup/update-role" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers
            Write-Host "✅ Role updated successfully!" -ForegroundColor Green
            Write-Host "New Role: $($updateResponse.data.role)" -ForegroundColor White
        } catch {
            Write-Host "❌ Update failed with status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            
            # Try to get more details
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response body: $responseBody" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Manual Fix Instructions ===" -ForegroundColor Cyan
Write-Host "If the above failed, you can manually update the user role:" -ForegroundColor White
Write-Host "1. Connect to your MongoDB database" -ForegroundColor White
Write-Host "2. Run this command:" -ForegroundColor White
Write-Host "   db.users.updateOne({email: 'admin@khayalami.com'}, {`$set: {role: 'admin'}})" -ForegroundColor Yellow
Write-Host "3. Or use MongoDB Compass/Studio 3T to update the document" -ForegroundColor White

























