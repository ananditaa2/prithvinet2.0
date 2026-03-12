import type { EmissionLog, Station, Industry, PrescribedLimits, CityKey, CityConfig, CityData } from "./types";

// JSON imports
import bhilaiEmissions from "./json/emission_logs_bhiali_aqi.json";
import korbaEmissions from "./json/emission_logs_korba.json";
import raigarhEmissions from "./json/emission_logs_raigarh.json";
import raipurEmissions from "./json/emission_logs_raipur.json";
import bilaspurEmissions from "./json/emission_logs_AQI_bilaspur.json";

import bhilaiIndustries from "./json/industries_bhilai_aqi.json";
import korbaIndustries from "./json/industries_aqi_korba.json";
import raigarhIndustries from "./json/industries_aqi_raigarh.json";
import raipurIndustries from "./json/industries_aqi_raipur.json";
import bilaspurIndustries from "./json/industries_AQI_Bilaspur.json";

import bhilaiStations from "./json/stations_bhilai_aqi.json";
import korbaStations from "./json/stations_aqi_korba.json";
import raigarhStations from "./json/stations_aqi_raigarh.json";
import raipurStations from "./json/stations_aqi_raipur.json";
import bilaspurStations from "./json/stations_AQI_bilaspur.json";

import limitsJson from "./json/prescribed_limits.json";

export const prescribedLimits: PrescribedLimits = limitsJson as PrescribedLimits;

export const CITIES: CityConfig[] = [
    { key: "bhilai", label: "Bhilai-Durg", region: "Bhilai-Durg, Chhattisgarh" },
    { key: "korba", label: "Korba", region: "Korba, Chhattisgarh" },
    { key: "raigarh", label: "Raigarh", region: "Raigarh, Chhattisgarh" },
    { key: "raipur", label: "Raipur", region: "Raipur, Chhattisgarh" },
    { key: "bilaspur", label: "Bilaspur", region: "Bilaspur, Chhattisgarh" },
];

const cityDataMap: Record<CityKey, CityData> = {
    bhilai: {
        emissions: bhilaiEmissions as EmissionLog[],
        stations: bhilaiStations as Station[],
        industries: bhilaiIndustries as Industry[],
    },
    korba: {
        emissions: korbaEmissions as EmissionLog[],
        stations: korbaStations as Station[],
        industries: korbaIndustries as Industry[],
    },
    raigarh: {
        emissions: raigarhEmissions as EmissionLog[],
        stations: raigarhStations as Station[],
        industries: raigarhIndustries as Industry[],
    },
    raipur: {
        emissions: raipurEmissions as EmissionLog[],
        stations: raipurStations as Station[],
        industries: raipurIndustries as Industry[],
    },
    bilaspur: {
        emissions: bilaspurEmissions as EmissionLog[],
        stations: bilaspurStations as Station[],
        industries: bilaspurIndustries as Industry[],
    },
};

export function getCityData(city: CityKey): CityData {
    return cityDataMap[city];
}

export function getAllEmissions(): EmissionLog[] {
    return Object.values(cityDataMap).flatMap((d) => d.emissions);
}

export function getAllStations(): Station[] {
    // Deduplicate by station_id
    const map = new Map<string, Station>();
    Object.values(cityDataMap).forEach((d) =>
        d.stations.forEach((s) => map.set(s.station_id, s))
    );
    return Array.from(map.values());
}

export function getAllIndustries(): Industry[] {
    // Deduplicate by industry_id
    const map = new Map<string, Industry>();
    Object.values(cityDataMap).forEach((d) =>
        d.industries.forEach((ind) => map.set(ind.industry_id, ind))
    );
    return Array.from(map.values());
}

export function getFilteredData(city: CityKey | "all"): CityData {
    if (city === "all") {
        return {
            emissions: getAllEmissions(),
            stations: getAllStations(),
            industries: getAllIndustries(),
        };
    }
    return getCityData(city);
}

export function getAverageAQI(emissions: EmissionLog[]): number {
    const valid = emissions.filter((e) => e.AQI != null);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((sum, e) => sum + (e.AQI ?? 0), 0) / valid.length);
}

export function getViolations(emissions: EmissionLog[]): EmissionLog[] {
    return emissions.filter((e) => e.compliance_status === "VIOLATION");
}

export function getComplianceRate(emissions: EmissionLog[]): number {
    if (emissions.length === 0) return 100;
    const compliant = emissions.filter((e) => e.compliance_status === "COMPLIANT").length;
    return Math.round((compliant / emissions.length) * 100);
}

export function getCityComparison(): { city: string; avgAQI: number; violations: number; compliance: number }[] {
    return CITIES.map((c) => {
        const data = getCityData(c.key);
        return {
            city: c.label,
            avgAQI: getAverageAQI(data.emissions),
            violations: getViolations(data.emissions).length,
            compliance: getComplianceRate(data.emissions),
        };
    });
}

export function getAqiTrendData(emissions: EmissionLog[]): { date: string; AQI: number; category: string }[] {
    // Group by date, average AQI per date, sort chronologically
    const grouped = new Map<string, { total: number; count: number; category: string }>();
    emissions.forEach((e) => {
        if (e.AQI == null) return;
        const date = e.timestamp.split("T")[0];
        const existing = grouped.get(date) || { total: 0, count: 0, category: e.AQI_category };
        existing.total += e.AQI;
        existing.count += 1;
        grouped.set(date, existing);
    });

    return Array.from(grouped.entries())
        .map(([date, { total, count, category }]) => ({
            date,
            AQI: Math.round(total / count),
            category,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function getPollutantAverages(emissions: EmissionLog[]): { pollutant: string; average: number; limit: number }[] {
    const sums: Record<string, { total: number; count: number }> = {};
    const pollutantKeys = ["SO2", "NOx", "NO2", "PM10", "PM2.5"];

    emissions.forEach((e) => {
        pollutantKeys.forEach((key) => {
            const val = (e.pollutants as Record<string, number | undefined>)[key];
            if (val != null) {
                if (!sums[key]) sums[key] = { total: 0, count: 0 };
                sums[key].total += val;
                sums[key].count += 1;
            }
        });
    });

    const limits = prescribedLimits.limits as Record<string, number>;

    return Object.entries(sums)
        .filter(([, v]) => v.count > 0)
        .map(([key, v]) => ({
            pollutant: key,
            average: Math.round((v.total / v.count) * 100) / 100,
            limit: limits[key] ?? limits["NOx"] ?? 80, // NO2 uses NOx limit
        }));
}

export function getLatestReadings(emissions: EmissionLog[], stations: Station[]): (Station & { latestAQI: number | null; latestCategory: string; latestDate: string; compliance: string })[] {
    return stations.map((station) => {
        const stationLogs = emissions
            .filter((e) => e.station_id === station.station_id)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const latest = stationLogs[0];
        return {
            ...station,
            latestAQI: latest?.AQI ?? null,
            latestCategory: latest?.AQI_category ?? "N/A",
            latestDate: latest?.timestamp?.split("T")[0] ?? "N/A",
            compliance: latest?.compliance_status ?? "N/A",
        };
    });
}
