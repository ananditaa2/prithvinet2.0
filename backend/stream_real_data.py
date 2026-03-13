import asyncio
import json
import os
import sys
from datetime import datetime, timezone
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData
from services.alert_service import check_and_trigger_alerts

# Load the real JSON files
REPO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_repo")
JSON_FILES = [
    "emission_logs_AQI_bilaspur.json",
    "emission_logs_bhiali_aqi.json",
    "emission_logs_korba.json",
    "emission_logs_raigarh.json",
    "emission_logs_raipur.json"
]

def load_all_records():
    all_records = []
    for file_name in JSON_FILES:
        path = os.path.join(REPO_DIR, file_name)
        if os.path.exists(path):
            with open(path, "r") as f:
                try:
                    records = json.load(f)
                    # We want to keep track of which file it came from for region logic
                    for r in records:
                        r["_source_file"] = file_name
                    all_records.extend(records)
                except Exception as e:
                    print(f"Error loading {file_name}: {e}")
    # Shuffle to make the live feed look random and dynamic across all cities
    random.shuffle(all_records)
    return all_records

async def start_streaming():
    print("⏳ Starting Real-Time Data Stream from 2025 JSON files...")
    records = load_all_records()
    if not records:
        print("❌ No JSON data found in temp_repo!")
        return

    print(f"✅ Loaded {len(records)} real historical records. Streaming them live...")

    # Dictionary to cache location lookups
    location_cache = {}

    db: Session = SessionLocal()
    try:
        for idx, item in enumerate(records):
            station_name = item.get("station_name")
            if not station_name:
                continue

            # Ensure location exists
            if station_name not in location_cache:
                loc = db.query(MonitoringLocation).filter_by(name=station_name).first()
                if not loc:
                    # Create it if it doesn't exist just in case
                    loc = MonitoringLocation(
                        name=station_name,
                        region=item.get("region", "Unknown"),
                        latitude=item.get("lat"),
                        longitude=item.get("lng"),
                        location_type="air"
                    )
                    db.add(loc)
                    db.commit()
                location_cache[station_name] = loc.id

            loc_id = location_cache[station_name]
            pollutants = item.get("pollutants", {})

            # For real-time effect, we set recorded_at to NOW, so the dashboard charts move
            record_time = datetime.now(timezone.utc)

            # Insert new reading
            data = EnvironmentalData(
                data_type="air",
                location_id=loc_id,
                industry_id=None,
                recorded_at=record_time,
                source="live_json_stream",
                notes=f"CECB Live Stream '{item.get('AQI_category', '')}'",
                pm25=pollutants.get("PM2.5"),
                pm10=pollutants.get("PM10"),
                no2=pollutants.get("NO2"),
                so2=pollutants.get("SO2"),
                aqi=item.get("AQI")
            )
            db.add(data)
            db.flush()

            # Trigger alerts
            alerts = check_and_trigger_alerts(db, data)
            db.commit()

            status_msg = f"[{idx}/{len(records)}] Pushed reading for {station_name} | AQI: {item.get('AQI')}"
            if alerts:
                status_msg += f" 🚨 Triggered {len(alerts)} alerts!"
            
            print(status_msg)

            # Wait 2.5 seconds between each reading so the UI updates gradually
            await asyncio.sleep(2.5)

    except Exception as e:
        print(f"❌ Stream error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    try:
        asyncio.run(start_streaming())
    except KeyboardInterrupt:
        print("\n⏹️ Stream stopped by user.")
