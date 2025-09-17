#!/bin/bash

# WhatsApp MCP Project Setup Script

echo "🚀 WhatsApp MCP Project Setup"
echo "=============================="

# Prüfe Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert. Bitte installiere Docker zuerst."
    exit 1
fi

# Prüfe Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose ist nicht installiert. Bitte installiere Docker Compose zuerst."
    exit 1
fi

echo "✅ Docker und Docker Compose gefunden"

# Erstelle notwendige Verzeichnisse
echo "📁 Erstelle Verzeichnisse..."
mkdir -p whatsapp-bridge/auth_info
mkdir -p logs

# Setze Berechtigungen
echo "🔐 Setze Berechtigungen..."
chmod +x whatsapp_mcp_control.sh

# Erstelle .env Datei falls nicht vorhanden
if [ ! -f .env ]; then
    echo "📝 Erstelle .env Datei..."
    cat > .env << EOF
# WhatsApp MCP Environment Variables
BRIDGE_ONLINE=true
BRIDGE_URL=http://whatsapp-bridge:3000
NODE_ENV=production
EOF
fi

echo "✅ Setup abgeschlossen!"
echo ""
echo "🚀 Starte die Services mit:"
echo "docker-compose -f docker-compose.whatsapp.yaml up -d"
echo ""
echo "📊 Prüfe Logs mit:"
echo "docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-bridge"
echo ""
echo "🔗 API-Endpunkte:"
echo "- MCP Server: http://localhost:8000"
echo "- WhatsApp Bridge: http://localhost:3000"
