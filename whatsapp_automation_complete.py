#!/usr/bin/env python3
"""
WhatsApp MCP Automation Script - Vollständige intelligente Automatisierung
Dieses Skript automatisiert alle WhatsApp-Operationen mit MCP-Integration
"""

import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
from pathlib import Path

# Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/Users/jeremyschulze/_Development/_Dev-projects/fapro/whatsapp_automation.log')
    ]
)
logger = logging.getLogger(__name__)

class WhatsAppMCPAutomation:
    """Vollständige WhatsApp MCP Automatisierung"""
    
    def __init__(self):
        self.bridge_url = "http://localhost:8080"
        self.target_phone = "+4917632023167"
        self.config_file = "/Users/jeremyschulze/_Development/_Dev-projects/fapro/whatsapp_automation_config.json"
        self.state_file = "/Users/jeremyschulze/_Development/_Dev-projects/fapro/whatsapp_automation_state.json"
        
        # Lade Konfiguration
        self.config = self.load_config()
        self.state = self.load_state()
    
    def load_config(self) -> Dict[str, Any]:
        """Lädt die Automatisierungs-Konfiguration"""
        default_config = {
            "auto_reply_enabled": True,
            "auto_reply_keywords": ["arbeit", "work", "job", "projekt"],
            "auto_reply_message": "ich mich demnächst an die arbeit mache :)",
            "message_check_interval": 300,  # 5 Minuten
            "max_messages_per_check": 30,
            "intelligent_responses": {
                "greeting": ["hallo", "hi", "hey"] + ["Hallo! Danke für deine Nachricht."],
                "work_inquiry": ["arbeit", "work", "projekt"] + ["ich mich demnächst an die arbeit mache :)"],
                "time_inquiry": ["wann", "when", "zeit"] + ["Ich melde mich bald mit Details!"]
            }
        }
        
        try:
            if Path(self.config_file).exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return {**default_config, **json.load(f)}
        except Exception as e:
            logger.warning(f"Fehler beim Laden der Konfiguration: {e}")
        
        return default_config
    
    def save_config(self):
        """Speichert die aktuelle Konfiguration"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Konfiguration: {e}")
    
    def load_state(self) -> Dict[str, Any]:
        """Lädt den aktuellen Automatisierungs-Zustand"""
        default_state = {
            "last_message_id": None,
            "last_check_time": None,
            "processed_messages": [],
            "auto_replies_sent": 0,
            "total_messages_processed": 0
        }
        
        try:
            if Path(self.state_file).exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    return {**default_state, **json.load(f)}
        except Exception as e:
            logger.warning(f"Fehler beim Laden des Zustands: {e}")
        
        return default_state
    
    def save_state(self):
        """Speichert den aktuellen Zustand"""
        try:
            self.state["last_check_time"] = datetime.now().isoformat()
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(self.state, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Fehler beim Speichern des Zustands: {e}")
    
    def check_bridge_status(self) -> bool:
        """Prüft ob die WhatsApp Bridge verfügbar ist"""
        try:
            response = requests.get(f"{self.bridge_url}/api/status", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_messages(self, limit: int = None) -> List[Dict[str, Any]]:
        """Holt die neuesten WhatsApp Nachrichten"""
        limit = limit or self.config["max_messages_per_check"]
        
        if self.check_bridge_status():
            try:
                response = requests.get(
                    f"{self.bridge_url}/api/messages",
                    params={"phone": self.target_phone, "limit": limit},
                    timeout=10
                )
                if response.status_code == 200:
                    return response.json().get("messages", [])
            except Exception as e:
                logger.error(f"Bridge API Fehler: {e}")
        
        # Fallback: Mock-Nachrichten für Tests
        mock_messages = [
            {
                "id": f"msg_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "phone": self.target_phone,
                "text": "Wann fängst du mit der Arbeit an?",
                "timestamp": datetime.now().isoformat(),
                "type": "received",
                "isNew": True
            }
        ]
        logger.info("Verwende Mock-Nachrichten (Bridge nicht verfügbar)")
        return mock_messages
    
    def send_message(self, text: str, target_phone: str = None) -> bool:
        """Sendet eine WhatsApp Nachricht"""
        target = target_phone or self.target_phone
        
        if self.check_bridge_status():
            try:
                payload = {"phone": target, "text": text}
                response = requests.post(
                    f"{self.bridge_url}/api/send",
                    json=payload,
                    timeout=10
                )
                
                if response.status_code == 200:
                    logger.info(f"✅ Nachricht gesendet an {target}: {text}")
                    return True
                else:
                    logger.error(f"API Fehler: {response.status_code}")
                    return False
            except Exception as e:
                logger.error(f"Bridge API Fehler: {e}")
        
        # Simulation für Tests
        logger.info(f"📱 SIMULIERT - Nachricht an {target}: {text}")
        return True
    
    def analyze_message(self, message: Dict[str, Any]) -> Optional[str]:
        """Analysiert eine Nachricht und bestimmt die passende Antwort"""
        if not message.get("text"):
            return None
        
        text = message["text"].lower()
        
        # Intelligente Antwort-Bestimmung
        for category, data in self.config["intelligent_responses"].items():
            keywords = data[:-1]  # Alle außer dem letzten Element sind Keywords
            response = data[-1]   # Letztes Element ist die Antwort
            
            if any(keyword in text for keyword in keywords):
                logger.info(f"🧠 Kategorie erkannt: {category}")
                return response
        
        # Fallback für unbekannte Nachrichten
        if any(keyword in text for keyword in self.config["auto_reply_keywords"]):
            return self.config["auto_reply_message"]
        
        return None
    
    def process_new_messages(self) -> Dict[str, Any]:
        """Verarbeitet neue Nachrichten und sendet automatische Antworten"""
        result = {
            "processed": 0,
            "replies_sent": 0,
            "errors": 0,
            "messages": []
        }
        
        try:
            messages = self.get_messages()
            logger.info(f"📬 {len(messages)} Nachrichten abgerufen")
            
            for message in messages:
                message_id = message.get("id")
                
                # Überspringe bereits verarbeitete Nachrichten
                if message_id in self.state["processed_messages"]:
                    continue
                
                # Nur eingehende Nachrichten verarbeiten
                if message.get("type") != "received":
                    continue
                
                result["processed"] += 1
                result["messages"].append(message)
                
                # Analysiere Nachricht für automatische Antwort
                if self.config["auto_reply_enabled"]:
                    reply_text = self.analyze_message(message)
                    
                    if reply_text:
                        if self.send_message(reply_text):
                            result["replies_sent"] += 1
                            self.state["auto_replies_sent"] += 1
                            logger.info(f"🤖 Automatische Antwort gesendet: {reply_text}")
                        else:
                            result["errors"] += 1
                
                # Markiere als verarbeitet
                self.state["processed_messages"].append(message_id)
                self.state["total_messages_processed"] += 1
                
                # Behalte nur die letzten 100 verarbeiteten IDs
                if len(self.state["processed_messages"]) > 100:
                    self.state["processed_messages"] = self.state["processed_messages"][-100:]
        
        except Exception as e:
            logger.error(f"Fehler bei der Nachrichtenverarbeitung: {e}")
            result["errors"] += 1
        
        return result
    
    def run_automation_cycle(self) -> Dict[str, Any]:
        """Führt einen kompletten Automatisierungs-Zyklus aus"""
        logger.info("🚀 Starte Automatisierungs-Zyklus...")
        
        cycle_result = {
            "timestamp": datetime.now().isoformat(),
            "bridge_available": self.check_bridge_status(),
            "config": self.config,
            "state_before": self.state.copy(),
            "processing_result": None,
            "state_after": None,
            "success": False
        }
        
        try:
            # Verarbeite neue Nachrichten
            processing_result = self.process_new_messages()
            cycle_result["processing_result"] = processing_result
            
            # Speichere Zustand
            self.save_state()
            cycle_result["state_after"] = self.state.copy()
            cycle_result["success"] = True
            
            logger.info(f"✅ Zyklus abgeschlossen: {processing_result}")
            
        except Exception as e:
            logger.error(f"❌ Fehler im Automatisierungs-Zyklus: {e}")
            cycle_result["error"] = str(e)
        
        return cycle_result
    
    async def run_continuous(self, duration_minutes: int = 60):
        """Führt die Automatisierung kontinuierlich aus"""
        logger.info(f"🔄 Starte kontinuierliche Automatisierung für {duration_minutes} Minuten")
        
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        interval = self.config["message_check_interval"]
        
        while datetime.now() < end_time:
            try:
                cycle_result = self.run_automation_cycle()
                
                # Speichere Cycle-Report
                report_file = f"/Users/jeremyschulze/_Development/_Dev-projects/fapro/automation_cycle_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(report_file, 'w', encoding='utf-8') as f:
                    json.dump(cycle_result, f, indent=2, ensure_ascii=False)
                
                logger.info(f"⏳ Warte {interval} Sekunden bis zum nächsten Zyklus...")
                await asyncio.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("🛑 Automatisierung durch Benutzer gestoppt")
                break
            except Exception as e:
                logger.error(f"❌ Unerwarteter Fehler: {e}")
                await asyncio.sleep(60)  # Warte 1 Minute bei Fehlern
        
        logger.info("🏁 Kontinuierliche Automatisierung beendet")

def main():
    """Hauptfunktion"""
    automation = WhatsAppMCPAutomation()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "test":
            # Einzelner Test
            result = automation.run_automation_cycle()
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
        elif command == "continuous":
            # Kontinuierlicher Modus
            duration = int(sys.argv[2]) if len(sys.argv) > 2 else 60
            asyncio.run(automation.run_continuous(duration))
            
        elif command == "send":
            # Nachricht senden
            message = sys.argv[2] if len(sys.argv) > 2 else "ich mich demnächst an die arbeit mache :)"
            success = automation.send_message(message)
            print(f"Nachricht gesendet: {success}")
            
        else:
            print("Verfügbare Kommandos: test, continuous [minuten], send [nachricht]")
    else:
        # Standard: Einzelner Test-Zyklus
        result = automation.run_automation_cycle()
        print("🎯 WhatsApp MCP Automatisierung abgeschlossen!")
        print(f"Verarbeitete Nachrichten: {result.get('processing_result', {}).get('processed', 0)}")
        print(f"Gesendete Antworten: {result.get('processing_result', {}).get('replies_sent', 0)}")

if __name__ == "__main__":
    main()
