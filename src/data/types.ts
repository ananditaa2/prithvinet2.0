export enum UserRole {
    SUPER_ADMIN = "Super Admin",
    REGIONAL_OFFICER = "Regional Officer",
    MONITORING_TEAM = "Monitoring Team",
    INDUSTRY_USER = "Industry User",
    CITIZEN = "Citizen Portal",
}

export interface Pollutants {
    SO2?: number;
    NOx?: number;
    NO2?: number;
    PM10?: number;
    "PM2.5"?: number;
}

export interface EmissionLog {
    id: string;
    station_id: string;
    station_name: string;
    station_type: string;
    lat: number;
    lng: number;
    timestamp: string;
    season: string;
    pollutants: Pollutants;
    AQI: number | null;
    AQI_category: string;
    compliance_status: string;
    violations: string[];
    region: string;
    source: string;
}

export interface Station {
    station_id: string;
    name: string;
    code?: string;
    type: string;
    lat: number;
    lng: number;
    region: string;
    active: boolean;
}

export interface Industry {
    industry_id: string;
    name: string;
    type: string;
    lat: number;
    lng: number;
    station_id: string;
    high_risk: boolean;
    region?: string;
    capacity_mw?: number | null;
    primary_pollutants?: string[];
}

export interface PrescribedLimits {
    source: string;
    unit: string;
    limits: {
        SO2: number;
        NOx: number;
        PM10: number;
        "PM2.5": number;
    };
}

export type CityKey = "bhilai" | "korba" | "raigarh" | "raipur" | "bilaspur";

export interface CityConfig {
    key: CityKey;
    label: string;
    region: string;
}

export interface CityData {
    emissions: EmissionLog[];
    stations: Station[];
    industries: Industry[];
}
