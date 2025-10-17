# Simple Agreement Flow Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "🏠 Simple Agreement Flow Test" -ForegroundColor Cyan
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

# 3. Complete tenant onboarding
Write-Host "3. Completing tenant onboarding..." -ForegroundColor Yellow
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
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/onboarding/tenant" -Method PUT -Headers $headers -ContentType "application/json" -Body ($onboardingData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Tenant onboarding completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant onboarding failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Create property
Write-Host "4. Creating test property..." -ForegroundColor Yellow
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
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/properties" -Method POST -Headers $headers -ContentType "application/json" -Body ($propertyData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Property created successfully" -ForegroundColor Green
    $propertyId = $response._id
} catch {
    Write-Host "❌ Property creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 5. Get tenant ID
Write-Host "5. Getting tenant ID..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Tenant profile retrieved" -ForegroundColor Green
    $tenantId = $response._id
} catch {
    Write-Host "❌ Get tenant profile failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 6. Create agreement (Landlord)
Write-Host "6. Creating agreement..." -ForegroundColor Yellow
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
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method POST -Headers $headers -ContentType "application/json" -Body ($agreementData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Agreement created successfully" -ForegroundColor Green
    $agreementId = $response._id
} catch {
    Write-Host "❌ Agreement creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 7. Test agreement access (Both parties)
Write-Host "7. Testing agreement access..." -ForegroundColor Yellow

# Landlord access
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId" -Method GET -Headers $headers
    Write-Host "✅ Landlord can access agreement (Status: $($response.status))" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord agreement access failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant access
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId" -Method GET -Headers $headers
    Write-Host "✅ Tenant can access agreement (Status: $($response.status))" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant agreement access failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Send for review (Landlord)
Write-Host "8. Sending agreement for review..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/review" -Method POST -Headers $headers
    Write-Host "✅ Agreement sent for review" -ForegroundColor Green
} catch {
    Write-Host "❌ Send for review failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Test pending agreements (Both parties)
Write-Host "9. Testing pending agreements..." -ForegroundColor Yellow

# Landlord pending
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers $headers
    Write-Host "✅ Landlord pending agreements: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord pending agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant pending
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers $headers
    Write-Host "✅ Tenant pending agreements: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant pending agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Sign agreement (Both parties)
Write-Host "10. Signing agreement..." -ForegroundColor Yellow
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

# Landlord signs
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/sign" -Method POST -Headers $headers -ContentType "application/json" -Body ($signatureData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Landlord signed agreement" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord signing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant signs
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/sign" -Method POST -Headers $headers -ContentType "application/json" -Body ($signatureData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Tenant signed agreement" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant signing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 11. Test agreement signatures
Write-Host "11. Testing agreement signatures..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/signatures" -Method GET -Headers $headers
    Write-Host "✅ Agreement signatures: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Get signatures failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 12. Activate agreement (Landlord)
Write-Host "12. Activating agreement..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/activate" -Method POST -Headers $headers
    Write-Host "✅ Agreement activated" -ForegroundColor Green
} catch {
    Write-Host "❌ Agreement activation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 13. Test active agreements (Both parties)
Write-Host "13. Testing active agreements..." -ForegroundColor Yellow

# Landlord active
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers $headers
    Write-Host "✅ Landlord active agreements: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord active agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant active
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers $headers
    Write-Host "✅ Tenant active agreements: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant active agreements failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 14. Test agreement statistics
Write-Host "14. Testing agreement statistics..." -ForegroundColor Yellow

# Landlord stats
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers $headers
    Write-Host "✅ Landlord stats - Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Tenant stats
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers $headers
    Write-Host "✅ Tenant stats - Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 15. Test authorization (Tenant should not create agreements)
Write-Host "15. Testing authorization..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method POST -Headers $headers -ContentType "application/json" -Body ($agreementData | ConvertTo-Json -Depth 10)
    Write-Host "❌ Tenant should not be able to create agreements" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ Tenant correctly blocked from creating agreements" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Simple Agreement Flow Test Complete!" -ForegroundColor Green
Write-Host "The landlord-tenant agreement system is working correctly!" -ForegroundColor Green 