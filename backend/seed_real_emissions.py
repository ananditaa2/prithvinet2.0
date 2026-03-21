"""
seed_real_emissions.py
======================
Seeds real CECB emission data from all JSON files into the production database.
Place this file in your backend/ folder and it will be called from startup.

Run standalone: python seed_real_emissions.py
"""

import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData
from models.industry import Industry


# All emission JSON files relative to backend/ folder
EMISSION_FILES = [
    ("../emission_logs_AQI_bilaspur.json", "Bilaspur"),
    ("../emission_logs_bhiali_aqi.json", "Bhilai"),
    ("../emission_logs_korba.json", "Korba"),
    ("../emission_logs_raigarh.json", "Raigarh"),
    ("../emission_logs_raipur.json", "Raipur"),
]

# Industry data from all JSON files
INDUSTRIES_DATA = [
    {"name": "Bhilai Steel Plant", "industry_type": "Steel", "latitude": 21.208, "longitude": 81.376, "city": "Bhilai", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-BSP-001"},
    {"name": "CSIDC Industrial Growth Center", "industry_type": "Mixed Industrial", "latitude": 21.2514, "longitude": 81.28, "city": "Bhilai", "state": "Chhattisgarh", "compliance_status": "compliant", "registration_number": "IND-CGC-002"},
    {"name": "Durg Thermal Plant", "industry_type": "Power", "latitude": 21.19, "longitude": 81.29, "city": "Durg", "state": "Chhattisgarh", "compliance_status": "warning", "registration_number": "IND-DTP-003"},
    {"name": "SECL Gevra Coal Mine", "industry_type": "Mining", "latitude": 22.2167, "longitude": 82.3833, "city": "Bilaspur", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-SGM-004"},
    {"name": "Bilaspur Thermal Power Station", "industry_type": "Power", "latitude": 22.12, "longitude": 82.18, "city": "Bilaspur", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-BTP-005"},
    {"name": "CECB Industrial Area Bilaspur", "industry_type": "Mixed Industrial", "latitude": 22.09, "longitude": 82.15, "city": "Bilaspur", "state": "Chhattisgarh", "compliance_status": "compliant", "registration_number": "IND-CAB-006"},
    {"name": "NTPC Korba Super Thermal Power Station", "industry_type": "Thermal Power", "latitude": 22.3456, "longitude": 82.7123, "city": "Korba", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-NKS-007"},
    {"name": "CSEB Korba West Power House", "industry_type": "Thermal Power", "latitude": 22.36, "longitude": 82.705, "city": "Korba", "state": "Chhattisgarh", "compliance_status": "warning", "registration_number": "IND-CKW-008"},
    {"name": "BALCO Aluminium Smelter Korba", "industry_type": "Aluminium", "latitude": 22.38, "longitude": 82.74, "city": "Korba", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-BAS-009"},
    {"name": "SECL Gevra Open Cast Coal Mine", "industry_type": "Coal Mining", "latitude": 22.42, "longitude": 82.65, "city": "Korba", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-SGO-010"},
    {"name": "Lanco Amarkantak Thermal Power Plant", "industry_type": "Thermal Power", "latitude": 22.33, "longitude": 82.68, "city": "Korba", "state": "Chhattisgarh", "compliance_status": "warning", "registration_number": "IND-LAT-011"},
    {"name": "Jindal Steel & Power Ltd Raigarh", "industry_type": "Steel & Power", "latitude": 21.92, "longitude": 83.41, "city": "Raigarh", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-JSP-012"},
    {"name": "Jindal Industrial Park Punjipathra", "industry_type": "Industrial Park", "latitude": 21.93, "longitude": 83.42, "city": "Raigarh", "state": "Chhattisgarh", "compliance_status": "warning", "registration_number": "IND-JIP-013"},
    {"name": "GVK Power Plant Raigarh", "industry_type": "Thermal Power", "latitude": 21.87, "longitude": 83.37, "city": "Raigarh", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-GVK-014"},
    {"name": "Wool Worth Industries Sarora Raipur", "industry_type": "Industrial", "latitude": 21.32, "longitude": 81.75, "city": "Raipur", "state": "Chhattisgarh", "compliance_status": "violation", "registration_number": "IND-WWI-015"},
    {"name": "Rawanbhata Water Treatment Industrial Zone", "industry_type": "Mixed Industrial", "latitude": 21.28, "longitude": 81.68, "city": "Raipur", "state": "Chhattisgarh", "compliance_status": "compliant", "registration_number": "IND-RWT-016"},
    {"name": "Urla Industrial Area Raipur", "industry_type": "Mixed Industrial", "latitude": 21.31, "longitude": 81.72, "city": "Raipur", "state": "Chhattisgarh", "compliance_status": "warning", "registration_number": "IND-UAR-017"},
    {"name": "Ambuja Cement Plant Bhatapara", "industry_type": "Cement", "latitude": 21.7347, "longitude": 81.9366, "city": "Bhatapara", "state": "Chhattisgarh", "compliance_status": "compliant", "registration_number": "IND-ACP-018"},
]


def seed_real_emissions():
    db: Session = SessionLocal()
    try:
        print("🏭 Seeding industries from real data...")
        ind_count = 0
        for ind_data in INDUSTRIES_DATA:
            existing = db.query(Industry).filter_by(
                registration_number=ind_data["registration_number"]
            ).first()
            if not existing:
                industry = Industry(
                    name=ind_data["name"],
                    industry_type=ind_data["industry_type"],
                    address=f"{ind_data['city']}, {ind_data['state']}",
                    region=ind_data["city"],
                    latitude=ind_data["latitude"],
                    longitude=ind_data["longitude"],
                    contact_email=f"contact@{ind_data['name'].lower().replace(' ', '')[:10]}.com",
                    registration_number=ind_data["registration_number"],
                    status=ind_data["compliance_status"],
                )
                db.add(industry)
                ind_count += 1
        db.commit()
        print(f"  ✅ {ind_count} new industries added")

        print("\n📊 Seeding real emission data from JSON files...")

        base_dir = os.path.dirname(os.path.abspath(__file__))
        total_inserted = 0

        for file_rel_path, region in EMISSION_FILES:
            # Try multiple possible paths
            possible_paths = [
                os.path.join(base_dir, file_rel_path),
                os.path.join(base_dir, os.path.basename(file_rel_path)),
                os.path.join(base_dir, "..", os.path.basename(file_rel_path)),
            ]

            file_path = None
            for p in possible_paths:
                if os.path.exists(p):
                    file_path = p
                    break

            if not file_path:
                print(f"  ⚠️  File not found: {os.path.basename(file_rel_path)} — skipping")
                continue

            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    records = json.load(f)
                except Exception as e:
                    print(f"  ❌ Failed to parse {os.path.basename(file_rel_path)}: {e}")
                    continue

            print(f"  📂 Loading {len(records)} records from {os.path.basename(file_rel_path)}...")

            batch_count = 0
            for item in records:
                station_name = item.get("station_name")
                if not station_name:
                    continue

                # Find or create monitoring location
                loc = db.query(MonitoringLocation).filter_by(name=station_name).first()
                if not loc:
                    loc = MonitoringLocation(
                        name=station_name,
                        region=item.get("region", region),
                        latitude=item.get("lat"),
                        longitude=item.get("lng"),
                        location_type="air",
                        industry_id=None,
                    )
                    db.add(loc)
                    db.flush()

                # Parse timestamp
                try:
                    record_time = datetime.fromisoformat(item["timestamp"])
                except Exception:
                    record_time = datetime.utcnow()

                pollutants = item.get("pollutants", {})

                # Skip if already exists (avoid duplicates on re-seed)
                existing_data = db.query(EnvironmentalData).filter_by(
                    location_id=loc.id,
                    recorded_at=record_time,
                    data_type="air"
                ).first()
                if existing_data:
                    continue

                data = EnvironmentalData(
                    data_type="air",
                    location_id=loc.id,
                    industry_id=None,
                    recorded_at=record_time,
                    source="CECB_NAMP",
                    notes=f"{item.get('AQI_category', '')} | {item.get('compliance_status', '')}",
                    pm25=pollutants.get("PM2.5"),
                    pm10=pollutants.get("PM10"),
                    no2=pollutants.get("NO2"),
                    so2=pollutants.get("SO2"),
                    aqi=item.get("AQI"),
                )
                db.add(data)
                batch_count += 1

                # Commit in batches of 500 to avoid memory issues
                if batch_count % 500 == 0:
                    db.commit()
                    print(f"    ... {batch_count} records committed")

            db.commit()
            total_inserted += batch_count
            print(f"  ✅ {batch_count} records inserted from {os.path.basename(file_rel_path)}")

        print(f"\n🎉 Real emission seed complete! Total: {total_inserted} air readings inserted")

    except Exception as e:
        print(f"❌ Real emission seed failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_real_emissions()
