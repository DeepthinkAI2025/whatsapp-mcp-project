# Dockerfile für WhatsApp Bridge (Node.js)
FROM node:18-alpine

WORKDIR /app

# Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci --only=production

# Code kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Bridge starten
CMD ["node", "whatsapp-bridge-server.js"]
