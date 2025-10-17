# Complete System Test - Khayalami Home Finder
$baseUrl = "http://localhost:3001"

Write-Host "Complete System Test - Khayalami Home Finder" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Test Results Summary
$testResults = @{
    "Authentication" = @{}
    "User Management" = @{}
    "Property Creation" = @{}
    "Image Management" = @{}
    "Search & Filters" = @{}
    "Role-Based Access" = @{}
    "API Endpoints" = @{}
}

# 1. Test Authentication System
Write-Host "`n1. Testing Authentication System" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Register landlord
try {
    $landlordPayload = @{
        firstName = "Test"
        lastName = "Landlord"
        email = "test.landlord@khayalami.com"
        password = "password123"
        phone = "+27123456789"
        role = "landlord"
    }
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($landlordPayload | ConvertTo-Json)
    Write-Host "✅ Landlord registration successful" -ForegroundColor Green
    $testResults.Authentication["Landlord Registration"] = "PASS"
    $landlordToken = $registerResponse.token
} catch {
    Write-Host "❌ Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Authentication["Landlord Registration"] = "FAIL"
}

# Register tenant
try {
    $tenantPayload = @{
        firstName = "Test"
        lastName = "Tenant"
        email = "test.tenant@khayalami.com"
        password = "password123"
        phone = "+27987654321"
        role = "tenant"
    }
    $tenantRegisterResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($tenantPayload | ConvertTo-Json)
    Write-Host "✅ Tenant registration successful" -ForegroundColor Green
    $testResults.Authentication["Tenant Registration"] = "PASS"
    $tenantToken = $tenantRegisterResponse.token
} catch {
    Write-Host "❌ Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Authentication["Tenant Registration"] = "FAIL"
}

# Login test
try {
    $loginPayload = @{
        email = "test.landlord@khayalami.com"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "✅ Login successful" -ForegroundColor Green
    $testResults.Authentication["Login"] = "PASS"
    $landlordToken = $loginResponse.token
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Authentication["Login"] = "FAIL"
}

# 2. Test User Management
Write-Host "`n2. Testing User Management" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $landlordToken"
}

# Get user profile
try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Profile retrieval successful" -ForegroundColor Green
    Write-Host "   User: $($profileResponse.data.firstName) $($profileResponse.data.lastName)" -ForegroundColor White
    Write-Host "   Role: $($profileResponse.data.role)" -ForegroundColor White
    Write-Host "   Email: $($profileResponse.data.email)" -ForegroundColor White
    $testResults["User Management"]["Profile Retrieval"] = "PASS"
} catch {
    Write-Host "❌ Profile retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["User Management"]["Profile Retrieval"] = "FAIL"
}

# 3. Test Property Creation
Write-Host "`n3. Testing Property Creation" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Test property creation without image (should fail)
try {
    $invalidProperty = @{
        title = "Invalid Property"
        description = "This should fail without main image"
        propertyType = "apartment"
        address = @{
            street = "123 Test Street"
            city = "Johannesburg"
            state = "Gauteng"
            postalCode = "2000"
            country = "South Africa"
            coordinates = @{
                latitude = -26.2041
                longitude = 28.0473
            }
        }
        price = 15000
        deposit = 15000
        bedrooms = 2
        bathrooms = 1
        area = 80
        furnishingLevel = "fully_furnished"
        availableFrom = "2024-01-01T00:00:00.000Z"
    }
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method POST -Headers $headers -Body ($invalidProperty | ConvertTo-Json -Depth 3)
    Write-Host "❌ Property created without main image (should have failed)" -ForegroundColor Red
    $testResults["Property Creation"]["Image Validation"] = "FAIL"
} catch {
    Write-Host "✅ Property creation correctly blocked without main image" -ForegroundColor Green
    $testResults["Property Creation"]["Image Validation"] = "PASS"
}

# Create valid property with images
try {
    $validProperty = @{
        title = "Luxury 3-Bedroom Apartment"
        description = "Stunning modern apartment with city views, fully furnished with premium amenities"
        propertyType = "apartment"
        address = @{
            street = "789 Luxury Boulevard"
            city = "Johannesburg"
            state = "Gauteng"
            postalCode = "2000"
            country = "South Africa"
            coordinates = @{
                latitude = -26.2041
                longitude = 28.0473
            }
        }
        price = 25000
        deposit = 25000
        zeroDepositAvailable = $true
        utilitiesIncluded = $true
        utilitiesCost = 2500
        bedrooms = 3
        bathrooms = 2
        area = 120
        floor = 25
        totalFloors = 30
        furnishingLevel = "fully_furnished"
        amenities = @("Swimming Pool", "Gym", "Security", "Parking", "Balcony", "Concierge")
        petFriendly = $true
        petOwnershipAllowed = $true
        proximityToTransport = @{
            busStop = 100
            trainStation = 500
            taxiRank = 200
        }
        boreholeAvailable = $true
        solarAvailable = $true
        backupPower = $true
        internetAvailable = $true
        parkingAvailable = $true
        parkingSpaces = 2
        khayalamiAgentAssistance = $true
        viewingSchedule = @{
            available = $true
            preferredTimes = @("10:00", "15:00", "17:00")
            contactPhone = "+27123456789"
        }
        images = @{
            mainImage = "https://lysp.s3.amazonaws.com/properties/luxury/main_image.jpg"
            gallery = @(
                "https://lysp.s3.amazonaws.com/properties/luxury/gallery1.jpg",
                "https://lysp.s3.amazonaws.com/properties/luxury/gallery2.jpg",
                "https://lysp.s3.amazonaws.com/properties/luxury/gallery3.jpg",
                "https://lysp.s3.amazonaws.com/properties/luxury/gallery4.jpg"
            )
            floorPlan = "https://lysp.s3.amazonaws.com/properties/luxury/floorplan.pdf"
            virtualTour = "https://example.com/luxury-apartment-360"
        }
        availableFrom = "2024-01-01T00:00:00.000Z"
    }
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method POST -Headers $headers -Body ($validProperty | ConvertTo-Json -Depth 3)
    Write-Host "✅ Property created successfully" -ForegroundColor Green
    Write-Host "   Property ID: $($createResponse.data._id)" -ForegroundColor White
    Write-Host "   Title: $($createResponse.data.title)" -ForegroundColor White
    Write-Host "   Price: R$($createResponse.data.price)" -ForegroundColor White
    Write-Host "   Main Image: $($createResponse.data.images.mainImage)" -ForegroundColor White
    $testResults["Property Creation"]["Valid Property Creation"] = "PASS"
    $propertyId = $createResponse.data._id
} catch {
    Write-Host "❌ Property creation failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Property Creation"]["Valid Property Creation"] = "FAIL"
}

# 4. Test Search & Filters
Write-Host "`n4. Testing Search & Filters" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Test basic property search
try {
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET
    Write-Host "✅ Basic property search successful" -ForegroundColor Green
    Write-Host "   Found $($searchResponse.data.Count) properties" -ForegroundColor White
    Write-Host "   Total pages: $($searchResponse.pagination.totalPages)" -ForegroundColor White
    $testResults["Search & Filters"]["Basic Search"] = "PASS"
} catch {
    Write-Host "❌ Basic property search failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Search & Filters"]["Basic Search"] = "FAIL"
}

# Test advanced filters
try {
    $filterParams = "?minPrice=20000&maxPrice=30000&bedrooms=3&petFriendly=true&boreholeAvailable=true&solarAvailable=true&zeroDepositAvailable=true&city=Johannesburg"
    $filterResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties$filterParams" -Method GET
    Write-Host "✅ Advanced filters successful" -ForegroundColor Green
    Write-Host "   Found $($filterResponse.data.Count) properties matching criteria" -ForegroundColor White
    $testResults["Search & Filters"]["Advanced Filters"] = "PASS"
} catch {
    Write-Host "❌ Advanced filters failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Search & Filters"]["Advanced Filters"] = "FAIL"
}

# Test location-based search
try {
    $locationParams = "?latitude=-26.2041&longitude=28.0473&radius=10000&limit=20"
    $locationResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/search/location$locationParams" -Method GET
    Write-Host "✅ Location-based search successful" -ForegroundColor Green
    Write-Host "   Found $($locationResponse.data.Count) properties within 10km radius" -ForegroundColor White
    $testResults["Search & Filters"]["Location Search"] = "PASS"
} catch {
    Write-Host "❌ Location-based search failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Search & Filters"]["Location Search"] = "FAIL"
}

# 5. Test Role-Based Access Control
Write-Host "`n5. Testing Role-Based Access Control" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test tenant trying to create property (should fail)
$tenantHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $tenantToken"
}

try {
    $tenantPropertyResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method POST -Headers $tenantHeaders -Body ($validProperty | ConvertTo-Json -Depth 3)
    Write-Host "❌ Tenant was able to create property (should have failed)" -ForegroundColor Red
    $testResults["Role-Based Access"]["Tenant Property Creation"] = "FAIL"
} catch {
    Write-Host "✅ Tenant correctly blocked from creating properties" -ForegroundColor Green
    $testResults["Role-Based Access"]["Tenant Property Creation"] = "PASS"
}

# Test tenant trying to access landlord features
try {
    $tenantLandlordResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $tenantHeaders
    Write-Host "❌ Tenant was able to access landlord features (should have failed)" -ForegroundColor Red
    $testResults["Role-Based Access"]["Tenant Landlord Access"] = "FAIL"
} catch {
    Write-Host "✅ Tenant correctly blocked from landlord features" -ForegroundColor Green
    $testResults["Role-Based Access"]["Tenant Landlord Access"] = "PASS"
}

# Test public access to properties (should work)
try {
    $publicResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET
    Write-Host "✅ Public access to properties working" -ForegroundColor Green
    $testResults["Role-Based Access"]["Public Property Access"] = "PASS"
} catch {
    Write-Host "❌ Public access to properties failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Role-Based Access"]["Public Property Access"] = "FAIL"
}

# 6. Test API Endpoints
Write-Host "`n6. Testing API Endpoints" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

# Test featured properties
try {
    $featuredResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/featured" -Method GET
    Write-Host "✅ Featured properties endpoint working" -ForegroundColor Green
    $testResults["API Endpoints"]["Featured Properties"] = "PASS"
} catch {
    Write-Host "❌ Featured properties endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["API Endpoints"]["Featured Properties"] = "FAIL"
}

# Test landlord properties
try {
    $landlordPropertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $headers
    Write-Host "✅ Landlord properties endpoint working" -ForegroundColor Green
    Write-Host "   Found $($landlordPropertiesResponse.data.Count) landlord properties" -ForegroundColor White
    $testResults["API Endpoints"]["Landlord Properties"] = "PASS"
} catch {
    Write-Host "❌ Landlord properties endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["API Endpoints"]["Landlord Properties"] = "FAIL"
}

# Test property status update
if ($propertyId) {
    try {
        $statusPayload = @{
            status = "published"
        }
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/$propertyId/status" -Method PATCH -Headers $headers -Body ($statusPayload | ConvertTo-Json)
        Write-Host "✅ Property status update working" -ForegroundColor Green
        Write-Host "   New status: $($statusResponse.data.status)" -ForegroundColor White
        $testResults["API Endpoints"]["Property Status Update"] = "PASS"
    } catch {
        Write-Host "❌ Property status update failed: $($_.Exception.Message)" -ForegroundColor Red
        $testResults["API Endpoints"]["Property Status Update"] = "FAIL"
    }
}

# 7. Generate Test Summary
Write-Host "`n7. Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$totalTests = 0
$passedTests = 0

foreach ($category in $testResults.Keys) {
    Write-Host "`n$($category):" -ForegroundColor Yellow
    foreach ($test in $testResults[$category].Keys) {
        $totalTests++
        if ($testResults[$category][$test] -eq "PASS") {
            $passedTests++
            Write-Host "  ✅ $test" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $test" -ForegroundColor Red
        }
    }
}

Write-Host "`nOverall Results:" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor Red
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

if ($successRate -ge 80) {
    Write-Host "`n🎉 System is working well!" -ForegroundColor Green
} elseif ($successRate -ge 60) {
    Write-Host "`n⚠️  System has some issues that need attention" -ForegroundColor Yellow
} else {
    Write-Host "`n🚨 System has significant issues that need immediate attention" -ForegroundColor Red
}

Write-Host "`nComplete system test finished!" -ForegroundColor Green 