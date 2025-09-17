#!/bin/bash
# WhatsApp MCP Automation - Unified Control Script
# Dieses Skript automatisiert ALLES für WhatsApp MCP

set -e

echo "🚀 WhatsApp MCP Automation - Unified Control Script"
echo "================================================="

# Konfiguration
PROJECT_DIR="/Users/jeremyschulze/_Development/_Dev-projects/fapro"
MCP_SERVER_DIR="$PROJECT_DIR/whatsapp-mcp-server"
AUTOMATION_SCRIPT="$PROJECT_DIR/whatsapp_automation_complete.py"
TARGET_PHONE="+4917632023167"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hilfsfunktionen
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

# Prüfe Abhängigkeiten
check_dependencies() {
    log_info "Prüfe System-Abhängigkeiten..."
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 ist nicht installiert!"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl ist nicht installiert!"
        exit 1
    fi
    
    log_success "Alle Abhängigkeiten verfügbar"
}

# Setup MCP Server
setup_mcp_server() {
    log_info "Setup WhatsApp MCP Server..."
    
    cd "$MCP_SERVER_DIR"
    
    # Virtual Environment
    if [ ! -d "venv" ]; then
        log_info "Erstelle Python Virtual Environment..."
        python3 -m venv venv
    fi
    
    # Aktiviere venv und installiere dependencies
    source venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1
    
    log_success "MCP Server setup abgeschlossen"
}

# Prüfe Bridge Status
check_bridge() {
    log_info "Prüfe WhatsApp Bridge Status..."
    
    if curl -s -f http://localhost:8080/api/status > /dev/null 2>&1; then
        log_success "WhatsApp Bridge läuft auf Port 8080"
        return 0
    else
        log_warning "WhatsApp Bridge nicht verfügbar (Fallback-Modus aktiv)"
        return 1
    fi
}

# Sende Test-Nachricht
send_test_message() {
    local message="${1:-ich mich demnächst an die arbeit mache :)}"
    
    log_info "Sende Test-Nachricht: '$message'"
    
    cd "$PROJECT_DIR"
    result=$(python3 "$AUTOMATION_SCRIPT" send "$message")
    
    if [[ $result == *"True"* ]]; then
        log_success "Nachricht erfolgreich gesendet!"
    else
        log_error "Fehler beim Senden der Nachricht"
    fi
}

# Führe Automatisierungs-Zyklus aus
run_automation_cycle() {
    log_info "Führe Automatisierungs-Zyklus aus..."
    
    cd "$PROJECT_DIR"
    python3 "$AUTOMATION_SCRIPT" test
    
    log_success "Automatisierungs-Zyklus abgeschlossen"
}

# Starte kontinuierliche Automatisierung
start_continuous() {
    local duration="${1:-60}"
    
    log_info "Starte kontinuierliche Automatisierung für $duration Minuten..."
    
    cd "$PROJECT_DIR"
    python3 "$AUTOMATION_SCRIPT" continuous "$duration"
}

# Setup Bridge Service
setup_bridge() {
    log_info "Setup WhatsApp Bridge Service..."
    
    cd "$PROJECT_DIR"
    
    # Installiere Node.js Dependencies
    if [ ! -f "package.json" ]; then
        log_info "Erstelle package.json..."
        npm init -y
    fi
    
    # Installiere erforderliche Pakete
    log_info "Installiere whatsapp-web.js, express und qrcode-terminal..."
    npm install whatsapp-web.js express qrcode-terminal
    
    log_success "Bridge Service Setup abgeschlossen!"
}

# Starte Bridge Service
start_bridge() {
    log_info "Starte WhatsApp Bridge Service..."
    
    if [ ! -f "$PROJECT_DIR/whatsapp-bridge-server.js" ]; then
        log_error "Bridge Server nicht gefunden: whatsapp-bridge-server.js"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Prüfe ob Dependencies installiert sind
    if [ ! -d "node_modules" ]; then
        log_warning "Node.js Dependencies nicht installiert. Führe Setup aus..."
        setup_bridge
    fi
    
    log_info "Starte Bridge Service auf Port 8080..."
    log_info "QR Code wird angezeigt - bitte mit WhatsApp scannen!"
    node whatsapp-bridge-server.js
}

# Starte MCP Server
start_mcp_server() {
    log_info "Starte WhatsApp MCP Server..."
    
    cd "$MCP_SERVER_DIR"
    source venv/bin/activate
    python main.py
}

# Zeige Status
show_status() {
    echo ""
    log_info "=== WhatsApp MCP System Status ==="
    
    # Bridge Status
    if check_bridge; then
        echo "🌉 Bridge: ✅ Verfügbar"
    else
        echo "🌉 Bridge: ❌ Offline (Simulation aktiv)"
    fi
    
    # MCP Server Status
    if [ -d "$MCP_SERVER_DIR/venv" ]; then
        echo "🖥️  MCP Server: ✅ Setup abgeschlossen"
    else
        echo "🖥️  MCP Server: ❌ Setup erforderlich"
    fi
    
    # Automatisierungs-Script Status
    if [ -f "$AUTOMATION_SCRIPT" ]; then
        echo "🤖 Automation: ✅ Verfügbar"
    else
        echo "🤖 Automation: ❌ Nicht gefunden"
    fi
    
    # Letzte Logs
    if [ -f "$PROJECT_DIR/whatsapp_automation.log" ]; then
        echo ""
        log_info "Letzte Log-Einträge:"
        tail -n 3 "$PROJECT_DIR/whatsapp_automation.log"
    fi
    
    echo ""
}

# Zeige Hilfe
show_help() {
    echo ""
    echo "📖 WhatsApp MCP Automation - Verfügbare Kommandos:"
    echo ""
    echo "  ./whatsapp_mcp_control.sh setup          - Setup des MCP Servers"
    echo "  ./whatsapp_mcp_control.sh setup-bridge   - Setup des Bridge Service"
    echo "  ./whatsapp_mcp_control.sh bridge         - Startet Bridge Service"
    echo "  ./whatsapp_mcp_control.sh status         - Zeigt System-Status"
    echo "  ./whatsapp_mcp_control.sh send [msg]     - Sendet eine Nachricht"
    echo "  ./whatsapp_mcp_control.sh test           - Einzelner Test-Zyklus"
    echo "  ./whatsapp_mcp_control.sh auto [min]     - Kontinuierliche Automatisierung"
    echo "  ./whatsapp_mcp_control.sh server         - Startet MCP Server"
    echo "  ./whatsapp_mcp_control.sh help           - Zeigt diese Hilfe"
    echo ""
    echo "📱 Ziel-Telefonnummer: $TARGET_PHONE"
    echo "📁 Projekt-Verzeichnis: $PROJECT_DIR"
    echo ""
}

# Hauptlogik
main() {
    check_dependencies
    
    case "${1:-help}" in
        "setup")
            setup_mcp_server
            ;;
        "setup-bridge")
            setup_bridge
            ;;
        "bridge")
            start_bridge
            ;;
        "status")
            show_status
            ;;
        "send")
            send_test_message "$2"
            ;;
        "test")
            run_automation_cycle
            ;;
        "auto")
            start_continuous "$2"
            ;;
        "server")
            start_mcp_server
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Führe Hauptfunktion aus
main "$@"
