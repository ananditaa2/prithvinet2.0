import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import Base, SessionLocal, engine
from core.security import hash_password
from models.alert import Alert
from models.environmental_data import EnvironmentalData
from models.industry import Industry
from models.monitoring_location import MonitoringLocation
from models.user import User
from services.json_ingestion import (
    import_air_json_data,
    import_noise_json_data,
    import_water_json_data,
)
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)


def seed_database():
    db: Session = SessionLocal()
    try:
        if not db.query(User).filter_by(email="admin@prithvinet.gov.in").first():
            print("Creating demo users...")
            users = [
                User(
                    name="Super Admin",
                    email="admin@prithvinet.gov.in",
                    password_hash=hash_password("Demo@123"),
                    role="admin",
                ),
                User(
                    name="Raipur RO",
                    email="ro.raipur@prithvinet.gov.in",
                    password_hash=hash_password("Demo@123"),
                    role="regional_officer",
                ),
                User(
                    name="Bhilai Steel Contact",
                    email="compliance@bhilaisteel.com",
                    password_hash=hash_password("Demo@123"),
                    role="industry_user",
                ),
                User(
                    name="Korba Power Contact",
                    email="env@korbapower.com",
                    password_hash=hash_password("Demo@123"),
                    role="industry_user",
                ),
                User(
                    name="Citizen Rajiv",
                    email="rajiv@example.com",
                    password_hash=hash_password("Demo@123"),
                    role="citizen",
                ),
            ]
            db.add_all(users)
            db.commit()

        if db.query(Industry).count() == 0:
            print("Creating demo industries...")
            industries = [
                Industry(
                    name="Bhilai Steel Plant",
                    industry_type="Steel Manufacturing",
                    address="Bhilai Industrial Estate",
                    region="Bhilai",
                    latitude=21.1938,
                    longitude=81.3509,
                    contact_email="compliance@bhilaisteel.com",
                    registration_number="IND-BSP-001",
                    status="active",
                ),
                Industry(
                    name="Korba Super Thermal Power",
                    industry_type="Power Plant",
                    address="Jamnipali",
                    region="Korba",
                    latitude=22.3595,
                    longitude=82.6800,
                    contact_email="env@korbapower.com",
                    registration_number="IND-KOR-002",
                    status="active",
                ),
                Industry(
                    name="Raipur Sponge Iron",
                    industry_type="Sponge Iron",
                    address="Siltara Industrial Area",
                    region="Raipur",
                    latitude=21.2514,
                    longitude=81.6296,
                    contact_email="admin@raipursponge.com",
                    registration_number="IND-RPR-003",
                    status="compliant",
                ),
                Industry(
                    name="Ambuja Cement Plant",
                    industry_type="Cement",
                    address="Bhatapara",
                    region="Bhatapara",
                    latitude=21.7347,
                    longitude=81.9366,
                    contact_email="env@ambuja.com",
                    registration_number="IND-BHT-004",
                    status="active",
                ),
                Industry(
                    name="Balco Aluminum",
                    industry_type="Aluminum Smelter",
                    address="Balco Nagar",
                    region="Korba",
                    latitude=22.3995,
                    longitude=82.7200,
                    contact_email="compliance@balco.com",
                    registration_number="IND-BLC-005",
                    status="violating",
                ),
            ]
            db.add_all(industries)
            db.commit()

        ind_bhilai = db.query(Industry).filter_by(name="Bhilai Steel Plant").first().id
        ind_korba = db.query(Industry).filter_by(name="Korba Super Thermal Power").first().id
        ind_raipur = db.query(Industry).filter_by(name="Raipur Sponge Iron").first().id
        ind_ambuja = db.query(Industry).filter_by(name="Ambuja Cement Plant").first().id
        ind_balco = db.query(Industry).filter_by(name="Balco Aluminum").first().id

        if db.query(MonitoringLocation).count() == 0:
            print("Creating monitoring locations...")
            locs = [
                MonitoringLocation(
                    name="BSP Main Stack 1",
                    region="Bhilai",
                    latitude=21.1940,
                    longitude=81.3510,
                    location_type="air",
                    industry_id=ind_bhilai,
                ),
                MonitoringLocation(
                    name="Shivnath River Discharge",
                    region="Bhilai",
                    latitude=21.1800,
                    longitude=81.3400,
                    location_type="water",
                    industry_id=ind_bhilai,
                ),
                MonitoringLocation(
                    name="Korba Chimney A",
                    region="Korba",
                    latitude=22.3600,
                    longitude=82.6810,
                    location_type="air",
                    industry_id=ind_korba,
                ),
                MonitoringLocation(
                    name="Korba Ash Pond",
                    region="Korba",
                    latitude=22.3700,
                    longitude=82.6900,
                    location_type="water",
                    industry_id=ind_korba,
                ),
                MonitoringLocation(
                    name="Siltara Phase 1 Ambient",
                    region="Raipur",
                    latitude=21.2520,
                    longitude=81.6300,
                    location_type="air",
                    industry_id=ind_raipur,
                ),
                MonitoringLocation(
                    name="Bhatapara Plant Gate",
                    region="Bhatapara",
                    latitude=21.7350,
                    longitude=81.9370,
                    location_type="air",
                    industry_id=ind_ambuja,
                ),
                MonitoringLocation(
                    name="Balco Smelter Extractor",
                    region="Korba",
                    latitude=22.4000,
                    longitude=82.7210,
                    location_type="air",
                    industry_id=ind_balco,
                ),
                MonitoringLocation(
                    name="Hasdeo River Upstream",
                    region="Korba",
                    latitude=22.3800,
                    longitude=82.6700,
                    location_type="water",
                    industry_id=None,
                ),
            ]
            db.add_all(locs)
            db.commit()

        imported_any = False

        if db.query(EnvironmentalData).filter(EnvironmentalData.data_type == "air").count() == 0:
            print("Ingesting air quality JSON data...")
            air_summary = import_air_json_data(db)
            db.commit()
            imported_any = imported_any or air_summary["inserted"] > 0
            print(
                f"Air import complete: {air_summary['inserted']} readings, "
                f"{air_summary['alerts']} alerts triggered."
            )

        print("Ingesting/backfilling water quality JSON data...")
        water_summary = import_water_json_data(db)
        db.commit()
        imported_any = imported_any or water_summary["inserted"] > 0
        print(
            f"Water import complete: {water_summary['inserted']} readings, "
            f"{water_summary['alerts']} alerts triggered."
        )

        print("Ingesting/backfilling noise JSON data...")
        noise_summary = import_noise_json_data(db)
        db.commit()
        imported_any = imported_any or noise_summary["inserted"] > 0
        print(
            f"Noise import complete: {noise_summary['inserted']} readings, "
            f"{noise_summary['alerts']} alerts triggered."
        )

        if imported_any:
            alerts = db.query(Alert).filter(Alert.status == "active").all()
            for i, alert in enumerate(alerts):
                if i % 2 == 0:
                    alert.status = "resolved"
                    alert.resolved_at = alert.created_at + timedelta(days=1)
                    alert.resolved_by_id = 1
                    alert.resolution_notes = "Automatically resolved via pipeline"
            db.commit()

        print("Database seeding complete.")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
