# Minimal Property Creation Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Minimal Property Creation Test" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_minimal_$timestamp@test.com"
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
} catch {
    Write-Host "Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Create minimal property with only required fields
Write-Host "2. Creating minimal property..." -ForegroundColor Yellow
$minimalPropertyData = @{
    title = "Minimal Test Property"
    description = "A minimal test property with only required fields"
    propertyType = "apartment"
    address = @{
        street = "123 Minimal Street"
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
        mainImage = "https://example.com/minimal.jpg"
    }
    availableFrom = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
}

$headers = @{ Authorization = "Bearer $landlordToken" }

Write-Host "   Minimal property data:" -ForegroundColor Gray
Write-Host "   $($minimalPropertyData | ConvertTo-Json -Depth 3)" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/properties" -Method POST -Headers $headers -ContentType "application/json" -Body ($minimalPropertyData | ConvertTo-Json -Depth 5)
    Write-Host "Minimal property created successfully!" -ForegroundColor Green
    Write-Host "   Property ID: $($response.data._id)" -ForegroundColor Gray
    
    # Now test the chat system with this property
    Write-Host "3. Testing chat system with created property..." -ForegroundColor Yellow
    
    # Register tenant
    $tenantEmail = "tenant_minimal_$timestamp@test.com"
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
        Write-Host "Tenant registered successfully" -ForegroundColor Green
        $tenantToken = $response.token
        $tenantId = $response._id
    } catch {
        Write-Host "Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
        exit
    }
    
    # Create chat
    $chatData = @{
        propertyId = $response.data._id
        landlordId = $landlordId
    }
    
    $headers = @{ Authorization = "Bearer $tenantToken" }
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/chat/get-or-create" -Method POST -Headers $headers -ContentType "application/json" -Body ($chatData | ConvertTo-Json)
        Write-Host "Chat created successfully!" -ForegroundColor Green
        $chatId = $response.data._id
        Write-Host "   Chat ID: $chatId" -ForegroundColor Gray
    } catch {
        Write-Host "Chat creation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Minimal property creation failed!" -ForegroundColor Red
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
}

Write-Host ""
Write-Host "Minimal Property Creation Test Complete!" -ForegroundColor Green 