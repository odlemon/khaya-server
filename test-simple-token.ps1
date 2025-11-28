# Simple token test
Write-Host "=== Simple Token Test ===" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Login first
$loginData = @{
    email = "admin@khayalami.com"
    password = "admin123"
} | ConvertTo-Json

try {
    Write-Host "Logging in..." -ForegroundColor Yellow
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    Write-Host "Login Response:" -ForegroundColor Cyan
    Write-Host "Success: $($loginResponse.success)" -ForegroundColor White
    Write-Host "Message: $($loginResponse.message)" -ForegroundColor White
    
    if ($loginResponse.success -and $loginResponse.data -and $loginResponse.data.token) {
        $token = $loginResponse.data.token
        Write-Host "Token length: $($token.Length)" -ForegroundColor White
        Write-Host "Token starts with: $($token.Substring(0, [Math]::Min(20, $token.Length)))" -ForegroundColor White
        
        # Test the token
        Write-Host "`nTesting token..." -ForegroundColor Yellow
        
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/properties?page=1&limit=5" -Method GET -Headers $headers
        Write-Host "✅ Success! Properties: $($response.data.pagination.total)" -ForegroundColor Green
        
    } else {
        Write-Host "❌ No token in response" -ForegroundColor Red
        Write-Host "Response data: $($loginResponse.data | ConvertTo-Json)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}



























