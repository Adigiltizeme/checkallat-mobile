#!/bin/bash

# Script de test des endpoints Mobile ↔ Backend
# Date: 2026-03-01

API_URL="http://localhost:4000/api/v1"
TOKEN=""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "🧪 Test des Endpoints Mobile <-> Backend"
echo "======================================"
echo ""

# Fonction de test
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    echo -n "Testing $name... "

    if [ -z "$data" ]; then
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Authorization: Bearer $TOKEN")
        fi
    else
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$data")
        fi
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "Response: $body"
    fi
}

# ==================== AUTH ====================
echo ""
echo "📝 Testing AUTH endpoints..."
echo "------------------------------"

test_endpoint "POST /auth/login" "POST" "/auth/login" '{"identifier":"test@checkallat.com","password":"Test@123"}' 200

# Extraire le token du dernier login
TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"identifier":"test@checkallat.com","password":"Test@123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

test_endpoint "GET /auth/me" "GET" "/auth/me" "" 200
test_endpoint "POST /auth/send-otp" "POST" "/auth/send-otp" '{"phone":"+221771234567"}' 200

# ==================== SERVICES ====================
echo ""
echo "🛠️  Testing SERVICES endpoints..."
echo "------------------------------"

test_endpoint "GET /services/categories" "GET" "/services/categories" "" 200
test_endpoint "GET /services/categories (activeOnly=false)" "GET" "/services/categories?activeOnly=false" "" 200

# ==================== PROS ====================
echo ""
echo "👷 Testing PROS endpoints..."
echo "------------------------------"

test_endpoint "GET /pros/search" "GET" "/pros/search?userLat=14.6937&userLng=-17.4441" "" 200

# ==================== BOOKINGS ====================
echo ""
echo "📅 Testing BOOKINGS endpoints..."
echo "------------------------------"

test_endpoint "GET /bookings/my-bookings" "GET" "/bookings/my-bookings" "" 200

# ==================== TRANSPORT ====================
echo ""
echo "🚛 Testing TRANSPORT endpoints..."
echo "------------------------------"

test_endpoint "GET /transport/my-requests/client" "GET" "/transport/my-requests/client" "" 200

# ==================== MARKETPLACE ====================
echo ""
echo "🛒 Testing MARKETPLACE endpoints..."
echo "------------------------------"

test_endpoint "GET /marketplace/products" "GET" "/marketplace/products" "" 200
test_endpoint "GET /marketplace/orders/my-orders/client" "GET" "/marketplace/orders/my-orders/client" "" 200

# ==================== SUMMARY ====================
echo ""
echo "======================================"
echo "✅ Tests terminés!"
echo "======================================"
echo ""
echo "Note: Certains endpoints peuvent retourner des tableaux vides"
echo "si aucune donnée n'existe encore dans la base de données."
echo ""
