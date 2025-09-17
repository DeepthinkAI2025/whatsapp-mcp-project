# Dockerfile für WhatsApp MCP Server (Python/FastAPI)
FROM python:3.11-slim

WORKDIR /app

# System-Abhängigkeiten installieren
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python-Abhängigkeiten
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code kopieren
COPY . .

# Port freigeben
EXPOSE 8000

# Server starten
CMD ["python", "main.py"]
