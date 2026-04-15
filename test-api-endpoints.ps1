# Script de test des endpoints Mobile ↔ Backend
# Date: 2026-03-01

$API_URL = "http://localhost:4000/api/v1"
$TOKEN = ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🧪 Test des Endpoints Mobile <-> Backend" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = "",
        [int]$ExpectedStatus = 200
    )

    Write-Host "Testing $Name... " -NoNewline

    $headers = @{
        "Content-Type" = "application/json"
    }

    if ($script:TOKEN) {
        $headers["Authorization"] = "Bearer $script:TOKEN"
    }

    try {
        if ($Data) {
            $response = Invoke-WebRequest -Uri "$API_URL$Endpoint" -Method $Method -Headers $headers -Body $Data -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri "$API_URL$Endpoint" -Method $Method -Headers $headers -UseBasicParsing
        }

        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $($response.StatusCode))"
        } else {
            Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Expected $ExpectedStatus, got $($response.StatusCode))"
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $statusCode)"
        } else {
            Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Expected $ExpectedStatus, got $statusCode)"
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# ==================== AUTH ====================
Write-Host ""
Write-Host "📝 Testing AUTH endpoints..." -ForegroundColor Yellow
Write-Host "------------------------------"

Test-Endpoint -Name "POST /auth/login" -Method "POST" -Endpoint "/auth/login" -Data '{"identifier":"test@checkallat.com","password":"Test@123"}' -ExpectedStatus 200

# Extraire le token
try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body '{"identifier":"test@checkallat.com","password":"Test@123"}' -ContentType "application/json"
    $script:TOKEN = $loginResponse.accessToken
    Write-Host "Token obtenu: $($script:TOKEN.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "Erreur lors de l'obtention du token" -ForegroundColor Red
}

Test-Endpoint -Name "GET /auth/me" -Method "GET" -Endpoint "/auth/me" -ExpectedStatus 200
Test-Endpoint -Name "POST /auth/send-otp" -Method "POST" -Endpoint "/auth/send-otp" -Data '{"phone":"+221771234567"}' -ExpectedStatus 200

# ==================== SERVICES ====================
Write-Host ""
Write-Host "🛠️  Testing SERVICES endpoints..." -ForegroundColor Yellow
Write-Host "------------------------------"

Test-Endpoint -Name "GET /services/categories" -Method "GET" -Endpoint "/services/categories" -ExpectedStatus 200
Test-Endpoint -Name "GET /services/categories?activeOnly=false" -Method "GET" -Endpoint "/services/categories?activeOnly=false" -ExpectedStatus 200

# ==================== PROS ====================
Write-Host ""
Write-Host "👷 Testing PROS endpoints..." -ForegroundColor Yellow
Write-Host "------------------------------"

Test-Endpoint -Name "GET /pros/search" -Method "GET" -Endpoint "/pros/search?userLat=14.6937&userLng=-17.4441" -ExpectedStatus 200

# ==================== BOOKINGS ====================
Write-Host ""
Write-Host "📅 Testing BOOKINGS endpoints..." -ForegroundColor Yellow
Write-Host "------------------------------"

Test-Endpoint -Name "GET /bookings/my-bookings" -Method "GET" -Endpoint "/bookings/my-bookings" -ExpectedStatus 200

# ==================== TRANSPORT ====================
Write-Host ""
Write-Host "🚛 Testing TRANSPORT endpoints..." -ForegroundColor Yellow
Write-Host "------------------------------"

Test-Endpoint -Name "GET /transport/my-requests/client" -Method "GET" -Endpoint "/transport/my-requests/client" -ExpectedStatus 200

# ==================== MARKETPLACE ====================
Write-Host ""
Write-Host "🛒 Testing MARKETPLACE endpoints..." -ForegroundColor Yellow
Write-Host "------------------------------"

Test-Endpoint -Name "GET /marketplace/products" -Method "GET" -Endpoint "/marketplace/products" -ExpectedStatus 200
Test-Endpoint -Name "GET /marketplace/orders/my-orders/client" -Method "GET" -Endpoint "/marketplace/orders/my-orders/client" -ExpectedStatus 200

# ==================== SUMMARY ====================
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Tests terminés!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Certains endpoints peuvent retourner des tableaux vides" -ForegroundColor Gray
Write-Host "si aucune donnée n'existe encore dans la base de données." -ForegroundColor Gray
Write-Host ""
