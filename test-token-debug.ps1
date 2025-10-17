# Debug script for token authentication
Write-Host "=== Testing Token Authentication ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Login first to get token
$loginData = @{
    email = "admin@khayalami.com"
    password = "admin123"
} | ConvertTo-Json

try {
    Write-Host "1. Logging in..." -ForegroundColor Yellow
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor White
        
        # Test different ways of sending the token
        Write-Host "`n2. Testing token in Authorization header..." -ForegroundColor Yellow
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/properties?page=1&limit=5" -Method GET -Headers $headers
            Write-Host "✅ Request successful!" -ForegroundColor Green
            Write-Host "Properties found: $($response.data.pagination.total)" -ForegroundColor White
        } catch {
            Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
            
            # Try to get response body
            if ($_.Exception.Response) {
                try {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $responseBody = $reader.ReadToEnd()
                    Write-Host "Response Body: $responseBody" -ForegroundColor Red
                } catch {
                    Write-Host "Could not read response body" -ForegroundColor Red
                }
            }
        }
        
        # Test with curl-style headers
        Write-Host "`n3. Testing with different header format..." -ForegroundColor Yellow
        
        try {
            $response2 = Invoke-WebRequest -Uri "$baseUrl/api/admin/properties?page=1&limit=5" -Method GET -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json"
            Write-Host "✅ Alternative request successful!" -ForegroundColor Green
            $responseData = $response2.Content | ConvertFrom-Json
            Write-Host "Properties found: $($responseData.data.pagination.total)" -ForegroundColor White
        } catch {
            Write-Host "❌ Alternative request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Token Debug Complete ===" -ForegroundColor Green











