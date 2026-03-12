import asyncio
from datetime import datetime, timedelta
import random
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal, engine, Base
from models.user import User
from models.industry import Industry
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData
from models.alert import Alert, Notification
from core.security import hash_password
from services.alert_service import check_and_trigger_alerts

# Create tables if not exist
Base.metadata.create_all(bind=engine)

def seed_database():
    db: Session = SessionLocal()
    try:
        # 1. Users
        if not db.query(User).filter_by(email="admin@prithvinet.gov.in").first():
            print("Creating demo users...")
            users = [
                User(name="Super Admin", email="admin@prithvinet.gov.in", password_hash=hash_password("Demo@123"), role="admin"),
                User(name="Raipur RO", email="ro.raipur@prithvinet.gov.in", password_hash=hash_password("Demo@123"), role="regional_officer"),
                User(name="Bhilai Steel Contact", email="compliance@bhilaisteel.com", password_hash=hash_password("Demo@123"), role="industry_user"),
                User(name="Korba Power Contact", email="env@korbapower.com", password_hash=hash_password("Demo@123"), role="industry_user"),
                User(name="Citizen Rajiv", email="rajiv@example.com", password_hash=hash_password("Demo@123"), role="citizen")
            ]
            db.add_all(users)
            db.commit()

        # 2. Industries
        if db.query(Industry).count() == 0:
            print("Creating demo industries...")
            industries = [
                Industry(name="Bhilai Steel Plant", industry_type="Steel Manufacturing", address="Bhilai Industrial Estate", region="Bhilai",
                         latitude=21.1938, longitude=81.3509, contact_email="compliance@bhilaisteel.com", registration_number="IND-BSP-001", status="active"),
                Industry(name="Korba Super Thermal Power", industry_type="Power Plant", address="Jamnipali", region="Korba",
                         latitude=22.3595, longitude=82.6800, contact_email="env@korbapower.com", registration_number="IND-KOR-002", status="active"),
                Industry(name="Raipur Sponge Iron", industry_type="Sponge Iron", address="Siltara Industrial Area", region="Raipur",
                         latitude=21.2514, longitude=81.6296, contact_email="admin@raipursponge.com", registration_number="IND-RPR-003", status="compliant"),
                Industry(name="Ambuja Cement Plant", industry_type="Cement", address="Bhatapara", region="Bhatapara",
                         latitude=21.7347, longitude=81.9366, contact_email="env@ambuja.com", registration_number="IND-BHT-004", status="active"),
                Industry(name="Balco Aluminum", industry_type="Aluminum Smelter", address="Balco Nagar", region="Korba",
                         latitude=22.3995, longitude=82.7200, contact_email="compliance@balco.com", registration_number="IND-BLC-005", status="violating")
            ]
            db.add_all(industries)
            db.commit()

        # Retrieve IDs
        ind_bhilai = db.query(Industry).filter_by(name="Bhilai Steel Plant").first().id
        ind_korba = db.query(Industry).filter_by(name="Korba Super Thermal Power").first().id
        ind_raipur = db.query(Industry).filter_by(name="Raipur Sponge Iron").first().id
        ind_ambuja = db.query(Industry).filter_by(name="Ambuja Cement Plant").first().id
        ind_balco = db.query(Industry).filter_by(name="Balco Aluminum").first().id

        # 3. Monitoring Locations
        if db.query(MonitoringLocation).count() == 0:
            print("Creating monitoring locations...")
            locs = [
                MonitoringLocation(name="BSP Main Stack 1", region="Bhilai", latitude=21.1940, longitude=81.3510, location_type="air", industry_id=ind_bhilai),
                MonitoringLocation(name="Shivnath River Discharge", region="Bhilai", latitude=21.1800, longitude=81.3400, location_type="water", industry_id=ind_bhilai),
                MonitoringLocation(name="Korba Chimney A", region="Korba", latitude=22.3600, longitude=82.6810, location_type="air", industry_id=ind_korba),
                MonitoringLocation(name="Korba Ash Pond", region="Korba", latitude=22.3700, longitude=82.6900, location_type="water", industry_id=ind_korba),
                MonitoringLocation(name="Siltara Phase 1 Ambient", region="Raipur", latitude=21.2520, longitude=81.6300, location_type="air", industry_id=ind_raipur),
                MonitoringLocation(name="Bhatapara Plant Gate", region="Bhatapara", latitude=21.7350, longitude=81.9370, location_type="air", industry_id=ind_ambuja),
                MonitoringLocation(name="Balco Smelter Extractor", region="Korba", latitude=22.4000, longitude=82.7210, location_type="air", industry_id=ind_balco),
                MonitoringLocation(name="Hasdeo River Upstream", region="Korba", latitude=22.3800, longitude=82.6700, location_type="water", industry_id=None), # Free floating
            ]
            db.add_all(locs)
            db.commit()

        # 4. Ingest Real CECB JSON Data
        if db.query(EnvironmentalData).count() == 0:
            print("Ingesting real CECB JSON data...")
            json_files = [
                "emission_logs_AQI_bilaspur.json",
                "emission_logs_bhiali_aqi.json",
                "emission_logs_korba.json",
                "emission_logs_raigarh.json",
                "emission_logs_raipur.json"
            ]
            
            repo_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_repo")
            
            for file_name in json_files:
                file_path = os.path.join(repo_dir, file_name)
                if not os.path.exists(file_path):
                    print(f"Skipping {file_name} (not found)")
                    continue
                    
                import json
                with open(file_path, "r") as f:
                    try:
                        records = json.load(f)
                    except Exception as e:
                        print(f"Failed to load {file_name}: {e}")
                        continue
                
                print(f"Loading {len(records)} records from {file_name}...")
                
                # To speed up, we don't commit every record, we batch them
                count = 0
                for item in records:
                    if count >= 1000: # Limit per file for hackathon demo speed if needed, but lets try to load all
                        break
                        
                    station_name = item.get("station_name")
                    if not station_name: continue
                    
                    # Find or create location
                    loc = db.query(MonitoringLocation).filter_by(name=station_name).first()
                    if not loc:
                        loc = MonitoringLocation(
                            name=station_name,
                            region=item.get("region", "Unknown"),
                            latitude=item.get("lat"),
                            longitude=item.get("lng"),
                            location_type="air"
                        )
                        db.add(loc)
                        db.flush()
                    
                    # Parse timestamp (e.g., "2025-07-01T00:00:00")
                    try:
                        record_time = datetime.fromisoformat(item["timestamp"])
                    except:
                        record_time = datetime.utcnow()
                        
                    pollutants = item.get("pollutants", {})
                    
                    data = EnvironmentalData(
                        data_type="air",
                        location_id=loc.id,
                        industry_id=None, # Not explicitly mapped in this JSON usually
                        recorded_at=record_time,
                        source="api",
                        notes=f"CECB Real Data '{item.get('AQI_category', '')}'",
                        pm25=pollutants.get("PM2.5"),
                        pm10=pollutants.get("PM10"),
                        no2=pollutants.get("NO2"),
                        so2=pollutants.get("SO2"),
                        aqi=item.get("AQI")
                    )
                    db.add(data)
                    db.flush()
                    count += 1
                    
                    # Trigger alerts only for recent data (e.g., assuming July 2025 is "recent" in context)
                    # For hackathon, let's just trigger alerts if AQI_category is POOR, VERY POOR, or SEVERE
                    category = item.get("AQI_category", "").upper()
                    if category in ["POOR", "VERY POOR", "SEVERE"]:
                        check_and_trigger_alerts(db, data)
                
                db.commit()

            print("Real CECB data ingestion complete.")

            # Make some older alerts resolved to show history
            alerts = db.query(Alert).filter(Alert.status == "active").all()
            for i, a in enumerate(alerts):
                if i % 2 == 0: # Resolve half of them randomly
                    a.status = "resolved"
                    a.resolved_at = a.created_at + timedelta(days=1)
                    a.resolved_by_id = 1
                    a.resolution_notes = "Automatically resolved via pipeline"
            db.commit()

        print("✅ Database seeding complete.")
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
