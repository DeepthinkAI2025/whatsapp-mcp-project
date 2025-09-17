#!/bin/bash
"""
Multi-User WhatsApp Bridge Starter
Startet mehrere Bridge-Instanzen für verschiedene Accounts
"""

BRIDGE_DIR="/Users/jeremyschulze/_Development/whatsapp-mcp-project/whatsapp-bridge"
BASE_PORT=3000

start_bridge_for_account() {
    local account_id=$1
    local port=$2
    
    echo "🚀 Starte Bridge für Account: $account_id auf Port: $port"
    
    # Erstelle separaten auth_info Ordner für diesen Account
    mkdir -p "$BRIDGE_DIR/auth_info_$account_id"
    
    # Starte Bridge mit separater Konfiguration
    cd "$BRIDGE_DIR"
    PORT=$port ACCOUNT_ID=$account_id AUTH_DIR="auth_info_$account_id" node whatsapp-bridge-server.js &
    
    echo "✅ Bridge für Account $account_id gestartet (PID: $!)"
}

# Beispiel: Starte Bridges für verschiedene Accounts
# start_bridge_for_account "user1_account" 3001
# start_bridge_for_account "user2_account" 3002
# start_bridge_for_account "user3_account" 3003

echo "Multi-User Bridge Manager bereit!"
