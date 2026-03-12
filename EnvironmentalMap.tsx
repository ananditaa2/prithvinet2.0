import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L, {
  type DivIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
} from "leaflet";
import "leaflet/dist/leaflet.css";

import { getFilteredData, getLatestReadings } from "@/data/aqiData";
import { getWaterFilteredData, getLatestWaterReadings } from "@/data/waterData";
import { getNoiseFilteredData, getLatestNoiseReadings } from "@/data/noiseData";
import { NOISE_LIMITS, type NoiseZone } from "@/data/noiseTypes";
import { WATER_CRITERIA } from "@/data/waterTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Droplets,
  Layers3,
  MapPinned,
  Radio,
  Volume2,
  Wind,
  Zap,
} from "lucide-react";

type LayerKey = "air" | "water" | "noise";
type PopupTone = "compliant" | "violation";

type AirMarkerPoint = {
  id: string;
  name: string;
  type: string;
  region: string;
  lat: number;
  lng: number;
  aqi: number | null;
  category: string;
  compliance: string;
  date: string;
  pollutants: Record<string, number | undefined>;
};

type WaterMarkerPoint = {
  id: string;
  name: string;
  type: string;
  city: string;
  waterBody: string;
  lat: number;
  lng: number;
  latestDO: number | null;
  latestBOD: number | null;
  latestFC: number | null;
  latestTC: number | null;
  latestStatus: string;
  latestPeriod: string;
};

type NoiseMarkerPoint = {
  id: string;
  name: string;
  city: string;
  zone: NoiseZone;
  lat: number;
  lng: number;
  avgDb: number;
  limit: number;
  violations: number;
  status: "EXCEEDS" | "WITHIN LIMIT";
};

type CrisisZone = {
  id: string;
  lat: number;
  lng: number;
  score: number;
  air?: AirMarkerPoint;
  water?: WaterMarkerPoint;
  noise?: NoiseMarkerPoint;
};

const CHHATTISGARH_CENTER: LatLngExpression = [21.2787, 81.8661];
const DEFAULT_ZOOM = 7;

const CARTO_DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const LAYER_META: Record<
  LayerKey,
  {
    label: string;
    icon: typeof Wind;
    border: string;
    accent: string;
    text: string;
  }
> = {
  air: {
    label: "Air Quality",
    icon: Wind,
    border: "border-emerald-400/30",
    accent: "from-emerald-400/25 via-cyan-400/20 to-transparent",
    text: "text-emerald-100",
  },
  water: {
    label: "Water Quality",
    icon: Droplets,
    border: "border-cyan-400/30",
    accent: "from-cyan-400/25 via-blue-400/20 to-transparent",
    text: "text-cyan-100",
  },
  noise: {
    label: "Noise Pollution",
    icon: Volume2,
    border: "border-violet-400/30",
    accent: "from-violet-400/25 via-fuchsia-400/20 to-transparent",
    text: "text-violet-100",
  },
};

function injectLeafletCommandStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("environmental-map-command-styles")) return;

  const style = document.createElement("style");
  style.id = "environmental-map-command-styles";
  style.innerHTML = `
    .environmental-command-map.leaflet-container {
      background:
        radial-gradient(circle at 50% 18%, rgba(34, 211, 238, 0.08), transparent 28%),
        radial-gradient(circle at 82% 76%, rgba(168, 85, 247, 0.08), transparent 24%),
        #020617;
      font-family: Inter, sans-serif;
    }

    .environmental-command-map .leaflet-control-zoom {
      display: none;
    }

    .environmental-command-map .leaflet-popup-content-wrapper {
      background: transparent;
      box-shadow: none;
      padding: 0;
      border: 0;
    }

    .environmental-command-map .leaflet-popup-content {
      margin: 0;
      min-width: 290px;
    }

    .environmental-command-map .leaflet-popup-tip {
      background: rgba(15, 23, 42, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.14);
      box-shadow: 0 16px 50px rgba(2, 6, 23, 0.45);
    }

    .air-glow-marker {
      filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.45));
    }

    .noise-ring-core {
      filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.45));
    }

    .crisis-aura-ring {
      animation: env-crisis-pulse 2.4s ease-in-out infinite;
      transform-origin: center;
    }

    @keyframes env-crisis-pulse {
      0%, 100% {
        transform: scale(0.94);
        opacity: 0.35;
      }
      50% {
        transform: scale(1.08);
        opacity: 0.75;
      }
    }
  `;
  document.head.appendChild(style);
}

function FitBoundsController({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(CHHATTISGARH_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(points as LatLngBoundsExpression);
    map.fitBounds(bounds, {
      padding: [52, 52],
      maxZoom: 9,
    });
  }, [map, points]);

  return null;
}

function getAqiVisuals(aqi: number | null) {
  if (aqi === null) {
    return { color: "#94a3b8", label: "Unknown" };
  }
  if (aqi <= 50) return { color: "#22c55e", label: "Good" };
  if (aqi <= 100) return { color: "#84cc16", label: "Satisfactory" };
  if (aqi <= 200) return { color: "#f59e0b", label: "Moderate" };
  if (aqi <= 300) return { color: "#f97316", label: "Poor" };
  if (aqi <= 400) return { color: "#ef4444", label: "Very Poor" };
  return { color: "#b91c1c", label: "Severe" };
}

function getWaterVisuals(status: string) {
  if (status === "SATISFACTORY") {
    return { color: "#10b981", label: "Compliant" };
  }
  return { color: "#ef4444", label: "Violation" };
}

function getNoiseVisuals(status: "EXCEEDS" | "WITHIN LIMIT") {
  if (status === "WITHIN LIMIT") {
    return { color: "#8b5cf6", label: "Compliant" };
  }
  return { color: "#ef4444", label: "Violation" };
}

function formatValue(value: number | null, unit: string) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value} ${unit}`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const int = Number.parseInt(expanded, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildWaterIcon(color: string): DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [28, 38],
    iconAnchor: [14, 34],
    popupAnchor: [0, -28],
    html: `
      <div style="position:relative;width:28px;height:38px;display:flex;align-items:flex-start;justify-content:center;">
        <div style="
          position:absolute;
          top:2px;
          left:2px;
          width:24px;
          height:24px;
          background:${color};
          border:2px solid rgba(255,255,255,0.96);
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 0 24px ${hexToRgba(color, 0.58)}, 0 10px 24px rgba(0,0,0,0.45);
        "></div>
        <div style="
          position:absolute;
          top:10px;
          left:10px;
          width:8px;
          height:8px;
          border-radius:9999px;
          background:rgba(255,255,255,0.96);
          box-shadow:0 0 10px rgba(255,255,255,0.55);
        "></div>
      </div>
    `,
  });
}

function statusBadgeClass(tone: PopupTone) {
  return tone === "compliant"
    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
    : "border-red-400/30 bg-red-500/15 text-red-200";
}

function PopupCard({
  title,
  subtitle,
  icon,
  status,
  tone,
  readings,
  footerLeft,
  footerRight,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  status: string;
  tone: PopupTone;
  readings: Array<{ label: string; value: string }>;
  footerLeft: string;
  footerRight: string;
}) {
  return (
    <div className="w-[300px] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 text-slate-100 shadow-[0_28px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2 shadow-inner">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold leading-tight text-white">
              {title}
            </h4>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]",
            statusBadgeClass(tone),
          )}
        >
          {status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {readings.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800/80 bg-slate-900/65 px-3 py-2.5"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
        <span>{footerLeft}</span>
        <span>{footerRight}</span>
      </div>
    </div>
  );
}

function LayerToggle({
  layer,
  checked,
  count,
  onChange,
}: {
  layer: LayerKey;
  checked: boolean;
  count: number;
  onChange: (checked: boolean) => void;
}) {
  const meta = LAYER_META[layer];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border bg-slate-950/85 px-4 py-3 shadow-[0_14px_40px_rgba(2,6,23,0.36)] backdrop-blur-xl",
        meta.border,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "rounded-xl border border-white/10 bg-gradient-to-br p-2.5",
            meta.accent,
          )}
        >
          <Icon className={cn("h-4 w-4 text-white")} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{meta.label}</p>
          <p className="text-xs text-slate-400">{count} live stations</p>
        </div>
      </div>

      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "blue" | "violet";
}) {
  const toneClass = {
    cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    blue: "border-blue-400/25 bg-blue-500/10 text-blue-100",
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-100",
  }[tone];

  return (
    <div
      className={cn("rounded-2xl border px-4 py-3 backdrop-blur-xl", toneClass)}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-3 w-3 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 12px ${hexToRgba(color, 0.6)}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function CrisisSignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function average(values: Array<number | undefined>) {
  const valid = values.filter(
    (value): value is number => typeof value === "number",
  );
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function dedupeCrisisZones(zones: CrisisZone[]) {
  const unique: CrisisZone[] = [];

  zones.forEach((zone) => {
    const exists = unique.some(
      (item) => distanceKm(item.lat, item.lng, zone.lat, zone.lng) <= 10,
    );

    if (!exists) unique.push(zone);
  });

  return unique;
}

export default function EnvironmentalMap() {
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>(
    {
      air: true,
      water: true,
      noise: true,
    },
  );

  useEffect(() => {
    injectLeafletCommandStyles();
  }, []);

  const airStations = useMemo<AirMarkerPoint[]>(() => {
    const air = getFilteredData("all");
    const latestStations = getLatestReadings(air.emissions, air.stations);

    const latestEmissionByStation = new Map(
      air.emissions
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .map((item) => [item.station_id, item] as const),
    );

    return latestStations
      .filter(
        (station) =>
          Number.isFinite(station.lat) && Number.isFinite(station.lng),
      )
      .map((station) => {
        const latest = latestEmissionByStation.get(station.station_id);

        return {
          id: station.station_id,
          name: station.name,
          type: station.type,
          region: station.region,
          lat: station.lat,
          lng: station.lng,
          aqi: station.latestAQI,
          category: station.latestCategory,
          compliance: station.compliance,
          date: station.latestDate,
          pollutants: latest?.pollutants ?? {},
        };
      });
  }, []);

  const waterStations = useMemo<WaterMarkerPoint[]>(() => {
    const water = getWaterFilteredData("all");

    return getLatestWaterReadings(water.readings, water.stations)
      .filter(
        (station) =>
          Number.isFinite(station.lat) && Number.isFinite(station.lon),
      )
      .map((station) => ({
        id: station.station_code,
        name: station.name,
        type: station.type || "River Monitoring",
        city: station.city,
        waterBody: station.water_body,
        lat: station.lat as number,
        lng: station.lon as number,
        latestDO: station.latestDO,
        latestBOD: station.latestBOD,
        latestFC: station.latestFC,
        latestTC: station.latestTC,
        latestStatus: station.latestStatus,
        latestPeriod: station.latestPeriod,
      }));
  }, []);

  const noiseStations = useMemo<NoiseMarkerPoint[]>(() => {
    const noise = getNoiseFilteredData("all");

    return getLatestNoiseReadings(noise.observations, noise.stations)
      .filter(
        (station) =>
          Number.isFinite(station.lat) && Number.isFinite(station.lon),
      )
      .map((station) => ({
        id: `${station.city}-${station.name}`,
        name: station.name,
        city: station.city,
        zone: station.zone,
        lat: station.lat,
        lng: station.lon,
        avgDb: station.avgDb,
        limit: station.limit,
        violations: station.violations,
        status: station.status,
      }));
  }, []);

  const visiblePoints = useMemo(() => {
    const points: Array<[number, number]> = [];

    if (visibleLayers.air) {
      airStations.forEach((station) => points.push([station.lat, station.lng]));
    }
    if (visibleLayers.water) {
      waterStations.forEach((station) =>
        points.push([station.lat, station.lng]),
      );
    }
    if (visibleLayers.noise) {
      noiseStations.forEach((station) =>
        points.push([station.lat, station.lng]),
      );
    }

    return points;
  }, [airStations, noiseStations, visibleLayers, waterStations]);

  const crisisZones = useMemo<CrisisZone[]>(() => {
    if (!(visibleLayers.air && visibleLayers.water && visibleLayers.noise)) {
      return [];
    }

    const criticalAir = airStations.filter(
      (station) =>
        station.compliance === "VIOLATION" || (station.aqi ?? 0) > 200,
    );
    const criticalWater = waterStations.filter(
      (station) => station.latestStatus !== "SATISFACTORY",
    );
    const criticalNoise = noiseStations.filter(
      (station) => station.status === "EXCEEDS",
    );

    const clusterRadiusKm = 35;
    const zones: CrisisZone[] = [];

    criticalAir.forEach((air) => {
      const nearbyWater = criticalWater.find(
        (water) =>
          distanceKm(air.lat, air.lng, water.lat, water.lng) <= clusterRadiusKm,
      );
      const nearbyNoise = criticalNoise.find(
        (noise) =>
          distanceKm(air.lat, air.lng, noise.lat, noise.lng) <= clusterRadiusKm,
      );

      if (!nearbyWater && !nearbyNoise) return;

      zones.push({
        id: `crisis-${air.id}-${nearbyWater?.id ?? "none"}-${nearbyNoise?.id ?? "none"}`,
        lat: average([air.lat, nearbyWater?.lat, nearbyNoise?.lat]),
        lng: average([air.lng, nearbyWater?.lng, nearbyNoise?.lng]),
        score: [air, nearbyWater, nearbyNoise].filter(Boolean).length,
        air,
        water: nearbyWater,
        noise: nearbyNoise,
      });
    });

    return dedupeCrisisZones(zones);
  }, [airStations, noiseStations, visibleLayers, waterStations]);

  const visibleStationCount =
    (visibleLayers.air ? airStations.length : 0) +
    (visibleLayers.water ? waterStations.length : 0) +
    (visibleLayers.noise ? noiseStations.length : 0);

  const activeLayerSummary = useMemo(() => {
    const labels: string[] = [];
    if (visibleLayers.air) labels.push("AQI");
    if (visibleLayers.water) labels.push("Water");
    if (visibleLayers.noise) labels.push("Noise");
    return labels.length ? labels.join(" • ") : "No layers active";
  }, [visibleLayers]);

  const airViolationCount = airStations.filter(
    (station) => station.compliance === "VIOLATION",
  ).length;
  const waterViolationCount = waterStations.filter(
    (station) => station.latestStatus !== "SATISFACTORY",
  ).length;
  const noiseViolationCount = noiseStations.filter(
    (station) => station.status === "EXCEEDS",
  ).length;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-800/70 bg-slate-950 shadow-[0_24px_100px_rgba(2,6,23,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_24%)]" />

      <div className="relative border-b border-slate-800/80 bg-slate-950/90 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200 hover:bg-cyan-500/10">
                Command Center Map
              </Badge>
              <Badge className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-red-200 hover:bg-red-500/10">
                {crisisZones.length > 0
                  ? `${crisisZones.length} Crisis Zones`
                  : "Statewide Scan Active"}
              </Badge>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-inner">
                <MapPinned className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Interactive Environmental Map
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 md:text-[15px]">
                  A live multi-layer command view of Chhattisgarh combining air,
                  water, and noise intelligence into one immersive geospatial
                  surface. Toggle layers, inspect stations, and expose
                  overlapping crisis corridors instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[440px]">
            <MetricPill
              label="Visible Stations"
              value={String(visibleStationCount)}
              tone="cyan"
            />
            <MetricPill
              label="Air Alerts"
              value={String(airViolationCount)}
              tone="emerald"
            />
            <MetricPill
              label="Water Violations"
              value={String(waterViolationCount)}
              tone="blue"
            />
            <MetricPill
              label="Noise Exceedances"
              value={String(noiseViolationCount)}
              tone="violet"
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-4 z-[1000] w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-[24px] border border-slate-700/70 bg-slate-950/80 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.4)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Layer Control
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {activeLayerSummary}
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setVisibleLayers({ air: true, water: true, noise: true })
                }
                className="h-8 rounded-full border-slate-700 bg-slate-900/70 px-3 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                Reset
              </Button>
            </div>

            <div className="space-y-3">
              <LayerToggle
                layer="air"
                checked={visibleLayers.air}
                count={airStations.length}
                onChange={(checked) =>
                  setVisibleLayers((prev) => ({ ...prev, air: checked }))
                }
              />
              <LayerToggle
                layer="water"
                checked={visibleLayers.water}
                count={waterStations.length}
                onChange={(checked) =>
                  setVisibleLayers((prev) => ({ ...prev, water: checked }))
                }
              />
              <LayerToggle
                layer="noise"
                checked={visibleLayers.noise}
                count={noiseStations.length}
                onChange={(checked) =>
                  setVisibleLayers((prev) => ({ ...prev, noise: checked }))
                }
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <Zap className="h-3.5 w-3.5 text-red-300" />
                God Mode
              </div>
              <p className="text-xs leading-5 text-slate-400">
                When all three layers are enabled, overlapping violations are
                highlighted as pulsing red crisis auras to reveal multi-source
                environmental stress zones.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-[1000] hidden md:block">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/75 px-4 py-3 text-xs text-slate-300 shadow-[0_12px_40px_rgba(2,6,23,0.38)] backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              <Radio className="h-3.5 w-3.5 text-cyan-300" />
              Legend
            </div>
            <div className="space-y-2">
              <LegendRow color="#22c55e" label="Air Good" />
              <LegendRow color="#10b981" label="Water Compliant" />
              <LegendRow color="#8b5cf6" label="Noise Compliant" />
              <LegendRow color="#ef4444" label="Violation / Exceedance" />
            </div>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-[1000] hidden md:block">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/75 px-4 py-3 text-xs text-slate-300 shadow-[0_12px_40px_rgba(2,6,23,0.38)] backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              <Layers3 className="h-3.5 w-3.5 text-cyan-300" />
              Thresholds
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <p>AQI alert: &gt; 200</p>
              <p>Water DO min: ≥ {WATER_CRITERIA.DO} mg/L</p>
              <p>Residential noise: ≤ {NOISE_LIMITS.Residential} dB</p>
            </div>
          </div>
        </div>

        <MapContainer
          center={CHHATTISGARH_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          zoomControl={false}
          className="environmental-command-map h-[620px] w-full md:h-[680px]"
        >
          <TileLayer attribution={MAP_ATTRIBUTION} url={CARTO_DARK_TILES} />
          <FitBoundsController points={visiblePoints} />

          <Pane name="crisisPane" style={{ zIndex: 410 }} />
          <Pane name="airPane" style={{ zIndex: 420 }} />
          <Pane name="waterPane" style={{ zIndex: 430 }} />
          <Pane name="noisePane" style={{ zIndex: 440 }} />

          {visibleLayers.air &&
            airStations.map((station) => {
              const visuals = getAqiVisuals(station.aqi);
              const radius =
                station.aqi === null
                  ? 8
                  : Math.min(18, Math.max(8, station.aqi / 18));

              return (
                <>
                  <CircleMarker
                    key={`${station.id}-outer`}
                    center={[station.lat, station.lng]}
                    radius={radius + 5}
                    pathOptions={{
                      color: visuals.color,
                      weight: 0,
                      fillColor: visuals.color,
                      fillOpacity: 0.18,
                    }}
                  />
                  <CircleMarker
                    key={`${station.id}-core`}
                    center={[station.lat, station.lng]}
                    radius={radius}
                    className="air-glow-marker"
                    pathOptions={{
                      color: visuals.color,
                      weight: 2,
                      fillColor: visuals.color,
                      fillOpacity: 0.92,
                    }}
                  >
                    <Popup className="env-map-popup" closeButton={false}>
                      <PopupCard
                        title={station.name}
                        subtitle={`${station.type} • ${station.region}`}
                        icon={<Wind className="h-4 w-4 text-emerald-300" />}
                        status={
                          station.compliance === "COMPLIANT"
                            ? "STATUS: COMPLIANT"
                            : "STATUS: VIOLATION"
                        }
                        tone={
                          station.compliance === "COMPLIANT"
                            ? "compliant"
                            : "violation"
                        }
                        readings={[
                          {
                            label: "AQI",
                            value:
                              station.aqi !== null ? `${station.aqi}` : "—",
                          },
                          {
                            label: "Category",
                            value: station.category || visuals.label,
                          },
                          {
                            label: "PM2.5",
                            value: formatValue(
                              station.pollutants["PM2.5"] ?? null,
                              "µg/m³",
                            ),
                          },
                          {
                            label: "PM10",
                            value: formatValue(
                              station.pollutants.PM10 ?? null,
                              "µg/m³",
                            ),
                          },
                        ]}
                        footerLeft="Air Quality"
                        footerRight={station.date}
                      />
                    </Popup>
                  </CircleMarker>
                </>
              );
            })}

          {visibleLayers.water &&
            waterStations.map((station) => {
              const visuals = getWaterVisuals(station.latestStatus);

              return (
                <Marker
                  key={station.id}
                  position={[station.lat, station.lng]}
                  pane="waterPane"
                  icon={buildWaterIcon(visuals.color)}
                >
                  <Popup
                    className="env-map-popup"
                    closeButton={false}
                    offset={[0, -14]}
                  >
                    <PopupCard
                      title={station.name}
                      subtitle={`${station.type} • ${station.waterBody}`}
                      icon={<Droplets className="h-4 w-4 text-cyan-300" />}
                      status={
                        station.latestStatus === "SATISFACTORY"
                          ? "STATUS: COMPLIANT"
                          : "STATUS: VIOLATION"
                      }
                      tone={
                        station.latestStatus === "SATISFACTORY"
                          ? "compliant"
                          : "violation"
                      }
                      readings={[
                        {
                          label: "DO",
                          value: formatValue(station.latestDO, "mg/L"),
                        },
                        {
                          label: "BOD",
                          value: formatValue(station.latestBOD, "mg/L"),
                        },
                        {
                          label: "FC",
                          value: formatValue(station.latestFC, "MPN/100ml"),
                        },
                        {
                          label: "TC",
                          value: formatValue(station.latestTC, "MPN/100ml"),
                        },
                      ]}
                      footerLeft={station.city}
                      footerRight={station.latestPeriod}
                    />
                  </Popup>
                </Marker>
              );
            })}

          {visibleLayers.noise &&
            noiseStations.map((station) => {
              const visuals = getNoiseVisuals(station.status);

              return (
                <>
                  <CircleMarker
                    key={`${station.id}-outer`}
                    center={[station.lat, station.lng]}
                    radius={16}
                    pathOptions={{
                      color: visuals.color,
                      weight: 2,
                      fillColor: visuals.color,
                      fillOpacity: 0.12,
                      opacity: 0.55,
                    }}
                  />
                  <CircleMarker
                    key={`${station.id}-mid`}
                    center={[station.lat, station.lng]}
                    radius={11}
                    pathOptions={{
                      color: visuals.color,
                      weight: 2,
                      fillColor: visuals.color,
                      fillOpacity: 0.22,
                      opacity: 0.75,
                    }}
                  />
                  <CircleMarker
                    key={`${station.id}-core`}
                    center={[station.lat, station.lng]}
                    radius={7}
                    className="noise-ring-core"
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.5,
                      fillColor: visuals.color,
                      fillOpacity: 0.96,
                    }}
                  >
                    <Popup className="env-map-popup" closeButton={false}>
                      <PopupCard
                        title={station.name}
                        subtitle={`${station.zone} Zone • ${station.city}`}
                        icon={<Volume2 className="h-4 w-4 text-violet-300" />}
                        status={
                          station.status === "WITHIN LIMIT"
                            ? "STATUS: COMPLIANT"
                            : "STATUS: VIOLATION"
                        }
                        tone={
                          station.status === "WITHIN LIMIT"
                            ? "compliant"
                            : "violation"
                        }
                        readings={[
                          { label: "Noise", value: `${station.avgDb} dB` },
                          { label: "Limit", value: `${station.limit} dB` },
                          { label: "Zone", value: station.zone },
                          { label: "Breaches", value: `${station.violations}` },
                        ]}
                        footerLeft="Noise Pollution"
                        footerRight={
                          station.status === "EXCEEDS"
                            ? "Above threshold"
                            : "Within limit"
                        }
                      />
                    </Popup>
                  </CircleMarker>
                </>
              );
            })}

          {crisisZones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={Math.max(22000, zone.score * 14000)}
              pane="crisisPane"
              className="crisis-aura-ring"
              pathOptions={{
                color: "#ef4444",
                weight: 2,
                fillColor: "#ef4444",
                fillOpacity: 0.14,
                opacity: 0.55,
              }}
            >
              <Popup className="env-map-popup" closeButton={false}>
                <div className="w-[310px] rounded-2xl border border-red-500/20 bg-slate-950/95 p-4 text-slate-100 shadow-[0_25px_80px_rgba(127,29,29,0.35)] backdrop-blur-xl">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2">
                      <AlertTriangle className="h-4 w-4 text-red-300" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Crisis Zone Detected
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        Overlapping environmental stressors detected within a 35
                        km cluster.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {zone.air && (
                      <CrisisSignalRow
                        label="Air"
                        value={`${zone.air.name} • AQI ${zone.air.aqi ?? "—"}`}
                      />
                    )}
                    {zone.water && (
                      <CrisisSignalRow
                        label="Water"
                        value={`${zone.water.name} • ${zone.water.latestStatus}`}
                      />
                    )}
                    {zone.noise && (
                      <CrisisSignalRow
                        label="Noise"
                        value={`${zone.noise.name} • ${zone.noise.avgDb} dB`}
                      />
                    )}
                  </div>

                  <Badge className="mt-4 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-red-200 hover:bg-red-500/10">
                    GOD MODE OVERLAP
                  </Badge>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      <div className="relative border-t border-slate-800/80 bg-slate-950/85 px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>
            Live layers are sourced from existing PrithviNet air, water, and
            noise datasets. Initial viewport auto-fits available monitoring
            stations across Chhattisgarh.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 hover:bg-slate-900/80">
              Dark Matter Basemap
            </Badge>
            <Badge className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 hover:bg-slate-900/80">
              Responsive Layout
            </Badge>
            <Badge className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 hover:bg-slate-900/80">
              Real Data Fusion
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
