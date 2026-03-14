"""
Update database entries for Jindal Raigarh station to match JSON changes
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.environmental_data import EnvironmentalData
from models.monitoring_location import MonitoringLocation

def update_jindal_db():
    db: Session = SessionLocal()
    
    try:
        # Find the Jindal monitoring location
        jindal_location = db.query(MonitoringLocation).filter(
            MonitoringLocation.name.like("%Jindal%")
        ).first()
        
        if not jindal_location:
            print("❌ Jindal location not found in database")
            return
        
        print(f"Found Jindal location: ID {jindal_location.id}, Name: {jindal_location.name}")
        
        # Find environmental data entries with PM10 around 83.7 for this location
        entries = db.query(EnvironmentalData).filter(
            EnvironmentalData.location_id == jindal_location.id,
            EnvironmentalData.data_type == "air",
            EnvironmentalData.pm10.between(82, 85)
        ).all()
        
        print(f"Found {len(entries)} entries with PM10 between 82-85")
        
        updated = 0
        for entry in entries:
            old_pm10 = entry.pm10
            entry.pm10 = 104.2
            # Update notes to reflect violation
            entry.notes = f"[DEMO] PM10 violation: 104.2 µg/m³ exceeds NAAQS limit of 100 µg/m³ (was {old_pm10})"
            updated += 1
            print(f"  Updated entry {entry.id}: PM10 {old_pm10} -> 104.2")
        
        db.commit()
        print(f"\n✅ Database updated: {updated} entries modified")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_jindal_db()
