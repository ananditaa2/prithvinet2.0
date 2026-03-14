"""
Seed Demo Noise Stations for Heatmap
=====================================
This script creates 4 dummy noise pollution monitoring stations
near major industrial highways in Raipur and Bhilai with realistic
dB readings to fix the "0 Live Stations" demo trap.

Run: python seed_noise_stations.py
"""

import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal, engine, Base
from models.industry import Industry
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData


def seed_noise_stations():
    """Create 4 noise monitoring stations near industrial highways"""
    db: Session = SessionLocal()
    
    try:
        print("🔊 Seeding 4 noise pollution monitoring stations...")
        
        # 4 Stations near major industrial highways in Raipur and Bhilai
        noise_stations = [
            {
                "name": "NH-30 Raipur Industrial Corridor",
                "region": "Raipur",
                "latitude": 21.2514,
                "longitude": 81.6296,
                "location_type": "industrial",
                "industry_id": None,
                "decibel_level": 87.5,  # High - near heavy truck traffic
                "noise_location_type": "industrial",
                "description": "Major highway connecting Raipur industrial zone"
            },
            {
                "name": "Siltara Industrial Area Entry",
                "region": "Raipur",
                "latitude": 21.2800,
                "longitude": 81.6500,
                "location_type": "industrial", 
                "industry_id": None,
                "decibel_level": 92.3,  # Very high - industrial machinery + traffic
                "noise_location_type": "industrial",
                "description": "Entry point to Siltara Phase 1 & 2 industrial hub"
            },
            {
                "name": "Bhilai Steel Plant Highway Junction",
                "region": "Bhilai",
                "latitude": 21.2100,
                "longitude": 81.3800,
                "location_type": "industrial",
                "industry_id": None,
                "decibel_level": 88.7,  # High - steel plant trucks + highway
                "noise_location_type": "industrial",
                "description": "Junction near BSP main gate with heavy commercial traffic"
            },
            {
                "name": "Nandini Road Mining Transport Route",
                "region": "Bhilai",
                "latitude": 21.1500,
                "longitude": 81.3200,
                "location_type": "industrial",
                "industry_id": None,
                "decibel_level": 85.2,  # Elevated - mining trucks
                "noise_location_type": "industrial",
                "description": "Route used by iron ore transport vehicles from Nandini mines"
            }
        ]
        
        created_count = 0
        
        for station_data in noise_stations:
            # Check if station already exists
            existing = db.query(MonitoringLocation).filter_by(name=station_data["name"]).first()
            if existing:
                print(f"  Station '{station_data['name']}' already exists, skipping...")
                continue
            
            # Create monitoring location
            location = MonitoringLocation(
                name=station_data["name"],
                region=station_data["region"],
                latitude=station_data["latitude"],
                longitude=station_data["longitude"],
                location_type=station_data["location_type"],
                industry_id=station_data["industry_id"],
                assigned_team="Noise Monitoring Team A",
                is_active=1
            )
            db.add(location)
            db.flush()  # Get the ID
            
            # Create noise data readings (3 readings over last 6 hours to show activity)
            now = datetime.now(timezone.utc)
            readings = [
                {
                    "recorded_at": now - timedelta(hours=4),
                    "decibel": station_data["decibel_level"],
                    "notes": f"Peak traffic hours - {station_data['description']}"
                },
                {
                    "recorded_at": now - timedelta(hours=2),
                    "decibel": station_data["decibel_level"] - 3.5,  # Slightly lower
                    "notes": "Standard industrial activity"
                },
                {
                    "recorded_at": now,
                    "decibel": station_data["decibel_level"] - 1.2,
                    "notes": "Current reading - ongoing industrial operations"
                }
            ]
            
            for reading in readings:
                noise_data = EnvironmentalData(
                    data_type="noise",
                    location_id=location.id,
                    industry_id=None,
                    recorded_at=reading["recorded_at"],
                    source="noise_sensor_api",
                    notes=reading["notes"],
                    decibel_level=reading["decibel"],
                    noise_location_type=station_data["noise_location_type"]
                )
                db.add(noise_data)
            
            created_count += 1
            print(f"  ✓ Created '{station_data['name']}' - {station_data['decibel_level']} dB")
        
        db.commit()
        
        print(f"\n✅ Successfully created {created_count} noise monitoring stations:")
        print(f"   • NH-30 Raipur Industrial Corridor: 87.5 dB (Limit: 75 dB)")
        print(f"   • Siltara Industrial Area Entry: 92.3 dB (Limit: 75 dB) - VIOLATION")
        print(f"   • Bhilai Steel Plant Highway Junction: 88.7 dB (Limit: 75 dB)")
        print(f"   • Nandini Road Mining Transport Route: 85.2 dB (Limit: 75 dB)")
        print(f"\n🎯 Frontend should now show '4 live stations' for Noise Pollution layer")
        
    except Exception as e:
        print(f"❌ Error seeding noise stations: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_noise_stations()
