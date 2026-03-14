import json
from datetime import datetime
from pathlib import Path
from typing import Any

from models.environmental_data import EnvironmentalData
from models.industry import Industry
from models.monitoring_location import MonitoringLocation
from services.alert_service import check_and_trigger_alerts

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "src" / "data" / "json"

AIR_FILES = [
    "emission_logs_AQI_bilaspur.json",
    "emission_logs_bhiali_aqi.json",
    "emission_logs_korba.json",
    "emission_logs_raigarh.json",
    "emission_logs_raipur.json",
]

WATER_FILES = [
    "water_index_raipur.json",
    "water_index_Raigarh.json",
    "water_index_durg_bhilai_structured.json",
    "water_quality_bilaspur_janjgirchampa.json",
    "water_quality_korba.json",
    "water_quality_Jagdalpur_NWMP.json",
]
WATER_STATION_FILES = {
    "water_index_raipur.json": "stations_raipur_water.json",
}

NOISE_STATIONS_FILE = "monitoring_stations.json"
NOISE_LOGS_FILE = "emission_logs.json"
NOISE_MOCK_FILES = [
    "noise_bhilai_mock.json",
    "noise_bilaspur_mock.json",
    "noise_korba_mock.json",
    "noise_raigarh_mock.json",
]
RAIPUR_NOISE_STATIONS_FILE = "monitoring_stations_raipur_noise.json"
RAIPUR_NOISE_LOGS_FILE = "noise_observations_hourly_raipur.json"

_MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

_INDUSTRY_HINTS = {
    "Bhilai Steel Plant": ("bhilai steel", "bsp", "sail", "bec"),
    "Korba Super Thermal Power": ("ntpc", "jamnipali", "thermal power", "power station", "power plant"),
    "Raipur Sponge Iron": ("siltara", "sponge iron"),
    "Ambuja Cement Plant": ("ambuja", "cement"),
    "Balco Aluminum": ("balco", "smelter", "aluminum"),
}


def _load_json(file_name: str) -> Any:
    path = DATA_DIR / file_name
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _to_float(value: Any) -> float | None:
    if value in (None, "", "NA", "N/A", "-"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _month_to_number(month: str | None) -> int:
    if not month:
        return 1
    return _MONTHS.get(str(month).strip().lower(), 1)


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _parse_month_record(month: str | None, year: Any) -> datetime:
    year_num = int(year) if year is not None else datetime.utcnow().year
    return datetime(year_num, _month_to_number(month), 1)


def _parse_noise_slot(time_slot: str | None, day_seed: int) -> datetime:
    if not time_slot:
        return datetime(2025, 1, day_seed, 0, 0)
    start_hour = int(str(time_slot).split("-")[0])
    return datetime(2025, 1, day_seed, start_hour, 0)


def _normalize_zone(zone: str | None) -> str:
    value = (zone or "residential").strip().lower()
    if value in {"silence", "silent"}:
        return "silent"
    return value


def _clean_name(name: str) -> str:
    return " ".join(name.replace("\u2014", " ").replace("-", " ").split()).strip()


def _find_industry(db, name: str, region: str | None, lat: float | None, lng: float | None, industrial_bias: bool = False) -> Industry | None:
    haystack = f"{name} {region or ''}".lower()
    for industry_name, hints in _INDUSTRY_HINTS.items():
        if any(hint in haystack for hint in hints):
            return db.query(Industry).filter(Industry.name == industry_name).first()

    if not industrial_bias or lat is None or lng is None:
        return None

    candidates = db.query(Industry).all()
    best_match: Industry | None = None
    best_distance = float("inf")
    for industry in candidates:
        if industry.latitude is None or industry.longitude is None:
            continue
        if region and industry.region and industry.region.lower() != region.lower():
            continue
        distance = ((industry.latitude - lat) ** 2 + (industry.longitude - lng) ** 2) ** 0.5
        if distance < best_distance:
            best_distance = distance
            best_match = industry

    return best_match if best_distance <= 0.25 else None


def _get_or_create_location(
    db,
    *,
    name: str,
    region: str,
    latitude: float | None,
    longitude: float | None,
    location_type: str,
    industry_id: int | None = None,
):
    location = db.query(MonitoringLocation).filter(MonitoringLocation.name == name).first()
    if location:
        changed = False
        if location.latitude is None and latitude is not None:
            location.latitude = latitude
            changed = True
        if location.longitude is None and longitude is not None:
            location.longitude = longitude
            changed = True
        if location.industry_id is None and industry_id is not None:
            location.industry_id = industry_id
            changed = True
        if changed:
            db.flush()
        return location

    if latitude is None or longitude is None:
        return None

    location = MonitoringLocation(
        name=name,
        region=region,
        latitude=latitude,
        longitude=longitude,
        location_type=location_type,
        industry_id=industry_id,
    )
    db.add(location)
    db.flush()
    return location


def import_air_json_data(db) -> dict[str, int]:
    inserted = 0
    alerts = 0

    for file_name in AIR_FILES:
        records = _load_json(file_name)
        for item in records:
            station_name = item.get("station_name")
            if not station_name:
                continue

            region = item.get("region") or item.get("city") or "Unknown"
            location = _get_or_create_location(
                db,
                name=station_name,
                region=region,
                latitude=_to_float(item.get("lat")),
                longitude=_to_float(item.get("lng")),
                location_type="air",
            )
            if not location:
                continue

            pollutants = item.get("pollutants", {})
            record_time = _parse_timestamp(item.get("timestamp")) or datetime.utcnow()
            entry = EnvironmentalData(
                data_type="air",
                location_id=location.id,
                industry_id=location.industry_id,
                recorded_at=record_time,
                source=f"json:air:{Path(file_name).stem}",
                notes=f"Imported from {file_name}; category={item.get('AQI_category', 'unknown')}",
                pm25=_to_float(pollutants.get("PM2.5")),
                pm10=_to_float(pollutants.get("PM10")),
                no2=_to_float(pollutants.get("NO2")),
                so2=_to_float(pollutants.get("SO2")),
                co=_to_float(pollutants.get("CO")),
                o3=_to_float(pollutants.get("O3")),
                aqi=_to_float(item.get("AQI")),
            )
            db.add(entry)
            db.flush()
            inserted += 1

            category = str(item.get("AQI_category", "")).upper()
            if category in {"POOR", "VERY POOR", "SEVERE"}:
                alerts += len(check_and_trigger_alerts(db, entry))

    return {"inserted": inserted, "alerts": alerts}


def _build_water_station_map(doc: dict[str, Any]) -> dict[str, dict[str, Any]]:
    stations = doc.get("stations") or doc.get("monitoring_stations") or []
    station_map: dict[str, dict[str, Any]] = {}
    for station in stations:
        code = str(station.get("station_code") or station.get("id") or station.get("station_id") or "").strip()
        if not code:
            continue
        coords = station.get("coordinates") or {}
        station_map[code] = {
            "name": station.get("station_name") or station.get("name"),
            "region": station.get("district") or station.get("city") or doc.get("city") or "Unknown",
            "lat": _to_float(station.get("latitude") or station.get("lat") or coords.get("lat")),
            "lng": _to_float(station.get("longitude") or station.get("lon") or station.get("lng") or coords.get("lon")),
            "water_body": station.get("water_body") or station.get("river"),
        }
    return station_map


def _merge_water_station_overrides(
    station_map: dict[str, dict[str, Any]],
    override_doc: dict[str, Any],
    *,
    default_region: str | None = None,
) -> dict[str, dict[str, Any]]:
    for station in override_doc.get("stations", []):
        code = str(station.get("station_code") or station.get("id") or "").strip()
        if not code:
            continue

        current = station_map.get(code, {})
        coords = station.get("coordinates") or {}
        station_map[code] = {
            "name": current.get("name") or station.get("station_name") or station.get("name"),
            "region": default_region or current.get("region") or station.get("district") or override_doc.get("city") or "Unknown",
            "lat": current.get("lat") if current.get("lat") is not None else _to_float(station.get("latitude") or station.get("lat") or coords.get("latitude") or coords.get("lat")),
            "lng": current.get("lng") if current.get("lng") is not None else _to_float(station.get("longitude") or station.get("lng") or station.get("lon") or coords.get("longitude") or coords.get("lon")),
            "water_body": current.get("water_body") or station.get("water_body") or station.get("river"),
        }

    return station_map


def _water_rows_from_document(doc: dict[str, Any], file_name: str) -> list[dict[str, Any]]:
    station_map = _build_water_station_map(doc)
    station_override_file = WATER_STATION_FILES.get(file_name)
    if station_override_file:
        station_map = _merge_water_station_overrides(
            station_map,
            _load_json(station_override_file),
            default_region=doc.get("city"),
        )
    rows: list[dict[str, Any]] = []

    if doc.get("monthly_records"):
        for monthly in doc["monthly_records"]:
            for reading in monthly.get("readings", []):
                station = station_map.get(str(reading.get("station_code")))
                if not station:
                    continue
                rows.append(
                    {
                        **station,
                        "recorded_at": _parse_month_record(monthly.get("month"), monthly.get("year")),
                        "bod": _to_float(reading.get("BOD")),
                        "dissolved_oxygen": _to_float(reading.get("DO")),
                        "coliform": _to_float(reading.get("FC")) or _to_float(reading.get("TC")),
                        "status": reading.get("status") or reading.get("water_quality_status"),
                        "source": f"json:water:{Path(file_name).stem}",
                        "notes": f"Imported from {file_name}",
                    }
                )

    if doc.get("monitoring_data"):
        for block in doc["monitoring_data"]:
            if block.get("readings"):
                for reading in block["readings"]:
                    station = station_map.get(str(reading.get("station_code")))
                    if not station:
                        continue
                    rows.append(
                        {
                            **station,
                            "recorded_at": _parse_month_record(block.get("month"), block.get("year")),
                            "bod": _to_float(reading.get("BOD")),
                            "dissolved_oxygen": _to_float(reading.get("DO")),
                            "coliform": _to_float(reading.get("FC")) or _to_float(reading.get("TC")),
                            "status": reading.get("status") or reading.get("water_quality_status"),
                            "source": f"json:water:{Path(file_name).stem}",
                            "notes": f"Imported from {file_name}",
                        }
                    )
            elif block.get("records"):
                station = station_map.get(str(block.get("station_code")))
                if not station:
                    continue
                for record in block["records"]:
                    rows.append(
                        {
                            **station,
                            "recorded_at": _parse_month_record(record.get("month"), record.get("year")),
                            "bod": _to_float(record.get("BOD")),
                            "dissolved_oxygen": _to_float(record.get("DO")),
                            "coliform": _to_float(record.get("FC")) or _to_float(record.get("TC")),
                            "status": record.get("status") or record.get("water_quality_status"),
                            "source": f"json:water:{Path(file_name).stem}",
                            "notes": f"Imported from {file_name}",
                        }
                    )

    for station in doc.get("stations", []):
        if not station.get("records"):
            continue
        station_info = {
            "name": station.get("station_name") or station.get("name"),
            "region": station.get("district") or station.get("city") or doc.get("city") or "Unknown",
            "lat": _to_float(station.get("latitude") or station.get("lat")),
            "lng": _to_float(station.get("longitude") or station.get("lng")),
            "water_body": station.get("water_body") or station.get("river"),
        }
        for record in station["records"]:
            rows.append(
                {
                    **station_info,
                    "recorded_at": _parse_month_record(record.get("month"), record.get("year")),
                    "bod": _to_float(record.get("BOD")),
                    "dissolved_oxygen": _to_float(record.get("DO")),
                    "coliform": _to_float(record.get("FC")) or _to_float(record.get("TC")),
                    "status": record.get("status") or record.get("water_quality_status"),
                    "source": f"json:water:{Path(file_name).stem}",
                    "notes": f"Imported from {file_name}",
                }
            )

    for station in doc.get("monitoring_stations", []):
        if not station.get("monitoring_data"):
            continue
        station_info = {
            "name": station.get("station_name") or station.get("name"),
            "region": station.get("district") or station.get("city") or doc.get("city") or "Unknown",
            "lat": _to_float(station.get("latitude") or station.get("lat")),
            "lng": _to_float(station.get("longitude") or station.get("lng")),
            "water_body": station.get("water_body") or station.get("river"),
        }
        for record in station["monitoring_data"]:
            rows.append(
                {
                    **station_info,
                    "recorded_at": _parse_month_record(record.get("month"), record.get("year")),
                    "bod": _to_float(record.get("BOD")) or _to_float(record.get("BOD_mg_per_l")),
                    "dissolved_oxygen": _to_float(record.get("DO")) or _to_float(record.get("DO_mg_per_l")),
                    "coliform": _to_float(record.get("FC")) or _to_float(record.get("FC_MPN_per_100ml")) or _to_float(record.get("TC")) or _to_float(record.get("TC_MPN_per_100ml")),
                    "status": record.get("status") or record.get("water_quality_status"),
                    "source": f"json:water:{Path(file_name).stem}",
                    "notes": f"Imported from {file_name}",
                }
            )

    return rows


def import_water_json_data(db) -> dict[str, int]:
    inserted = 0
    alerts = 0

    for file_name in WATER_FILES:
        water_source = f"json:water:{Path(file_name).stem}"
        if db.query(EnvironmentalData).filter(EnvironmentalData.source == water_source).count() > 0:
            continue
        rows = _water_rows_from_document(_load_json(file_name), file_name)
        for row in rows:
            name = row.get("name")
            if not name:
                continue
            industrial_bias = any(term in name.lower() for term in ("industrial", "plant", "steel", "power", "factory", "mine", "smelter", "cluster"))
            industry = _find_industry(db, name, row.get("region"), row.get("lat"), row.get("lng"), industrial_bias=industrial_bias)
            location = _get_or_create_location(
                db,
                name=name,
                region=row.get("region") or "Unknown",
                latitude=row.get("lat"),
                longitude=row.get("lng"),
                location_type="water",
                industry_id=industry.id if industry else None,
            )
            if not location:
                continue

            notes = row.get("notes", "")
            if row.get("water_body"):
                notes = f"{notes}; water_body={row['water_body']}"
            if row.get("status"):
                notes = f"{notes}; status={row['status']}"

            entry = EnvironmentalData(
                data_type="water",
                location_id=location.id,
                industry_id=location.industry_id,
                recorded_at=row["recorded_at"],
                source=water_source,
                notes=notes.strip("; "),
                bod=row.get("bod"),
                dissolved_oxygen=row.get("dissolved_oxygen"),
                coliform=row.get("coliform"),
            )
            db.add(entry)
            db.flush()
            inserted += 1
            alerts += len(check_and_trigger_alerts(db, entry))

    return {"inserted": inserted, "alerts": alerts}


def import_noise_json_data(db) -> dict[str, int]:
    inserted = 0
    alerts = 0

    def persist_noise_row(
        *,
        name: str,
        region: str,
        latitude: float | None,
        longitude: float | None,
        zone: str | None,
        recorded_at: datetime,
        decibel_level: float | None,
        peak_decibel: float | None,
        notes: str,
        source: str,
    ) -> None:
        nonlocal inserted, alerts

        normalized_zone = _normalize_zone(zone)
        industry = _find_industry(
            db,
            name,
            region,
            latitude,
            longitude,
            industrial_bias=normalized_zone == "industrial",
        )
        location = _get_or_create_location(
            db,
            name=_clean_name(name),
            region=region,
            latitude=latitude,
            longitude=longitude,
            location_type="noise",
            industry_id=industry.id if industry else None,
        )
        if not location:
            return

        entry = EnvironmentalData(
            data_type="noise",
            location_id=location.id,
            industry_id=location.industry_id,
            recorded_at=recorded_at,
            source=source,
            notes=notes,
            decibel_level=decibel_level,
            peak_decibel=peak_decibel,
            noise_location_type=normalized_zone,
        )
        db.add(entry)
        db.flush()
        inserted += 1
        alerts += len(check_and_trigger_alerts(db, entry))

    stations_doc = _load_json(NOISE_STATIONS_FILE)
    logs_doc = _load_json(NOISE_LOGS_FILE)
    station_map = {
        station["station_id"]: station
        for station in stations_doc.get("monitoring_stations", [])
    }

    structured_source = f"json:noise:{Path(NOISE_LOGS_FILE).stem}"
    if db.query(EnvironmentalData).filter(EnvironmentalData.source == structured_source).count() == 0:
        for log in logs_doc.get("emission_logs", []):
            station = station_map.get(log.get("station_id"))
            if not station:
                continue

            weather = log.get("weather") or {}
            notes_parts = [
                f"Imported from {NOISE_LOGS_FILE}",
                f"period={log.get('period', 'unknown')}",
                f"zone={station.get('zone_type', 'unknown')}",
                log.get("remarks"),
            ]
            if weather:
                notes_parts.append(
                    "weather="
                    f"{weather.get('temp_C', 'NA')}C/"
                    f"{weather.get('humidity_pct', 'NA')}pct/"
                    f"{weather.get('wind_kmh', 'NA')}kmh"
                )

            persist_noise_row(
                name=station.get("name", "Unknown Noise Station"),
                region=station.get("district") or station.get("city") or log.get("city") or "Unknown",
                latitude=_to_float(station.get("lat")),
                longitude=_to_float(station.get("lng")),
                zone=station.get("zone_type"),
                recorded_at=_parse_timestamp(log.get("timestamp")) or datetime.utcnow(),
                decibel_level=_to_float(log.get("Leq_dB")),
                peak_decibel=_to_float(log.get("Lmax_dB")),
                notes="; ".join(part for part in notes_parts if part),
                source=structured_source,
            )

    for file_index, file_name in enumerate(NOISE_MOCK_FILES, start=1):
        mock_source = f"json:noise:{Path(file_name).stem}"
        if db.query(EnvironmentalData).filter(EnvironmentalData.source == mock_source).count() > 0:
            continue
        doc = _load_json(file_name)
        mock_station_map = {
            station.get("name"): station
            for station in doc.get("stations", [])
        }
        for observation in doc.get("observations", []):
            station = mock_station_map.get(observation.get("station"))
            if not station:
                continue

            day_offset = file_index * 2 + (0 if observation.get("day_type") == "Working" else 1)
            persist_noise_row(
                name=station.get("name", "Unknown Noise Station"),
                region=Path(file_name).stem.replace("noise_", "").replace("_mock", "").title(),
                latitude=_to_float(station.get("lat")),
                longitude=_to_float(station.get("lon")),
                zone=observation.get("zone") or station.get("zone"),
                recorded_at=_parse_noise_slot(observation.get("time"), day_offset),
                decibel_level=_to_float(observation.get("noise_db")),
                peak_decibel=_to_float(observation.get("noise_db")),
                notes=(
                    f"Imported from {file_name}; "
                    f"day_type={observation.get('day_type', 'unknown')}; "
                    f"time_slot={observation.get('time', 'unknown')}"
                ),
                source=mock_source,
            )

    raipur_source = f"json:noise:{Path(RAIPUR_NOISE_LOGS_FILE).stem}"
    if db.query(EnvironmentalData).filter(EnvironmentalData.source == raipur_source).count() == 0:
        raipur_stations = _load_json(RAIPUR_NOISE_STATIONS_FILE)
        raipur_logs = _load_json(RAIPUR_NOISE_LOGS_FILE)
        raipur_station_map = {
            station.get("name"): station
            for station in raipur_stations.get("stations", [])
        }
        for observation in raipur_logs.get("observations", []):
            station = raipur_station_map.get(observation.get("station"))
            if not station:
                continue

            day_offset = 20 + (0 if observation.get("day_type") == "Working" else 1)
            persist_noise_row(
                name=station.get("name", "Unknown Noise Station"),
                region="Raipur",
                latitude=_to_float(station.get("lat")),
                longitude=_to_float(station.get("lon")),
                zone=observation.get("zone") or station.get("zone"),
                recorded_at=_parse_noise_slot(observation.get("time"), day_offset),
                decibel_level=_to_float(observation.get("noise_db")),
                peak_decibel=_to_float(observation.get("noise_db")),
                notes=(
                    f"Imported from {RAIPUR_NOISE_LOGS_FILE}; "
                    f"day_type={observation.get('day_type', 'unknown')}; "
                    f"time_slot={observation.get('time', 'unknown')}"
                ),
                source=raipur_source,
            )

    return {"inserted": inserted, "alerts": alerts}
