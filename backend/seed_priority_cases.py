"""
Seed Demo Priority Cases for Inspection Priority Page
=====================================================
This script creates 3 highly severe dummy priority cases to prevent
the 'No priority cases' empty state during presentations.

Run: python seed_priority_cases.py
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
from models.alert import Alert


def seed_priority_cases():
    """Create 3 high-priority demo cases for presentation"""
    db: Session = SessionLocal()
    
    try:
        print("🎯 Seeding 3 high-priority demo cases...")
        
        # Case 1: Bhilai Steel Plant - 3 Critical Violations
        # Ensure industry exists with violating status
        bsp = db.query(Industry).filter_by(name="Bhilai Steel Plant").first()
        if not bsp:
            print("Creating Bhilai Steel Plant...")
            bsp = Industry(
                name="Bhilai Steel Plant",
                industry_type="Steel Manufacturing",
                address="Bhilai Industrial Estate",
                region="Bhilai",
                latitude=21.1938,
                longitude=81.3509,
                contact_email="compliance@bhilaisteel.com",
                registration_number="IND-BSP-001",
                status="violating"
            )
            db.add(bsp)
            db.flush()
        else:
            bsp.status = "violating"
            db.add(bsp)
        
        # Get or create monitoring location for BSP
        bsp_loc = db.query(MonitoringLocation).filter_by(name="BSP Main Stack 1").first()
        if not bsp_loc:
            bsp_loc = MonitoringLocation(
                name="BSP Main Stack 1",
                region="Bhilai",
                latitude=21.1940,
                longitude=81.3510,
                location_type="air",
                industry_id=bsp.id
            )
            db.add(bsp_loc)
            db.flush()
        
        # Create critical environmental data records for BSP
        now = datetime.now(timezone.utc)
        
        # PM10 critical violation (150 > 100 limit)
        data1 = EnvironmentalData(
            data_type="air",
            location_id=bsp_loc.id,
            industry_id=bsp.id,
            recorded_at=now - timedelta(hours=2),
            source="manual_demo",
            notes="Demo: Critical PM10 breach for 48+ hours",
            pm10=150.0,
            pm25=85.0,
            no2=95.0,
            so2=120.0,
            aqi=320
        )
        db.add(data1)
        db.flush()
        
        # Create 3 critical alerts for BSP
        alerts_bsp = [
            Alert(
                data_id=data1.id,
                location_id=bsp_loc.id,
                industry_id=bsp.id,
                alert_type="air",
                pollutant="pm10",
                measured_value=150.0,
                threshold_value=100.0,
                severity="critical",
                message="PM10 level of 150.0 µg/m³ exceeds CPCB legal limit (100). Facility has breached limits for 48 consecutive hours.",
                status="active",
                created_at=now - timedelta(hours=2)
            ),
            Alert(
                data_id=data1.id,
                location_id=bsp_loc.id,
                industry_id=bsp.id,
                alert_type="air",
                pollutant="pm25",
                measured_value=85.0,
                threshold_value=60.0,
                severity="critical",
                message="PM2.5 level of 85.0 µg/m³ exceeds CPCB legal limit (60). Severity: critical.",
                status="active",
                created_at=now - timedelta(hours=2)
            ),
            Alert(
                data_id=data1.id,
                location_id=bsp_loc.id,
                industry_id=bsp.id,
                alert_type="air",
                pollutant="so2",
                measured_value=120.0,
                threshold_value=80.0,
                severity="high",
                message="SO2 level of 120.0 µg/m³ exceeds CPCB legal limit (80). Severity: high.",
                status="active",
                created_at=now - timedelta(hours=1)
            ),
        ]
        db.add_all(alerts_bsp)
        
        # Case 2: Balco Aluminum - 2 Critical Violations
        balco = db.query(Industry).filter_by(name="Balco Aluminum").first()
        if not balco:
            print("Creating Balco Aluminum...")
            balco = Industry(
                name="Balco Aluminum",
                industry_type="Aluminum Smelter",
                address="Balco Nagar",
                region="Korba",
                latitude=22.3995,
                longitude=82.7200,
                contact_email="compliance@balco.com",
                registration_number="IND-BLC-005",
                status="violating"
            )
            db.add(balco)
            db.flush()
        else:
            balco.status = "violating"
            db.add(balco)
        
        balco_loc = db.query(MonitoringLocation).filter_by(name="Balco Smelter Extractor").first()
        if not balco_loc:
            balco_loc = MonitoringLocation(
                name="Balco Smelter Extractor",
                region="Korba",
                latitude=22.4000,
                longitude=82.7210,
                location_type="air",
                industry_id=balco.id
            )
            db.add(balco_loc)
            db.flush()
        
        data2 = EnvironmentalData(
            data_type="air",
            location_id=balco_loc.id,
            industry_id=balco.id,
            recorded_at=now - timedelta(hours=4),
            source="manual_demo",
            notes="Demo: Multiple pollutant violations",
            pm10=180.0,
            pm25=95.0,
            no2=110.0,
            aqi=380
        )
        db.add(data2)
        db.flush()
        
        alerts_balco = [
            Alert(
                data_id=data2.id,
                location_id=balco_loc.id,
                industry_id=balco.id,
                alert_type="air",
                pollutant="pm10",
                measured_value=180.0,
                threshold_value=100.0,
                severity="critical",
                message="PM10 level of 180.0 µg/m³ exceeds CPCB legal limit (100). Severity: critical.",
                status="active",
                created_at=now - timedelta(hours=4)
            ),
            Alert(
                data_id=data2.id,
                location_id=balco_loc.id,
                industry_id=balco.id,
                alert_type="air",
                pollutant="no2",
                measured_value=110.0,
                threshold_value=80.0,
                severity="high",
                message="NO2 level of 110.0 µg/m³ exceeds CPCB legal limit (80). Severity: high.",
                status="active",
                created_at=now - timedelta(hours=3)
            ),
        ]
        db.add_all(alerts_balco)
        
        # Case 3: Korba Super Thermal Power - 2 High Violations
        korba = db.query(Industry).filter_by(name="Korba Super Thermal Power").first()
        if not korba:
            print("Creating Korba Super Thermal Power...")
            korba = Industry(
                name="Korba Super Thermal Power",
                industry_type="Power Plant",
                address="Jamnipali",
                region="Korba",
                latitude=22.3595,
                longitude=82.6800,
                contact_email="env@korbapower.com",
                registration_number="IND-KOR-002",
                status="violating"
            )
            db.add(korba)
            db.flush()
        else:
            korba.status = "violating"
            db.add(korba)
        
        korba_loc = db.query(MonitoringLocation).filter_by(name="Korba Chimney A").first()
        if not korba_loc:
            korba_loc = MonitoringLocation(
                name="Korba Chimney A",
                region="Korba",
                latitude=22.3600,
                longitude=82.6810,
                location_type="air",
                industry_id=korba.id
            )
            db.add(korba_loc)
            db.flush()
        
        data3 = EnvironmentalData(
            data_type="air",
            location_id=korba_loc.id,
            industry_id=korba.id,
            recorded_at=now - timedelta(hours=6),
            source="manual_demo",
            notes="Demo: Thermal power emissions exceeding limits",
            pm10=140.0,
            so2=150.0,
            no2=85.0,
            aqi=290
        )
        db.add(data3)
        db.flush()
        
        alerts_korba = [
            Alert(
                data_id=data3.id,
                location_id=korba_loc.id,
                industry_id=korba.id,
                alert_type="air",
                pollutant="pm10",
                measured_value=140.0,
                threshold_value=100.0,
                severity="critical",
                message="PM10 level of 140.0 µg/m³ exceeds CPCB legal limit (100). Severity: critical.",
                status="active",
                created_at=now - timedelta(hours=6)
            ),
            Alert(
                data_id=data3.id,
                location_id=korba_loc.id,
                industry_id=korba.id,
                alert_type="air",
                pollutant="so2",
                measured_value=150.0,
                threshold_value=80.0,
                severity="critical",
                message="SO2 level of 150.0 µg/m³ exceeds CPCB legal limit (80). Severity: critical.",
                status="active",
                created_at=now - timedelta(hours=5)
            ),
        ]
        db.add_all(alerts_korba)
        
        db.commit()
        
        print(f"✅ Successfully seeded 3 priority cases:")
        print(f"   1. Bhilai Steel Plant - 3 alerts (2 critical, 1 high)")
        print(f"   2. Balco Aluminum - 2 alerts (1 critical, 1 high)")
        print(f"   3. Korba Super Thermal Power - 2 alerts (2 critical)")
        print(f"\n🎯 Total: 7 high-severity alerts created for demo presentation")
        
    except Exception as e:
        print(f"❌ Error seeding priority cases: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_priority_cases()
