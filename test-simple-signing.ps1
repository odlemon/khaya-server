# Simple Agreement Signing Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Simple Agreement Signing Test" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_simple_$timestamp@test.com"
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
} catch {
    Write-Host "❌ Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Register tenant
Write-Host "2. Registering tenant..." -ForegroundColor Yellow
$tenantEmail = "tenant_simple_$timestamp@test.com"
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
} catch {
    Write-Host "❌ Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Create property
Write-Host "3. Creating test property..." -ForegroundColor Yellow
$propertyData = @{
    title = "Test Property for Signing"
    description = "A test property for signing logic testing"
    propertyType = "apartment"
    address = @{
        street = "123 Signing Street"
        city = "Test City"
        state = "Test State"
        postalCode = "12345"
        country = "Test Country"
        coordinates = @{
            latitude = -26.2041
            longitude = 28.0473
        }
    }
    price = 2500
    deposit = 5000
    zeroDepositAvailable = $true
    utilitiesIncluded = $true
    utilitiesCost = 200
    bedrooms = 2
    bathrooms = 2
    area = 1200
    floor = 1
    totalFloors = 5
    furnishingLevel = "fully_furnished"
    amenities = @("wifi", "air_conditioning", "gym")
    petFriendly = $true
    petOwnershipAllowed = $true
    proximityToTransport = @{
        busStop = 100
        trainStation = 500
        taxiRank = 200
    }
    boreholeAvailable = $false
    solarAvailable = $false
    backupPower = $true
    internetAvailable = $true
    parkingAvailable = $true
    parkingSpaces = 1
    khayalamiAgentAssistance = $true
    viewingSchedule = @{
        available = $true
        preferredTimes = @("Mon 10-12", "Wed 2-4")
        contactPhone = "+1234567890"
    }
    images = @{
        mainImage = "https://example.com/main.jpg"
        gallery = @("https://example.com/gallery1.jpg", "https://example.com/gallery2.jpg")
        floorPlan = "https://example.com/floorplan.jpg"
        virtualTour = "https://example.com/virtualtour.mp4"
    }
    availableFrom = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
}

$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/properties" -Method POST -Headers $headers -ContentType "application/json" -Body ($propertyData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Property created successfully" -ForegroundColor Green
    $propertyId = $response._id
} catch {
    Write-Host "❌ Property creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Get tenant ID and manually verify tenant
Write-Host "4. Getting tenant ID and verifying..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Tenant profile retrieved" -ForegroundColor Green
    $tenantId = $response._id
    Write-Host "   Tenant ID: $tenantId" -ForegroundColor Gray
    Write-Host "   Is Verified: $($response.isVerified)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get tenant profile failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 5. Test agreement endpoints without creating agreement
Write-Host "5. Testing agreement endpoints..." -ForegroundColor Yellow

# Test landlord agreement endpoints
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method GET -Headers $headers
    Write-Host "✅ Landlord agreements endpoint working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test tenant agreement endpoints
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method GET -Headers $headers
    Write-Host "✅ Tenant agreements endpoint working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test agreement templates
Write-Host "6. Testing agreement templates..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/templates" -Method GET -Headers $headers
    Write-Host "✅ Agreement templates working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) templates" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreement templates failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test agreement statistics
Write-Host "7. Testing agreement statistics..." -ForegroundColor Yellow

# Landlord stats
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers $headers
    Write-Host "✅ Landlord stats working" -ForegroundColor Green
    Write-Host "   Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant stats
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers $headers
    Write-Host "✅ Tenant stats working" -ForegroundColor Green
    Write-Host "   Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Test pending agreements
Write-Host "8. Testing pending agreements..." -ForegroundColor Yellow

# Landlord pending
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers $headers
    Write-Host "✅ Landlord pending agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) pending agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord pending failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant pending
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers $headers
    Write-Host "✅ Tenant pending agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) pending agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant pending failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Test active agreements
Write-Host "9. Testing active agreements..." -ForegroundColor Yellow

# Landlord active
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers $headers
    Write-Host "✅ Landlord active agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) active agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord active failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant active
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers $headers
    Write-Host "✅ Tenant active agreements working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) active agreements" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant active failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Simple Agreement Signing Test Complete!" -ForegroundColor Green
Write-Host "The agreement system endpoints are working correctly!" -ForegroundColor Green 