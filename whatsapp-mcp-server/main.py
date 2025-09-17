import asyncio
import nest_asyncio
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import os

nest_asyncio.apply()
app = FastAPI()

# Konfiguration
BRIDGE_ONLINE = os.getenv("BRIDGE_ONLINE", "false").lower() == "true"
BRIDGE_URL = os.getenv("BRIDGE_URL", "http://localhost:3000")

# In-Memory Simulation (für Fallback)
MESSAGES = []

class Message(BaseModel):
    to: str
    message: str
    timestamp: datetime = None

async def send_to_bridge(phone: str, message: str) -> dict:
    """Sendet Nachricht über die Bridge"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BRIDGE_URL}/send",
                json={"to": phone, "message": message},
                timeout=30.0
            )
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Bridge error: {str(e)}")

@app.post("/send")
async def send_whatsapp_message(msg: Message):
    msg.timestamp = datetime.utcnow()

    if BRIDGE_ONLINE:
        # Echter Versand über Bridge
        try:
            result = await send_to_bridge(msg.to, msg.message)
            return {"status": "sent", "message": msg, "bridge_response": result}
        except Exception as e:
            return {"status": "error", "message": msg, "error": str(e)}
    else:
        # Simulation
        MESSAGES.append(msg)
        return {"status": "simulated", "detail": "Bridge offline, Nachricht simuliert", "message": msg}

@app.get("/messages", response_model=List[Message])
async def get_whatsapp_messages(limit: int = 30):
    return MESSAGES[-limit:]

@app.get("/bridge_status")
async def whatsapp_bridge_status():
    if BRIDGE_ONLINE:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BRIDGE_URL}/status", timeout=10.0)
                return {"bridge_online": True, "status": response.json()}
        except:
            return {"bridge_online": False, "error": "Bridge nicht erreichbar"}
    else:
        return {"bridge_online": False, "simulation_mode": True}

# Optional: Starte den Server direkt
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
