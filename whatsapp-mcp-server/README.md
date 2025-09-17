# WhatsApp MCP Server für FaPro

Ein kostengünstiger WhatsApp MCP (Model Context Protocol) Server als Alternative zu Twilio für das Versenden von Rechnungen und Zahlungserinnerungen per WhatsApp.

## 🚀 Funktionen

- **Kostenlos**: Nutzt WhatsApp Web ohne API-Kosten (im Gegensatz zu Twilio)
- **Rechnungsversand**: Automatischer Versand von Rechnungen mit Zahlungslinks
- **Zahlungserinnerungen**: Automatische Mahnungen für überfällige Rechnungen
- **MCP-kompatibel**: Vollständig kompatibel mit dem Model Context Protocol
- **REST API**: Zusätzliche REST-Schnittstelle für direkte Integration
- **Warteschlange**: Intelligente Nachrichtenwarteschlange für hohe Zuverlässigkeit
- **QR-Code Setup**: Einfache Einrichtung über WhatsApp Web QR-Code

## 📋 Voraussetzungen

- Node.js 18+ 
- WhatsApp Account
- Smartphone mit WhatsApp für QR-Code Scanning

## 🛠️ Installation

```bash
# Repository klonen und Verzeichnis wechseln
cd whatsapp-mcp-server

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env bearbeiten mit Ihren Werten

# TypeScript kompilieren
npm run build

# Server starten
npm start
```

## ⚙️ Konfiguration

Bearbeiten Sie die `.env` Datei:

```env
# Server Konfiguration
PORT=3001
NODE_ENV=development

# WhatsApp Konfiguration
WHATSAPP_SESSION_PATH=./whatsapp-session
WHATSAPP_COMPANY_NAME="FaPro GmbH"
WHATSAPP_COMPANY_PHONE="+49123456789"
WHATSAPP_COMPANY_EMAIL="info@fapro.de"

# FaPro API Konfiguration
FAPRO_API_URL="http://localhost:8000"
FAPRO_API_KEY="your-api-key-here"
```

## 🚀 Erste Einrichtung

1. **Server starten:**
   ```bash
   npm run dev
   ```

2. **QR-Code scannen:**
   - Der Server zeigt einen QR-Code im Terminal
   - Öffnen Sie WhatsApp auf Ihrem Smartphone
   - Gehen Sie zu "Verknüpfte Geräte" → "Gerät verknüpfen"
   - Scannen Sie den QR-Code

3. **Bereitschaft prüfen:**
   ```bash
   curl http://localhost:3001/health
   ```

## 📝 MCP Tools

### send_invoice_whatsapp
Sendet eine Rechnung mit Zahlungslink per WhatsApp.

**Parameter:**
- `to`: Telefonnummer (mit Ländercode, z.B. +491234567890)
- `invoice_number`: Rechnungsnummer
- `amount`: Betrag in Euro
- `payment_link`: Stripe Zahlungslink
- `customer_name`: Kundenname
- `due_date`: Fälligkeitsdatum (optional)

### send_payment_reminder_whatsapp
Sendet eine Zahlungserinnerung.

**Parameter:**
- `to`: Telefonnummer
- `invoice_number`: Rechnungsnummer
- `amount`: Offener Betrag
- `payment_link`: Zahlungslink
- `customer_name`: Kundenname
- `days_overdue`: Tage überfällig

### send_custom_message_whatsapp
Sendet eine benutzerdefinierte Nachricht.

**Parameter:**
- `to`: Telefonnummer
- `message`: Nachrichtentext

### get_whatsapp_status
Überprüft den WhatsApp Verbindungsstatus.

## 🌐 REST API

### GET /health
Systemstatus prüfen

```bash
curl http://localhost:3001/health
```

### GET /whatsapp/status
WhatsApp Verbindungsstatus

```bash
curl http://localhost:3001/whatsapp/status
```

### POST /whatsapp/send
Nachricht senden

```bash
curl -X POST http://localhost:3001/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "message": "Hallo, das ist eine Testnachricht!"
  }'
```

## 🔧 Integration in FaPro

### 1. PHP Service erstellen

```php
// src/Service/WhatsAppMCPService.php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Customer;
use App\Entity\Invoice;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Psr\Log\LoggerInterface;

class WhatsAppMCPService
{
    private readonly HttpClientInterface $httpClient;
    private readonly LoggerInterface $logger;
    private readonly string $mcpServerUrl;

    public function __construct(
        HttpClientInterface $httpClient,
        LoggerInterface $logger,
        string $mcpServerUrl = 'http://localhost:3001'
    ) {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
        $this->mcpServerUrl = $mcpServerUrl;
    }

    public function sendInvoice(Invoice $invoice, Customer $customer, string $paymentLink): bool
    {
        try {
            $response = $this->httpClient->request('POST', $this->mcpServerUrl . '/whatsapp/send', [
                'json' => [
                    'to' => $customer->getPhone(),
                    'message' => $this->generateInvoiceMessage($invoice, $customer, $paymentLink)
                ]
            ]);

            $data = $response->toArray();
            
            if ($data['success'] ?? false) {
                $this->logger->info("WhatsApp invoice sent", [
                    'invoice_id' => $invoice->getId(),
                    'customer_id' => $customer->getId(),
                    'message_id' => $data['message_id']
                ]);
                return true;
            }

            return false;
        } catch (\Exception $e) {
            $this->logger->error("WhatsApp invoice send failed", [
                'error' => $e->getMessage(),
                'invoice_id' => $invoice->getId()
            ]);
            return false;
        }
    }

    private function generateInvoiceMessage(Invoice $invoice, Customer $customer, string $paymentLink): string
    {
        // Nachricht generieren (siehe MCP Server Template)
        return "🧾 Rechnung {$invoice->getNumber()}\n\n" .
               "Hallo {$customer->getName()},\n\n" .
               "Ihre Rechnung ist bereit...\n" .
               $paymentLink;
    }
}
```

### 2. Service konfigurieren

```yaml
# config/services.yaml
services:
    App\Service\WhatsAppMCPService:
        arguments:
            $mcpServerUrl: '%env(WHATSAPP_MCP_URL)%'
```

### 3. Alte Twilio Service ersetzen

```php
// In InvoiceController oder ähnlich
public function sendInvoiceWhatsApp(Invoice $invoice): JsonResponse
{
    $customer = $invoice->getCustomer();
    $paymentLink = $this->generatePaymentLink($invoice);
    
    // MCP Service statt Twilio verwenden
    $success = $this->whatsappMCPService->sendInvoice($invoice, $customer, $paymentLink);
    
    return $this->json(['success' => $success]);
}
```

## 💰 Kostenvergleich

| Anbieter | Kosten pro Nachricht | Monatliche Kosten (1000 Nachrichten) |
|----------|---------------------|--------------------------------------|
| **WhatsApp MCP Server** | **€0.00** | **€0.00** |
| Twilio WhatsApp | €0.0055 - €0.012 | €5.50 - €12.00 |
| WhatsApp Business API | €0.005 - €0.015 | €5.00 - €15.00 |

## ⚠️ Wichtige Hinweise

1. **WhatsApp Nutzungsbedingungen**: Stellen Sie sicher, dass Ihre Nutzung den WhatsApp Geschäftsbedingungen entspricht
2. **Rate Limits**: Vermeiden Sie Spam - maximal 1 Nachricht pro Sekunde
3. **Session Management**: Die WhatsApp Session wird lokal gespeichert und muss gelegentlich erneuert werden
4. **Backup**: Erstellen Sie regelmäßig Backups des Session-Ordners

## 🐛 Fehlerbehandlung

### Server startet nicht
```bash
# Ports prüfen
lsof -i :3001

# Session löschen und neu starten
rm -rf ./whatsapp-session
npm start
```

### WhatsApp Verbindung verloren
1. Server neu starten
2. QR-Code erneut scannen
3. Session-Ordner löschen falls nötig

## 📈 Monitoring

### Logs überwachen
```bash
# Logs in Echtzeit
npm run dev

# Systemlogs
tail -f /var/log/whatsapp-mcp.log
```

### Gesundheitscheck
```bash
# Automatischer Check alle 5 Minuten
*/5 * * * * curl -f http://localhost:3001/health || echo "WhatsApp MCP Server down" | mail -s "Alert" admin@fapro.de
```

## 🚀 Produktionsdeployment

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Systemd Service
```ini
[Unit]
Description=WhatsApp MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/whatsapp-mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Email: support@fapro.de
- Dokumentation: [Vollständige Docs](https://docs.fapro.de/whatsapp-mcp)

## 📄 Lizenz

MIT License - siehe LICENSE Datei für Details.
