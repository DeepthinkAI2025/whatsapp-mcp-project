# WhatsApp MCP Project

Ein vollständiges WhatsApp-Integrationssystem mit MCP (Model Context Protocol) für KI-Agenten und Automatisierung.

## 🚀 Features

- **WhatsApp Bridge**: Echte WhatsApp-Integration mit Baileys
- **MCP Server**: FastAPI-basierter Server für KI-Agenten
- **Automatisierung**: Intelligente Nachrichtenverarbeitung
- **Docker Support**: Vollständige Containerisierung
- **KI-Integration**: Nahtlose MCP-Unterstützung für Cline und andere KI-Agenten

## 📋 Voraussetzungen

- Docker & Docker Compose
- Node.js 18+ (für Bridge-Entwicklung)
- Python 3.11+ (für MCP-Server-Entwicklung)

## 🛠️ Schnellstart

### Mit Docker Compose (Empfohlen)

```bash
# Repository klonen
git clone https://github.com/your-username/whatsapp-mcp-project.git
cd whatsapp-mcp-project

# Services starten
docker-compose -f docker-compose.whatsapp.yaml up -d

# Bridge-Logs prüfen (QR-Code für WhatsApp-Login)
docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-bridge

# Status prüfen
curl http://localhost:8000/bridge_status
```

### Manuell (für Entwicklung)

```bash
# MCP-Server starten
cd whatsapp-mcp-server
pip install -r requirements.txt
python main.py

# Bridge starten (in neuem Terminal)
cd whatsapp-bridge
npm install
node whatsapp-bridge-server.js
```

## 📡 API-Endpunkte

### MCP Server (Port 8000)

- `POST /send` - Nachricht senden
- `GET /messages` - Nachrichten abrufen
- `GET /bridge_status` - Bridge-Status prüfen

### WhatsApp Bridge (Port 3000)

- `POST /send` - WhatsApp-Nachricht senden
- `GET /status` - Verbindungsstatus

## 🤖 KI-Integration

Das System ist vollständig MCP-kompatibel. KI-Agenten können folgende Tools nutzen:

- `send_whatsapp_message()` - Nachrichten versenden
- `get_whatsapp_messages()` - Nachrichten abrufen
- `whatsapp_bridge_status()` - Status prüfen

### Beispiel für Cline/KI-Nutzung:

```
Nutze WhatsApp MCP und sende: "Hallo von KI!"
Prüfe den WhatsApp Status mit MCP
Hole die letzten 5 Nachrichten über MCP
```

## 🔧 Konfiguration

### Umgebungsvariablen

```bash
# MCP-Server
BRIDGE_ONLINE=true
BRIDGE_URL=http://whatsapp-bridge:3000

# Bridge
NODE_ENV=production
```

### MCP-Konfiguration

Die `whatsapp-mcp-config.json` enthält die Tool-Definitionen für KI-Agenten.

## 📱 WhatsApp Setup

1. **QR-Code scannen**: Nach dem Start der Bridge wird ein QR-Code angezeigt
2. **WhatsApp Web**: Scanne den Code mit WhatsApp auf deinem Telefon
3. **Verbindung**: Warte auf "WhatsApp verbunden!" Nachricht

## 🧪 Tests

```bash
# Automatisierung testen
python whatsapp_automation_complete.py test

# KI-Demo ausführen
python whatsapp_mcp_ai_demo.py

# Status prüfen
./whatsapp_mcp_control.sh status
```

## 🏗️ Architektur

```
┌─────────────────┐    HTTP     ┌─────────────────┐
│   KI-Agent      │◄──────────►│   MCP Server    │
│  (Cline etc.)   │             │   (FastAPI)     │
└─────────────────┘             └─────────────────┘
                                   │
                                   │ HTTP
                                   ▼
┌─────────────────┐    WebSocket  ┌─────────────────┐
│ WhatsApp Bridge │◄────────────►│   WhatsApp      │
│   (Node.js)     │               │   (Baileys)     │
└─────────────────┘               └─────────────────┘
```

## 📁 Projektstruktur

```
whatsapp-mcp-project/
├── docker-compose.whatsapp.yaml    # Docker Setup
├── whatsapp-mcp-server/           # Python MCP Server
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── whatsapp-bridge/               # Node.js WhatsApp Bridge
│   ├── whatsapp-bridge-server.js
│   ├── package.json
│   └── Dockerfile
├── whatsapp_mcp_control.sh        # Control Script
├── whatsapp_automation_complete.py # Automatisierung
├── whatsapp_mcp_ai_demo.py        # KI-Demo
└── whatsapp-mcp-config.json       # MCP-Konfiguration
```

## 🔒 Sicherheit

- Keine sensiblen Daten im Code
- Authentifizierung über WhatsApp Web
- Sichere API-Kommunikation
- Containerisierte Ausführung

## 📄 Lizenz

MIT License - siehe LICENSE Datei für Details.

## 🤝 Beitragen

1. Fork das Projekt
2. Erstelle einen Feature-Branch
3. Commit deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

## 📞 Support

Bei Fragen oder Problemen:
- Öffne ein Issue auf GitHub
- Prüfe die Logs: `docker-compose logs`
- Teste die API-Endpunkte mit curl

---

**Hinweis**: Dieses System ermöglicht echte WhatsApp-Kommunikation. Verwende es verantwortungsvoll und im Einklang mit WhatsApps Nutzungsbedingungen.
