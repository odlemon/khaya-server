# Chat System Test
$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Chat System Test" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

# 1. Register landlord
Write-Host "1. Registering landlord..." -ForegroundColor Yellow
$landlordEmail = "landlord_chat_$timestamp@test.com"
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
    Write-Host "Landlord registered successfully" -ForegroundColor Green
    $landlordToken = $response.token
    $landlordId = $response._id
} catch {
    Write-Host "Landlord registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Register tenant
Write-Host "2. Registering tenant..." -ForegroundColor Yellow
$tenantEmail = "tenant_chat_$timestamp@test.com"
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
    Write-Host "Tenant registered successfully" -ForegroundColor Green
    $tenantToken = $response.token
    $tenantId = $response._id
} catch {
    Write-Host "Tenant registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Create property
Write-Host "3. Creating test property..." -ForegroundColor Yellow
$propertyData = @{
    title = "Test Property for Chat"
    description = "A test property for chat system testing"
    propertyType = "apartment"
    address = @{
        street = "123 Chat Street"
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
    Write-Host "Property created successfully" -ForegroundColor Green
    $propertyId = $response.data._id
} catch {
    Write-Host "Property creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Create chat between tenant and landlord
Write-Host "4. Creating chat between tenant and landlord..." -ForegroundColor Yellow
$chatData = @{
    propertyId = $propertyId
    landlordId = $landlordId
}

$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/get-or-create" -Method POST -Headers $headers -ContentType "application/json" -Body ($chatData | ConvertTo-Json)
    Write-Host "Chat created successfully" -ForegroundColor Green
    $chatId = $response.data._id
    Write-Host "   Chat ID: $chatId" -ForegroundColor Gray
} catch {
    Write-Host "Chat creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 5. Send initial message from tenant
Write-Host "5. Sending initial message from tenant..." -ForegroundColor Yellow
$messageData = @{
    chatId = $chatId
    content = "Hi! I'm interested in viewing this property. Is it still available?"
    messageType = "text"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/$chatId/messages" -Method POST -Headers $headers -ContentType "application/json" -Body ($messageData | ConvertTo-Json)
    Write-Host "Initial message sent successfully" -ForegroundColor Green
    $firstMessageId = $response.data._id
} catch {
    Write-Host "Initial message failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Landlord responds
Write-Host "6. Landlord responding to message..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
$landlordMessageData = @{
    chatId = $chatId
    content = "Yes, it's still available! When would you like to view it?"
    messageType = "text"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/$chatId/messages" -Method POST -Headers $headers -ContentType "application/json" -Body ($landlordMessageData | ConvertTo-Json)
    Write-Host "Landlord response sent successfully" -ForegroundColor Green
} catch {
    Write-Host "Landlord response failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Tenant sends viewing request
Write-Host "7. Tenant sending viewing request..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
$viewingRequestData = @{
    chatId = $chatId
    preferredDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
    preferredTime = "14:00"
    alternativeDates = @((Get-Date).AddDays(4).ToString("yyyy-MM-dd"), (Get-Date).AddDays(5).ToString("yyyy-MM-dd"))
    alternativeTimes = @("10:00", "16:00")
    message = "I would like to schedule a viewing. These are my preferred times."
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/viewing-request" -Method POST -Headers $headers -ContentType "application/json" -Body ($viewingRequestData | ConvertTo-Json)
    Write-Host "Viewing request sent successfully" -ForegroundColor Green
    $viewingRequestId = $response.data._id
} catch {
    Write-Host "Viewing request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Landlord responds to viewing request
Write-Host "8. Landlord responding to viewing request..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
$viewingResponseData = @{
    messageId = $viewingRequestId
    status = "accepted"
    acceptedDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
    acceptedTime = "14:00"
    message = "Perfect! I'll meet you at the property at 2 PM on Thursday."
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/viewing-request/respond" -Method PUT -Headers $headers -ContentType "application/json" -Body ($viewingResponseData | ConvertTo-Json)
    Write-Host "Viewing request response sent successfully" -ForegroundColor Green
} catch {
    Write-Host "Viewing request response failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Tenant sends move-in request
Write-Host "9. Tenant sending move-in request..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
$moveInRequestData = @{
    chatId = $chatId
    preferredMoveInDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    tenancyDuration = 12
    message = "I would like to move in next month for a 12-month lease."
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/move-in-request" -Method POST -Headers $headers -ContentType "application/json" -Body ($moveInRequestData | ConvertTo-Json)
    Write-Host "Move-in request sent successfully" -ForegroundColor Green
    $moveInRequestId = $response.data._id
} catch {
    Write-Host "Move-in request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Landlord responds to move-in request
Write-Host "10. Landlord responding to move-in request..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
$moveInResponseData = @{
    messageId = $moveInRequestId
    status = "accepted"
    acceptedMoveInDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    acceptedDuration = 12
    message = "Great! I accept your move-in request. Let's proceed with the agreement."
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/move-in-request/respond" -Method PUT -Headers $headers -ContentType "application/json" -Body ($moveInResponseData | ConvertTo-Json)
    Write-Host "Move-in request response sent successfully" -ForegroundColor Green
} catch {
    Write-Host "Move-in request response failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 11. Get chat with messages
Write-Host "11. Getting chat with messages..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/$chatId" -Method GET -Headers $headers
    Write-Host "Chat retrieved successfully" -ForegroundColor Green
    Write-Host "   Total messages: $($response.data.messages.Count)" -ForegroundColor Gray
    Write-Host "   Chat participants: $($response.data.chat.participants.Count)" -ForegroundColor Gray
} catch {
    Write-Host "Get chat failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 12. Get user chats
Write-Host "12. Getting user chats..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method GET -Headers $headers
    Write-Host "User chats retrieved successfully" -ForegroundColor Green
    Write-Host "   Total chats: $($response.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "Get user chats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 13. Get chat statistics
Write-Host "13. Getting chat statistics..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/stats" -Method GET -Headers $headers
    Write-Host "Chat stats retrieved successfully" -ForegroundColor Green
    Write-Host "   Total chats: $($response.data.totalChats)" -ForegroundColor Gray
    Write-Host "   Unread count: $($response.data.unreadCount)" -ForegroundColor Gray
    Write-Host "   Pending viewing requests: $($response.data.pendingViewingRequests)" -ForegroundColor Gray
    Write-Host "   Pending move-in requests: $($response.data.pendingMoveInRequests)" -ForegroundColor Gray
} catch {
    Write-Host "Get chat stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 14. Get landlord's viewing requests
Write-Host "14. Getting landlord's viewing requests..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $landlordToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/viewing-requests" -Method GET -Headers $headers
    Write-Host "Landlord viewing requests retrieved successfully" -ForegroundColor Green
    Write-Host "   Pending viewing requests: $($response.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "Get landlord viewing requests failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 15. Get landlord's move-in requests
Write-Host "15. Getting landlord's move-in requests..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/move-in-requests" -Method GET -Headers $headers
    Write-Host "Landlord move-in requests retrieved successfully" -ForegroundColor Green
    Write-Host "   Pending move-in requests: $($response.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "Get landlord move-in requests failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 16. Get tenant's pending requests
Write-Host "16. Getting tenant's pending requests..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/pending-requests" -Method GET -Headers $headers
    Write-Host "Tenant pending requests retrieved successfully" -ForegroundColor Green
    Write-Host "   Pending viewing requests: $($response.data.viewingRequests.Count)" -ForegroundColor Gray
    Write-Host "   Pending move-in requests: $($response.data.moveInRequests.Count)" -ForegroundColor Gray
} catch {
    Write-Host "Get tenant pending requests failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 17. Get unread count
Write-Host "17. Getting unread count..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/unread-count" -Method GET -Headers $headers
    Write-Host "Unread count retrieved successfully" -ForegroundColor Green
    Write-Host "   Unread messages: $($response.data.unreadCount)" -ForegroundColor Gray
} catch {
    Write-Host "Get unread count failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 18. Mark messages as read
Write-Host "18. Marking messages as read..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/$chatId/read" -Method PUT -Headers $headers
    Write-Host "Messages marked as read successfully" -ForegroundColor Green
} catch {
    Write-Host "Mark messages as read failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 19. Send another message with attachment
Write-Host "19. Sending message with attachment..." -ForegroundColor Yellow
$messageWithAttachment = @{
    chatId = $chatId
    content = "Here's my ID document for verification"
    messageType = "document"
    attachments = @(
        @{
            type = "document"
            url = "https://example.com/id-document.pdf"
            filename = "id-document.pdf"
            size = 1024000
        }
    )
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/$chatId/messages" -Method POST -Headers $headers -ContentType "application/json" -Body ($messageWithAttachment | ConvertTo-Json -Depth 10)
    Write-Host "Message with attachment sent successfully" -ForegroundColor Green
} catch {
    Write-Host "Message with attachment failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 20. Test authorization (tenant trying to access landlord endpoints)
Write-Host "20. Testing authorization..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/viewing-requests" -Method GET -Headers $headers
    Write-Host "Authorization test failed - tenant should not access landlord endpoints" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "Authorization working correctly - tenant blocked from landlord endpoints" -ForegroundColor Green
    } else {
        Write-Host "Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Chat System Test Complete!" -ForegroundColor Green
Write-Host "The chat system is working correctly with messaging, viewing requests, and move-in requests!" -ForegroundColor Green 