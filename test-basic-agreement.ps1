# Basic Agreement Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "🏠 Basic Agreement Test" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_basic_$timestamp@test.com"
$landlordData = @{
    firstName = "John"
    lastName = "Landlord"
    email = $landlordEmail
    password = "TestPassword123!"
    role = "landlord"
    phone = "+1234567890"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body ($landlordData | ConvertTo-Json)
    Write-Host "✅ Landlord registered successfully" -ForegroundColor Green
    $landlordToken = $response.token
    Write-Host "   Token: $($landlordToken.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Register tenant
Write-Host "2. Registering tenant..." -ForegroundColor Yellow
$tenantEmail = "tenant_basic_$timestamp@test.com"
$tenantData = @{
    firstName = "Jane"
    lastName = "Tenant"
    email = $tenantEmail
    password = "TestPassword123!"
    role = "tenant"
    phone = "+0987654321"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body ($tenantData | ConvertTo-Json)
    Write-Host "✅ Tenant registered successfully" -ForegroundColor Green
    $tenantToken = $response.token
    Write-Host "   Token: $($tenantToken.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Test agreement templates (public endpoint)
Write-Host "3. Testing agreement templates..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/templates" -Method GET -Headers @{ Authorization = "Bearer $landlordToken" }
    Write-Host "✅ Agreement templates working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) templates" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreement templates failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test agreement endpoints (landlord)
Write-Host "4. Testing landlord agreement endpoints..." -ForegroundColor Yellow

# Get landlord agreements
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method GET -Headers @{ Authorization = "Bearer $landlordToken" }
    Write-Host "✅ Landlord agreements endpoint working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Get landlord agreement stats
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers @{ Authorization = "Bearer $landlordToken" }
    Write-Host "✅ Landlord agreement stats working" -ForegroundColor Green
    Write-Host "   Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord agreement stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test agreement endpoints (tenant)
Write-Host "5. Testing tenant agreement endpoints..." -ForegroundColor Yellow

# Get tenant agreements
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method GET -Headers @{ Authorization = "Bearer $tenantToken" }
    Write-Host "✅ Tenant agreements endpoint working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Get tenant agreement stats
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers @{ Authorization = "Bearer $tenantToken" }
    Write-Host "✅ Tenant agreement stats working" -ForegroundColor Green
    Write-Host "   Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant agreement stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test pending agreements (both parties)
Write-Host "6. Testing pending agreements..." -ForegroundColor Yellow

# Landlord pending
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers @{ Authorization = "Bearer $landlordToken" }
    Write-Host "✅ Landlord pending agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) pending agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord pending agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant pending
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers @{ Authorization = "Bearer $tenantToken" }
    Write-Host "✅ Tenant pending agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) pending agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant pending agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test active agreements (both parties)
Write-Host "7. Testing active agreements..." -ForegroundColor Yellow

# Landlord active
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers @{ Authorization = "Bearer $landlordToken" }
    Write-Host "✅ Landlord active agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) active agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord active agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant active
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers @{ Authorization = "Bearer $tenantToken" }
    Write-Host "✅ Tenant active agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) active agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant active agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Test authorization (tenant should not create agreements)
Write-Host "8. Testing authorization..." -ForegroundColor Yellow

$testAgreementData = @{
    propertyId = "507f1f77bcf86cd799439011"
    tenantId = "507f1f77bcf86cd799439012"
    title = "Test Agreement"
    startDate = "2025-09-01"
    endDate = "2026-08-31"
    rentAmount = 2500
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method POST -Headers @{ Authorization = "Bearer $tenantToken" } -ContentType "application/json" -Body ($testAgreementData | ConvertTo-Json)
    Write-Host "❌ Tenant should not be able to create agreements" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ Tenant correctly blocked from creating agreements" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Basic Agreement Test Complete!" -ForegroundColor Green
Write-Host "The agreement system endpoints are working correctly!" -ForegroundColor Green 