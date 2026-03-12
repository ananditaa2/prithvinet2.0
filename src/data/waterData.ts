import type { WaterReading, WaterStation, WaterCityKey, WaterCityConfig } from "./waterTypes";

// JSON imports – water quality data
import raipurWater from "./json/water_index_raipur.json";
import durgBhilaiWater from "./json/water_index_durg_bhilai_structured.json";
import raigarhWater from "./json/water_index_Raigarh.json";
import korbaWater from "./json/water_quality_korba.json";
import bilaspurWater from "./json/water_quality_bilaspur_janjgirchampa.json";
import jagdalpurWater from "./json/water_quality_Jagdalpur_NWMP.json";

// Station/industry metadata
import raipurWaterStations from "./json/stations_raipur_water.json";
import raipurWaterIndustries from "./json/industry_raipur_water.json";

// ── City config ──────────────────────────────────────────────
export const WATER_CITIES: WaterCityConfig[] = [
    { key: "raipur", label: "Raipur", region: "Raipur, Chhattisgarh" },
    { key: "durg_bhilai", label: "Durg-Bhilai", region: "Durg-Bhilai, Chhattisgarh" },
    { key: "raigarh", label: "Raigarh", region: "Raigarh, Chhattisgarh" },
    { key: "korba", label: "Korba", region: "Korba, Chhattisgarh" },
    { key: "bilaspur", label: "Bilaspur", region: "Bilaspur, Chhattisgarh" },
    { key: "jagdalpur", label: "Jagdalpur", region: "Jagdalpur, Chhattisgarh" },
];

// ── Helper: safe number ──────────────────────────────────────
function safeNum(v: unknown): number | null {
    if (v === null || v === undefined || v === "BDL" || v === "BLD" || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

// ── Normalizers ──────────────────────────────────────────────

function normalizeRaipur(): { readings: WaterReading[]; stations: WaterStation[] } {
    const data = raipurWater as any;
    const stationMap = new Map<number, string>();
    (data.stations || []).forEach((s: any) => stationMap.set(s.station_code, s.name));

    const readings: WaterReading[] = [];
    (data.monthly_records || []).forEach((rec: any) => {
        (rec.readings || []).forEach((r: any) => {
            readings.push({
                station_code: String(r.station_code),
                station_name: stationMap.get(r.station_code) || `Station ${r.station_code}`,
                city: "Raipur",
                month: rec.month,
                year: rec.year,
                DO: safeNum(r.DO),
                BOD: safeNum(r.BOD),
                FC: safeNum(r.FC),
                TC: safeNum(r.TC),
                status: r.status === "NOT SATISFACTORY" ? "NOT SATISFACTORY" : "SATISFACTORY",
            });
        });
    });

    const stMeta = (raipurWaterStations as any).stations || [];
    const stations: WaterStation[] = stMeta.map((s: any) => ({
        station_code: String(s.station_code),
        name: s.name,
        city: "Raipur",
        lat: s.coordinates?.latitude ?? null,
        lon: s.coordinates?.longitude ?? null,
        water_body: s.river || "River",
        type: "River",
    }));

    return { readings, stations };
}

function normalizeDurgBhilai(): { readings: WaterReading[]; stations: WaterStation[] } {
    const data = durgBhilaiWater as any;
    const stationMap = new Map<number, { name: string; lat: number | null; lon: number | null }>();
    (data.stations || []).forEach((s: any) => {
        stationMap.set(s.station_code, {
            name: s.name,
            lat: s.coordinates?.lat ?? null,
            lon: s.coordinates?.lon ?? null,
        });
    });

    const readings: WaterReading[] = [];
    (data.monthly_records || []).forEach((rec: any) => {
        (rec.readings || []).forEach((r: any) => {
            const st = stationMap.get(r.station_code);
            readings.push({
                station_code: String(r.station_code),
                station_name: st?.name || `Station ${r.station_code}`,
                city: "Durg-Bhilai",
                month: rec.month,
                year: rec.year,
                DO: safeNum(r.DO),
                BOD: safeNum(r.BOD),
                FC: safeNum(r.FC),
                TC: null, // not in this dataset
                status: r.status === "NOT SATISFACTORY" ? "NOT SATISFACTORY" : "SATISFACTORY",
            });
        });
    });

    const stations: WaterStation[] = Array.from(stationMap.entries()).map(([code, info]) => ({
        station_code: String(code),
        name: info.name,
        city: "Durg-Bhilai",
        lat: info.lat,
        lon: info.lon,
        water_body: "Sheonath River",
        type: "River",
    }));

    return { readings, stations };
}

function normalizeRaigarh(): { readings: WaterReading[]; stations: WaterStation[] } {
    const data = raigarhWater as any;
    const readings: WaterReading[] = [];
    const stations: WaterStation[] = [];

    (data.stations || []).forEach((st: any) => {
        stations.push({
            station_code: String(st.station_code),
            name: st.name,
            city: "Raigarh",
            lat: null,
            lon: null,
            water_body: st.name.split(",")[0] || "River",
            type: "River",
        });
        (st.records || []).forEach((r: any) => {
            readings.push({
                station_code: String(st.station_code),
                station_name: st.name,
                city: "Raigarh",
                month: r.month,
                year: r.year,
                DO: safeNum(r.DO),
                BOD: safeNum(r.BOD),
                FC: safeNum(r.FC),
                TC: safeNum(r.TC),
                status: r.status === "NOT SATISFACTORY" ? "NOT SATISFACTORY" : "SATISFACTORY",
            });
        });
    });

    return { readings, stations };
}

function normalizeKorba(): { readings: WaterReading[]; stations: WaterStation[] } {
    const data = korbaWater as any;
    const stationMap = new Map<string, { name: string; lat: number | null; lon: number | null; type: string; water_body: string }>();
    (data.monitoring_stations || []).forEach((s: any) => {
        stationMap.set(String(s.station_code), {
            name: s.station_name,
            lat: s.latitude ?? null,
            lon: s.longitude ?? null,
            type: s.station_type || "River",
            water_body: s.water_body || "Hasdeo River",
        });
    });

    const readings: WaterReading[] = [];
    (data.monitoring_data || []).forEach((rec: any) => {
        const monthName = rec.month_name || rec.month || "";
        (rec.records || []).forEach((r: any) => {
            const st = stationMap.get(String(r.station_code));
            readings.push({
                station_code: String(r.station_code),
                station_name: st?.name || `Station ${r.station_code}`,
                city: "Korba",
                month: monthName,
                year: rec.year,
                DO: safeNum(r.DO),
                BOD: safeNum(r.BOD),
                FC: safeNum(r.FC),
                TC: safeNum(r.TC),
                status: (r.water_quality_status || r.status) === "NOT SATISFACTORY" ? "NOT SATISFACTORY" : "SATISFACTORY",
            });
        });
    });

    const stations: WaterStation[] = Array.from(stationMap.entries()).map(([code, info]) => ({
        station_code: code,
        name: info.name,
        city: "Korba",
        lat: info.lat,
        lon: info.lon,
        water_body: info.water_body,
        type: info.type,
    }));

    return { readings, stations };
}

function normalizeBilaspur(): { readings: WaterReading[]; stations: WaterStation[] } {
    const data = bilaspurWater as any;
    const stationMap = new Map<string, { name: string; lat: number | null; lon: number | null; type: string; water_body: string }>();
    (data.monitoring_stations || []).forEach((s: any) => {
        stationMap.set(String(s.station_code), {
            name: s.station_name,
            lat: s.latitude ?? null,
            lon: s.longitude ?? null,
            type: s.station_type || "River",
            water_body: s.water_body || "Mahanadi River",
        });
    });

    const readings: WaterReading[] = [];
    (data.monitoring_data || []).forEach((rec: any) => {
        (rec.readings || []).forEach((r: any) => {
            const st = stationMap.get(String(r.station_code));
            readings.push({
                station_code: String(r.station_code),
                station_name: st?.name || `Station ${r.station_code}`,
                city: "Bilaspur",
                month: rec.month,
                year: rec.year,
                DO: safeNum(r.DO),
                BOD: safeNum(r.BOD),
                FC: safeNum(r.FC),
                TC: safeNum(r.TC),
                status: (r.status) === "NOT SATISFACTORY" ? "NOT SATISFACTORY" : "SATISFACTORY",
            });
        });
    });

    const stations: WaterStation[] = Array.from(stationMap.entries()).map(([code, info]) => ({
        station_code: code,
        name: info.name,
        city: "Bilaspur",
        lat: info.lat,
        lon: info.lon,
        water_body: info.water_body,
        type: info.type,
    }));

    return { readings, stations };
}

function normalizeJagdalpur(): { readings: WaterReading[]; stations: WaterStation[] } {
    const data = jagdalpurWater as any;
    const readings: WaterReading[] = [];
    const stations: WaterStation[] = [];

    (data.monitoring_stations || []).forEach((st: any) => {
        stations.push({
            station_code: String(st.station_code),
            name: st.station_name,
            city: "Jagdalpur",
            lat: st.latitude ?? null,
            lon: st.longitude ?? null,
            water_body: st.river || "Indrawati River",
            type: "River",
        });
        (st.monitoring_data || []).forEach((r: any) => {
            readings.push({
                station_code: String(st.station_code),
                station_name: st.station_name,
                city: "Jagdalpur",
                month: r.month,
                year: r.year,
                DO: safeNum(r.DO_mg_per_l),
                BOD: safeNum(r.BOD_mg_per_l),
                FC: safeNum(r.FC_MPN_per_100ml),
                TC: safeNum(r.TC_MPN_per_100ml),
                status: (r.water_quality_status) === "NOT SATISFACTORY" ? "NOT SATISFACTORY" : "SATISFACTORY",
            });
        });
    });

    return { readings, stations };
}

// ── Build unified data ───────────────────────────────────────

const raipurNorm = normalizeRaipur();
const durgBhilaiNorm = normalizeDurgBhilai();
const raigarhNorm = normalizeRaigarh();
const korbaNorm = normalizeKorba();
const bilaspurNorm = normalizeBilaspur();
const jagdalpurNorm = normalizeJagdalpur();

const waterCityDataMap: Record<WaterCityKey, { readings: WaterReading[]; stations: WaterStation[] }> = {
    raipur: raipurNorm,
    durg_bhilai: durgBhilaiNorm,
    raigarh: raigarhNorm,
    korba: korbaNorm,
    bilaspur: bilaspurNorm,
    jagdalpur: jagdalpurNorm,
};

// ── Public API ───────────────────────────────────────────────

export function getWaterCityData(city: WaterCityKey) {
    return waterCityDataMap[city];
}

export function getWaterFilteredData(city: WaterCityKey | "all") {
    if (city === "all") {
        return {
            readings: Object.values(waterCityDataMap).flatMap((d) => d.readings),
            stations: Object.values(waterCityDataMap).flatMap((d) => d.stations),
        };
    }
    return getWaterCityData(city);
}

export function getWaterComplianceRate(readings: WaterReading[]): number {
    if (readings.length === 0) return 100;
    const sat = readings.filter((r) => r.status === "SATISFACTORY").length;
    return Math.round((sat / readings.length) * 100);
}

export function getWaterViolations(readings: WaterReading[]): WaterReading[] {
    return readings.filter((r) => r.status === "NOT SATISFACTORY");
}

export function getAverageDO(readings: WaterReading[]): number {
    const valid = readings.filter((r) => r.DO != null && r.DO > 0);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((s, r) => s + (r.DO ?? 0), 0) / valid.length) * 100) / 100;
}

export function getAverageBOD(readings: WaterReading[]): number {
    const valid = readings.filter((r) => r.BOD != null && r.BOD > 0);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((s, r) => s + (r.BOD ?? 0), 0) / valid.length) * 100) / 100;
}

const MONTH_ORDER: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

export function getWaterTrendData(readings: WaterReading[]): { period: string; DO: number; BOD: number }[] {
    const grouped = new Map<string, { doSum: number; doCount: number; bodSum: number; bodCount: number }>();

    readings.forEach((r) => {
        const key = `${r.year}-${String(MONTH_ORDER[r.month] ?? 0).padStart(2, "0")}`;
        if (key === "0-00") return;
        const g = grouped.get(key) || { doSum: 0, doCount: 0, bodSum: 0, bodCount: 0 };
        if (r.DO != null && r.DO > 0) { g.doSum += r.DO; g.doCount++; }
        if (r.BOD != null && r.BOD > 0) { g.bodSum += r.BOD; g.bodCount++; }
        grouped.set(key, g);
    });

    return Array.from(grouped.entries())
        .map(([period, g]) => ({
            period,
            DO: g.doCount > 0 ? Math.round((g.doSum / g.doCount) * 100) / 100 : 0,
            BOD: g.bodCount > 0 ? Math.round((g.bodSum / g.bodCount) * 100) / 100 : 0,
        }))
        .sort((a, b) => a.period.localeCompare(b.period))
        .slice(-24); // last 24 months for readability
}

export function getWaterCityComparison(): { city: string; compliance: number; avgDO: number; violations: number }[] {
    return WATER_CITIES.map((c) => {
        const data = getWaterCityData(c.key);
        return {
            city: c.label,
            compliance: getWaterComplianceRate(data.readings),
            avgDO: getAverageDO(data.readings),
            violations: getWaterViolations(data.readings).length,
        };
    });
}

export function getLatestWaterReadings(readings: WaterReading[], stations: WaterStation[]) {
    return stations.map((station) => {
        const stationReadings = readings
            .filter((r) => r.station_code === station.station_code)
            .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return (MONTH_ORDER[b.month] ?? 0) - (MONTH_ORDER[a.month] ?? 0);
            });
        const latest = stationReadings[0];
        return {
            ...station,
            latestDO: latest?.DO ?? null,
            latestBOD: latest?.BOD ?? null,
            latestFC: latest?.FC ?? null,
            latestTC: latest?.TC ?? null,
            latestStatus: latest?.status ?? "N/A",
            latestPeriod: latest ? `${latest.month} ${latest.year}` : "N/A",
        };
    });
}

export { raipurWaterIndustries };
