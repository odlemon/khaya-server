# Landlord-Tenant Agreement Flow Test
# Tests the complete agreement lifecycle from creation to signing

$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "🏠 Landlord-Tenant Agreement Flow Test" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test counters
$totalTests = 0
$passedTests = 0
$failedTests = 0

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

# Step 1: Register landlord and tenant
Write-Host "📝 Step 1: Setting up accounts..." -ForegroundColor Yellow

$landlordEmail = "landlord_agreement_$timestamp@test.com"
$tenantEmail = "tenant_agreement_$timestamp@test.com"

# Register landlord
$landlordData = @{
    firstName = "John"
    lastName = "Landlord"
    email = $landlordEmail
    password = "TestPassword123!"
    role = "landlord"
    phone = "+1234567890"
}

$response = Test-API -method "POST" -url "$baseUrl/auth/register" -body $landlordData
if ($response.Success) {
    Write-TestResult -testName "Landlord Registration" -success $true -message "Landlord registered successfully"
    $landlordToken = $response.Data.token
} else {
    Write-TestResult -testName "Landlord Registration" -success $false -message $response.Error
    exit
}

# Register tenant
$tenantData = @{
    firstName = "Jane"
    lastName = "Tenant"
    email = $tenantEmail
    password = "TestPassword123!"
    role = "tenant"
    phone = "+0987654321"
}

$response = Test-API -method "POST" -url "$baseUrl/auth/register" -body $tenantData
if ($response.Success) {
    Write-TestResult -testName "Tenant Registration" -success $true -message "Tenant registered successfully"
    $tenantToken = $response.Data.token
} else {
    Write-TestResult -testName "Tenant Registration" -success $false -message $response.Error
    exit
}

# Step 2: Complete tenant onboarding
Write-Host "📝 Step 2: Completing tenant onboarding..." -ForegroundColor Yellow

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

# Step 3: Create property for testing
Write-Host "📝 Step 3: Creating test property..." -ForegroundColor Yellow

$propertyData = @{
    title = "Test Property for Agreement"
    description = "A test property for agreement testing"
    propertyType = "apartment"
    address = @{
        street = "123 Agreement Street"
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
$response = Test-API -method "POST" -url "$baseUrl/properties" -body $propertyData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Property Creation" -success $true -message "Property created successfully"
    $propertyId = $response.Data._id
} else {
    Write-TestResult -testName "Property Creation" -success $false -message $response.Error
    exit
}

# Step 4: Get tenant ID
Write-Host "📝 Step 4: Getting tenant ID..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/auth/me" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Tenant Profile" -success $true -message "Tenant profile retrieved"
    $tenantId = $response.Data._id
} else {
    Write-TestResult -testName "Get Tenant Profile" -success $false -message $response.Error
    exit
}

# Step 5: Test Agreement Creation (Landlord)
Write-Host "📝 Step 5: Testing agreement creation..." -ForegroundColor Yellow

$agreementData = @{
    propertyId = $propertyId
    tenantId = $tenantId
    title = "Test Tenancy Agreement"
    description = "A test agreement between landlord and tenant"
    startDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    endDate = (Get-Date).AddDays(395).ToString("yyyy-MM-dd")
    rentAmount = 2500
    depositAmount = 5000
    zeroDeposit = $true
    terms = @(
        "Tenant shall pay rent on time",
        "Tenant shall maintain the property",
        "Tenant shall not sublet without permission",
        "Landlord shall provide necessary maintenance"
    )
    specialConditions = @(
        "Special condition for this agreement"
    )
    paymentSchedule = @{
        frequency = "monthly"
        dueDay = 1
        lateFee = 100
        gracePeriod = 5
    }
    utilitiesIncluded = $true
    utilitiesList = @("electricity", "water", "internet")
    maintenanceIncluded = $true
    khayalamiProtection = @{
        enabled = $true
        planType = "premium"
        monthlyFee = 50
        coverage = @("damage", "theft", "liability")
    }
}

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements" -body $agreementData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Agreement Creation" -success $true -message "Agreement created successfully"
    $agreementId = $response.Data._id
} else {
    Write-TestResult -testName "Agreement Creation" -success $false -message $response.Error
    exit
}

# Step 6: Test Agreement Status Check (Both Parties)
Write-Host "📝 Step 6: Testing agreement status checks..." -ForegroundColor Yellow

# Landlord check
$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Landlord Agreement Access" -success $true -message "Landlord can access agreement"
    Write-Host "   Status: $($response.Data.status)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Landlord Agreement Access" -success $false -message $response.Error
}

# Tenant check
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Tenant Agreement Access" -success $true -message "Tenant can access agreement"
    Write-Host "   Status: $($response.Data.status)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Tenant Agreement Access" -success $false -message $response.Error
}

# Step 7: Test Send for Review (Landlord)
Write-Host "📝 Step 7: Testing send for review..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/review" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Send for Review" -success $true -message "Agreement sent for review"
} else {
    Write-TestResult -testName "Send for Review" -success $false -message $response.Error
}

# Step 8: Test Pending Agreements (Both Parties)
Write-Host "📝 Step 8: Testing pending agreements..." -ForegroundColor Yellow

# Landlord pending agreements
$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/pending" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Landlord Pending Agreements" -success $true -message "Landlord pending agreements retrieved"
    Write-Host "   Found $($response.Data.Count) pending agreements" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Landlord Pending Agreements" -success $false -message $response.Error
}

# Tenant pending agreements
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/pending" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Tenant Pending Agreements" -success $true -message "Tenant pending agreements retrieved"
    Write-Host "   Found $($response.Data.Count) pending agreements" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Tenant Pending Agreements" -success $false -message $response.Error
}

# Step 9: Test Agreement Signing (Both Parties)
Write-Host "📝 Step 9: Testing agreement signing..." -ForegroundColor Yellow

$signatureData = @{
    signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ipAddress = "192.168.1.1"
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    deviceInfo = @{
        type = "desktop"
        os = "Windows"
        browser = "Chrome"
    }
    signatureType = "drawing"
    verificationMethod = "email"
    sessionId = "test-session-123"
}

# Landlord signs first
$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/sign" -body $signatureData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Landlord Signs Agreement" -success $true -message "Landlord signed agreement"
} else {
    Write-TestResult -testName "Landlord Signs Agreement" -success $false -message $response.Error
}

# Tenant signs second
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/sign" -body $signatureData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Tenant Signs Agreement" -success $true -message "Tenant signed agreement"
} else {
    Write-TestResult -testName "Tenant Signs Agreement" -success $false -message $response.Error
}

# Step 10: Test Agreement Signatures
Write-Host "📝 Step 10: Testing agreement signatures..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId/signatures" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Signatures" -success $true -message "Signatures retrieved"
    Write-Host "   Found $($response.Data.Count) signatures" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Signatures" -success $false -message $response.Error
}

# Step 11: Test Agreement Activation (Landlord)
Write-Host "📝 Step 11: Testing agreement activation..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/activate" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Activate Agreement" -success $true -message "Agreement activated"
} else {
    Write-TestResult -testName "Activate Agreement" -success $false -message $response.Error
}

# Step 12: Test Active Agreements (Both Parties)
Write-Host "📝 Step 12: Testing active agreements..." -ForegroundColor Yellow

# Landlord active agreements
$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/active" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Landlord Active Agreements" -success $true -message "Landlord active agreements retrieved"
    Write-Host "   Found $($response.Data.Count) active agreements" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Landlord Active Agreements" -success $false -message $response.Error
}

# Tenant active agreements
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/active" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Tenant Active Agreements" -success $true -message "Tenant active agreements retrieved"
    Write-Host "   Found $($response.Data.Count) active agreements" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Tenant Active Agreements" -success $false -message $response.Error
}

# Step 13: Test Agreement Statistics
Write-Host "📝 Step 13: Testing agreement statistics..." -ForegroundColor Yellow

# Landlord stats
$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/stats" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Landlord Agreement Stats" -success $true -message "Landlord stats retrieved"
    $stats = $response.Data
    Write-Host "   Total: $($stats.total), Active: $($stats.active), Pending: $($stats.pending)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Landlord Agreement Stats" -success $false -message $response.Error
}

# Tenant stats
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/stats" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Tenant Agreement Stats" -success $true -message "Tenant stats retrieved"
    $stats = $response.Data
    Write-Host "   Total: $($stats.total), Active: $($stats.active), Pending: $($stats.pending)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Tenant Agreement Stats" -success $false -message $response.Error
}

# Step 14: Test Agreement Audit Trail
Write-Host "📝 Step 14: Testing agreement audit trail..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId/audit-trail" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Audit Trail" -success $true -message "Audit trail retrieved"
    Write-Host "   Timeline events: $($response.Data.timeline.Count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Audit Trail" -success $false -message $response.Error
}

# Step 15: Test Authorization and Security
Write-Host "📝 Step 15: Testing authorization and security..." -ForegroundColor Yellow

# Test tenant trying to create agreement (should fail)
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements" -body $agreementData -headers $headers
if (-not $response.Success -and $response.StatusCode -eq 403) {
    Write-TestResult -testName "Tenant Agreement Creation Authorization" -success $true -message "Tenant correctly blocked from creating agreements"
} else {
    Write-TestResult -testName "Tenant Agreement Creation Authorization" -success $false -message "Tenant should not be able to create agreements"
}

# Test tenant trying to activate agreement (should fail)
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/activate" -headers $headers
if (-not $response.Success -and $response.StatusCode -eq 403) {
    Write-TestResult -testName "Tenant Agreement Activation Authorization" -success $true -message "Tenant correctly blocked from activating agreements"
} else {
    Write-TestResult -testName "Tenant Agreement Activation Authorization" -success $false -message "Tenant should not be able to activate agreements"
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
    Write-Host "🎉 All tests passed! Landlord-tenant agreement flow is working correctly." -ForegroundColor Green
    Write-Host "✅ Agreement creation, signing, and activation flow is complete" -ForegroundColor Green
    Write-Host "✅ Both parties can access their agreements" -ForegroundColor Green
    Write-Host "✅ Authorization and security are properly enforced" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Some tests failed. Please check the implementation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🏠 Landlord-Tenant Agreement Flow Test Complete!" -ForegroundColor Cyan 