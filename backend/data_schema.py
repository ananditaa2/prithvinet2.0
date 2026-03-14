"""
Unified JSON Schema for PrithviNet Data Ingestion
=================================================
This module provides a standardized schema for all environmental data JSON files
and a dynamic ingestion engine for seed_db.py

Naming Convention: [domain]_[city]_[optional_subtype].json
Examples:
    - air_raipur_emissions.json
    - air_korba_stations.json
    - water_korba_nwmp.json
    - noise_raigarh_mock.json
"""

from typing import TypedDict, Optional, List, Dict, Any, Union
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum


class DataDomain(str, Enum):
    AIR = "air"
    WATER = "water"
    NOISE = "noise"
    INDUSTRY = "industry"


class FileType(str, Enum):
    EMISSIONS = "emissions"      # Time-series pollution readings
    STATIONS = "stations"        # Monitoring location metadata
    INDUSTRIES = "industries"    # Industry/facility registry
    WATER_QUALITY = "nwmp"       # National Water Monitoring Programme data
    NOISE_OBSERVATIONS = "noise" # Noise level readings


# ═══════════════════════════════════════════════════════════════════════════════
# UNIFIED RECORD SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class UnifiedStationRecord(TypedDict, total=False):
    """Standardized station/monitoring location record"""
    station_id: str              # Unique identifier
    station_code: Optional[str] # Official code (e.g., CECB station code)
    station_name: str           # Human-readable name
    name: Optional[str]         # Alias for station_name
    location_type: str          # "air", "water", "noise", "industrial", etc.
    station_type: Optional[str]# Alias for location_type
    region: str                 # City/region name
    city: Optional[str]         # Alias for region
    district: Optional[str]     # District name
    state: str                  # State (default: "Chhattisgarh")
    lat: float                  # Latitude
    latitude: Optional[float]   # Alias for lat
    lng: float                  # Longitude
    lon: Optional[float]        # Alias for lng
    longitude: Optional[float]   # Alias for lng
    water_body: Optional[str]   # For water stations: river/lake name
    zone: Optional[str]         # For noise: "residential", "commercial", "industrial"
    active: Optional[bool]      # Is station currently active


class UnifiedEmissionRecord(TypedDict, total=False):
    """Standardized air quality emission record"""
    id: Optional[str]           # Record ID (optional)
    station_id: str             # Reference to station
    station_name: Optional[str]# Denormalized station name
    timestamp: str              # ISO 8601 datetime
    date: Optional[str]         # Alias for timestamp (YYYY-MM-DD)
    month: Optional[str]        # Month name (e.g., "January")
    year: Optional[int]        # Year (e.g., 2025)
    season: Optional[str]      # "summer", "monsoon", "winter", "autumn"
    
    # Pollutant readings (µg/m³)
    pollutants: Dict[str, Optional[float]]
    PM2_5: Optional[float]     # PM2.5 (alias)
    pm25: Optional[float]      # PM2.5 (alias)
    PM10: Optional[float]      # PM10
    pm10: Optional[float]      # PM10 (alias)
    NO2: Optional[float]       # Nitrogen Dioxide
    no2: Optional[float]       # NO2 (alias)
    SO2: Optional[float]       # Sulfur Dioxide
    so2: Optional[float]       # SO2 (alias)
    CO: Optional[float]        # Carbon Monoxide
    co: Optional[float]        # CO (alias)
    O3: Optional[float]        # Ozone
    o3: Optional[float]        # O3 (alias)
    
    AQI: Optional[int]         # Air Quality Index
    aqi: Optional[int]         # AQI (alias)
    AQI_category: Optional[str] # "GOOD", "SATISFACTORY", "MODERATE", etc.
    compliance_status: Optional[str]  # "COMPLIANT", "VIOLATION"
    violations: Optional[List[str]]   # List of violated pollutants
    
    # Metadata
    source: Optional[str]      # Data source description
    notes: Optional[str]       # Additional notes


class UnifiedWaterRecord(TypedDict, total=False):
    """Standardized water quality record (NWMP format)"""
    station_code: str         # Station identifier
    station_name: Optional[str]
    city: str                 # City name
    water_body: Optional[str] # River/lake name
    
    # Temporal
    date: Optional[str]        # YYYY-MM-DD
    timestamp: Optional[str]   # ISO 8601 (alias)
    month: Optional[str]      # Month name
    year: Optional[int]       # Year
    
    # Water quality parameters
    DO: Optional[float]        # Dissolved Oxygen (mg/l)
    dissolved_oxygen: Optional[float]  # Alias
    BOD: Optional[float]       # Biochemical Oxygen Demand (mg/l)
    bod: Optional[float]        # Alias
    FC: Optional[float]        # Fecal Coliform (MPN/100ml)
    fecal_coliform: Optional[float]   # Alias
    TC: Optional[float]        # Total Coliform (MPN/100ml)
    total_coliform: Optional[float]    # Alias
    
    # Status
    status: Optional[str]      # "SATISFACTORY" | "NOT SATISFACTORY"
    compliance_status: Optional[str]   # Alias
    
    # Location
    lat: Optional[float]
    lng: Optional[float]


class UnifiedNoiseRecord(TypedDict, total=False):
    """Standardized noise pollution record"""
    station_id: Optional[str]
    station_name: Optional[str]
    name: Optional[str]        # Alias
    
    # Location
    city: Optional[str]
    region: Optional[str]
    zone: str                  # "residential", "commercial", "industrial", "silent"
    location_type: Optional[str]  # Alias for zone
    
    # Coordinates
    lat: float
    latitude: Optional[float]  # Alias
    lng: float
    lon: Optional[float]       # Alias
    longitude: Optional[float]  # Alias
    
    # Measurements
    decibel_level: Optional[float]  # dB reading
    avgDb: Optional[float]      # Alias
    limit: Optional[float]      # Legal limit for zone
    violations: Optional[int]   # Count of violations
    
    # Temporal
    timestamp: Optional[str]
    date: Optional[str]


class UnifiedIndustryRecord(TypedDict, total=False):
    """Standardized industry/facility record"""
    id: Optional[str]
    industry_id: Optional[str]   # Alias
    name: str
    industry_name: Optional[str]  # Alias
    type: str                  # Industry type (e.g., "Steel Manufacturing")
    industry_type: Optional[str]  # Alias
    
    # Location
    region: str                # City/region
    city: Optional[str]         # Alias
    district: Optional[str]
    address: Optional[str]
    lat: Optional[float]
    latitude: Optional[float]  # Alias
    lng: Optional[float]
    longitude: Optional[float]  # Alias
    lon: Optional[float]       # Alias
    
    # Identifiers
    registration_number: Optional[str]
    station_id: Optional[str]   # Associated monitoring station
    
    # Status
    status: Optional[str]      # "active", "compliant", "violating", "suspended"
    high_risk: Optional[bool]
    
    # Contact
    contact_email: Optional[str]


# ═══════════════════════════════════════════════════════════════════════════════
# UNIFIED CONTAINER SCHEMA (Root JSON Structure)
# ═══════════════════════════════════════════════════════════════════════════════

class UnifiedDataFile(TypedDict, total=False):
    """
    Standardized root structure for all JSON data files.
    Supports both flat arrays and nested metadata formats.
    """
    # Metadata section (optional but recommended)
    metadata: Optional[Dict[str, Any]]
    domain: Optional[str]       # "air", "water", "noise", "industry"
    city: Optional[str]         # City name
    region: Optional[str]       # Region name (alias)
    data_period: Optional[Dict[str, str]]  # {"start": "2024-01", "end": "2025-02"}
    
    # Data arrays (at least one required)
    records: Optional[List[Any]]           # Generic records array
    emissions: Optional[List[UnifiedEmissionRecord]]
    stations: Optional[List[UnifiedStationRecord]]
    monitoring_stations: Optional[List[UnifiedStationRecord]]  # Alias
    industries: Optional[List[UnifiedIndustryRecord]]
    water_quality: Optional[List[UnifiedWaterRecord]]
    noise_observations: Optional[List[UnifiedNoiseRecord]]
    
    # Legacy aliases for backwards compatibility
    pollutants: Optional[List[Any]]


# ═══════════════════════════════════════════════════════════════════════════════
# FIELD MAPPING CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

FIELD_ALIASES = {
    # Station fields
    "station_name": ["name", "stationName", "location_name"],
    "station_code": ["code", "stationCode", "id"],
    "location_type": ["station_type", "type", "zone"],
    "region": ["city", "district", "area"],
    "lat": ["latitude", "lat"],
    "lng": ["longitude", "lon", "lng"],
    
    # Emission fields
    "timestamp": ["date", "datetime", "recorded_at", "recordedAt"],
    "PM2_5": ["pm25", "PM2.5", "pm2_5", "particulate_matter_2_5"],
    "PM10": ["pm10", "PM10", "particulate_matter_10"],
    "NO2": ["no2", "NO2", "nitrogen_dioxide"],
    "SO2": ["so2", "SO2", "sulfur_dioxide"],
    "CO": ["co", "CO", "carbon_monoxide"],
    "O3": ["o3", "O3", "ozone"],
    
    # Water fields
    "DO": ["dissolved_oxygen", "do"],
    "BOD": ["bod", "biochemical_oxygen_demand"],
    "FC": ["fecal_coliform", "fc"],
    "TC": ["total_coliform", "tc"],
    
    # Industry fields
    "industry_type": ["type", "category", "sector"],
    "registration_number": ["reg_no", "license", "permit_id"],
}


def normalize_field_name(field: str) -> str:
    """Convert various field naming conventions to standard names"""
    field_lower = field.lower().strip()
    for standard, aliases in FIELD_ALIASES.items():
        if field_lower in [a.lower() for a in aliases] or field_lower == standard.lower():
            return standard
    return field


# ═══════════════════════════════════════════════════════════════════════════════
# PARSING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def parse_timestamp(value: Any) -> Optional[datetime]:
    """Parse various timestamp formats to datetime object"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%m/%d/%Y",
        "%B %Y",  # e.g., "January 2025"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(str(value), fmt)
        except ValueError:
            continue
    
    return None


def extract_records(data: Dict[str, Any], domain: str) -> List[Dict[str, Any]]:
    """
    Extract data records from various JSON structures.
    Handles both flat arrays and nested objects.
    """
    # Direct array
    if isinstance(data, list):
        return data
    
    # Check common record keys
    record_keys = {
        "air": ["emissions", "records", "pollutants", "readings"],
        "water": ["water_quality", "monitoring_stations", "records", "readings"],
        "noise": ["noise_observations", "stations", "records", "readings"],
        "industry": ["industries", "facilities", "records"],
    }
    
    keys_to_try = record_keys.get(domain, ["records", "data", "items"])
    
    for key in keys_to_try:
        if key in data and isinstance(data[key], list):
            return data[key]
    
    # If no recognized structure, return empty list
    return []


def normalize_record(record: Dict[str, Any], domain: str) -> Dict[str, Any]:
    """Normalize a single record to unified schema"""
    normalized = {}
    
    # Normalize field names
    for key, value in record.items():
        standard_name = normalize_field_name(key)
        normalized[standard_name] = value
    
    # Handle pollutant nested objects
    if "pollutants" in normalized and isinstance(normalized["pollutants"], dict):
        for pol_key, pol_val in normalized["pollutants"].items():
            std_pol = normalize_field_name(pol_key)
            normalized[std_pol] = pol_val
    
    # Extract AQI category if not present
    if "AQI_category" not in normalized and "aqi" in normalized:
        aqi = normalized.get("aqi") or normalized.get("AQI")
        if aqi is not None:
            normalized["AQI_category"] = calculate_aqi_category(aqi)
    
    # Set default compliance status
    if "compliance_status" not in normalized and domain == "air":
        violations = normalized.get("violations", [])
        normalized["compliance_status"] = "VIOLATION" if violations else "COMPLIANT"
    
    return normalized


def calculate_aqi_category(aqi: int) -> str:
    """Calculate AQI category from AQI value"""
    if aqi <= 50:
        return "GOOD"
    elif aqi <= 100:
        return "SATISFACTORY"
    elif aqi <= 200:
        return "MODERATE"
    elif aqi <= 300:
        return "POOR"
    elif aqi <= 400:
        return "VERY POOR"
    else:
        return "SEVERE"


# ═══════════════════════════════════════════════════════════════════════════════
# FILE DISCOVERY
# ═══════════════════════════════════════════════════════════════════════════════

import os
import re
from pathlib import Path


def discover_data_files(repo_dir: str) -> Dict[str, List[str]]:
    """
    Discover and categorize all JSON data files in the repository.
    Returns a dict mapping domain -> list of file paths.
    """
    domain_patterns = {
        "air": [
            r"emission.*\.json$",
            r"aqi.*\.json$",
            r"air.*\.json$",
        ],
        "water": [
            r"water.*\.json$",
            r"nwmp.*\.json$",
        ],
        "noise": [
            r"noise.*\.json$",
            r"decibel.*\.json$",
        ],
        "industry": [
            r"industr.*\.json$",
            r"facility.*\.json$",
            r"plant.*\.json$",
        ],
    }
    
    discovered = {domain: [] for domain in domain_patterns.keys()}
    discovered["unknown"] = []
    
    repo_path = Path(repo_dir)
    if not repo_path.exists():
        return discovered
    
    for json_file in repo_path.glob("*.json"):
        file_name = json_file.name.lower()
        matched = False
        
        for domain, patterns in domain_patterns.items():
            for pattern in patterns:
                if re.search(pattern, file_name, re.IGNORECASE):
                    discovered[domain].append(str(json_file))
                    matched = True
                    break
            if matched:
                break
        
        if not matched:
            discovered["unknown"].append(str(json_file))
    
    return discovered


# Export all public symbols
__all__ = [
    "DataDomain",
    "FileType", 
    "UnifiedStationRecord",
    "UnifiedEmissionRecord",
    "UnifiedWaterRecord",
    "UnifiedNoiseRecord",
    "UnifiedIndustryRecord",
    "UnifiedDataFile",
    "FIELD_ALIASES",
    "normalize_field_name",
    "parse_timestamp",
    "extract_records",
    "normalize_record",
    "calculate_aqi_category",
    "discover_data_files",
]
