# Correct token test
Write-Host "=== Correct Token Test ===" -ForegroundColor Green

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
    
    if ($loginResponse.success -and $loginResponse.token) {
        $token = $loginResponse.token
        Write-Host "Token length: $($token.Length)" -ForegroundColor White
        Write-Host "Token starts with: $($token.Substring(0, [Math]::Min(20, $token.Length)))" -ForegroundColor White
        
        # Test the token
        Write-Host "`nTesting token with admin properties..." -ForegroundColor Yellow
        
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/properties?page=1&limit=5" -Method GET -Headers $headers
        Write-Host "✅ Success! Properties: $($response.data.pagination.total)" -ForegroundColor Green
        
        # Test dashboard
        Write-Host "`nTesting dashboard..." -ForegroundColor Yellow
        $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/dashboard/stats" -Method GET -Headers $headers
        Write-Host "✅ Dashboard Success!" -ForegroundColor Green
        Write-Host "Total Tenants: $($dashboardResponse.data.overview.totalTenants)" -ForegroundColor White
        Write-Host "Total Landlords: $($dashboardResponse.data.overview.totalLandlords)" -ForegroundColor White
        Write-Host "Total Properties: $($dashboardResponse.data.overview.totalProperties)" -ForegroundColor White
        Write-Host "Total Agreements: $($dashboardResponse.data.overview.totalAgreements)" -ForegroundColor White
        
    } else {
        Write-Host "❌ No token in response" -ForegroundColor Red
        Write-Host "Available fields: $($loginResponse.PSObject.Properties.Name -join ', ')" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

























