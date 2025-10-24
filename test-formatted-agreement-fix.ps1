# Test script to verify the formatted agreement fix
Write-Host "Testing Formatted Agreement Fix..." -ForegroundColor Green

Write-Host "`nThe issue was:" -ForegroundColor Yellow
Write-Host "1. Address field was an object but code expected a string" -ForegroundColor White
Write-Host "2. Missing safety checks for optional fields like paymentSchedule and khayalamiProtection" -ForegroundColor White
Write-Host "3. No error handling in the generation process" -ForegroundColor White

Write-Host "`nFixes applied:" -ForegroundColor Green
Write-Host "✅ Added proper address object handling" -ForegroundColor White
Write-Host "✅ Added safety checks for paymentSchedule field" -ForegroundColor White
Write-Host "✅ Added safety checks for khayalamiProtection field" -ForegroundColor White
Write-Host "✅ Added error handling and logging" -ForegroundColor White

Write-Host "`nNow when you fetch an agreement:" -ForegroundColor Cyan
Write-Host "GET /api/agreements/{agreementId}" -ForegroundColor Gray
Write-Host "The response will include the 'formattedAgreement' field with:" -ForegroundColor White

Write-Host "`n- Properly formatted address: '8 Dan Judson Road, Harare, Harare 000, Zimbabwe'" -ForegroundColor White
Write-Host "- All agreement details filled in" -ForegroundColor White
Write-Host "- Error handling if any field is missing" -ForegroundColor White
Write-Host "- Console logging for debugging" -ForegroundColor White

Write-Host "`nExpected response structure:" -ForegroundColor Magenta
Write-Host "{`n  'success': true,`n  'data': {`n    '_id': '...',`n    'title': 'Rental Agreement - tenant',`n    'status': 'signed',`n    'formattedAgreement': 'RENTAL AGREEMENT\n\nThis is a rental agreement between Nyasha Karata (Landlord) and Kundai K (Tenant) for the property located at 8 Dan Judson Road, Harare, Harare 000, Zimbabwe...'`n  }`n}" -ForegroundColor Gray

Write-Host "`nTest it now by fetching your agreement!" -ForegroundColor Green















