# WhatsApp MCP Project - Beispiel-Nutzung

Dieses Beispiel zeigt, wie du das WhatsApp MCP System in deinen eigenen Projekten nutzen kannst.

## 🚀 Schnellstart

```bash
# 1. Repository klonen
git clone https://github.com/your-username/whatsapp-mcp-project.git
cd whatsapp-mcp-project

# 2. Setup ausführen
./setup.sh

# 3. Services starten
docker-compose -f docker-compose.whatsapp.yaml up -d

# 4. QR-Code scannen (für WhatsApp-Verbindung)
docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-bridge
```

## 📡 API-Beispiele

### Nachricht senden

```bash
curl -X POST http://localhost:8000/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "message": "Hallo von WhatsApp MCP!"
  }'
```

### Nachrichten abrufen

```bash
curl http://localhost:8000/messages?limit=5
```

### Status prüfen

```bash
curl http://localhost:8000/bridge_status
```

## 🤖 KI-Integration

### Mit Cline/KI-Agenten

```
Nutze WhatsApp MCP und sende: "Projekt-Update bereit"
Prüfe den WhatsApp Status mit MCP
Hole die letzten 10 Nachrichten über MCP
```

### Programmatisch in Python

```python
import requests

# Nachricht senden
response = requests.post('http://localhost:8000/send', json={
    'to': '+491234567890',
    'message': 'Test-Nachricht'
})
print(response.json())

# Status prüfen
status = requests.get('http://localhost:8000/bridge_status')
print(status.json())
```

### Programmatisch in JavaScript

```javascript
const axios = require('axios');

// Nachricht senden
axios.post('http://localhost:8000/send', {
  to: '+491234567890',
  message: 'Test-Nachricht'
})
.then(response => console.log(response.data))
.catch(error => console.error(error));

// Status prüfen
axios.get('http://localhost:8000/bridge_status')
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

## 🔧 Erweiterte Konfiguration

### Umgebungsvariablen

```bash
# .env Datei
BRIDGE_ONLINE=true
BRIDGE_URL=http://whatsapp-bridge:3000
NODE_ENV=production
```

### Docker Compose Override

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  whatsapp-mcp-server:
    environment:
      - DEBUG=true
    ports:
      - "8000:8000"
```

## 📊 Monitoring

### Logs verfolgen

```bash
# Alle Logs
docker-compose -f docker-compose.whatsapp.yaml logs -f

# Nur Bridge-Logs
docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-bridge

# Nur MCP-Server Logs
docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-mcp-server
```

### Health Checks

```bash
# Container-Status
docker-compose -f docker-compose.whatsapp.yaml ps

# Ressourcen-Nutzung
docker stats
```

## 🧪 Tests

### Automatisierung testen

```bash
python whatsapp_automation_complete.py test
```

### KI-Demo ausführen

```bash
python whatsapp_mcp_ai_demo.py
```

### Control Script

```bash
./whatsapp_mcp_control.sh status
./whatsapp_mcp_control.sh test
```

## 🐛 Fehlerbehebung

### Häufige Probleme

1. **QR-Code wird nicht angezeigt**
   ```bash
   docker-compose -f docker-compose.whatsapp.yaml logs whatsapp-bridge
   ```

2. **Verbindung fehlgeschlagen**
   ```bash
   docker-compose -f docker-compose.whatsapp.yaml restart whatsapp-bridge
   ```

3. **API nicht erreichbar**
   ```bash
   curl http://localhost:8000/bridge_status
   docker-compose -f docker-compose.whatsapp.yaml ps
   ```

### Debug-Modus

```bash
# Mit Debug-Logs
docker-compose -f docker-compose.whatsapp.yaml up
```

## 🔒 Sicherheit

- Scanne QR-Codes nur auf vertrauenswürdigen Geräten
- Verwende starke Passwörter für WhatsApp
- Überwache API-Zugriffe
- Halte Dependencies aktuell

## 📞 Support

Bei Problemen:
1. Prüfe die Logs
2. Teste die API-Endpunkte
3. Öffne ein Issue auf GitHub
4. Kontaktiere den Entwickler

---

**Happy coding with WhatsApp MCP! 🚀📱**
