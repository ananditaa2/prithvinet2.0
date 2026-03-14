"""
Demo Anomaly Trigger Script for PrithviNet "Wow Moment"

Usage:
    python backend/demo_trigger.py spike          # Trigger immediate AQI spike at Korba
    python backend/demo_trigger.py water          # Trigger water quality anomaly
    python backend/demo_trigger.py noise          # Trigger noise level spike
    python backend/demo_trigger.py random         # Random anomaly every 5-15 seconds
    python backend/demo_trigger.py reset          # Clear all demo anomalies

This script is designed for live demos to judges - it creates realistic
anomaly scenarios that appear instantly on the WebSocket dashboard.
"""

import asyncio
import json
import os
import sys
import random
import time
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData
from services.alert_service import check_and_trigger_alerts
from core.websocket import manager as ws_manager

API_BASE = "http://localhost:8000"

# Demo stations - Korba Thermal is the "hero" station for the demo
DEMO_STATIONS = {
    "korba_thermal": {
        "name": "Korba Super Thermal Power Station",
        "region": "Korba",
        "lat": 22.3603,
        "lng": 82.7500,
        "base_aqi": 180,
        "spike_aqi": 320,  # Hazardous level
    },
    "bhilai_steel": {
        "name": "Bhilai Steel Plant",
        "region": "Bhilai",
        "lat": 21.2160,
        "lng": 81.4310,
        "base_aqi": 140,
        "spike_aqi": 280,
    },
    "raigarh_jindal": {
        "name": "Jindal Industrial Park",
        "region": "Raigarh",
        "lat": 21.9000,
        "lng": 83.4000,
        "base_aqi": 150,
        "spike_aqi": 290,
    },
}


def ensure_stations_exist(db: Session):
    """Ensure demo monitoring locations exist in DB."""
    locations = {}
    for key, data in DEMO_STATIONS.items():
        loc = db.query(MonitoringLocation).filter_by(name=data["name"]).first()
        if not loc:
            loc = MonitoringLocation(
                name=data["name"],
                region=data["region"],
                latitude=data["lat"],
                longitude=data["lng"],
                location_type="air",
            )
            db.add(loc)
            db.commit()
            db.refresh(loc)
            print(f"✅ Created monitoring location: {data['name']} (ID: {loc.id})")
        else:
            print(f"ℹ️ Location exists: {data['name']} (ID: {loc.id})")
        locations[key] = loc.id
    return locations


async def trigger_air_spike(db: Session, location_id: int, station_key: str = "korba_thermal"):
    """Trigger an air quality anomaly spike."""
    station = DEMO_STATIONS[station_key]
    
    # Create spike reading
    spike_aqi = station["spike_aqi"] + random.randint(-20, 30)
    pm25 = 120 + random.randint(-10, 40)  # Very high PM2.5
    pm10 = 200 + random.randint(-20, 60)  # Very high PM10
    
    data = EnvironmentalData(
        data_type="air",
        location_id=location_id,
        recorded_at=datetime.now(timezone.utc),
        source="DEMO_SPIKE",
        notes="LIVE DEMO: Simulated hazardous AQI spike for judging panel",
        aqi=spike_aqi,
        pm25=pm25,
        pm10=pm10,
        no2=random.uniform(80, 150),
        so2=random.uniform(60, 120),
    )
    
    db.add(data)
    db.flush()
    
    # Trigger alerts
    alerts = check_and_trigger_alerts(db, data)
    db.commit()
    
    # Broadcast via WebSocket
    event = {
        "type": "ANOMALY_ALERT",
        "severity": "CRITICAL" if spike_aqi > 300 else "HIGH",
        "message": f"🚨 HAZARDOUS AIR QUALITY at {station['name']}: AQI {spike_aqi}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": {
            "id": location_id,
            "name": station["name"],
            "region": station["region"],
            "lat": station["lat"],
            "lng": station["lng"],
        },
        "data": {
            "aqi": spike_aqi,
            "pm25": pm25,
            "pm10": pm10,
            "status": "HAZARDOUS" if spike_aqi > 300 else "UNHEALTHY",
        },
        "escalation_timer": 300,  # 5 minutes to respond
        "demo_mode": True,
    }
    
    await ws_manager.broadcast(event)
    
    # Debug: Print connection status
    print(f"   📡 WebSocket connections: {len(ws_manager.active_connections)}")
    if len(ws_manager.active_connections) == 0:
        print("   ⚠️  WARNING: No active WebSocket clients connected!")
        print("   💡 Make sure dashboard is open and connected to /ws/dashboard")
    
    print(f"🔴 SPIKE INJECTED: {station['name']}")
    print(f"   AQI: {spike_aqi} (HAZARDOUS)")
    print(f"   PM2.5: {pm25:.1f} μg/m³ | PM10: {pm10:.1f} μg/m³")
    print(f"   Alerts triggered: {len(alerts)}")
    print(f"   WebSocket broadcast sent to {len(ws_manager.active_connections)} clients")
    
    return event


async def trigger_water_anomaly(db: Session, location_id: int = None):
    """Trigger a water quality anomaly."""
    if location_id is None:
        # Use Korba station or create water location
        db_loc = db.query(MonitoringLocation).filter_by(region="Korba", location_type="water").first()
        if not db_loc:
            db_loc = MonitoringLocation(
                name="Korba River Monitoring Point",
                region="Korba",
                latitude=22.3500,
                longitude=82.7400,
                location_type="water",
            )
            db.add(db_loc)
            db.commit()
            db.refresh(db_loc)
        location_id = db_loc.id
    
    # Dangerous water readings
    ph = random.uniform(4.5, 5.5)  # Acidic
    bod = random.uniform(15, 25)   # High BOD
    do = random.uniform(1, 3)     # Low dissolved oxygen
    
    data = EnvironmentalData(
        data_type="water",
        location_id=location_id,
        recorded_at=datetime.now(timezone.utc),
        source="DEMO_ANOMALY",
        notes="LIVE DEMO: Water quality violation - acidic pH detected",
        ph=ph,
        bod=bod,
        dissolved_oxygen=do,
    )
    
    db.add(data)
    db.flush()
    alerts = check_and_trigger_alerts(db, data)
    db.commit()
    
    event = {
        "type": "ANOMALY_ALERT",
        "severity": "HIGH",
        "message": f"⚠️ WATER QUALITY ALERT: Acidic pH {ph:.1f} detected in Korba",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": {
            "id": location_id,
            "name": "Korba River Monitoring Point",
            "region": "Korba",
        },
        "data": {
            "ph": ph,
            "bod": bod,
            "dissolved_oxygen": do,
            "status": "CRITICAL",
        },
        "escalation_timer": 600,  # 10 minutes for water
        "demo_mode": True,
    }
    
    await ws_manager.broadcast(event)
    
    print(f"🔵 WATER ANOMALY: Korba River")
    print(f"   pH: {ph:.1f} (CRITICAL - ACIDIC)")
    print(f"   BOD: {bod:.1f} mg/L | DO: {do:.1f} mg/L")
    print(f"   Alerts triggered: {len(alerts)}")
    
    return event


async def trigger_noise_spike(db: Session, location_id: int = None):
    """Trigger a noise level spike."""
    if location_id is None:
        db_loc = db.query(MonitoringLocation).filter_by(region="Korba", location_type="noise").first()
        if not db_loc:
            db_loc = MonitoringLocation(
                name="Korba Industrial Noise Monitor",
                region="Korba",
                latitude=22.3650,
                longitude=82.7600,
                location_type="noise",
            )
            db.add(db_loc)
            db.commit()
            db.refresh(db_loc)
        location_id = db_loc.id
    
    decibel = random.uniform(95, 115)  # Extremely loud
    
    data = EnvironmentalData(
        data_type="noise",
        location_id=location_id,
        recorded_at=datetime.now(timezone.utc),
        source="DEMO_SPIKE",
        notes="LIVE DEMO: Excessive industrial noise detected",
        decibel_level=decibel,
        noise_location_type="industrial",
    )
    
    db.add(data)
    db.flush()
    alerts = check_and_trigger_alerts(db, data)
    db.commit()
    
    event = {
        "type": "ANOMALY_ALERT",
        "severity": "HIGH",
        "message": f"📢 NOISE ALERT: {decibel:.0f} dB detected in Korba Industrial Zone",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": {
            "id": location_id,
            "name": "Korba Industrial Noise Monitor",
            "region": "Korba",
        },
        "data": {
            "decibel_level": decibel,
            "zone_type": "industrial",
            "status": "VIOLATION",
        },
        "escalation_timer": 180,  # 3 minutes for noise
        "demo_mode": True,
    }
    
    await ws_manager.broadcast(event)
    
    print(f"🟣 NOISE SPIKE: Korba Industrial Zone")
    print(f"   Level: {decibel:.0f} dB (LIMIT: 75 dB)")
    print(f"   Exceeds limit by: {decibel - 75:.0f} dB")
    
    return event


async def random_anomaly_loop():
    """Continuously inject random anomalies for demo."""
    db = SessionLocal()
    try:
        locations = ensure_stations_exist(db)
        
        print("\n🎲 RANDOM ANOMALY MODE ACTIVATED")
        print("   Injecting random spikes every 5-15 seconds...")
        print("   Press Ctrl+C to stop\n")
        
        anomaly_types = [
            lambda: trigger_air_spike(db, locations["korba_thermal"], "korba_thermal"),
            lambda: trigger_air_spike(db, locations["bhilai_steel"], "bhilai_steel"),
            lambda: trigger_water_anomaly(db),
            lambda: trigger_noise_spike(db),
        ]
        
        while True:
            await asyncio.sleep(random.uniform(5, 15))
            anomaly_func = random.choice(anomaly_types)
            await anomaly_func()
            print("-" * 50)
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Random anomaly mode stopped")
    finally:
        db.close()


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    db = SessionLocal()
    
    try:
        if command == "spike":
            locations = ensure_stations_exist(db)
            print("\n🔴 TRIGGERING AIR QUALITY SPIKE")
            print("=" * 50)
            await trigger_air_spike(db, locations["korba_thermal"], "korba_thermal")
            
        elif command == "water":
            print("\n🔵 TRIGGERING WATER ANOMALY")
            print("=" * 50)
            await trigger_water_anomaly(db)
            
        elif command == "noise":
            print("\n🟣 TRIGGERING NOISE SPIKE")
            print("=" * 50)
            await trigger_noise_spike(db)
            
        elif command == "random":
            await random_anomaly_loop()
            
        elif command == "reset":
            print("\n🧹 RESETTING DEMO STATE")
            print("=" * 50)
            # Mark demo records as resolved
            db.query(EnvironmentalData).filter(
                EnvironmentalData.source.in_(["DEMO_SPIKE", "DEMO_ANOMALY"])
            ).update({"notes": "DEMO_RESET"})
            db.commit()
            print("✅ Demo anomalies marked as resolved")
            
            # Broadcast reset
            await ws_manager.broadcast({
                "type": "DEMO_RESET",
                "message": "Demo anomalies cleared",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
        else:
            print(f"❌ Unknown command: {command}")
            print(__doc__)
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
