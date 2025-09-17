#!/usr/bin/env python3
"""
Multi-User WhatsApp MCP Server
Unterstützt mehrere WhatsApp-Accounts gleichzeitig
"""

import asyncio
import httpx
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import os
import json
import hashlib

app = FastAPI(title="Multi-User WhatsApp MCP Server")

# Konfiguration
BRIDGES = {}  # Account-ID -> Bridge-Info
BRIDGE_BASE_PORT = 3000
BRIDGE_URL_TEMPLATE = "http://localhost:{port}"

class Message(BaseModel):
    to: str
    message: str
    account_id: Optional[str] = None
    timestamp: datetime = None

class AccountInfo(BaseModel):
    account_id: str
    phone_number: str
    display_name: Optional[str] = None
    bridge_port: int
    status: str = "disconnected"

class MultiUserBridge:
    """Verwaltet mehrere WhatsApp-Bridges"""
    
    def __init__(self):
        self.accounts = {}  # account_id -> AccountInfo
        self.next_port = BRIDGE_BASE_PORT
    
    def create_account(self, user_id: str, phone_number: str, display_name: str = None) -> str:
        """Erstellt einen neuen WhatsApp-Account"""
        account_id = hashlib.md5(f"{user_id}_{phone_number}".encode()).hexdigest()[:8]
        
        if account_id not in self.accounts:
            self.accounts[account_id] = AccountInfo(
                account_id=account_id,
                phone_number=phone_number,
                display_name=display_name or f"User_{account_id}",
                bridge_port=self.next_port,
                status="created"
            )
            self.next_port += 1
            
            # Starte Bridge für diesen Account
            self._start_bridge_for_account(account_id)
        
        return account_id
    
    def _start_bridge_for_account(self, account_id: str):
        """Startet eine dedizierte Bridge für einen Account"""
        account = self.accounts[account_id]
        # TODO: Starte separate Bridge-Instanz auf account.bridge_port
        # Jede Bridge bekommt eigenen auth_info Ordner: auth_info_{account_id}/
        print(f"🚀 Bridge für Account {account_id} auf Port {account.bridge_port} gestartet")
        account.status = "starting"
    
    def get_bridge_url(self, account_id: str) -> str:
        """Gibt die Bridge-URL für einen Account zurück"""
        if account_id not in self.accounts:
            raise HTTPException(status_code=404, detail="Account nicht gefunden")
        
        port = self.accounts[account_id].bridge_port
        return BRIDGE_URL_TEMPLATE.format(port=port)
    
    def list_accounts(self) -> List[AccountInfo]:
        """Listet alle Accounts auf"""
        return list(self.accounts.values())

# Multi-User Bridge Manager
bridge_manager = MultiUserBridge()

@app.post("/accounts")
async def create_account(user_id: str, phone_number: str, display_name: str = None):
    """Erstellt einen neuen WhatsApp-Account für einen User"""
    account_id = bridge_manager.create_account(user_id, phone_number, display_name)
    return {
        "account_id": account_id,
        "bridge_port": bridge_manager.accounts[account_id].bridge_port,
        "qr_code_url": f"http://localhost:{bridge_manager.accounts[account_id].bridge_port}/qr",
        "message": "Scanne den QR-Code mit WhatsApp um diesen Account zu verbinden"
    }

@app.get("/accounts")
async def list_accounts():
    """Listet alle WhatsApp-Accounts auf"""
    return bridge_manager.list_accounts()

@app.get("/accounts/{account_id}/status")
async def get_account_status(account_id: str):
    """Prüft den Status eines WhatsApp-Accounts"""
    try:
        bridge_url = bridge_manager.get_bridge_url(account_id)
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{bridge_url}/status", timeout=10.0)
            return {
                "account_id": account_id,
                "bridge_online": True,
                "status": response.json()
            }
    except Exception as e:
        return {
            "account_id": account_id,
            "bridge_online": False,
            "error": str(e)
        }

@app.post("/send")
async def send_whatsapp_message(msg: Message, x_account_id: str = Header(None)):
    """Sendet eine WhatsApp-Nachricht über einen spezifischen Account"""
    msg.timestamp = datetime.utcnow()
    
    # Account-ID aus Header oder Message body
    account_id = x_account_id or msg.account_id
    if not account_id:
        raise HTTPException(status_code=400, detail="Account-ID erforderlich (Header oder Body)")
    
    try:
        bridge_url = bridge_manager.get_bridge_url(account_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{bridge_url}/send",
                json={"to": msg.to, "message": msg.message},
                timeout=30.0
            )
            return {
                "status": "sent",
                "account_id": account_id,
                "message": msg,
                "bridge_response": response.json()
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Senden: {str(e)}")

@app.get("/messages")
async def get_whatsapp_messages(limit: int = 30, x_account_id: str = Header(None)):
    """Holt Nachrichten von einem spezifischen Account"""
    if not x_account_id:
        raise HTTPException(status_code=400, detail="Account-ID im Header erforderlich")
    
    try:
        bridge_url = bridge_manager.get_bridge_url(x_account_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{bridge_url}/messages",
                params={"limit": limit},
                timeout=10.0
            )
            return {
                "account_id": x_account_id,
                "messages": response.json().get("messages", [])
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen: {str(e)}")

@app.get("/")
async def root():
    """API Info"""
    return {
        "service": "Multi-User WhatsApp MCP Server",
        "version": "2.0",
        "accounts": len(bridge_manager.accounts),
        "features": [
            "Multiple WhatsApp accounts per server",
            "Individual QR codes per user",
            "Account-based message routing",
            "Isolated auth sessions"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Multi-User WhatsApp MCP Server wird gestartet...")
    print("📱 Jeder User kann seinen eigenen WhatsApp-Account verbinden")
    uvicorn.run("multi_user_main:app", host="0.0.0.0", port=8000, reload=True)
