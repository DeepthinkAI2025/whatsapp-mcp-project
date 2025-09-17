# WhatsApp MCP Project

Ein vollständiges WhatsApp-Integrationssystem mit MCP (Model Context Protocol) für Automatisierung und externe Tools wie n8n, Cline oder andere Software. **Ein WhatsApp-Account wird von allen Nutzern geteilt** - optimiert für den Betrieb auf VM oder Cloud-Plattformen.

## 🚀 Features

- **WhatsApp Bridge**: Echte WhatsApp-Integration mit Baileys
- **MCP Server**: FastAPI-basierter Server für API-Zugriffe
- **Web Dashboard**: Intuitives Web-Interface mit QR-Code-Display, Chat und System-Monitoring
- **Automatisierung**: Intelligente Nachrichtenverarbeitung
- **Docker Support**: Vollständige Containerisierung für einfache Deployment
- **Externe Integration**: Nahtlose Nutzung mit n8n, Cline und anderen Tools über API-Endpunkte
- **Single Account**: Ein WhatsApp-Account für alle Nutzer (einfach und kostengünstig)
- **Cloud-Ready**: Funktioniert auf Google Cloud VM, Vercel, Railway und anderen Plattformen

## 📋 Voraussetzungen

- Docker & Docker Compose (für VM-Deployment)
- Node.js 18+ (für Bridge-Entwicklung)
- Python 3.11+ (für MCP-Server-Entwicklung)
- Cloud-Account (Google Cloud VM, Vercel, Railway, etc.)

## 🛠️ Schnellstart

### Deployment-Optionen

#### Option 1: Google Cloud VM (Vollständige Kontrolle)

**Vorteile:** Vollständige Kontrolle, persistente Sessions, WebSocket-Support
**Nachteile:** Komplexere Einrichtung, höhere Kosten

1. **VM erstellen**:
   - Gehe zu Google Cloud Console > Compute Engine > VM-Instanzen
   - Erstelle eine neue VM (z.B. Ubuntu 22.04 LTS)
   - Öffne Ports: 80, 443, 3000 (Bridge), 8000 (MCP Server)
   - Firewall-Regeln: Erlaube HTTP/HTTPS und die benötigten Ports

2. **Projekt deployen**:
   ```bash
   # Repository klonen
   git clone https://github.com/DeepthinkAI2025/whatsapp-mcp-project.git
   cd whatsapp-mcp-project

   # Docker Services starten
   docker-compose -f docker-compose.whatsapp.yaml up -d

   # Bridge-Logs prüfen (QR-Code für WhatsApp-Login)
   docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-bridge
   ```

3. **Erreichbarkeit sicherstellen**:
   - Verwende die externe IP der VM
   - **Web Dashboard**: `http://YOUR_VM_IP:9000` (Empfohlen für Benutzer)
   - **MCP API**: `http://YOUR_VM_IP:8000/bridge_status`
   - **Bridge API**: `http://YOUR_VM_IP:3000/status`
   - Für HTTPS: Richte einen Load Balancer oder SSL-Zertifikat ein

#### Option 2: Vercel/Railway (Serverless, nur MCP Server)

**Vorteile:** Einfaches Deployment, automatische HTTPS, kostenlos
**Nachteile:** Keine persistente WhatsApp-Sessions, nur für API-Wrapper**

```bash
# Nur MCP Server deployen (ohne WhatsApp Bridge)
npm i -g vercel
cd whatsapp-mcp-server
vercel --prod

# Oder mit Railway
npm i -g @railway/cli
railway deploy
```

**Wichtig:** Bei Serverless-Deployment muss die WhatsApp Bridge separat (z.B. auf VPS) laufen!

### Lokale Entwicklung

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

## 🌐 Web Dashboard (Port 9000)

Das Web Dashboard bietet eine benutzerfreundliche Oberfläche zur Verwaltung des WhatsApp MCP Systems.

### Funktionen

- **📱 QR-Code Display**: Automatische Anzeige und Aktualisierung des WhatsApp QR-Codes
- **💬 Chat Interface**: Direkte Nachrichten-Versendung über die Web-Oberfläche
- **📊 System Monitoring**: Echtzeit-Status von Bridge, MCP Server und aktiven Verbindungen
- **📜 Live Logs**: System-Ereignisse und Nachrichten-Status in Echtzeit
- **🔄 Auto-Refresh**: Automatische Aktualisierung aller Komponenten

### Zugriff

```bash
# Nach dem Start der Docker Services
open http://localhost:9000

# Oder auf Cloud VM
open http://YOUR_VM_IP:9000
```

### Web UI API-Endpunkte

- `GET /api/status` - System-Status (Bridge, MCP, Web-Clients)
- `GET /api/qr` - QR-Code für WhatsApp-Verbindung
- `POST /api/send` - Nachricht senden über Web-Interface
- `GET /api/messages` - Nachrichten-Verlauf abrufen
- `POST /api/restart-bridge` - Bridge-Neustart (Admin-Funktion)

### Screenshot/Demo

Das Dashboard zeigt:
1. **Status-Anzeige**: Verbindungs-Status der verschiedenen Services
2. **QR-Code-Bereich**: Für neue WhatsApp-Verbindungen
3. **Chat-Interface**: Telefonnummer eingeben und Nachrichten senden
4. **System-Logs**: Live-Ereignisse und Fehlermeldungen

## 📡 API-Endpunkte (Detailliert)

### MCP Server (Port 8000)

Alle Endpunkte sind über `http://YOUR_VM_IP:8000` erreichbar.

- `POST /send` - Nachricht senden
  - Body: `{"to": "1234567890@c.us", "message": "Hallo"}`
  - Response: `{"status": "success", "message_id": "xxx"}`

- `GET /messages` - Nachrichten abrufen
  - Query: `?limit=10&from=1234567890@c.us`
  - Response: `[{"from": "123...", "message": "Hallo", "timestamp": "2023-..."}]`

- `GET /bridge_status` - Bridge-Status prüfen
  - Response: `{"status": "connected", "qr_code": null}`

- `POST /webhook` - Webhook für eingehende Nachrichten (optional)
  - Konfiguriere in n8n oder anderen Tools

### WhatsApp Bridge (Port 3000)

- `POST /send` - WhatsApp-Nachricht senden
  - Body: `{"number": "1234567890", "message": "Test"}`

- `GET /status` - Verbindungsstatus
  - Response: `{"connected": true, "qr": "data:image/png;base64,..."}`

## 🔗 Integration mit externen Tools

### Mit n8n

n8n kann die API-Endpunkte nutzen, um WhatsApp-Nachrichten zu senden/empfangen:

1. **HTTP Request Node in n8n**:
   - URL: `http://YOUR_VM_IP:8000/send`
   - Method: POST
   - Body: `{"to": "{{$node["data"].json.number}}", "message": "{{$node["data"].json.message}}"}`

2. **Webhook für eingehende Nachrichten**:
   - Konfiguriere den Webhook-Endpunkt in der VM
   - In n8n: Webhook-Node mit URL `http://YOUR_VM_IP:8000/webhook`

### Mit Cline oder anderen KI-Tools

Das System ist MCP-kompatibel. KI-Agenten können folgende Tools nutzen:

- `send_whatsapp_message(to, message)` - Nachrichten versenden
- `get_whatsapp_messages(limit, from_number)` - Nachrichten abrufen
- `whatsapp_bridge_status()` - Status prüfen

### Beispiel für Cline/KI-Nutzung:

```
Nutze WhatsApp MCP und sende: "Hallo von KI!"
Prüfe den WhatsApp Status mit MCP
Hole die letzten 5 Nachrichten über MCP
```

## 🔧 Konfiguration für GCP

### Umgebungsvariablen

```bash
# MCP-Server
BRIDGE_ONLINE=true
BRIDGE_URL=http://whatsapp-bridge:3000
EXTERNAL_IP=YOUR_VM_EXTERNAL_IP  # Für Webhooks

# Bridge
NODE_ENV=production
PORT=3000
```

### Firewall und Sicherheit

- Öffne nur notwendige Ports (3000, 8000)
- Verwende HTTPS mit Let's Encrypt oder Google Load Balancer
- Authentifiziere API-Zugriffe mit API-Keys (empfohlen für Produktion)

### Load Balancer (Optional)

Für Hochverfügbarkeit:
- Erstelle einen Load Balancer in GCP
- Backend: Deine VM-Instanzen
- Frontend: HTTP/HTTPS mit SSL

## 📱 WhatsApp Setup (Ein Account für alle)

⚠️ **Wichtig**: Ein WhatsApp-Account wird von allen Nutzern geteilt!

1. **QR-Code scannen**: Nach dem Start der Bridge wird ein QR-Code angezeigt
2. **WhatsApp Web**: Scanne den Code mit WhatsApp auf deinem Telefon
3. **Verbindung**: Warte auf "WhatsApp verbunden!" Nachricht
4. **Alle Nutzer**: Können jetzt über die API Nachrichten senden/empfangen

## 💡 Deployment-Empfehlungen

### Für echte WhatsApp-Integration:
- ✅ **Google Cloud VM** (oder anderer VPS)
- ✅ **Railway** (falls WebSocket + Persistenz unterstützt)
- ❌ **Vercel** (nicht geeignet für WhatsApp Bridge)

### Nur als API-Gateway:
- ✅ **Vercel** für MCP Server (Bridge läuft separat)
- ✅ **Railway** für MCP Server
- 📡 **WhatsApp Bridge** auf separatem VPS

### Kosten-Vergleich:
- **Google Cloud VM**: ~$10-30/Monat (je nach Größe)
- **Vercel Pro**: $20/Monat (nur für API, Bridge extra)
- **Railway**: $5-20/Monat (kann alles hosten)

**Fazit:** Für Vollständigkeit → **Google Cloud VM** oder **Railway**

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
│   Externe Tools │◄──────────►│   MCP Server    │
│  (n8n, Cline)   │             │   (FastAPI)     │
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
├── docker-compose.whatsapp.yaml    # Docker Setup (alle Services)
├── whatsapp-mcp-server/           # Python MCP Server
│   ├── main.py
│   ├── multi_user_main.py         # Multi-Account Support
│   ├── requirements.txt
│   └── Dockerfile
├── whatsapp-bridge/               # Node.js WhatsApp Bridge
│   ├── whatsapp-bridge-server.js
│   ├── package.json
│   ├── Dockerfile
│   └── auth_info/                 # WhatsApp Session Data
├── web-ui/                        # Web Dashboard
│   ├── server.js                  # Express Server
│   ├── package.json
│   ├── Dockerfile
│   └── public/
│       └── index.html             # Frontend Interface
├── whatsapp_mcp_control.sh        # Control Script
├── whatsapp_automation_complete.py # Automatisierung
├── whatsapp_mcp_ai_demo.py        # KI-Demo
└── Makefile                       # Build & Deploy Befehle
```

## 🔒 Sicherheit

- Keine sensiblen Daten im Code
- Authentifizierung über WhatsApp Web
- Sichere API-Kommunikation
- Containerisierte Ausführung
- Firewall-Konfiguration für GCP

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
- Für GCP-spezifische Probleme: Prüfe die VM-Logs und Firewall-Einstellungen

---

**Hinweis**: Dieses System ermöglicht echte WhatsApp-Kommunikation. Verwende es verantwortungsvoll und im Einklang mit WhatsApps Nutzungsbedingungen. Für Produktionsumgebungen empfehlen wir HTTPS und API-Authentifizierung.
