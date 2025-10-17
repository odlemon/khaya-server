# Test Authentication and User Management
$baseUrl = "http://localhost:3001"

Write-Host "Testing Authentication and User Management" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# 1. Register a new landlord
Write-Host "1. Registering a new landlord..." -ForegroundColor Yellow
$landlordPayload = @{
    firstName = "John"
    lastName = "Landlord"
    email = "john.landlord@test.com"
    password = "password123"
    phone = "+27123456789"
    role = "landlord"
}

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($landlordPayload | ConvertTo-Json)
    Write-Host "Landlord registered successfully!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.data.user._id)" -ForegroundColor Cyan
    $landlordToken = $registerResponse.token
} catch {
    Write-Host "Failed to register landlord: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Register a new tenant
Write-Host "2. Registering a new tenant..." -ForegroundColor Yellow
$tenantPayload = @{
    firstName = "Jane"
    lastName = "Tenant"
    email = "jane.tenant@test.com"
    password = "password123"
    phone = "+27987654321"
    role = "tenant"
}

try {
    $tenantRegisterResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($tenantPayload | ConvertTo-Json)
    Write-Host "Tenant registered successfully!" -ForegroundColor Green
    Write-Host "User ID: $($tenantRegisterResponse.data.user._id)" -ForegroundColor Cyan
    $tenantToken = $tenantRegisterResponse.token
} catch {
    Write-Host "Failed to register tenant: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Login as landlord
Write-Host "3. Logging in as landlord..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "john.landlord@test.com"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "Landlord login successful!" -ForegroundColor Green
    $landlordToken = $loginResponse.token
} catch {
    Write-Host "Failed to login landlord: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Get user profile
Write-Host "4. Getting landlord profile..." -ForegroundColor Yellow
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $landlordToken"
}

try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers
    Write-Host "Profile retrieved successfully!" -ForegroundColor Green
    Write-Host "User Details:" -ForegroundColor Cyan
    Write-Host "  Name: $($profileResponse.data.firstName) $($profileResponse.data.lastName)" -ForegroundColor White
    Write-Host "  Email: $($profileResponse.data.email)" -ForegroundColor White
    Write-Host "  Role: $($profileResponse.data.role)" -ForegroundColor White
    Write-Host "  Phone: $($profileResponse.data.phone)" -ForegroundColor White
    Write-Host "  Is Verified: $($profileResponse.data.isVerified)" -ForegroundColor White
    Write-Host "  Is Active: $($profileResponse.data.isActive)" -ForegroundColor White
} catch {
    Write-Host "Failed to get profile: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test role-based access (tenant trying to access landlord features)
Write-Host "5. Testing role-based access..." -ForegroundColor Yellow
$tenantHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $tenantToken"
}

try {
    $testResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $tenantHeaders
    Write-Host "Unexpected: Tenant was able to access landlord features" -ForegroundColor Red
} catch {
    Write-Host "Correctly blocked: Tenant cannot access landlord features" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "Authentication and User Management tests complete!" -ForegroundColor Green 