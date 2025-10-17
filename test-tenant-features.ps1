# Tenant Features Test Script
# Tests favorite properties and enhanced digital agreements with e-signatures

$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

# Test counters
$totalTests = 0
$passedTests = 0
$failedTests = 0

# Test results storage
$testResults = @()

function Write-TestResult {
    param($testName, $success, $message, $details = "")
    
    $totalTests++
    if ($success) {
        $passedTests++
        Write-Host "✅ PASS: $testName" -ForegroundColor Green
    } else {
        $failedTests++
        Write-Host "❌ FAIL: $testName" -ForegroundColor Red
        Write-Host "   Message: $message" -ForegroundColor Red
        if ($details) {
            Write-Host "   Details: $details" -ForegroundColor Yellow
        }
    }
    
    $testResults += [PSCustomObject]@{
        TestName = $testName
        Success = $success
        Message = $message
        Details = $details
    }
}

function Test-API {
    param($method, $url, $body = $null, $headers = @{})
    
    try {
        $params = @{
            Method = $method
            Uri = $url
            Headers = $headers
            ContentType = "application/json"
        }
        
        if ($body) {
            $params.Body = $body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        try {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorBody = $reader.ReadToEnd()
            $errorData = $errorBody | ConvertFrom-Json
            $errorMessage = $errorData.message
        } catch {
            # Use default error message if parsing fails
        }
        return @{ Success = $false; Error = $errorMessage; StatusCode = $statusCode }
    }
}

Write-Host "🏠 Tenant Features Test Suite" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register and login tenant
Write-Host "📝 Step 1: Setting up tenant account..." -ForegroundColor Yellow

$tenantEmail = "tenant_features_$timestamp@test.com"
$tenantPassword = "TestPassword123!"

$registerData = @{
    firstName = "Jane"
    lastName = "Tenant"
    email = $tenantEmail
    password = $tenantPassword
    role = "tenant"
    phone = "+0987654321"
}

$response = Test-API -method "POST" -url "$baseUrl/auth/register" -body $registerData
if ($response.Success) {
    Write-TestResult -testName "Tenant Registration" -success $true -message "Tenant registered successfully"
    $tenantToken = $response.Data.token
} else {
    Write-TestResult -testName "Tenant Registration" -success $false -message $response.Error
    exit
}

# Step 2: Register and login landlord
Write-Host "📝 Step 2: Setting up landlord account..." -ForegroundColor Yellow

$landlordEmail = "landlord_features_$timestamp@test.com"
$landlordPassword = "TestPassword123!"

$registerData = @{
    firstName = "John"
    lastName = "Landlord"
    email = $landlordEmail
    password = $landlordPassword
    role = "landlord"
    phone = "+1234567890"
}

$response = Test-API -method "POST" -url "$baseUrl/auth/register" -body $registerData
if ($response.Success) {
    Write-TestResult -testName "Landlord Registration" -success $true -message "Landlord registered successfully"
    $landlordToken = $response.Data.token
} else {
    Write-TestResult -testName "Landlord Registration" -success $false -message $response.Error
    exit
}

# Step 3: Complete tenant onboarding
Write-Host "📝 Step 3: Completing tenant onboarding..." -ForegroundColor Yellow

$onboardingData = @{
    steps = @{
        profileSetup = @{
            completed = $true
            data = @{
                employmentStatus = "employed"
                employer = "Test Company"
                monthlyIncome = 5000
                employmentDuration = 2
                references = @("ref1@test.com", "ref2@test.com")
            }
        }
        rentalHistory = @{
            completed = $true
            data = @{
                previousLandlords = @("prev_landlord@test.com")
                rentalHistory = 3
                evictionHistory = $false
                paymentHistory = "excellent"
                references = @("ref3@test.com")
            }
        }
        preferences = @{
            completed = $true
            data = @{
                preferredAreas = @("Downtown", "Suburbs")
                budget = @{
                    min = 1000
                    max = 3000
                }
                propertyTypes = @("apartment", "house")
                bedrooms = 2
                moveInDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
                leaseDuration = 12
                petFriendly = $true
                parkingRequired = $true
            }
        }
        verification = @{
            completed = $true
            data = @{
                idDocument = "https://example.com/id.pdf"
                payslips = @("https://example.com/payslip1.pdf")
                bankStatement = "https://example.com/bank.pdf"
                creditCheck = $true
                backgroundCheck = $true
            }
        }
        documents = @{
            completed = $true
            data = @{
                proofOfIncome = @("https://example.com/income.pdf")
                employmentLetter = "https://example.com/employment.pdf"
                bankStatements = @("https://example.com/bank1.pdf")
                references = @("https://example.com/ref1.pdf")
            }
        }
        servicePreferences = @{
            completed = $true
            data = @{
                zeroDeposit = $true
                utilitiesIncluded = $true
                maintenanceServices = $true
                notificationPreferences = @{
                    email = $true
                    sms = $true
                    push = $true
                }
            }
        }
    }
}

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "PUT" -url "$baseUrl/onboarding/tenant" -body $onboardingData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Tenant Onboarding Completion" -success $true -message "Tenant onboarding completed"
} else {
    Write-TestResult -testName "Tenant Onboarding Completion" -success $false -message $response.Error
}

# Step 4: Create properties for testing
Write-Host "📝 Step 4: Creating test properties..." -ForegroundColor Yellow

$propertyData1 = @{
    title = "Test Property 1"
    description = "A test property for favorites testing"
    propertyType = "apartment"
    address = @{
        street = "123 Test Street"
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
        mainImage = "https://example.com/main1.jpg"
        gallery = @("https://example.com/gallery1.jpg", "https://example.com/gallery2.jpg")
        floorPlan = "https://example.com/floorplan1.jpg"
        virtualTour = "https://example.com/virtualtour1.mp4"
    }
    availableFrom = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
}

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/properties" -body $propertyData1 -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Property 1 Creation" -success $true -message "Property 1 created successfully"
    $propertyId1 = $response.Data._id
} else {
    Write-TestResult -testName "Property 1 Creation" -success $false -message $response.Error
    exit
}

$propertyData2 = @{
    title = "Test Property 2"
    description = "Another test property for favorites testing"
    propertyType = "house"
    address = @{
        street = "456 Test Avenue"
        city = "Test City"
        state = "Test State"
        postalCode = "12346"
        country = "Test Country"
        coordinates = @{
            latitude = -26.2042
            longitude = 28.0474
        }
    }
    price = 3000
    deposit = 6000
    zeroDepositAvailable = $false
    utilitiesIncluded = $false
    utilitiesCost = 250
    bedrooms = 3
    bathrooms = 2
    area = 1500
    floor = 2
    totalFloors = 3
    furnishingLevel = "unfurnished"
    amenities = @("wifi", "garden", "pool")
    petFriendly = $false
    petOwnershipAllowed = $false
    proximityToTransport = @{
        busStop = 200
        trainStation = 700
        taxiRank = 300
    }
    boreholeAvailable = $true
    solarAvailable = $true
    backupPower = $false
    internetAvailable = $true
    parkingAvailable = $true
    parkingSpaces = 2
    khayalamiAgentAssistance = $false
    viewingSchedule = @{
        available = $true
        preferredTimes = @("Tue 1-3", "Thu 4-6")
        contactPhone = "+0987654321"
    }
    images = @{
        mainImage = "https://example.com/main2.jpg"
        gallery = @("https://example.com/gallery3.jpg", "https://example.com/gallery4.jpg")
        floorPlan = "https://example.com/floorplan2.jpg"
        virtualTour = "https://example.com/virtualtour2.mp4"
    }
    availableFrom = (Get-Date).AddDays(15).ToString("yyyy-MM-dd")
}

$response = Test-API -method "POST" -url "$baseUrl/properties" -body $propertyData2 -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Property 2 Creation" -success $true -message "Property 2 created successfully"
    $propertyId2 = $response.Data._id
} else {
    Write-TestResult -testName "Property 2 Creation" -success $false -message $response.Error
    exit
}

# Step 5: Test Favorite Properties
Write-Host "📝 Step 5: Testing favorite properties..." -ForegroundColor Yellow

# Add property to favorites
$favoriteData = @{
    propertyId = $propertyId1
    notes = "This is a great property!"
    priority = "high"
    reminderDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
}

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/favorites" -body $favoriteData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Add Property to Favorites" -success $true -message "Property added to favorites"
} else {
    Write-TestResult -testName "Add Property to Favorites" -success $false -message $response.Error
}

# Add second property to favorites
$favoriteData2 = @{
    propertyId = $propertyId2
    notes = "Another great option"
    priority = "medium"
}

$response = Test-API -method "POST" -url "$baseUrl/favorites" -body $favoriteData2 -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Add Second Property to Favorites" -success $true -message "Second property added to favorites"
} else {
    Write-TestResult -testName "Add Second Property to Favorites" -success $false -message $response.Error
}

# Get user's favorites
$response = Test-API -method "GET" -url "$baseUrl/favorites" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get User Favorites" -success $true -message "Favorites retrieved successfully"
    Write-Host "   Found $($response.Data.Count) favorites" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get User Favorites" -success $false -message $response.Error
}

# Check if property is favorited
$response = Test-API -method "GET" -url "$baseUrl/favorites/check/$propertyId1" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Check If Property is Favorited" -success $true -message "Favorite status checked"
    Write-Host "   Is favorited: $($response.Data.isFavorited)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Check If Property is Favorited" -success $false -message $response.Error
}

# Get favorite count for property
$response = Test-API -method "GET" -url "$baseUrl/favorites/count/$propertyId1"
if ($response.Success) {
    Write-TestResult -testName "Get Property Favorite Count" -success $true -message "Favorite count retrieved"
    Write-Host "   Favorite count: $($response.Data.count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Property Favorite Count" -success $false -message $response.Error
}

# Update favorite
$updateData = @{
    notes = "Updated notes for this property"
    priority = "low"
}

$response = Test-API -method "PUT" -url "$baseUrl/favorites/$propertyId1" -body $updateData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Update Favorite" -success $true -message "Favorite updated successfully"
} else {
    Write-TestResult -testName "Update Favorite" -success $false -message $response.Error
}

# Get favorite statistics
$response = Test-API -method "GET" -url "$baseUrl/favorites/stats" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Favorite Statistics" -success $true -message "Statistics retrieved"
    $stats = $response.Data
    Write-Host "   Total favorites: $($stats.total)" -ForegroundColor Gray
    Write-Host "   High priority: $($stats.byPriority.high)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Favorite Statistics" -success $false -message $response.Error
}

# Step 6: Test Enhanced Digital Agreements
Write-Host "📝 Step 6: Testing enhanced digital agreements..." -ForegroundColor Yellow

# Get agreement templates
$response = Test-API -method "GET" -url "$baseUrl/agreements/templates" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Templates" -success $true -message "Templates retrieved"
    Write-Host "   Found $($response.Data.Count) templates" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Templates" -success $false -message $response.Error
}

# Get tenant user ID
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/auth/me" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Tenant Profile" -success $true -message "Tenant profile retrieved"
    $tenantId = $response.Data._id
} else {
    Write-TestResult -testName "Get Tenant Profile" -success $false -message $response.Error
    exit
}

# Create agreement from template (landlord)
$templateAgreementData = @{
    templateId = "standard_tenancy" # This would be a real template ID
    propertyId = $propertyId1
    tenantId = $tenantId
    formData = @{
        title = "Standard Tenancy Agreement"
        description = "A standard tenancy agreement created from template"
        startDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(395).ToString("yyyy-MM-dd")
        rentAmount = 2500
        depositAmount = 5000
        zeroDeposit = $true
        utilitiesIncluded = $true
        maintenanceIncluded = $true
        paymentSchedule = @{
            frequency = "monthly"
            dueDay = 1
            lateFee = 100
            gracePeriod = 5
        }
        khayalamiProtection = @{
            enabled = $true
            planType = "premium"
            monthlyFee = 50
            coverage = @("damage", "theft", "liability")
        }
    }
    customTerms = @(
        "Additional custom term 1",
        "Additional custom term 2"
    )
    customSpecialConditions = @(
        "Special condition for this agreement"
    )
}

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/from-template" -body $templateAgreementData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Create Agreement from Template" -success $true -message "Agreement created from template"
    $agreementId = $response.Data._id
} else {
    Write-TestResult -testName "Create Agreement from Template" -success $false -message $response.Error
    # Create a regular agreement instead
    $regularAgreementData = @{
        propertyId = $propertyId1
        tenantId = $tenantId
        title = "Test Agreement"
        description = "A test agreement"
        startDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(395).ToString("yyyy-MM-dd")
        rentAmount = 2500
        depositAmount = 5000
        zeroDeposit = $true
        terms = @(
            "Tenant shall pay rent on time",
            "Tenant shall maintain the property"
        )
    }
    
    $response = Test-API -method "POST" -url "$baseUrl/agreements" -body $regularAgreementData -headers $headers
    if ($response.Success) {
        Write-TestResult -testName "Create Regular Agreement" -success $true -message "Regular agreement created"
        $agreementId = $response.Data._id
    } else {
        Write-TestResult -testName "Create Regular Agreement" -success $false -message $response.Error
        exit
    }
}

# Send agreement for review
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/review" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Send Agreement for Review" -success $true -message "Agreement sent for review"
} else {
    Write-TestResult -testName "Send Agreement for Review" -success $false -message $response.Error
}

# Sign agreement with enhanced e-signature (landlord)
$signatureData = @{
    signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ipAddress = "192.168.1.1"
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    deviceInfo = @{
        type = "desktop"
        os = "Windows"
        browser = "Chrome"
    }
    signatureType = "drawing"
    verificationMethod = "email"
    sessionId = "test-session-123"
}

$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/sign" -body $signatureData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Sign Agreement (Landlord)" -success $true -message "Landlord signed agreement"
} else {
    Write-TestResult -testName "Sign Agreement (Landlord)" -success $false -message $response.Error
}

# Sign agreement with enhanced e-signature (tenant)
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/sign" -body $signatureData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Sign Agreement (Tenant)" -success $true -message "Tenant signed agreement"
} else {
    Write-TestResult -testName "Sign Agreement (Tenant)" -success $false -message $response.Error
}

# Get agreement signatures
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId/signatures" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Signatures" -success $true -message "Signatures retrieved"
    Write-Host "   Found $($response.Data.Count) signatures" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Signatures" -success $false -message $response.Error
}

# Get agreement audit trail
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId/audit-trail" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Audit Trail" -success $true -message "Audit trail retrieved"
    Write-Host "   Timeline events: $($response.Data.timeline.Count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Audit Trail" -success $false -message $response.Error
}

# Step 7: Test Authorization and Security
Write-Host "📝 Step 7: Testing authorization and security..." -ForegroundColor Yellow

# Test tenant trying to create agreement (should fail)
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements" -body $regularAgreementData -headers $headers
if (-not $response.Success -and $response.StatusCode -eq 403) {
    Write-TestResult -testName "Tenant Authorization Check" -success $true -message "Tenant correctly blocked from creating agreements"
} else {
    Write-TestResult -testName "Tenant Authorization Check" -success $false -message "Tenant should not be able to create agreements"
}

# Test landlord trying to add favorites (should fail)
$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/favorites" -body $favoriteData -headers $headers
if (-not $response.Success -and $response.StatusCode -eq 403) {
    Write-TestResult -testName "Landlord Favorites Authorization Check" -success $true -message "Landlord correctly blocked from adding favorites"
} else {
    Write-TestResult -testName "Landlord Favorites Authorization Check" -success $false -message "Landlord should not be able to add favorites"
}

# Step 8: Cleanup - Remove favorites
Write-Host "📝 Step 8: Cleaning up test data..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "DELETE" -url "$baseUrl/favorites/$propertyId1" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Remove Favorite 1" -success $true -message "Favorite 1 removed"
} else {
    Write-TestResult -testName "Remove Favorite 1" -success $false -message $response.Error
}

$response = Test-API -method "DELETE" -url "$baseUrl/favorites/$propertyId2" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Remove Favorite 2" -success $true -message "Favorite 2 removed"
} else {
    Write-TestResult -testName "Remove Favorite 2" -success $false -message $response.Error
}

# Summary
Write-Host ""
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor Yellow

if ($failedTests -eq 0) {
    Write-Host ""
    Write-Host "🎉 All tests passed! Tenant features are working correctly." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Some tests failed. Please check the implementation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Detailed Test Results:" -ForegroundColor Cyan
$testResults | Format-Table -AutoSize

Write-Host ""
Write-Host "🏠 Tenant Features Test Complete!" -ForegroundColor Cyan 