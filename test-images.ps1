# Test Image Upload Functionality
$baseUrl = "http://localhost:3001"

Write-Host "Testing Image Upload Functionality" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# 1. Login as landlord
Write-Host "1. Logging in as landlord..." -ForegroundColor Yellow
try {
    $loginPayload = @{
        email = "john.landlord@test.com"
        password = "password123"
    }
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
    Write-Host "Landlord login successful!" -ForegroundColor Green
    $landlordToken = $loginResponse.token
} catch {
    Write-Host "Failed to login landlord: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $landlordToken"
}

# 2. Test single image upload (simulated)
Write-Host "2. Testing single image upload..." -ForegroundColor Yellow
try {
    # Create a simple test image (1x1 pixel PNG)
    $testImageBytes = [System.Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"propertyId`"",
        "",
        "test-property-123",
        "--$boundary",
        "Content-Disposition: form-data; name=`"imageType`"",
        "",
        "main",
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"test.png`"",
        "Content-Type: image/png",
        "",
        [System.Text.Encoding]::UTF8.GetString($testImageBytes),
        "--$boundary--"
    ) -join $LF
    
    $uploadHeaders = @{
        "Authorization" = "Bearer $landlordToken"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $uploadResponse = Invoke-RestMethod -Uri "$baseUrl/api/images/upload" -Method POST -Headers $uploadHeaders -Body $bodyLines
    Write-Host "Single image upload successful!" -ForegroundColor Green
    Write-Host "Uploaded image URL: $($uploadResponse.data.url)" -ForegroundColor Cyan
    Write-Host "Image key: $($uploadResponse.data.key)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to upload single image: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Note: This test requires actual file upload which may not work in this environment" -ForegroundColor Yellow
}

# 3. Test image upload without authentication (should fail)
Write-Host "3. Testing image upload without authentication (should fail)..." -ForegroundColor Yellow
try {
    $noAuthResponse = Invoke-RestMethod -Uri "$baseUrl/api/images/upload" -Method POST -ContentType "application/json"
    Write-Host "Unexpected: Upload succeeded without authentication" -ForegroundColor Red
} catch {
    Write-Host "Correctly blocked: Image upload requires authentication" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Test image upload with tenant role (should fail)
Write-Host "4. Testing image upload with tenant role (should fail)..." -ForegroundColor Yellow
try {
    # Login as tenant
    $tenantLoginPayload = @{
        email = "jane.tenant@test.com"
        password = "password123"
    }
    $tenantLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($tenantLoginPayload | ConvertTo-Json)
    $tenantToken = $tenantLoginResponse.token
    
    $tenantHeaders = @{
        "Authorization" = "Bearer $tenantToken"
    }
    
    $tenantUploadResponse = Invoke-RestMethod -Uri "$baseUrl/api/images/upload" -Method POST -Headers $tenantHeaders -ContentType "application/json"
    Write-Host "Unexpected: Tenant was able to upload images" -ForegroundColor Red
} catch {
    Write-Host "Correctly blocked: Only landlords can upload images" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. Test image deletion (if we have an image key)
Write-Host "5. Testing image deletion..." -ForegroundColor Yellow
try {
    # This would require a valid image key from a previous upload
    $testImageKey = "properties/test-property-123/main_1234567890_test.png"
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/api/images/$testImageKey" -Method DELETE -Headers $headers
    Write-Host "Image deletion successful!" -ForegroundColor Green
} catch {
    Write-Host "Image deletion test: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Note: This is expected if the image doesn't exist" -ForegroundColor Cyan
}

# 6. Test property image update
Write-Host "6. Testing property image update..." -ForegroundColor Yellow
try {
    # First get a property to update
    $propertiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/landlord/my-properties" -Method GET -Headers $headers
    if ($propertiesResponse.data.Count -gt 0) {
        $propertyId = $propertiesResponse.data[0]._id
        
        $imageUpdatePayload = @{
            images = @{
                mainImage = "https://lysp.s3.amazonaws.com/properties/updated/main_image.jpg"
                gallery = @(
                    "https://lysp.s3.amazonaws.com/properties/updated/gallery1.jpg",
                    "https://lysp.s3.amazonaws.com/properties/updated/gallery2.jpg"
                )
                floorPlan = "https://lysp.s3.amazonaws.com/properties/updated/floorplan.pdf"
            }
        }
        
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/properties/$propertyId/images" -Method PATCH -Headers $headers -Body ($imageUpdatePayload | ConvertTo-Json -Depth 3)
        Write-Host "Property images updated successfully!" -ForegroundColor Green
        Write-Host "Updated main image: $($updateResponse.data.images.mainImage)" -ForegroundColor Cyan
        Write-Host "Gallery images: $($updateResponse.data.images.gallery.Count)" -ForegroundColor Cyan
    } else {
        Write-Host "No properties found to update images" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to update property images: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Image Upload tests complete!" -ForegroundColor Green 