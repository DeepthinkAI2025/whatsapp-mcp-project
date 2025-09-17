#!/bin/bash

# WhatsApp MCP Project - Deployment Test Script
# Tests the complete system functionality

echo "🚀 Testing WhatsApp MCP Project Deployment"
echo "==========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Test functions
test_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    log_info "Testing $service_name at $url"
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$service_name is responding (HTTP $status_code)"
        return 0
    else
        log_error "$service_name failed (HTTP $status_code)"
        return 1
    fi
}

test_json_endpoint() {
    local service_name=$1
    local url=$2
    
    log_info "Testing JSON response from $service_name"
    
    response=$(curl -s "$url" --max-time 10)
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        log_success "$service_name returned valid JSON"
        echo "Response preview: $(echo "$response" | jq -c . | head -c 100)..."
        return 0
    else
        log_error "$service_name returned invalid JSON"
        echo "Raw response: $response"
        return 1
    fi
}

# Main tests
echo ""
log_info "Step 1: Testing service availability"

# Test Web UI
test_service "Web Dashboard" "http://localhost:9000" || exit 1

# Test MCP Server
test_service "MCP Server" "http://localhost:8000/bridge_status" || exit 1

# Test WhatsApp Bridge
test_service "WhatsApp Bridge" "http://localhost:3000/status" || exit 1

echo ""
log_info "Step 2: Testing API endpoints"

# Test MCP API endpoints
test_json_endpoint "MCP Bridge Status" "http://localhost:8000/bridge_status" || exit 1

# Test Bridge status
test_json_endpoint "Bridge Status" "http://localhost:3000/status" || exit 1

# Test Web UI API
test_json_endpoint "Web UI Status" "http://localhost:9000/api/status" || exit 1

echo ""
log_info "Step 3: Testing message sending capability"

# Test message sending (this will fail if WhatsApp is not connected, but tests API structure)
log_info "Testing message API structure (may fail if WhatsApp not connected)"
response=$(curl -s -X POST http://localhost:9000/api/send \
    -H "Content-Type: application/json" \
    -d '{"to": "test@c.us", "message": "Test deployment"}' \
    --max-time 10)

if echo "$response" | jq . >/dev/null 2>&1; then
    log_success "Message API returned valid JSON structure"
    echo "Response: $(echo "$response" | jq -c .)"
else
    log_warning "Message API structure test failed (expected if WhatsApp not connected)"
fi

echo ""
log_info "Step 4: Testing container health"

# Check Docker containers
log_info "Checking Docker container status"
docker-compose -f docker-compose.whatsapp.yaml ps

echo ""
log_success "Deployment test completed!"
echo ""
echo "🌐 Access points:"
echo "   • Web Dashboard: http://localhost:9000"
echo "   • MCP Server API: http://localhost:8000"
echo "   • WhatsApp Bridge: http://localhost:3000"
echo ""
echo "📝 Next steps:"
echo "   1. Open Web Dashboard in browser"
echo "   2. Scan QR code with WhatsApp"
echo "   3. Send test messages via Web UI"
echo ""
