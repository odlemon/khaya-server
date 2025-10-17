# Test script for real-time chat functionality
# This script demonstrates how to connect to Socket.IO and test real-time messaging

Write-Host "=== Real-time Chat Test ===" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3001"
$socketUrl = "http://localhost:3001"

# Test user credentials (replace with actual test users)
$tenantCredentials = @{
    email = "tenant@example.com"
    password = "password123"
}

$landlordCredentials = @{
    email = "landlord@example.com" 
    password = "password123"
}

# Function to authenticate and get token
function Get-AuthToken {
    param($credentials)
    
    $body = @{
        email = $credentials.email
        password = $credentials.password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json"
        return $response.data.token
    } catch {
        Write-Host "Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to create a test chat
function Create-TestChat {
    param($tenantToken, $landlordToken)
    
    # Get properties first
    $headers = @{ Authorization = "Bearer $tenantToken" }
    $properties = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method GET -Headers $headers
    
    if ($properties.data -and $properties.data.Count -gt 0) {
        $property = $properties.data[0]
        $propertyId = $property._id
        $landlordId = $property.landlordId
        
        Write-Host "Using property: $($property.address)" -ForegroundColor Yellow
        Write-Host "Property ID: $propertyId" -ForegroundColor Yellow
        Write-Host "Landlord ID: $landlordId" -ForegroundColor Yellow
        
        return @{
            propertyId = $propertyId
            landlordId = $landlordId
        }
    }
    
    return $null
}

# Function to send a message via REST API
function Send-Message {
    param($token, $tenantId, $landlordId, $propertyId, $content)
    
    $headers = @{ Authorization = "Bearer $token" }
    $body = @{
        tenantId = $tenantId
        landlordId = $landlordId
        propertyId = $propertyId
        content = $content
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/chat/send" -Method POST -Body $body -ContentType "application/json" -Headers $headers
        return $response
    } catch {
        Write-Host "Failed to send message: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to get user info
function Get-UserInfo {
    param($token)
    
    $headers = @{ Authorization = "Bearer $token" }
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/users/profile" -Method GET -Headers $headers
        return $response.data
    } catch {
        Write-Host "Failed to get user info: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Main test execution
Write-Host "`n1. Authenticating users..." -ForegroundColor Cyan

$tenantToken = Get-AuthToken $tenantCredentials
$landlordToken = Get-AuthToken $landlordCredentials

if (-not $tenantToken -or -not $landlordToken) {
    Write-Host "Authentication failed. Please check credentials." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Tenant authenticated" -ForegroundColor Green
Write-Host "✓ Landlord authenticated" -ForegroundColor Green

Write-Host "`n2. Getting user information..." -ForegroundColor Cyan

$tenantInfo = Get-UserInfo $tenantToken
$landlordInfo = Get-UserInfo $landlordToken

if ($tenantInfo -and $landlordInfo) {
    Write-Host "✓ Tenant: $($tenantInfo.firstName) $($tenantInfo.lastName) ($($tenantInfo._id))" -ForegroundColor Green
    Write-Host "✓ Landlord: $($landlordInfo.firstName) $($landlordInfo.lastName) ($($landlordInfo._id))" -ForegroundColor Green
} else {
    Write-Host "Failed to get user information" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Creating test chat..." -ForegroundColor Cyan

$chatInfo = Create-TestChat $tenantToken $landlordToken
if (-not $chatInfo) {
    Write-Host "Failed to create test chat" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Test chat setup complete" -ForegroundColor Green

Write-Host "`n4. Testing message sending..." -ForegroundColor Cyan

# Send messages from both users
$message1 = Send-Message $tenantToken $tenantInfo._id $landlordInfo._id $chatInfo.propertyId "Hello! I'm interested in this property."
$message2 = Send-Message $landlordToken $tenantInfo._id $landlordInfo._id $chatInfo.propertyId "Hi! Thanks for your interest. When would you like to schedule a viewing?"

if ($message1 -and $message2) {
    Write-Host "✓ Messages sent successfully" -ForegroundColor Green
    Write-Host "  Tenant message: $($message1.data.content)" -ForegroundColor Yellow
    Write-Host "  Landlord message: $($message2.data.content)" -ForegroundColor Yellow
} else {
    Write-Host "Failed to send messages" -ForegroundColor Red
}

Write-Host "`n5. Testing online users endpoint..." -ForegroundColor Cyan

$headers = @{ Authorization = "Bearer $tenantToken" }
try {
    $onlineUsers = Invoke-RestMethod -Uri "$baseUrl/api/chat/online-users" -Method GET -Headers $headers
    Write-Host "✓ Online users retrieved: $($onlineUsers.data.onlineUsers.Count) users online" -ForegroundColor Green
} catch {
    Write-Host "Failed to get online users: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Real-time Chat Test Complete ===" -ForegroundColor Green
Write-Host "`nTo test real-time features with Socket.IO:" -ForegroundColor Yellow
Write-Host "1. Install socket.io-client in your frontend" -ForegroundColor White
Write-Host "2. Connect to: $socketUrl" -ForegroundColor White
Write-Host "3. Authenticate with token: $tenantToken" -ForegroundColor White
Write-Host "4. Join chat room and listen for events:" -ForegroundColor White
Write-Host "   - 'new_message' - Real-time message delivery" -ForegroundColor White
Write-Host "   - 'user_typing' - Typing indicators" -ForegroundColor White
Write-Host "   - 'messages_read' - Read receipts" -ForegroundColor White
Write-Host "   - 'user_online'/'user_offline' - Online status" -ForegroundColor White











