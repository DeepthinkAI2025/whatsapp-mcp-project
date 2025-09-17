import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Client, MessageMedia, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

// Lade Umgebungsvariablen
config();

/**
 * WhatsApp MCP Server für FaPro
 * Kosteneffiziente Alternative zu Twilio für Rechnungsversand per WhatsApp
 */
class WhatsAppMCPServer {
  private server: Server;
  private whatsappClient!: Client;
  private expressApp: express.Application;
  private isClientReady: boolean = false;
  private messageQueue: Array<{ to: string; message: string; id: string }> = [];
  private currentQr: string | null = null;
  private sseClients: Set<Response> = new Set();

  constructor() {
    this.server = new Server(
      {
        name: 'fapro-whatsapp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Express Server für REST API
    this.expressApp = express();
    this.setupExpress();

    // WhatsApp Client Setup
    this.setupWhatsAppClient();
    this.setupHandlers();
  }

  private setupExpress(): void {
    this.expressApp.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    }));
    this.expressApp.use(express.json());

    // Health Check
    this.expressApp.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        whatsapp_ready: this.isClientReady,
        timestamp: new Date().toISOString()
      });
    });

    // WhatsApp Status
    this.expressApp.get('/whatsapp/status', (req, res) => {
      res.json({
        ready: this.isClientReady,
        queue_length: this.messageQueue.length
      });
    });

    // Aktueller QR Code als JSON
    this.expressApp.get('/whatsapp/qr', (req, res) => {
      res.json({ qr: this.currentQr, ready: this.isClientReady });
    });

    // QR Code als PNG (zum Einbinden im Frontend)
    this.expressApp.get('/whatsapp/qr.png', async (req, res) => {
      try {
        if (!this.currentQr) {
          return res.status(404).json({ error: 'Kein QR Code verfügbar' });
        }
        const pngBuffer = await QRCode.toBuffer(this.currentQr, { type: 'png', scale: 8 });
        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
      } catch (err) {
        console.error('Fehler beim Erzeugen des QR PNG:', err);
        res.status(500).json({ error: 'QR Code konnte nicht erzeugt werden' });
      }
    });
    // Server-Sent Events fr QR-Updates
    this.expressApp.get('/whatsapp/qr/stream', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const sendEvent = (event: any) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Initialer Zustand
      sendEvent({ ready: this.isClientReady, qr: this.currentQr || null });

      // Client registrieren
      this.sseClients.add(res);

      // Cleanup bei Verbindungsende
      req.on('close', () => {
        this.sseClients.delete(res);
        res.end();
      });
    });



    // Send Message via REST API
    this.expressApp.post('/whatsapp/send', async (req, res) => {
      try {
        const { to, message, type = 'text' } = req.body;

        if (!to || !message) {
          return res.status(400).json({ error: 'Telefonnummer und Nachricht sind erforderlich' });
        }

        const result = await this.sendWhatsAppMessage(to, message);
        res.json(result);
      } catch (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
        res.status(500).json({
          error: 'Nachricht konnte nicht gesendet werden',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    const port = process.env.PORT || 3001;
    this.expressApp.listen(port, () => {
      console.log(`WhatsApp MCP Server läuft auf Port ${port}`);
    });
  }

  private setupWhatsAppClient(): void {
    this.whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.whatsappClient.on('qr', (qr) => {
      this.currentQr = qr;
      console.log('QR Code für WhatsApp Web aktualisiert');
      this.broadcastSse({ ready: false, qr });
      // Optional: ASCII-QR in der Konsole anzeigen (für lokale Tests)
      qrcode.generate(qr, { small: true });
    });

    this.whatsappClient.on('ready', () => {
      console.log('WhatsApp Client ist bereit!');
      this.isClientReady = true;
      this.currentQr = null;
      this.broadcastSse({ ready: true, qr: null });
      this.processMessageQueue();
    });

    this.whatsappClient.on('authenticated', () => {
      console.log('WhatsApp authentifiziert');
    });

    this.whatsappClient.on('auth_failure', (msg) => {
      console.error('WhatsApp Authentifizierung fehlgeschlagen', msg);
    });

    this.whatsappClient.on('disconnected', (reason) => {
      console.log('WhatsApp disconnected', reason);
      this.isClientReady = false;
      this.broadcastSse({ ready: false, qr: null });
    });

    this.whatsappClient.on('message', (message) => {
      console.log('Nachricht empfangen:', message.from, message.body);
      // Hier können eingehende Nachrichten verarbeitet werden
    });

    this.whatsappClient.initialize();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'send_invoice_whatsapp',
            description: 'Sendet eine Rechnung mit Zahlungslink per WhatsApp',
            inputSchema: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Telefonnummer des Empfängers (mit Ländercode, z.B. +491234567890)'
                },
                invoice_number: {
                  type: 'string',
                  description: 'Rechnungsnummer'
                },
                amount: {
                  type: 'number',
                  description: 'Rechnungsbetrag in Euro'
                },
                payment_link: {
                  type: 'string',
                  description: 'Stripe Zahlungslink'
                },
                customer_name: {
                  type: 'string',
                  description: 'Name des Kunden'
                },
                due_date: {
                  type: 'string',
                  description: 'Fälligkeitsdatum (YYYY-MM-DD)'
                }
              },
              required: ['to', 'invoice_number', 'amount', 'payment_link', 'customer_name']
            }
          },
          {
            name: 'send_payment_reminder_whatsapp',
            description: 'Sendet eine Zahlungserinnerung per WhatsApp',
            inputSchema: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Telefonnummer des Empfängers'
                },
                invoice_number: {
                  type: 'string',
                  description: 'Rechnungsnummer'
                },
                amount: {
                  type: 'number',
                  description: 'Offener Betrag in Euro'
                },
                payment_link: {
                  type: 'string',
                  description: 'Zahlungslink'
                },
                customer_name: {
                  type: 'string',
                  description: 'Name des Kunden'
                },
                days_overdue: {
                  type: 'number',
                  description: 'Tage überfällig'
                }
              },
              required: ['to', 'invoice_number', 'amount', 'payment_link', 'customer_name', 'days_overdue']
            }
          },
          {
            name: 'send_custom_message_whatsapp',
            description: 'Sendet eine benutzerdefinierte Nachricht per WhatsApp',
            inputSchema: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Telefonnummer des Empfängers'
                },
                message: {
                  type: 'string',
                  description: 'Nachrichtentext'
                }
              },
              required: ['to', 'message']
            }
          },
          {
            name: 'get_whatsapp_status',
            description: 'Überprüft den Status der WhatsApp Verbindung',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'send_invoice_whatsapp':
          return this.handleSendInvoice(request.params.arguments);

        case 'send_payment_reminder_whatsapp':
          return this.handleSendPaymentReminder(request.params.arguments);

        case 'send_custom_message_whatsapp':
          return this.handleSendCustomMessage(request.params.arguments);

        case 'get_whatsapp_status':
          return this.handleGetStatus();

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unbekanntes Tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleSendInvoice(args: any): Promise<any> {
    const { to, invoice_number, amount, payment_link, customer_name, due_date } = args;

    const message = this.generateInvoiceMessage({
      invoice_number,
      amount,
      payment_link,
      customer_name,
      due_date
    });

    const result = await this.sendWhatsAppMessage(to, message);

    return {
      content: [{
        type: 'text',
        text: `Rechnung ${invoice_number} wurde per WhatsApp an ${to} gesendet.`
      }]
    };
  }

  private async handleSendPaymentReminder(args: any): Promise<any> {
    const { to, invoice_number, amount, payment_link, customer_name, days_overdue } = args;

    const message = this.generatePaymentReminderMessage({
      invoice_number,
      amount,
      payment_link,
      customer_name,
      days_overdue
    });

    const result = await this.sendWhatsAppMessage(to, message);

    return {
      content: [{
        type: 'text',
        text: `Zahlungserinnerung für Rechnung ${invoice_number} wurde per WhatsApp an ${to} gesendet.`
      }]
    };
  }

  private async handleSendCustomMessage(args: any): Promise<any> {
    const { to, message } = args;

    const result = await this.sendWhatsAppMessage(to, message);

    return {
      content: [{
        type: 'text',
        text: `Nachricht wurde per WhatsApp an ${to} gesendet.`
      }]
    };
  }

  private async handleGetStatus(): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ready: this.isClientReady,
          queue_length: this.messageQueue.length,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  private broadcastSse(event: any): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of this.sseClients) {
      try { res.write(payload); } catch { /* ignore */ }
    }
  }

  private async sendWhatsAppMessage(to: string, message: string): Promise<any> {
    const messageId = uuidv4();

    if (!this.isClientReady) {

      // Füge zur Warteschlange hinzu wenn Client nicht bereit
      this.messageQueue.push({ to, message, id: messageId });
      return {
        success: false,
        message_id: messageId,
        status: 'queued',
        error: 'WhatsApp Client ist nicht bereit. Nachricht wurde zur Warteschlange hinzugefügt.'
      };
    }

    try {
      // Formatiere Telefonnummer für WhatsApp
      const formattedNumber = this.formatPhoneNumber(to);

      // Sende Nachricht
      const sentMessage = await this.whatsappClient.sendMessage(formattedNumber, message);

      console.log(`WhatsApp Nachricht gesendet an ${to}:`, sentMessage.id._serialized);

      return {
        success: true,
        message_id: messageId,
        whatsapp_id: sentMessage.id._serialized,
        status: 'sent',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Fehler beim Senden der WhatsApp Nachricht:', error);
      return {
        success: false,
        message_id: messageId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Entferne alle nicht-numerischen Zeichen außer +
    let formatted = phone.replace(/[^\d+]/g, '');

    // Füge Ländercode hinzu wenn nicht vorhanden
    if (formatted.startsWith('0')) {
      formatted = '+49' + formatted.substring(1); // Deutsche Nummer
    } else if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    // Entferne + für WhatsApp Format
    return formatted.substring(1) + '@c.us';
  }

  private generateInvoiceMessage(data: {
    invoice_number: string;
    amount: number;
    payment_link: string;
    customer_name: string;
    due_date?: string;
  }): string {
    const companyName = process.env.WHATSAPP_COMPANY_NAME || 'FaPro GmbH';
    const companyPhone = process.env.WHATSAPP_COMPANY_PHONE || '+49123456789';
    const companyEmail = process.env.WHATSAPP_COMPANY_EMAIL || 'info@fapro.de';

    const amount = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(data.amount);

    const dueDate = data.due_date ? new Date(data.due_date).toLocaleDateString('de-DE') : 'unbekannt';

    return `🧾 *Rechnung ${data.invoice_number}*

Hallo ${data.customer_name},

Ihre Rechnung ist bereit:

💰 Betrag: *${amount}*
📅 Fällig am: ${dueDate}

🔗 *Jetzt online bezahlen:*
${data.payment_link}

Alternativ können Sie per Banküberweisung zahlen:
IBAN: DE89 3704 0044 0532 0130 00
Verwendungszweck: ${data.invoice_number}

Bei Fragen erreichen Sie uns unter:
📞 ${companyPhone}
📧 ${companyEmail}

Vielen Dank!
Ihr ${companyName} Team`;
  }

  private generatePaymentReminderMessage(data: {
    invoice_number: string;
    amount: number;
    payment_link: string;
    customer_name: string;
    days_overdue: number;
  }): string {
    const companyName = process.env.WHATSAPP_COMPANY_NAME || 'FaPro GmbH';
    const companyPhone = process.env.WHATSAPP_COMPANY_PHONE || '+49123456789';
    const companyEmail = process.env.WHATSAPP_COMPANY_EMAIL || 'info@fapro.de';

    const amount = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(data.amount);

    return `⚠️ *Zahlungserinnerung - Rechnung ${data.invoice_number}*

Liebe/r ${data.customer_name},

Ihre Rechnung ist seit ${data.days_overdue} Tagen überfällig.

💰 Offener Betrag: *${amount}*
📋 Rechnung: ${data.invoice_number}

🔗 *Jetzt online bezahlen:*
${data.payment_link}

Falls Sie bereits bezahlt haben, ignorieren Sie bitte diese Nachricht.

Bei Fragen erreichen Sie uns unter:
📞 ${companyPhone}
📧 ${companyEmail}

Vielen Dank für Ihr Verständnis!
Ihr ${companyName} Team`;
  }

  private async processMessageQueue(): Promise<void> {
    if (!this.isClientReady || this.messageQueue.length === 0) {
      return;
    }

    console.log(`Verarbeite ${this.messageQueue.length} Nachrichten aus der Warteschlange...`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const { to, message, id } of messages) {
      try {
        await this.sendWhatsAppMessage(to, message);
        console.log(`Nachricht ${id} erfolgreich gesendet`);

        // Pause zwischen Nachrichten um Rate Limiting zu vermeiden
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Fehler beim Senden von Nachricht ${id}:`, error);
        // Nachricht wieder zur Warteschlange hinzufügen
        this.messageQueue.push({ to, message, id });
      }
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.log('WhatsApp MCP Server gestartet');
    console.log('Verfügbare Tools:');
    console.log('- send_invoice_whatsapp: Rechnung per WhatsApp senden');
    console.log('- send_payment_reminder_whatsapp: Zahlungserinnerung senden');
    console.log('- send_custom_message_whatsapp: Benutzerdefinierte Nachricht senden');
    console.log('- get_whatsapp_status: WhatsApp Status überprüfen');
  }
}

// Server starten
const server = new WhatsAppMCPServer();
server.run().catch(console.error);
