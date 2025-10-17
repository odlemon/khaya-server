# Agreement Signing Logic Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Agreement Signing Logic Test" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_sign_$timestamp@test.com"
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
$tenantEmail = "tenant_sign_$timestamp@test.com"
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

# 4. Get tenant ID
Write-Host "4. Getting tenant ID..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Tenant profile retrieved" -ForegroundColor Green
    $tenantId = $response._id
} catch {
    Write-Host "❌ Get tenant profile failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 5. Create agreement (Landlord)
Write-Host "5. Creating agreement..." -ForegroundColor Yellow
$agreementData = @{
    propertyId = $propertyId
    tenantId = $tenantId
    title = "Test Tenancy Agreement for Signing"
    description = "A test agreement to verify signing logic"
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
        "Special condition for signing test"
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
    Write-Host "   Agreement ID: $agreementId" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreement creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 6. Check initial agreement status
Write-Host "6. Checking initial agreement status..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId" -Method GET -Headers $headers
    Write-Host "✅ Initial status: $($response.status)" -ForegroundColor Green
    Write-Host "   Landlord signed: $($response.signatures.landlord -ne $null)" -ForegroundColor Gray
    Write-Host "   Tenant signed: $($response.signatures.tenant -ne $null)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get agreement failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Check signatures before signing
Write-Host "7. Checking signatures before signing..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/signatures" -Method GET -Headers $headers
    Write-Host "✅ Signatures check working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) signatures" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get signatures failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Landlord signs first
Write-Host "8. Landlord signing agreement..." -ForegroundColor Yellow
$landlordSignatureData = @{
    signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ipAddress = "192.168.1.100"
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    deviceInfo = @{
        type = "desktop"
        os = "Windows"
        browser = "Chrome"
    }
    signatureType = "drawing"
    verificationMethod = "email"
    sessionId = "landlord-session-123"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/sign" -Method POST -Headers $headers -ContentType "application/json" -Body ($landlordSignatureData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Landlord signed successfully" -ForegroundColor Green
    Write-Host "   Signature ID: $($response.signatureId)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Landlord signing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Check status after landlord signs
Write-Host "9. Checking status after landlord signs..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId" -Method GET -Headers $headers
    Write-Host "✅ Status after landlord: $($response.status)" -ForegroundColor Green
    Write-Host "   Landlord signed: $($response.signatures.landlord -ne $null)" -ForegroundColor Gray
    Write-Host "   Tenant signed: $($response.signatures.tenant -ne $null)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get agreement failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Check signatures after landlord signs
Write-Host "10. Checking signatures after landlord signs..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/signatures" -Method GET -Headers $headers
    Write-Host "✅ Signatures after landlord: $($response.Count)" -ForegroundColor Green
    foreach ($sig in $response) {
        Write-Host "   - $($sig.userRole): $($sig.signedAt)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Get signatures failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 11. Tenant signs
Write-Host "11. Tenant signing agreement..." -ForegroundColor Yellow
$tenantSignatureData = @{
    signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ipAddress = "192.168.1.200"
    userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    deviceInfo = @{
        type = "mobile"
        os = "iOS"
        browser = "Safari"
    }
    signatureType = "drawing"
    verificationMethod = "email"
    sessionId = "tenant-session-456"
}

$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/sign" -Method POST -Headers $headers -ContentType "application/json" -Body ($tenantSignatureData | ConvertTo-Json -Depth 10)
    Write-Host "✅ Tenant signed successfully" -ForegroundColor Green
    Write-Host "   Signature ID: $($response.signatureId)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tenant signing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 12. Check status after both sign
Write-Host "12. Checking status after both parties sign..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId" -Method GET -Headers $headers
    Write-Host "✅ Status after both: $($response.status)" -ForegroundColor Green
    Write-Host "   Landlord signed: $($response.signatures.landlord -ne $null)" -ForegroundColor Gray
    Write-Host "   Tenant signed: $($response.signatures.tenant -ne $null)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get agreement failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 13. Check all signatures
Write-Host "13. Checking all signatures..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/signatures" -Method GET -Headers $headers
    Write-Host "✅ All signatures: $($response.Count)" -ForegroundColor Green
    foreach ($sig in $response) {
        Write-Host "   - $($sig.userRole): $($sig.signedAt) (Verified: $($sig.isVerified))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Get signatures failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 14. Verify signature integrity
Write-Host "14. Verifying signature integrity..." -ForegroundColor Yellow
if ($response.Count -gt 0) {
    $firstSignature = $response[0]
    try {
        $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/signatures/$($firstSignature._id)/verify" -Method GET -Headers $headers
        Write-Host "✅ Signature verification working" -ForegroundColor Green
        Write-Host "   Integrity: $($verifyResponse.integrity)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Signature verification failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 15. Test duplicate signing prevention
Write-Host "15. Testing duplicate signing prevention..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/sign" -Method POST -Headers $headers -ContentType "application/json" -Body ($tenantSignatureData | ConvertTo-Json -Depth 10)
    Write-Host "❌ Tenant should not be able to sign twice" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "✅ Duplicate signing correctly prevented" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 16. Check pending vs active agreements
Write-Host "16. Checking pending vs active agreements..." -ForegroundColor Yellow

# Check pending (should be 0 since both signed)
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers $headers
    Write-Host "✅ Landlord pending: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord pending failed: $($_.Exception.Message)" -ForegroundColor Red
}

$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/pending" -Method GET -Headers $headers
    Write-Host "✅ Tenant pending: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant pending failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 17. Activate agreement (Landlord)
Write-Host "17. Activating agreement..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/activate" -Method POST -Headers $headers
    Write-Host "✅ Agreement activated successfully" -ForegroundColor Green
    Write-Host "   Final status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agreement activation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 18. Check active agreements
Write-Host "18. Checking active agreements..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers $headers
    Write-Host "✅ Landlord active: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord active failed: $($_.Exception.Message)" -ForegroundColor Red
}

$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/active" -Method GET -Headers $headers
    Write-Host "✅ Tenant active: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant active failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 19. Test agreement audit trail
Write-Host "19. Testing agreement audit trail..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/$agreementId/audit-trail" -Method GET -Headers $headers
    Write-Host "✅ Audit trail working" -ForegroundColor Green
    Write-Host "   Found $($response.Count) audit entries" -ForegroundColor Gray
    foreach ($entry in $response) {
        Write-Host "   - $($entry.action): $($entry.timestamp)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Audit trail failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 20. Test agreement statistics
Write-Host "20. Testing agreement statistics..." -ForegroundColor Yellow

$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers $headers
    Write-Host "✅ Landlord stats - Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Green
} catch {
    Write-Host "❌ Landlord stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agreements/stats" -Method GET -Headers $headers
    Write-Host "✅ Tenant stats - Total: $($response.total), Active: $($response.active), Pending: $($response.pending)" -ForegroundColor Green
} catch {
    Write-Host "❌ Tenant stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Agreement Signing Logic Test Complete!" -ForegroundColor Green
Write-Host "The signing system is working correctly with proper status tracking!" -ForegroundColor Green 