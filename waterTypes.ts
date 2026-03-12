export type WaterCityKey = "raipur" | "durg_bhilai" | "raigarh" | "korba" | "bilaspur" | "jagdalpur";

export interface WaterCityConfig {
    key: WaterCityKey;
    label: string;
    region: string;
}

export interface WaterReading {
    station_code: string;
    station_name: string;
    city: string;
    month: string;
    year: number;
    DO: number | null;
    BOD: number | null;
    FC: number | null;
    TC: number | null;
    status: "SATISFACTORY" | "NOT SATISFACTORY";
}

export interface WaterStation {
    station_code: string;
    name: string;
    city: string;
    lat: number | null;
    lon: number | null;
    water_body: string;
    type: string;
}

export interface WaterIndustry {
    id: string;
    name: string;
    type: string;
    river_proximity: string;
    lat: number;
    lon: number;
    district: string;
}

export interface WaterQualityCriteria {
    DO: string;
    BOD: string;
    FC: string;
    TC: string;
}

export const WATER_CRITERIA = {
    DO: 4.0,   // mg/l — must be ABOVE this
    BOD: 3.0,  // mg/l — must be BELOW this
    FC: 2500,  // MPN/100ml — must be BELOW this
    TC: 5000,  // MPN/100ml — must be BELOW this
};
