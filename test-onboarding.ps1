# Test Onboarding System - Khayalami Home Finder
$baseUrl = "http://localhost:3001"

Write-Host "Testing Onboarding System - Khayalami Home Finder" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Test Results Summary
$testResults = @{
    "Registration with Role Selection" = @{}
    "Landlord Onboarding" = @{}
    "Tenant Onboarding" = @{}
    "Onboarding Progress" = @{}
    "Role-Based Access" = @{}
    "API Endpoints" = @{}
}

# 1. Test Registration with Role Selection
Write-Host "`n1. Testing Registration with Role Selection" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Test registration without role (should fail)
Write-Host "1.1 Testing registration without role (should fail)..." -ForegroundColor Yellow
try {
    $invalidPayload = @{
        email = "test@example.com"
        password = "password123"
        firstName = "Test"
        lastName = "User"
        phone = "+27123456789"
    }
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($invalidPayload | ConvertTo-Json)
    Write-Host "❌ Registration succeeded without role (should have failed)" -ForegroundColor Red
    $testResults["Registration with Role Selection"]["Role Required"] = "FAIL"
} catch {
    Write-Host "✅ Registration correctly blocked without role" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $testResults["Registration with Role Selection"]["Role Required"] = "PASS"
}

# Test registration with invalid role (should fail)
Write-Host "1.2 Testing registration with invalid role (should fail)..." -ForegroundColor Yellow
try {
    $invalidRolePayload = @{
        email = "test@example.com"
        password = "password123"
        firstName = "Test"
        lastName = "User"
        role = "invalid_role"
        phone = "+27123456789"
    }
    $invalidRoleResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($invalidRolePayload | ConvertTo-Json)
    Write-Host "❌ Registration succeeded with invalid role (should have failed)" -ForegroundColor Red
    $testResults["Registration with Role Selection"]["Invalid Role Blocked"] = "FAIL"
} catch {
    Write-Host "✅ Registration correctly blocked with invalid role" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $testResults["Registration with Role Selection"]["Invalid Role Blocked"] = "PASS"
}

# Test landlord registration (should succeed)
Write-Host "1.3 Testing landlord registration..." -ForegroundColor Yellow
try {
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $landlordPayload = @{
        email = "landlord.onboarding.$timestamp@test.com"
        password = "password123"
        firstName = "John"
        lastName = "Landlord"
        role = "landlord"
        phone = "+27123456789"
    }
    $landlordRegisterResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($landlordPayload | ConvertTo-Json)
    Write-Host "✅ Landlord registration successful" -ForegroundColor Green
    Write-Host "   User ID: $($landlordRegisterResponse.data.userId)" -ForegroundColor White
    Write-Host "   Role: $($landlordRegisterResponse.data.role)" -ForegroundColor White
    Write-Host "   Requires Onboarding: $($landlordRegisterResponse.data.requiresOnboarding)" -ForegroundColor White
    $testResults["Registration with Role Selection"]["Landlord Registration"] = "PASS"
    $landlordToken = $landlordRegisterResponse.token
} catch {
    Write-Host "❌ Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Registration with Role Selection"]["Landlord Registration"] = "FAIL"
}

# Test tenant registration (should succeed)
Write-Host "1.4 Testing tenant registration..." -ForegroundColor Yellow
try {
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $tenantPayload = @{
        email = "tenant.onboarding.$timestamp@test.com"
        password = "password123"
        firstName = "Jane"
        lastName = "Tenant"
        role = "tenant"
        phone = "+27987654321"
    }
    $tenantRegisterResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body ($tenantPayload | ConvertTo-Json)
    Write-Host "✅ Tenant registration successful" -ForegroundColor Green
    Write-Host "   User ID: $($tenantRegisterResponse.data.userId)" -ForegroundColor White
    Write-Host "   Role: $($tenantRegisterResponse.data.role)" -ForegroundColor White
    Write-Host "   Requires Onboarding: $($tenantRegisterResponse.data.requiresOnboarding)" -ForegroundColor White
    $testResults["Registration with Role Selection"]["Tenant Registration"] = "PASS"
    $tenantToken = $tenantRegisterResponse.token
} catch {
    Write-Host "❌ Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Registration with Role Selection"]["Tenant Registration"] = "FAIL"
}

# 2. Test Landlord Onboarding
Write-Host "`n2. Testing Landlord Onboarding" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$landlordHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $landlordToken"
}

# Get onboarding status
Write-Host "2.1 Getting landlord onboarding status..." -ForegroundColor Yellow
try {
    $landlordStatusResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $landlordHeaders
    Write-Host "✅ Landlord onboarding status retrieved" -ForegroundColor Green
    Write-Host "   Is Completed: $($landlordStatusResponse.data.isCompleted)" -ForegroundColor White
    Write-Host "   Current Step: $($landlordStatusResponse.data.currentStep)" -ForegroundColor White
    Write-Host "   Total Steps: $($landlordStatusResponse.data.totalSteps)" -ForegroundColor White
    $testResults["Landlord Onboarding"]["Get Status"] = "PASS"
} catch {
    Write-Host "❌ Failed to get landlord onboarding status: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Landlord Onboarding"]["Get Status"] = "FAIL"
}

# Get onboarding requirements
Write-Host "2.2 Getting landlord onboarding requirements..." -ForegroundColor Yellow
try {
    $landlordRequirementsResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/requirements" -Method GET -Headers $landlordHeaders
    Write-Host "✅ Landlord onboarding requirements retrieved" -ForegroundColor Green
    Write-Host "   User Type: $($landlordRequirementsResponse.data.userType)" -ForegroundColor White
    Write-Host "   Total Steps: $($landlordRequirementsResponse.data.totalSteps)" -ForegroundColor White
    Write-Host "   Steps: $($landlordRequirementsResponse.data.steps.Count)" -ForegroundColor White
    $testResults["Landlord Onboarding"]["Get Requirements"] = "PASS"
} catch {
    Write-Host "❌ Failed to get landlord onboarding requirements: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Landlord Onboarding"]["Get Requirements"] = "FAIL"
}

# Update profile setup step
Write-Host "2.3 Updating landlord profile setup step..." -ForegroundColor Yellow
try {
    $profileSetupData = @{
        step = "profileSetup"
        data = @{
            businessName = "Landlord Properties Ltd"
            businessType = "Company"
            businessLicense = "BL123456"
            taxId = "TAX123456"
            yearsInBusiness = 5
            portfolioSize = 10
        }
    }
    $profileSetupResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/landlord" -Method PUT -Headers $landlordHeaders -Body ($profileSetupData | ConvertTo-Json -Depth 3)
    Write-Host "✅ Landlord profile setup completed" -ForegroundColor Green
    Write-Host "   Current Step: $($profileSetupResponse.data.currentStep)" -ForegroundColor White
    $testResults["Landlord Onboarding"]["Profile Setup"] = "PASS"
} catch {
    Write-Host "❌ Failed to update landlord profile setup: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Landlord Onboarding"]["Profile Setup"] = "FAIL"
}

# Update property details step
Write-Host "2.4 Updating landlord property details step..." -ForegroundColor Yellow
try {
    $propertyDetailsData = @{
        step = "propertyDetails"
        data = @{
            propertyTypes = @("apartment", "house", "studio")
            totalProperties = 10
            averageRent = 15000
            preferredAreas = @("Sandton", "Rosebank", "Melville")
            propertyManagement = $true
        }
    }
    $propertyDetailsResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/landlord" -Method PUT -Headers $landlordHeaders -Body ($propertyDetailsData | ConvertTo-Json -Depth 3)
    Write-Host "✅ Landlord property details completed" -ForegroundColor Green
    Write-Host "   Current Step: $($propertyDetailsResponse.data.currentStep)" -ForegroundColor White
    $testResults["Landlord Onboarding"]["Property Details"] = "PASS"
} catch {
    Write-Host "❌ Failed to update landlord property details: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Landlord Onboarding"]["Property Details"] = "FAIL"
}

# 3. Test Tenant Onboarding
Write-Host "`n3. Testing Tenant Onboarding" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

$tenantHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $tenantToken"
}

# Get onboarding status
Write-Host "3.1 Getting tenant onboarding status..." -ForegroundColor Yellow
try {
    $tenantStatusResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $tenantHeaders
    Write-Host "✅ Tenant onboarding status retrieved" -ForegroundColor Green
    Write-Host "   Is Completed: $($tenantStatusResponse.data.isCompleted)" -ForegroundColor White
    Write-Host "   Current Step: $($tenantStatusResponse.data.currentStep)" -ForegroundColor White
    Write-Host "   Total Steps: $($tenantStatusResponse.data.totalSteps)" -ForegroundColor White
    $testResults["Tenant Onboarding"]["Get Status"] = "PASS"
} catch {
    Write-Host "❌ Failed to get tenant onboarding status: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Tenant Onboarding"]["Get Status"] = "FAIL"
}

# Get onboarding requirements
Write-Host "3.2 Getting tenant onboarding requirements..." -ForegroundColor Yellow
try {
    $tenantRequirementsResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/requirements" -Method GET -Headers $tenantHeaders
    Write-Host "✅ Tenant onboarding requirements retrieved" -ForegroundColor Green
    Write-Host "   User Type: $($tenantRequirementsResponse.data.userType)" -ForegroundColor White
    Write-Host "   Total Steps: $($tenantRequirementsResponse.data.totalSteps)" -ForegroundColor White
    Write-Host "   Steps: $($tenantRequirementsResponse.data.steps.Count)" -ForegroundColor White
    $testResults["Tenant Onboarding"]["Get Requirements"] = "PASS"
} catch {
    Write-Host "❌ Failed to get tenant onboarding requirements: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Tenant Onboarding"]["Get Requirements"] = "FAIL"
}

# Update profile setup step
Write-Host "3.3 Updating tenant profile setup step..." -ForegroundColor Yellow
try {
    $tenantProfileData = @{
        step = "profileSetup"
        data = @{
            employmentStatus = "Employed"
            employer = "Tech Company Ltd"
            monthlyIncome = 45000
            employmentDuration = 3
            references = @("John Manager", "HR Department")
        }
    }
    $tenantProfileResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/tenant" -Method PUT -Headers $tenantHeaders -Body ($tenantProfileData | ConvertTo-Json -Depth 3)
    Write-Host "✅ Tenant profile setup completed" -ForegroundColor Green
    Write-Host "   Current Step: $($tenantProfileResponse.data.currentStep)" -ForegroundColor White
    $testResults["Tenant Onboarding"]["Profile Setup"] = "PASS"
} catch {
    Write-Host "❌ Failed to update tenant profile setup: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Tenant Onboarding"]["Profile Setup"] = "FAIL"
}

# Update rental history step
Write-Host "3.4 Updating tenant rental history step..." -ForegroundColor Yellow
try {
    $rentalHistoryData = @{
        step = "rentalHistory"
        data = @{
            previousLandlords = @("Previous Landlord 1", "Previous Landlord 2")
            rentalHistory = 2
            evictionHistory = $false
            paymentHistory = "Excellent"
            references = @("Landlord Reference 1", "Landlord Reference 2")
        }
    }
    $rentalHistoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/tenant" -Method PUT -Headers $tenantHeaders -Body ($rentalHistoryData | ConvertTo-Json -Depth 3)
    Write-Host "✅ Tenant rental history completed" -ForegroundColor Green
    Write-Host "   Current Step: $($rentalHistoryResponse.data.currentStep)" -ForegroundColor White
    $testResults["Tenant Onboarding"]["Rental History"] = "PASS"
} catch {
    Write-Host "❌ Failed to update tenant rental history: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Tenant Onboarding"]["Rental History"] = "FAIL"
}

# 4. Test Onboarding Progress
Write-Host "`n4. Testing Onboarding Progress" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Get landlord progress
Write-Host "4.1 Getting landlord onboarding progress..." -ForegroundColor Yellow
try {
    $landlordProgressResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/progress" -Method GET -Headers $landlordHeaders
    Write-Host "✅ Landlord onboarding progress retrieved" -ForegroundColor Green
    Write-Host "   Progress: $($landlordProgressResponse.data.progress)%" -ForegroundColor White
    Write-Host "   Completed Steps: $($landlordProgressResponse.data.completedSteps)" -ForegroundColor White
    Write-Host "   Total Steps: $($landlordProgressResponse.data.totalSteps)" -ForegroundColor White
    $testResults["Onboarding Progress"]["Landlord Progress"] = "PASS"
} catch {
    Write-Host "❌ Failed to get landlord progress: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Onboarding Progress"]["Landlord Progress"] = "FAIL"
}

# Get tenant progress
Write-Host "4.2 Getting tenant onboarding progress..." -ForegroundColor Yellow
try {
    $tenantProgressResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/progress" -Method GET -Headers $tenantHeaders
    Write-Host "✅ Tenant onboarding progress retrieved" -ForegroundColor Green
    Write-Host "   Progress: $($tenantProgressResponse.data.progress)%" -ForegroundColor White
    Write-Host "   Completed Steps: $($tenantProgressResponse.data.completedSteps)" -ForegroundColor White
    Write-Host "   Total Steps: $($tenantProgressResponse.data.totalSteps)" -ForegroundColor White
    $testResults["Onboarding Progress"]["Tenant Progress"] = "PASS"
} catch {
    Write-Host "❌ Failed to get tenant progress: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["Onboarding Progress"]["Tenant Progress"] = "FAIL"
}

# 5. Test Role-Based Access
Write-Host "`n5. Testing Role-Based Access" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Test tenant trying to access landlord onboarding (should fail)
Write-Host "5.1 Testing tenant accessing landlord onboarding (should fail)..." -ForegroundColor Yellow
try {
    $tenantLandlordData = @{
        step = "profileSetup"
        data = @{
            businessName = "Test Business"
        }
    }
    $tenantLandlordResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/landlord" -Method PUT -Headers $tenantHeaders -Body ($tenantLandlordData | ConvertTo-Json -Depth 3)
    Write-Host "❌ Tenant was able to access landlord onboarding (should have failed)" -ForegroundColor Red
    $testResults["Role-Based Access"]["Tenant Landlord Access"] = "FAIL"
} catch {
    Write-Host "✅ Tenant correctly blocked from landlord onboarding" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $testResults["Role-Based Access"]["Tenant Landlord Access"] = "PASS"
}

# Test landlord trying to access tenant onboarding (should fail)
Write-Host "5.2 Testing landlord accessing tenant onboarding (should fail)..." -ForegroundColor Yellow
try {
    $landlordTenantData = @{
        step = "profileSetup"
        data = @{
            employmentStatus = "Employed"
        }
    }
    $landlordTenantResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/tenant" -Method PUT -Headers $landlordHeaders -Body ($landlordTenantData | ConvertTo-Json -Depth 3)
    Write-Host "❌ Landlord was able to access tenant onboarding (should have failed)" -ForegroundColor Red
    $testResults["Role-Based Access"]["Landlord Tenant Access"] = "FAIL"
} catch {
    Write-Host "✅ Landlord correctly blocked from tenant onboarding" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $testResults["Role-Based Access"]["Landlord Tenant Access"] = "PASS"
}

# 6. Test API Endpoints
Write-Host "`n6. Testing API Endpoints" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

# Test skip onboarding step
Write-Host "6.1 Testing skip onboarding step..." -ForegroundColor Yellow
try {
    $skipData = @{
        step = "verification"
    }
    $skipResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/skip" -Method POST -Headers $landlordHeaders -Body ($skipData | ConvertTo-Json)
    Write-Host "✅ Skip onboarding step successful" -ForegroundColor Green
    Write-Host "   Current Step: $($skipResponse.data.currentStep)" -ForegroundColor White
    $testResults["API Endpoints"]["Skip Step"] = "PASS"
} catch {
    Write-Host "❌ Failed to skip onboarding step: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["API Endpoints"]["Skip Step"] = "FAIL"
}

# Test reset onboarding
Write-Host "6.2 Testing reset onboarding..." -ForegroundColor Yellow
try {
    $resetResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/reset" -Method DELETE -Headers $landlordHeaders
    Write-Host "✅ Reset onboarding successful" -ForegroundColor Green
    $testResults["API Endpoints"]["Reset Onboarding"] = "PASS"
} catch {
    Write-Host "❌ Failed to reset onboarding: $($_.Exception.Message)" -ForegroundColor Red
    $testResults["API Endpoints"]["Reset Onboarding"] = "FAIL"
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
    Write-Host "`n🎉 Onboarding system is working well!" -ForegroundColor Green
} elseif ($successRate -ge 60) {
    Write-Host "`n⚠️  Onboarding system has some issues that need attention" -ForegroundColor Yellow
} else {
    Write-Host "`n🚨 Onboarding system has significant issues that need immediate attention" -ForegroundColor Red
}

Write-Host "`nOnboarding system test finished!" -ForegroundColor Green 