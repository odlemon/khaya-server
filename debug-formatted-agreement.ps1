# Debug script for formatted agreement issue
Write-Host "🔍 Debugging Formatted Agreement Issue..." -ForegroundColor Green

Write-Host "`nI've added extensive debugging to help identify the issue:" -ForegroundColor Yellow

Write-Host "`n1. Service Method Debugging:" -ForegroundColor Cyan
Write-Host "   - Logs when generation starts" -ForegroundColor White
Write-Host "   - Logs landlord, tenant, and property data" -ForegroundColor White
Write-Host "   - Logs generated agreement length and preview" -ForegroundColor White
Write-Host "   - Logs when field is added to response" -ForegroundColor White
Write-Host "   - Logs all object keys after adding formattedAgreement" -ForegroundColor White

Write-Host "`n2. Controller Debugging:" -ForegroundColor Cyan
Write-Host "   - Logs agreement keys before sending response" -ForegroundColor White
Write-Host "   - Checks if formattedAgreement field exists" -ForegroundColor White

Write-Host "`n3. Error Handling:" -ForegroundColor Cyan
Write-Host "   - Catches any errors in generation" -ForegroundColor White
Write-Host "   - Sets fallback text if generation fails" -ForegroundColor White

Write-Host "`nTo debug this issue:" -ForegroundColor Magenta
Write-Host "1. Make a request to GET /api/agreements/{agreementId}" -ForegroundColor White
Write-Host "2. Check your server console/logs for the debug messages" -ForegroundColor White
Write-Host "3. Look for messages starting with 🔍, ✅, or ❌" -ForegroundColor White

Write-Host "`nExpected debug output:" -ForegroundColor Green
Write-Host "🔍 Starting formatted agreement generation for agreement: [ID]" -ForegroundColor Gray
Write-Host "🔍 generateFormattedAgreement called for agreement: [ID]" -ForegroundColor Gray
Write-Host "🔍 Landlord data: {firstName: 'Nyasha', lastName: 'Karata', ...}" -ForegroundColor Gray
Write-Host "🔍 Tenant data: {firstName: 'Kundai', lastName: 'K', ...}" -ForegroundColor Gray
Write-Host "🔍 Property data: {title: 'Houses', address: {...}, ...}" -ForegroundColor Gray
Write-Host "🔍 Generated formatted agreement preview: RENTAL AGREEMENT..." -ForegroundColor Gray
Write-Host "📝 Generated formatted agreement length: [number]" -ForegroundColor Gray
Write-Host "✅ Formatted agreement added to response for agreement: [ID]" -ForegroundColor Gray
Write-Host "🔍 Agreement object keys after adding formattedAgreement: [array of keys]" -ForegroundColor Gray
Write-Host "🔍 Controller - Agreement keys before sending response: [array of keys]" -ForegroundColor Gray
Write-Host "🔍 Controller - Has formattedAgreement field: true" -ForegroundColor Gray

Write-Host "`nIf you see any ❌ error messages, that will tell us what's wrong!" -ForegroundColor Red
Write-Host "If you don't see any debug messages, the method isn't being called at all." -ForegroundColor Red

Write-Host "`nMake the API call and check your server logs!" -ForegroundColor Yellow




















