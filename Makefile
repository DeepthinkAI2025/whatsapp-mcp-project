# WhatsApp MCP Project Makefile

.PHONY: help setup up down logs status test clean

# Standard-Ziel
help: ## Zeige diese Hilfe an
	@echo "WhatsApp MCP Project - Verfügbare Befehle:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Erstelle Setup und installiere Abhängigkeiten
	./setup.sh

up: ## Starte alle Services
	docker-compose -f docker-compose.whatsapp.yaml up -d

down: ## Stoppe alle Services
	docker-compose -f docker-compose.whatsapp.yaml down

logs: ## Zeige Logs aller Services
	docker-compose -f docker-compose.whatsapp.yaml logs -f

logs-bridge: ## Zeige nur Bridge-Logs
	docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-bridge

logs-mcp: ## Zeige nur MCP-Server Logs
	docker-compose -f docker-compose.whatsapp.yaml logs -f whatsapp-mcp-server

status: ## Zeige Status aller Services
	docker-compose -f docker-compose.whatsapp.yaml ps

test: ## Führe Tests aus
	python whatsapp_automation_complete.py test

demo: ## Führe KI-Demo aus
	python whatsapp_mcp_ai_demo.py

restart: ## Restarte alle Services
	docker-compose -f docker-compose.whatsapp.yaml restart

restart-bridge: ## Restarte nur Bridge
	docker-compose -f docker-compose.whatsapp.yaml restart whatsapp-bridge

restart-mcp: ## Restarte nur MCP-Server
	docker-compose -f docker-compose.whatsapp.yaml restart whatsapp-mcp-server

build: ## Baue Docker-Images neu
	docker-compose -f docker-compose.whatsapp.yaml build

clean: ## Entferne Container und Volumes
	docker-compose -f docker-compose.whatsapp.yaml down -v
	docker system prune -f

deep-clean: ## Vollständige Bereinigung
	docker-compose -f docker-compose.whatsapp.yaml down -v --rmi all
	docker system prune -a -f

shell-bridge: ## Öffne Shell in Bridge-Container
	docker-compose -f docker-compose.whatsapp.yaml exec whatsapp-bridge sh

shell-mcp: ## Öffne Shell in MCP-Server Container
	docker-compose -f docker-compose.whatsapp.yaml exec whatsapp-mcp-server bash

update: ## Aktualisiere Dependencies
	cd whatsapp-bridge && npm update
	cd ../whatsapp-mcp-server && pip install -r requirements.txt --upgrade

backup: ## Erstelle Backup der Auth-Daten
	docker run --rm -v whatsapp-mcp-project_whatsapp_bridge_data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/whatsapp_auth_backup.tar.gz -C /data .

restore: ## Stelle Auth-Daten wieder her
	docker run --rm -v whatsapp-mcp-project_whatsapp_bridge_data:/data -v $(pwd)/backup:/backup alpine tar xzf /backup/whatsapp_auth_backup.tar.gz -C /data
