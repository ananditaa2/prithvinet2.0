import sys
import os
from datetime import datetime, timezone, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal, engine, Base
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData

def seed_water_stations():
    db: Session = SessionLocal()
    try:
        print("💧 Seeding 6 strategic Water Quality Monitoring Stations...")
        
        water_locations = [
            {
                "name": "Kharun River Intake Well",
                "region": "Raipur",
                "latitude": 21.196,
                "longitude": 81.583,
                "desc": "Primary water source for Raipur city",
                "base_do": 6.8, "base_bod": 2.2, "status": "SATISFACTORY"
            },
            {
                "name": "Shivnath River Downstream",
                "region": "Bhilai",
                "latitude": 21.215,
                "longitude": 81.320,
                "desc": "Downstream of major industrial discharges",
                "base_do": 4.1, "base_bod": 8.5, "status": "NOT SATISFACTORY"
            },
            {
                "name": "Arpa River Basin",
                "region": "Bilaspur",
                "latitude": 22.090,
                "longitude": 82.140,
                "desc": "City center river monitoring point",
                "base_do": 5.5, "base_bod": 4.0, "status": "SATISFACTORY"
            },
            {
                "name": "Hasdeo Barrage Discharge",
                "region": "Korba",
                "latitude": 22.385,
                "longitude": 82.695,
                "desc": "Thermal power plant cooling water intake area",
                "base_do": 3.8, "base_bod": 12.0, "status": "NOT SATISFACTORY"  # Violation!
            },
            {
                "name": "Kelo River Bank",
                "region": "Raigarh",
                "latitude": 21.890,
                "longitude": 83.390,
                "desc": "Industrial corridor surface water",
                "base_do": 6.2, "base_bod": 3.5, "status": "SATISFACTORY"
            },
            {
                "name": "Dalpat Sagar Lake",
                "region": "Jagdalpur",
                "latitude": 19.088,
                "longitude": 82.016,
                "desc": "Major urban lake monitoring",
                "base_do": 6.9, "base_bod": 2.0, "status": "SATISFACTORY"
            }
        ]
        
        created_count = 0
        now = datetime.now(timezone.utc)
        
        for loc_data in water_locations:
            location = db.query(MonitoringLocation).filter_by(name=loc_data["name"]).first()
            if not location:
                location = MonitoringLocation(
                    name=loc_data["name"],
                    region=loc_data["region"],
                    latitude=loc_data["latitude"],
                    longitude=loc_data["longitude"],
                    location_type="water",
                    assigned_team="State Water Quality Board",
                    is_active=1
                )
                db.add(location)
                db.flush()
            
            # Generate 14 days of historical data + 1 live reading
            for day_offset in range(14, -1, -1):
                read_time = now - timedelta(days=day_offset, hours=random.randint(0,5))
                
                # Add slight noise to the base metrics
                current_do = max(0.0, loc_data["base_do"] + random.uniform(-0.8, 0.8))
                current_bod = max(0.0, loc_data["base_bod"] + random.uniform(-1.5, 1.5))
                
                # Determine status
                is_violation = current_do < 4.0 or current_bod > 5.0
                status_text = "NOT SATISFACTORY - CONTAMINATED" if is_violation else "SATISFACTORY - COMPLIANT"
                
                data = EnvironmentalData(
                    data_type="water",
                    location_id=location.id,
                    recorded_at=read_time,
                    source="NWMP_Sensor",
                    notes=f"Auto-sampled | {status_text} | {loc_data['desc']}",
                    dissolved_oxygen=round(current_do, 2),
                    bod=round(current_bod, 2),
                    ph=round(random.uniform(6.5, 8.2), 2)
                )
                db.add(data)
                
            created_count += 1
            print(f"  ✓ Processed station: '{loc_data['name']}' with 15 historical readings.")
            
        db.commit()
        print(f"\n✅ Successfully seeded {created_count} comprehensive water stations!")
        print("🎯 Heatmap 'Water Quality' layer will now populate with active analytics.")

    except Exception as e:
        print(f"❌ Error seeding water stations: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_water_stations()
