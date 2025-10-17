# Tenant Verification Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Tenant Verification Test" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_verify_$timestamp@test.com"
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
$tenantEmail = "tenant_verify_$timestamp@test.com"
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

# 3. Check tenant verification status before onboarding
Write-Host "3. Checking tenant verification status before onboarding..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Tenant profile retrieved" -ForegroundColor Green
    Write-Host "   Is Verified: $($response.isVerified)" -ForegroundColor Gray
    Write-Host "   Requires Onboarding: $($response.requiresOnboarding)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get tenant profile failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Complete tenant onboarding
Write-Host "4. Completing tenant onboarding..." -ForegroundColor Yellow
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

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/onboarding/tenant" -Method PUT -Headers $headers -ContentType "application/json" -Body ($onboardingData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Tenant onboarding completed" -ForegroundColor Green
    Write-Host "   Is Completed: $($response.isCompleted)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant onboarding failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 5. Check tenant verification status after onboarding
Write-Host "5. Checking tenant verification status after onboarding..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Tenant profile after onboarding" -ForegroundColor Green
    Write-Host "   Is Verified: $($response.isVerified)" -ForegroundColor Gray
    Write-Host "   Requires Onboarding: $($response.requiresOnboarding)" -ForegroundColor Gray
    $tenantId = $response._id
} catch {
    Write-Host "❌ Get tenant profile failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 6. Create property
Write-Host "6. Creating test property..." -ForegroundColor Yellow
$propertyData = @{
    title = "Test Property for Verification"
    description = "A test property for verification testing"
    propertyType = "apartment"
    address = @{
        street = "123 Verification Street"
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

# 7. Create agreement with verified tenant
Write-Host "7. Creating agreement with verified tenant..." -ForegroundColor Yellow
$agreementData = @{
    propertyId = $propertyId
    tenantId = $tenantId
    title = "Test Tenancy Agreement for Verification"
    description = "A test agreement with verified tenant"
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
        "Special condition for verification test"
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

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements" -Method POST -Headers $headers -ContentType "application/json" -Body ($agreementData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Agreement created successfully" -ForegroundColor Green
    $agreementId = $response._id
    Write-Host "   Agreement ID: $agreementId" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreement creation failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more detailed error information
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error Response Body:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor Red
    } catch {
        Write-Host "   Could not read error response body" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Tenant Verification Test Complete!" -ForegroundColor Green 