# Digital Agreements System Test Script
# Tests all agreement-related functionality including creation, signing, and management

$baseUrl = "http://localhost:3000/api"
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

Write-Host "🏠 Digital Agreements System Test Suite" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register and login landlord
Write-Host "📝 Step 1: Setting up landlord account..." -ForegroundColor Yellow

$landlordEmail = "landlord_agreement_$timestamp@test.com"
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

# Step 2: Register and login tenant
Write-Host "📝 Step 2: Setting up tenant account..." -ForegroundColor Yellow

$tenantEmail = "tenant_agreement_$timestamp@test.com"
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

# Step 3: Complete tenant onboarding to make them verified
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

# Step 4: Create a property for the landlord
Write-Host "📝 Step 4: Creating property for landlord..." -ForegroundColor Yellow

$propertyData = @{
    title = "Test Agreement Property"
    description = "A test property for agreement testing"
    address = @{
        street = "123 Test Street"
        city = "Test City"
        state = "Test State"
        zipCode = "12345"
        country = "Test Country"
        coordinates = @{
            latitude = -26.2041
            longitude = 28.0473
        }
    }
    price = @{
        rent = 2500
        deposit = 5000
        utilities = 200
    }
    details = @{
        bedrooms = 2
        bathrooms = 2
        squareFootage = 1200
        propertyType = "apartment"
        furnished = $true
        parking = $true
        petFriendly = $true
    }
    amenities = @("wifi", "air_conditioning", "gym")
    infrastructure = @{
        electricity = $true
        water = $true
        internet = $true
        security = $true
        borehole = $false
        solar = $false
    }
    images = @{
        mainImage = "https://example.com/main.jpg"
        gallery = @("https://example.com/gallery1.jpg", "https://example.com/gallery2.jpg")
        floorPlan = "https://example.com/floorplan.jpg"
        virtualTour = "https://example.com/virtualtour.mp4"
    }
    landlordSettings = @{
        zeroDeposit = $true
        khayalamiAgentAssistance = $true
    }
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

# Step 5: Get tenant user ID
Write-Host "📝 Step 5: Getting tenant user ID..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/auth/me" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Tenant Profile" -success $true -message "Tenant profile retrieved"
    $tenantId = $response.Data._id
} else {
    Write-TestResult -testName "Get Tenant Profile" -success $false -message $response.Error
    exit
}

# Step 6: Test Agreement Templates
Write-Host "📝 Step 6: Testing agreement templates..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/templates" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Templates" -success $true -message "Templates retrieved successfully"
    $templates = $response.Data
    Write-Host "   Found $($templates.Count) templates" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Templates" -success $false -message $response.Error
}

# Step 7: Create Agreement
Write-Host "📝 Step 7: Creating agreement..." -ForegroundColor Yellow

$agreementData = @{
    propertyId = $propertyId
    tenantId = $tenantId
    title = "Test Tenancy Agreement"
    description = "A test agreement for the test property"
    startDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    endDate = (Get-Date).AddDays(395).ToString("yyyy-MM-dd")
    rentAmount = 2500
    depositAmount = 5000
    zeroDeposit = $true
    terms = @(
        "Tenant shall pay rent on time",
        "Tenant shall maintain the property",
        "Landlord shall provide habitable conditions",
        "Both parties shall give proper notice for termination"
    )
    specialConditions = @(
        "Zero deposit with Khayalami protection plan",
        "Monthly maintenance included"
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
    Write-TestResult -testName "Create Agreement" -success $true -message "Agreement created successfully"
    $agreementId = $response.Data._id
} else {
    Write-TestResult -testName "Create Agreement" -success $false -message $response.Error
    exit
}

# Step 8: Get Agreement by ID (Landlord)
Write-Host "📝 Step 8: Testing agreement retrieval..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement by ID (Landlord)" -success $true -message "Agreement retrieved successfully"
    $agreement = $response.Data
    Write-Host "   Status: $($agreement.status)" -ForegroundColor Gray
    Write-Host "   Title: $($agreement.title)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement by ID (Landlord)" -success $false -message $response.Error
}

# Step 9: Get Agreement by ID (Tenant)
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement by ID (Tenant)" -success $true -message "Agreement retrieved successfully by tenant"
} else {
    Write-TestResult -testName "Get Agreement by ID (Tenant)" -success $false -message $response.Error
}

# Step 10: Update Agreement (Landlord only)
Write-Host "📝 Step 10: Testing agreement updates..." -ForegroundColor Yellow

$updateData = @{
    description = "Updated description for the test agreement"
    specialConditions = @(
        "Zero deposit with Khayalami protection plan",
        "Monthly maintenance included",
        "Additional security deposit waiver"
    )
}

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "PUT" -url "$baseUrl/agreements/$agreementId" -body $updateData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Update Agreement" -success $true -message "Agreement updated successfully"
} else {
    Write-TestResult -testName "Update Agreement" -success $false -message $response.Error
}

# Step 11: Send Agreement for Review
Write-Host "📝 Step 11: Sending agreement for review..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/review" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Send Agreement for Review" -success $true -message "Agreement sent for review"
    Write-Host "   New status: $($response.Data.status)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Send Agreement for Review" -success $false -message $response.Error
}

# Step 12: Sign Agreement (Landlord)
Write-Host "📝 Step 12: Testing agreement signing..." -ForegroundColor Yellow

$signatureData = @{
    signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ipAddress = "192.168.1.1"
}

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/sign" -body $signatureData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Sign Agreement (Landlord)" -success $true -message "Landlord signed agreement"
    Write-Host "   Status after landlord signature: $($response.Data.status)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Sign Agreement (Landlord)" -success $false -message $response.Error
}

# Step 13: Sign Agreement (Tenant)
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/sign" -body $signatureData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Sign Agreement (Tenant)" -success $true -message "Tenant signed agreement"
    Write-Host "   Status after tenant signature: $($response.Data.status)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Sign Agreement (Tenant)" -success $false -message $response.Error
}

# Step 14: Upload Attachment
Write-Host "📝 Step 14: Testing attachment upload..." -ForegroundColor Yellow

$attachmentData = @{
    name = "Additional Terms.pdf"
    url = "https://example.com/additional-terms.pdf"
    type = "document"
}

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements/$agreementId/attachments" -body $attachmentData -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Upload Attachment" -success $true -message "Attachment uploaded successfully"
    Write-Host "   Attachments count: $($response.Data.attachments.Count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Upload Attachment" -success $false -message $response.Error
}

# Step 15: Get Agreement Statistics
Write-Host "📝 Step 15: Testing agreement statistics..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/stats" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Statistics (Landlord)" -success $true -message "Statistics retrieved successfully"
    $stats = $response.Data
    Write-Host "   Total agreements: $($stats.total)" -ForegroundColor Gray
    Write-Host "   Active agreements: $($stats.active)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get Agreement Statistics (Landlord)" -success $false -message $response.Error
}

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/stats" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get Agreement Statistics (Tenant)" -success $true -message "Statistics retrieved successfully"
} else {
    Write-TestResult -testName "Get Agreement Statistics (Tenant)" -success $false -message $response.Error
}

# Step 16: Get User Agreements
Write-Host "📝 Step 16: Testing user agreements listing..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get User Agreements (Landlord)" -success $true -message "Landlord agreements retrieved"
    Write-Host "   Agreements count: $($response.Data.Count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get User Agreements (Landlord)" -success $false -message $response.Error
}

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Get User Agreements (Tenant)" -success $true -message "Tenant agreements retrieved"
    Write-Host "   Agreements count: $($response.Data.Count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Get User Agreements (Tenant)" -success $false -message $response.Error
}

# Step 17: Generate Agreement PDF
Write-Host "📝 Step 17: Testing PDF generation..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$agreementId/pdf" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Generate Agreement PDF" -success $true -message "PDF URL generated"
    Write-Host "   PDF URL: $($response.Data.pdfUrl)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Generate Agreement PDF" -success $false -message $response.Error
}

# Step 18: Test Authorization (Tenant trying to create agreement)
Write-Host "📝 Step 18: Testing authorization..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "POST" -url "$baseUrl/agreements" -body $agreementData -headers $headers
if (-not $response.Success -and $response.StatusCode -eq 403) {
    Write-TestResult -testName "Tenant Authorization Check" -success $true -message "Tenant correctly blocked from creating agreements"
} else {
    Write-TestResult -testName "Tenant Authorization Check" -success $false -message "Tenant should not be able to create agreements"
}

# Step 19: Test Invalid Agreement Access
Write-Host "📝 Step 19: Testing invalid access..." -ForegroundColor Yellow

$fakeAgreementId = "507f1f77bcf86cd799439011"
$headers = @{ Authorization = "Bearer $tenantToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements/$fakeAgreementId" -headers $headers
if (-not $response.Success) {
    Write-TestResult -testName "Invalid Agreement Access" -success $true -message "Correctly blocked access to non-existent agreement"
} else {
    Write-TestResult -testName "Invalid Agreement Access" -success $false -message "Should not be able to access non-existent agreement"
}

# Step 20: Test Agreement Filtering
Write-Host "📝 Step 20: Testing agreement filtering..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
$response = Test-API -method "GET" -url "$baseUrl/agreements?status=active" -headers $headers
if ($response.Success) {
    Write-TestResult -testName "Agreement Status Filtering" -success $true -message "Filtered agreements retrieved"
    Write-Host "   Filtered agreements count: $($response.Data.Count)" -ForegroundColor Gray
} else {
    Write-TestResult -testName "Agreement Status Filtering" -success $false -message $response.Error
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
    Write-Host "🎉 All tests passed! Digital Agreements system is working correctly." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Some tests failed. Please check the implementation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Detailed Test Results:" -ForegroundColor Cyan
$testResults | Format-Table -AutoSize

Write-Host ""
Write-Host "🏠 Digital Agreements System Test Complete!" -ForegroundColor Cyan 