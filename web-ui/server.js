const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Konfiguration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8000';
const BRIDGE_SERVER_URL = process.env.BRIDGE_SERVER_URL || 'http://localhost:3000';
const PORT = process.env.WEB_UI_PORT || 9000;

// State
let currentQR = null;
let connectionStatus = 'disconnected';
let chatMessages = [];
let connectedClients = 0;

// API Endpoints

// Dashboard - Hauptseite
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// QR-Code API
app.get('/api/qr', async (req, res) => {
  try {
    const response = await axios.get(`${BRIDGE_SERVER_URL}/status`);
    const data = response.data;
    
    if (data.qr) {
      const qrCodeDataURL = await QRCode.toDataURL(data.qr);
      res.json({
        success: true,
        qr: qrCodeDataURL,
        status: data.connected ? 'connected' : 'waiting_for_scan'
      });
    } else if (data.connected) {
      res.json({
        success: true,
        qr: null,
        status: 'connected'
      });
    } else {
      res.json({
        success: false,
        message: 'Bridge nicht verfügbar'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bridge nicht erreichbar',
      error: error.message
    });
  }
});

// Status API
app.get('/api/status', async (req, res) => {
  try {
    const bridgeResponse = await axios.get(`${BRIDGE_SERVER_URL}/status`);
    const mcpResponse = await axios.get(`${MCP_SERVER_URL}/bridge_status`);
    
    res.json({
      success: true,
      bridge: {
        connected: bridgeResponse.data.connected,
        online: true
      },
      mcp: {
        online: mcpResponse.status === 200,
        bridge_online: mcpResponse.data.bridge_online
      },
      web_clients: connectedClients
    });
  } catch (error) {
    res.json({
      success: false,
      bridge: { connected: false, online: false },
      mcp: { online: false, bridge_online: false },
      web_clients: connectedClients,
      error: error.message
    });
  }
});

// Nachrichten senden
app.post('/api/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    const response = await axios.post(`${MCP_SERVER_URL}/send`, {
      to: to,
      message: message
    });
    
    // Broadcast to all connected clients
    io.emit('message_sent', {
      to: to,
      message: message,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Nachricht',
      error: error.message
    });
  }
});

// Nachrichten abrufen
app.get('/api/messages', async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const response = await axios.get(`${MCP_SERVER_URL}/messages?limit=${limit}`);
    
    res.json({
      success: true,
      messages: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Nachrichten',
      error: error.message
    });
  }
});

// Container Management
app.post('/api/restart-bridge', async (req, res) => {
  try {
    // In production würde hier ein Docker-Restart ausgeführt
    res.json({
      success: true,
      message: 'Bridge wird neu gestartet...'
    });
    
    io.emit('system_message', {
      type: 'info',
      message: 'WhatsApp Bridge wird neu gestartet...'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Neustart der Bridge'
    });
  }
});

// WebSocket Verbindungen
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`🌐 Client verbunden. Aktive Verbindungen: ${connectedClients}`);
  
  // Sende aktuellen Status
  socket.emit('status_update', {
    connected_clients: connectedClients,
    timestamp: new Date().toISOString()
  });
  
  // Client-Events
  socket.on('request_qr', async () => {
    try {
      const response = await axios.get(`${BRIDGE_SERVER_URL}/status`);
      if (response.data.qr) {
        const qrCodeDataURL = await QRCode.toDataURL(response.data.qr);
        socket.emit('qr_code', qrCodeDataURL);
      }
    } catch (error) {
      socket.emit('error', 'QR-Code konnte nicht abgerufen werden');
    }
  });
  
  socket.on('send_message', async (data) => {
    try {
      const response = await axios.post(`${MCP_SERVER_URL}/send`, {
        to: data.to,
        message: data.message
      });
      
      io.emit('message_sent', {
        ...data,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });
    } catch (error) {
      socket.emit('error', 'Nachricht konnte nicht gesendet werden');
    }
  });
  
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`🔌 Client getrennt. Aktive Verbindungen: ${connectedClients}`);
  });
});

// Periodic Status Updates
setInterval(async () => {
  try {
    const response = await axios.get(`${BRIDGE_SERVER_URL}/status`);
    const newStatus = response.data.connected ? 'connected' : 'disconnected';
    
    if (newStatus !== connectionStatus) {
      connectionStatus = newStatus;
      io.emit('connection_status', {
        status: connectionStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    // QR-Code Updates
    if (response.data.qr && response.data.qr !== currentQR) {
      currentQR = response.data.qr;
      const qrCodeDataURL = await QRCode.toDataURL(currentQR);
      io.emit('qr_update', qrCodeDataURL);
    }
  } catch (error) {
    if (connectionStatus !== 'error') {
      connectionStatus = 'error';
      io.emit('connection_status', {
        status: 'error',
        message: 'Bridge nicht erreichbar',
        timestamp: new Date().toISOString()
      });
    }
  }
}, 3000); // Alle 3 Sekunden

// Server starten
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WhatsApp MCP Web UI läuft auf Port ${PORT}`);
  console.log(`📱 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 MCP Server: ${MCP_SERVER_URL}`);
  console.log(`🌉 Bridge Server: ${BRIDGE_SERVER_URL}`);
});

module.exports = app;
