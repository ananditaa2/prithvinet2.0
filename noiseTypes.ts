export type NoiseCityKey = "raipur" | "bhilai" | "korba" | "raigarh" | "bilaspur";

export interface NoiseCityConfig {
    key: NoiseCityKey;
    label: string;
    region: string;
}

export type NoiseZone = "Commercial" | "Silent" | "Residential" | "Industrial";

export interface NoiseObservation {
    station: string;
    zone: NoiseZone;
    day_type: "Working" | "NonWorking";
    time: string;
    noise_db: number;
    city: string;
}

export interface NoiseStation {
    id: number;
    name: string;
    zone: NoiseZone;
    lat: number;
    lon: number;
    city: string;
}

export interface NoiseLimit {
    zone: NoiseZone;
    limit_db: number;
}

export const NOISE_LIMITS: Record<NoiseZone, number> = {
    Commercial: 65,
    Silent: 50,
    Residential: 55,
    Industrial: 75,
};
