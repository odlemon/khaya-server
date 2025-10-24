# Test script to demonstrate formatted agreement functionality
# This script will create a test agreement and fetch it to show the formatted output

Write-Host "Testing Formatted Agreement Generation..." -ForegroundColor Green

# Test data for creating an agreement
$testAgreement = @{
    propertyId = "507f1f77bcf86cd799439011"  # Replace with actual property ID
    tenantId = "507f1f77bcf86cd799439012"    # Replace with actual tenant ID
    title = "Test Rental Agreement"
    description = "A test agreement to demonstrate formatted output"
    startDate = "2024-01-01T00:00:00.000Z"
    endDate = "2024-12-31T23:59:59.999Z"
    rentAmount = 1500
    depositAmount = 3000
    zeroDeposit = $false
    terms = @(
        "Tenant shall pay rent on time",
        "Tenant shall maintain the property in good condition",
        "Tenant shall not sublet without written permission",
        "Landlord shall provide necessary maintenance"
    )
    specialConditions = @(
        "No pets allowed",
        "No smoking on premises"
    )
    paymentSchedule = @{
        frequency = "monthly"
        dueDay = 1
        lateFee = 100
        gracePeriod = 5
    }
    utilitiesIncluded = $true
    utilitiesList = @("Water", "Electricity", "Internet")
    maintenanceIncluded = $true
    khayalamiProtection = @{
        enabled = $true
        planType = "premium"
        monthlyFee = 50
        coverage = @("Property damage", "Liability protection", "Rent guarantee")
    }
}

# Convert to JSON
$jsonData = $testAgreement | ConvertTo-Json -Depth 10

Write-Host "Test Agreement Data:" -ForegroundColor Yellow
Write-Host $jsonData

Write-Host "`nTo test the formatted agreement:" -ForegroundColor Cyan
Write-Host "1. First create an agreement using the above data" -ForegroundColor White
Write-Host "2. Then fetch the agreement by ID to see the formatted output" -ForegroundColor White
Write-Host "3. The response will include a 'formattedAgreement' field with the human-readable text" -ForegroundColor White

Write-Host "`nExample API calls:" -ForegroundColor Magenta
Write-Host "POST http://localhost:3001/api/agreements" -ForegroundColor Gray
Write-Host "GET http://localhost:3001/api/agreements/{agreementId}" -ForegroundColor Gray

Write-Host "`nThe formatted agreement will include:" -ForegroundColor Green
Write-Host "- Agreement details (dates, duration, status)" -ForegroundColor White
Write-Host "- Rental terms (rent, deposit, payment schedule)" -ForegroundColor White
Write-Host "- Utilities and services information" -ForegroundColor White
Write-Host "- Khayalami protection plan details" -ForegroundColor White
Write-Host "- Landlord and tenant information" -ForegroundColor White
Write-Host "- Terms and conditions" -ForegroundColor White
Write-Host "- Signature status" -ForegroundColor White
Write-Host "- Agreement status timeline" -ForegroundColor White















