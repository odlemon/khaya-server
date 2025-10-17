# Test Property Management with Images
$baseUrl = "http://localhost:3001"

Write-Host "Testing Property Management with Images" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# 1. Login as landlord
Write-Host "1. Logging in as landlord..." -ForegroundColor Yellow
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

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $landlordToken"
}

# 2. Test creating property WITHOUT main image (should fail)
Write-Host "2. Testing property creation without main image (should fail)..." -ForegroundColor Yellow
$invalidPropertyPayload = @{
    title = "Test Property Without Image"
    description = "This property has no main image and should fail validation"
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

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method POST -Headers $headers -Body ($invalidPropertyPayload | ConvertTo-Json -Depth 3)
    Write-Host "Unexpected: Property created without main image" -ForegroundColor Red
} catch {
    Write-Host "Correctly blocked: Property creation requires main image" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Create property WITH main image (should succeed)
Write-Host "3. Creating property with main image..." -ForegroundColor Yellow
$validPropertyPayload = @{
    title = "Beautiful 2-Bedroom Apartment"
    description = "Modern apartment with stunning city views, fully furnished with all amenities"
    propertyType = "apartment"
    address = @{
        street = "456 Luxury Avenue"
        city = "Johannesburg"
        state = "Gauteng"
        postalCode = "2000"
        country = "South Africa"
        coordinates = @{
            latitude = -26.2041
            longitude = 28.0473
        }
    }
    price = 18000
    deposit = 18000
    zeroDepositAvailable = $true
    utilitiesIncluded = $true
    utilitiesCost = 2000
    bedrooms = 2
    bathrooms = 2
    area = 95
    floor = 15
    totalFloors = 20
    furnishingLevel = "fully_furnished"
    amenities = @("Swimming Pool", "Gym", "Security", "Parking", "Balcony")
    petFriendly = $true
    petOwnershipAllowed = $false
    proximityToTransport = @{
        busStop = 150
        trainStation = 800
        taxiRank = 300
    }
    boreholeAvailable = $true
    solarAvailable = $true
    backupPower = $true
    internetAvailable = $true
    parkingAvailable = $true
    parkingSpaces = 1
    khayalamiAgentAssistance = $true
    viewingSchedule = @{
        available = $true
        preferredTimes = @("09:00", "14:00", "16:00")
        contactPhone = "+27123456789"
    }
    images = @{
        mainImage = "https://lysp.s3.amazonaws.com/properties/sample/main_image.jpg"
        gallery = @(
            "https://lysp.s3.amazonaws.com/properties/sample/gallery1.jpg",
            "https://lysp.s3.amazonaws.com/properties/sample/gallery2.jpg",
            "https://lysp.s3.amazonaws.com/properties/sample/gallery3.jpg"
        )
        floorPlan = "https://lysp.s3.amazonaws.com/properties/sample/floorplan.pdf"
        virtualTour = "https://example.com/virtual-tour-360"
    }
    availableFrom = "2024-01-01T00:00:00.000Z"
}

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method POST -Headers $headers -Body ($validPropertyPayload | ConvertTo-Json -Depth 3)
    Write-Host "Property created successfully!" -ForegroundColor Green
    Write-Host "Property ID: $($createResponse.data._id)" -ForegroundColor Cyan
    $propertyId = $createResponse.data._id
} catch {
    Write-Host "Failed to create property: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Get the created property
Write-Host "4. Fetching created property..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/$propertyId" -Method GET
    Write-Host "Property retrieved successfully!" -ForegroundColor Green
    Write-Host "Property Details:" -ForegroundColor Cyan
    Write-Host "  Title: $($getResponse.data.title)" -ForegroundColor White
    Write-Host "  Type: $($getResponse.data.propertyType)" -ForegroundColor White
    Write-Host "  Price: R$($getResponse.data.price)" -ForegroundColor White
    Write-Host "  Bedrooms: $($getResponse.data.bedrooms)" -ForegroundColor White
    Write-Host "  Status: $($getResponse.data.status)" -ForegroundColor White
    Write-Host "  Main Image: $($getResponse.data.images.mainImage)" -ForegroundColor White
    Write-Host "  Gallery Images: $($getResponse.data.images.gallery.Count)" -ForegroundColor White
    Write-Host "  Zero Deposit: $($getResponse.data.zeroDepositAvailable)" -ForegroundColor White
    Write-Host "  Pet Friendly: $($getResponse.data.petFriendly)" -ForegroundColor White
    Write-Host "  Borehole: $($getResponse.data.boreholeAvailable)" -ForegroundColor White
    Write-Host "  Solar: $($getResponse.data.solarAvailable)" -ForegroundColor White
} catch {
    Write-Host "Failed to get property: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Get landlord's properties
Write-Host "5. Fetching landlord's properties..." -ForegroundColor Yellow
try {
    $landlordPropertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $headers
    Write-Host "Landlord properties retrieved successfully!" -ForegroundColor Green
    Write-Host "Found $($landlordPropertiesResponse.data.Count) properties" -ForegroundColor Cyan
    
    $landlordPropertiesResponse.data | ForEach-Object {
        Write-Host "  - $($_.title) (Status: $($_.status))" -ForegroundColor White
    }
} catch {
    Write-Host "Failed to get landlord properties: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test property search and filters
Write-Host "6. Testing property search and filters..." -ForegroundColor Yellow
try {
    $searchParams = "?minPrice=10000&maxPrice=20000&bedrooms=2&petFriendly=true&boreholeAvailable=true&city=Johannesburg"
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties$searchParams" -Method GET
    Write-Host "Property search successful!" -ForegroundColor Green
    Write-Host "Found $($searchResponse.data.Count) properties matching criteria" -ForegroundColor Cyan
    Write-Host "Pagination: Page $($searchResponse.pagination.page) of $($searchResponse.pagination.totalPages)" -ForegroundColor White
} catch {
    Write-Host "Failed to search properties: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test location-based search
Write-Host "7. Testing location-based search..." -ForegroundColor Yellow
try {
    $locationParams = "?latitude=-26.2041&longitude=28.0473&radius=5000&limit=10"
    $locationResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/search/location$locationParams" -Method GET
    Write-Host "Location search successful!" -ForegroundColor Green
    Write-Host "Found $($locationResponse.data.Count) properties within 5km radius" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to search by location: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Update property status
Write-Host "8. Updating property status to published..." -ForegroundColor Yellow
try {
    $statusPayload = @{
        status = "published"
    }
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/$propertyId/status" -Method PATCH -Headers $headers -Body ($statusPayload | ConvertTo-Json)
    Write-Host "Property status updated successfully!" -ForegroundColor Green
    Write-Host "New status: $($statusResponse.data.status)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to update property status: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Property Management tests complete!" -ForegroundColor Green 