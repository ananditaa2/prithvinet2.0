import type { NoiseObservation, NoiseStation, NoiseCityKey, NoiseCityConfig, NoiseZone } from "./noiseTypes";
import { NOISE_LIMITS } from "./noiseTypes";

// JSON imports
import raipurNoiseObs from "./json/noise_observations_hourly_raipur.json";
import raipurNoiseStations from "./json/monitoring_stations_raipur_noise.json";
import bhilaiNoise from "./json/noise_bhilai_mock.json";
import korbaNoise from "./json/noise_korba_mock.json";
import raigarhNoise from "./json/noise_raigarh_mock.json";
import bilaspurNoise from "./json/noise_bilaspur_mock.json";

// ── City config ──────────────────────────────────────────────
export const NOISE_CITIES: NoiseCityConfig[] = [
    { key: "raipur", label: "Raipur", region: "Raipur, Chhattisgarh" },
    { key: "bhilai", label: "Bhilai-Durg", region: "Bhilai-Durg, Chhattisgarh" },
    { key: "korba", label: "Korba", region: "Korba, Chhattisgarh" },
    { key: "raigarh", label: "Raigarh", region: "Raigarh, Chhattisgarh" },
    { key: "bilaspur", label: "Bilaspur", region: "Bilaspur, Chhattisgarh" },
];

// ── Normalizers ──────────────────────────────────────────────

function normalizeRaipur(): { observations: NoiseObservation[]; stations: NoiseStation[] } {
    const obs = (raipurNoiseObs as any).observations as any[];
    const st = (raipurNoiseStations as any).stations as any[];
    return {
        observations: obs.map((o) => ({ ...o, city: "Raipur" } as NoiseObservation)),
        stations: st.map((s) => ({ ...s, city: "Raipur" } as NoiseStation)),
    };
}

function normalizeMockCity(data: any, city: string): { observations: NoiseObservation[]; stations: NoiseStation[] } {
    return {
        observations: (data.observations as any[]).map((o) => ({ ...o, city } as NoiseObservation)),
        stations: (data.stations as any[]).map((s) => ({ ...s, city } as NoiseStation)),
    };
}

// ── Build unified data ───────────────────────────────────────

const noiseCityDataMap: Record<NoiseCityKey, { observations: NoiseObservation[]; stations: NoiseStation[] }> = {
    raipur: normalizeRaipur(),
    bhilai: normalizeMockCity(bhilaiNoise, "Bhilai-Durg"),
    korba: normalizeMockCity(korbaNoise, "Korba"),
    raigarh: normalizeMockCity(raigarhNoise, "Raigarh"),
    bilaspur: normalizeMockCity(bilaspurNoise, "Bilaspur"),
};

// ── Public API ───────────────────────────────────────────────

export function getNoiseCityData(city: NoiseCityKey) {
    return noiseCityDataMap[city];
}

export function getNoiseFilteredData(city: NoiseCityKey | "all") {
    if (city === "all") {
        return {
            observations: Object.values(noiseCityDataMap).flatMap((d) => d.observations),
            stations: Object.values(noiseCityDataMap).flatMap((d) => d.stations),
        };
    }
    return getNoiseCityData(city);
}

export function getAverageNoise(observations: NoiseObservation[]): number {
    if (observations.length === 0) return 0;
    return Math.round((observations.reduce((s, o) => s + o.noise_db, 0) / observations.length) * 10) / 10;
}

export function getNoiseViolations(observations: NoiseObservation[]): NoiseObservation[] {
    return observations.filter((o) => o.noise_db > NOISE_LIMITS[o.zone]);
}

export function getNoiseComplianceRate(observations: NoiseObservation[]): number {
    if (observations.length === 0) return 100;
    const compliant = observations.filter((o) => o.noise_db <= NOISE_LIMITS[o.zone]).length;
    return Math.round((compliant / observations.length) * 100);
}

export function getNoiseHourlyTrend(observations: NoiseObservation[]): { time: string; Working: number; NonWorking: number }[] {
    const timeSlots = ["07-08", "08-09", "09-10", "10-11", "11-12", "12-13", "13-14", "14-15", "15-16", "16-17", "17-18", "18-19", "19-20", "20-21"];

    return timeSlots.map((time) => {
        const working = observations.filter((o) => o.time === time && o.day_type === "Working");
        const nonWorking = observations.filter((o) => o.time === time && o.day_type === "NonWorking");
        return {
            time: time.replace("-", "–"),
            Working: working.length > 0 ? Math.round((working.reduce((s, o) => s + o.noise_db, 0) / working.length) * 10) / 10 : 0,
            NonWorking: nonWorking.length > 0 ? Math.round((nonWorking.reduce((s, o) => s + o.noise_db, 0) / nonWorking.length) * 10) / 10 : 0,
        };
    });
}

export function getNoiseCityComparison(): { city: string; avgNoise: number; compliance: number; violations: number }[] {
    return NOISE_CITIES.map((c) => {
        const data = getNoiseCityData(c.key);
        return {
            city: c.label,
            avgNoise: getAverageNoise(data.observations),
            compliance: getNoiseComplianceRate(data.observations),
            violations: getNoiseViolations(data.observations).length,
        };
    });
}

export function getNoiseZoneBreakdown(observations: NoiseObservation[]): { zone: NoiseZone; avgDb: number; limit: number; compliance: number }[] {
    const zones: NoiseZone[] = ["Commercial", "Silent", "Residential", "Industrial"];
    return zones.map((zone) => {
        const zoneObs = observations.filter((o) => o.zone === zone);
        return {
            zone,
            avgDb: getAverageNoise(zoneObs),
            limit: NOISE_LIMITS[zone],
            compliance: getNoiseComplianceRate(zoneObs),
        };
    }).filter((z) => z.avgDb > 0);
}

export function getLatestNoiseReadings(observations: NoiseObservation[], stations: NoiseStation[]) {
    return stations.map((station) => {
        const stObs = observations.filter((o) => o.station === station.name);
        const avgDb = getAverageNoise(stObs);
        const limit = NOISE_LIMITS[station.zone];
        const violations = stObs.filter((o) => o.noise_db > limit).length;
        return {
            ...station,
            avgDb,
            limit,
            violations,
            compliance: stObs.length > 0 ? Math.round(((stObs.length - violations) / stObs.length) * 100) : 100,
            status: avgDb > limit ? "EXCEEDS" : "WITHIN LIMIT" as "EXCEEDS" | "WITHIN LIMIT",
        };
    });
}
