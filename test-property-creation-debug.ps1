# Property Creation Debug Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Property Creation Debug Test" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_debug_$timestamp@test.com"
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
    Write-Host "Landlord registered successfully" -ForegroundColor Green
    $landlordToken = $response.token
    $landlordId = $response._id
    Write-Host "   Landlord ID: $landlordId" -ForegroundColor Gray
} catch {
    Write-Host "Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Create property with detailed error reporting
Write-Host "2. Creating test property..." -ForegroundColor Yellow
$propertyData = @{
    title = "Test Property for Debug"
    description = "A test property for debugging property creation"
    propertyType = "apartment"
    address = @{
        street = "123 Debug Street"
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

Write-Host "   Property data:" -ForegroundColor Gray
Write-Host "   $($propertyData | ConvertTo-Json -Depth 3)" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/properties" -Method POST -Headers $headers -ContentType "application/json" -Body ($propertyData | ConvertTo-Json -Depth 10)
    Write-Host "Property created successfully" -ForegroundColor Green
    Write-Host "   Property ID: $($response.data._id)" -ForegroundColor Gray
} catch {
    Write-Host "Property creation failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        # Try to get the response body
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            Write-Host "   Response Body: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "   Could not read response body" -ForegroundColor Red
        }
    }
    
    # Also try a simpler property creation
    Write-Host "3. Trying simplified property creation..." -ForegroundColor Yellow
    $simplePropertyData = @{
        title = "Simple Test Property"
        description = "A simple test property"
        propertyType = "apartment"
        address = @{
            street = "123 Simple Street"
            city = "Test City"
            state = "Test State"
            postalCode = "12345"
            country = "Test Country"
            coordinates = @{
                latitude = -26.2041
                longitude = 28.0473
            }
        }
        price = 2000
        deposit = 4000
        bedrooms = 1
        bathrooms = 1
        area = 800
        furnishingLevel = "unfurnished"
        images = @{
            mainImage = "https://example.com/simple.jpg"
            gallery = @()
        }
        availableFrom = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/properties" -Method POST -Headers $headers -ContentType "application/json" -Body ($simplePropertyData | ConvertTo-Json -Depth 5)
        Write-Host "Simple property created successfully" -ForegroundColor Green
        Write-Host "   Property ID: $($response.data._id)" -ForegroundColor Gray
    } catch {
        Write-Host "Simple property creation also failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Property Creation Debug Test Complete!" -ForegroundColor Green 