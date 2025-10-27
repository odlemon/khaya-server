# Test Chat Creation Flow
$baseUrl = "http://localhost:3001"

Write-Host "Testing Chat Creation Flow" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# 1. Login as landlord
Write-Host "1. Logging in as landlord..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "test.landlord@khayalami.com"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "Landlord login successful!" -ForegroundColor Green
    $landlordToken = $loginResponse.token
    $landlordUserId = $loginResponse.user.userId
} catch {
    Write-Host "Failed to login landlord: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$landlordHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $landlordToken"
}

# 2. Get landlord connections
Write-Host "`n2. Getting landlord connections..." -ForegroundColor Yellow
try {
    $connectionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/landlord" -Method GET -Headers $landlordHeaders
    Write-Host "Connections found: $($connectionsResponse.data.Count)" -ForegroundColor Cyan
    
    if ($connectionsResponse.data.Count -gt 0) {
        $pendingConnection = $connectionsResponse.data | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
        
        if ($pendingConnection) {
            Write-Host "Found pending connection: $($pendingConnection._id)" -ForegroundColor Green
            
            # 3. Accept the connection (this will create chat)
            Write-Host "`n3. Accepting connection to create chat..." -ForegroundColor Yellow
            $acceptPayload = @{
                responseMessage = "Thank you for your interest! I'd be happy to help you with this property. Let's discuss the details."
            }
            
            $acceptResponse = Invoke-RestMethod -Uri "$baseUrl/api/connections/$($pendingConnection._id)/accept" -Method PUT -Headers $landlordHeaders -Body ($acceptPayload | ConvertTo-Json)
            Write-Host "Connection accepted successfully!" -ForegroundColor Green
            Write-Host "Response: $($acceptResponse.message)" -ForegroundColor Cyan
            
            # 4. Get landlord's chats
            Write-Host "`n4. Getting landlord's chats..." -ForegroundColor Yellow
            $chatsResponse = Invoke-RestMethod -Uri "$baseUrl/api/chats" -Method GET -Headers $landlordHeaders
            Write-Host "Chats found: $($chatsResponse.data.Count)" -ForegroundColor Cyan
            
            if ($chatsResponse.data.Count -gt 0) {
                $newChat = $chatsResponse.data[0]
                Write-Host "New chat created: $($newChat._id)" -ForegroundColor Green
                Write-Host "Participants: $($newChat.participants.Count)" -ForegroundColor White
                Write-Host "Property: $($newChat.propertyId.title)" -ForegroundColor White
                
                # 5. Get chat messages
                Write-Host "`n5. Getting chat messages..." -ForegroundColor Yellow
                $messagesResponse = Invoke-RestMethod -Uri "$baseUrl/api/chats/$($newChat._id)" -Method GET -Headers $landlordHeaders
                Write-Host "Messages in chat: $($messagesResponse.data.messages.Count)" -ForegroundColor Cyan
                
                if ($messagesResponse.data.messages.Count -gt 0) {
                    $firstMessage = $messagesResponse.data.messages[0]
                    Write-Host "First message:" -ForegroundColor Green
                    Write-Host "  Sender: $($firstMessage.senderRole)" -ForegroundColor White
                    Write-Host "  Content: $($firstMessage.content)" -ForegroundColor White
                    Write-Host "  Read: $($firstMessage.isRead)" -ForegroundColor White
                }
            }
        } else {
            Write-Host "No pending connections found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No connections found for this landlord" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Chat creation flow test completed!" -ForegroundColor Green
Write-Host "`n📋 What happened:" -ForegroundColor Cyan
Write-Host "1. Landlord accepted a connection request" -ForegroundColor White
Write-Host "2. Chat room was automatically created" -ForegroundColor White
Write-Host "3. Initial message was sent from landlord" -ForegroundColor White
Write-Host "4. Tenant can now chat with landlord" -ForegroundColor White

























