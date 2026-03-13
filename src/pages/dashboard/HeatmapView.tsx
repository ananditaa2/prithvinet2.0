import { useEffect, useMemo, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createRoot } from "react-dom/client";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Droplets,
  Layers3,
  MapPinned,
  Volume2,
  Wind,
} from "lucide-react";

type LayerKey = "air" | "water" | "noise";
type PopupTone = "compliant" | "violation";

// --- Types ---
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
  zone: string;
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

// --- Config ---
const CHHATTISGARH_CENTER: [number, number] = [21.2787, 81.8661];
const DEFAULT_ZOOM = 7;
const CARTO_DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const LAYER_META: Record<LayerKey, { label: string; icon: typeof Wind; border: string; accent: string }> = {
  air: { label: "Air Quality", icon: Wind, border: "border-emerald-400/30", accent: "from-emerald-400/25 via-cyan-400/20 to-transparent" },
  water: { label: "Water Quality", icon: Droplets, border: "border-cyan-400/30", accent: "from-cyan-400/25 via-blue-400/20 to-transparent" },
  noise: { label: "Noise Pollution", icon: Volume2, border: "border-violet-400/30", accent: "from-violet-400/25 via-fuchsia-400/20 to-transparent" },
};

// --- Helpers ---
function getAqiVisuals(aqi: number | null) {
  if (aqi === null) return { color: "#94a3b8", label: "Unknown" };
  if (aqi <= 50) return { color: "#22c55e", label: "Good" };
  if (aqi <= 100) return { color: "#84cc16", label: "Satisfactory" };
  if (aqi <= 200) return { color: "#f59e0b", label: "Moderate" };
  if (aqi <= 300) return { color: "#f97316", label: "Poor" };
  if (aqi <= 400) return { color: "#ef4444", label: "Very Poor" };
  return { color: "#b91c1c", label: "Severe" };
}

function getWaterVisuals(status: string) {
  return status === "SATISFACTORY" ? { color: "#10b981", label: "Compliant" } : { color: "#ef4444", label: "Violation" };
}

function getNoiseVisuals(status: string) {
  return status === "WITHIN LIMIT" ? { color: "#8b5cf6", label: "Compliant" } : { color: "#ef4444", label: "Violation" };
}

function formatValue(value: number | null, unit: string) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value} ${unit}`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;
  const int = parseInt(expanded, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toRadians(deg: number) { return (deg * Math.PI) / 180; }
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function average(values: (number | undefined)[]) {
  const valid = values.filter((v): v is number => typeof v === "number");
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
}

// --- Components ---
function PopupCard({ title, subtitle, icon, status, tone, readings, footerLeft, footerRight }: { 
  title: string; subtitle: string; icon: React.ReactNode; status: string; tone: PopupTone; 
  readings: { label: string; value: string }[]; footerLeft: string; footerRight: string;
}) {
  const statusClass = tone === "compliant" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-red-400/30 bg-red-500/15 text-red-200";
  return (
    <div className="w-[300px] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 text-slate-100 shadow-[0_28px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2 shadow-inner">{icon}</div>
          <div><h4 className="text-sm font-semibold leading-tight text-white">{title}</h4><p className="mt-1 text-xs text-slate-400">{subtitle}</p></div>
        </div>
        <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]", statusClass)}>{status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {readings.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-800/80 bg-slate-900/65 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
        <span>{footerLeft}</span><span>{footerRight}</span>
      </div>
    </div>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone: "cyan" | "emerald" | "blue" | "violet" }) {
  const toneClass = {
    cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    blue: "border-blue-400/25 bg-blue-500/10 text-blue-100",
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-100",
  }[tone];
  return (
    <div className={cn("rounded-2xl border px-4 py-3 backdrop-blur-xl", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function LayerToggle({ layer, checked, count, onChange }: { layer: LayerKey; checked: boolean; count: number; onChange: (v: boolean) => void }) {
  const meta = LAYER_META[layer];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-center justify-between rounded-2xl border bg-slate-950/85 px-4 py-3 shadow-[0_14px_40px_rgba(2,6,23,0.36)] backdrop-blur-xl", meta.border)}>
      <div className="flex items-center gap-3">
        <div className={cn("rounded-xl border border-white/10 bg-gradient-to-br p-2.5", meta.accent)}><Icon className="h-4 w-4 text-white" /></div>
        <div><p className="text-sm font-semibold text-slate-100">{meta.label}</p><p className="text-xs text-slate-400">{count} live stations</p></div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// --- Main Component ---
export default function HeatmapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const layers = useRef<Record<string, L.LayerGroup>>({});
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>({ air: true, water: true, noise: true });

  // API Data State
  const [airStations, setAirStations] = useState<AirMarkerPoint[]>([]);
  const [waterStations, setWaterStations] = useState<WaterMarkerPoint[]>([]);
  const [noiseStations, setNoiseStations] = useState<NoiseMarkerPoint[]>([]);

  useEffect(() => {
    Promise.all([
      api.public.airQuality(),
      api.public.waterQuality(),
      // public noise isn't exposed separately in citizen.py, so we use the generic data endpoint
      api.data.list({ limit: "500" })
    ]).then(([airRes, waterRes, allDataRes]) => {
      
      // Parse Air
      // citizen.py /public/air-quality returns {"count": X, "data": [...]}
      const airData = airRes?.data || [];
      const airMapped = airData.filter((s: any) => s.location?.lat != null && s.location?.lng != null).map((s: any) => ({
        id: String(s.location?.id || Math.random()),
        name: s.location?.name || "Unknown Air Station",
        type: "Air Monitoring",
        region: s.location?.region || "Unknown",
        lat: s.location?.lat, lng: s.location?.lng,
        aqi: s.aqi || null,
        category: (s.aqi || 0) > 200 ? "Poor" : "Good",
        compliance: (s.aqi || 0) > 200 ? "VIOLATION" : "COMPLIANT",
        date: s.recorded_at || "Recent",
        pollutants: { pm25: s.pm25, pm10: s.pm10 },
      }));
      setAirStations(airMapped);

      // Parse Water
      const waterData = waterRes?.data || [];
      const waterMapped = waterData.filter((s: any) => s.location?.lat != null && s.location?.lng != null).map((s: any) => ({
        id: String(s.location?.id || Math.random()),
        name: s.location?.name || "Unknown Water Station",
        type: "Water Monitoring",
        city: s.location?.region || "Unknown",
        waterBody: "Local Water Body",
        lat: s.location?.lat, lng: s.location?.lng,
        latestDO: s.do || null,
        latestBOD: s.bod || null,
        latestFC: null, latestTC: null,
        latestStatus: (s.bod || 0) > 5 ? "VIOLATION" : "SATISFACTORY",
        latestPeriod: s.recorded_at || "Recent"
      }));
      setWaterStations(waterMapped);

      // Parse Noise (Fallback to raw data)
      const noiseData = (allDataRes || []).filter((d: any) => d.data_type === "noise" && d.location?.lat != null);
      
      // Group by location
      const noiseByLoc = new Map<number, any>();
      noiseData.forEach((d: any) => {
        if (!noiseByLoc.has(d.location_id) || new Date(d.recorded_at) > new Date(noiseByLoc.get(d.location_id).recorded_at)) {
          noiseByLoc.set(d.location_id, d);
        }
      });

      const noiseMapped = Array.from(noiseByLoc.values()).map((s: any) => ({
        id: String(s.location_id),
        name: s.location?.name || "Unknown Noise Station",
        city: s.location?.region || "Unknown",
        zone: "Industrial",
        lat: s.location?.lat, lng: s.location?.lng,
        avgDb: s.decibel_level || 0,
        limit: 75,
        violations: (s.decibel_level || 0) > 75 ? 1 : 0,
        status: ((s.decibel_level || 0) > 75 ? "EXCEEDS" : "WITHIN LIMIT") as "EXCEEDS" | "WITHIN LIMIT"
      }));
      setNoiseStations(noiseMapped);

    }).catch(console.error);
  }, []);

  const crisisZones = useMemo(() => {
    if (!(visibleLayers.air && visibleLayers.water && visibleLayers.noise)) return [];
    const airV = airStations.filter(s => s.compliance === "VIOLATION" || (s.aqi ?? 0) > 200);
    const waterV = waterStations.filter(s => s.latestStatus !== "SATISFACTORY");
    const noiseV = noiseStations.filter(s => s.status === "EXCEEDS");
    const zones: CrisisZone[] = [];
    airV.forEach(a => {
      const w = waterV.find(v => distanceKm(a.lat, a.lng, v.lat, v.lng) <= 35);
      const n = noiseV.find(v => distanceKm(a.lat, a.lng, v.lat, v.lng) <= 35);
      if (w || n) {
        zones.push({
          id: `crisis-${a.id}`, 
          lat: average([a.lat, w?.lat, n?.lat]), 
          lng: average([a.lng, w?.lng, n?.lng]), 
          score: [a,w,n].filter(Boolean).length, air: a, water: w, noise: n
        });
      }
    });
    return zones;
  }, [airStations, waterStations, noiseStations, visibleLayers]);

  // Map Initialization
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = L.map(mapRef.current, { center: CHHATTISGARH_CENTER, zoom: DEFAULT_ZOOM, zoomControl: false });
    leafletMap.current = map;

    L.tileLayer(CARTO_DARK_TILES, { attribution: MAP_ATTRIBUTION }).addTo(map);

    layers.current = {
      air: L.layerGroup().addTo(map),
      water: L.layerGroup().addTo(map),
      noise: L.layerGroup().addTo(map),
      crisis: L.layerGroup().addTo(map)
    };

    // Style injection
    const styleId = "leaflet-vanilla-overrides";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.innerHTML = `
        .leaflet-container { background: #020617 !important; border-radius: 24px; font-family: Inter, sans-serif; }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-tip { background: #0f172a !important; border: 1px solid rgba(255,255,255,0.1) !important; }
        .air-glow { filter: drop-shadow(0 0 8px rgba(34,197,94,0.4)); }
        .noise-glow { filter: drop-shadow(0 0 8px rgba(139,92,246,0.4)); }
        .crisis-pulse { animation: crisis-pulse 2s infinite; }
        @keyframes crisis-pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
      `;
      document.head.appendChild(s);
    }

    return () => { map.remove(); };
  }, []);

  // Update Layers
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !layers.current.air) return;

    const { air, water, noise, crisis } = layers.current;
    
    // 1. Air Layer
    air.clearLayers();
    if (visibleLayers.air) {
      airStations.forEach(s => {
        const visuals = getAqiVisuals(s.aqi);
        const marker = L.circleMarker([s.lat, s.lng], { radius: 10, color: visuals.color, weight: 2, fillOpacity: 0.8, className: "air-glow" });
        const popupEl = document.createElement("div");
        createRoot(popupEl).render(
          <PopupCard title={s.name} subtitle={s.region} icon={<Wind className="h-4 w-4 text-emerald-300" />} status={s.compliance} tone={s.compliance === "COMPLIANT" ? "compliant" : "violation"} readings={[{label:"AQI", value:s.aqi?.toString()||"—"}, {label:"Category", value:s.category}]} footerLeft="Air Quality" footerRight={s.date} />
        );
        marker.bindPopup(popupEl, { maxWidth: 320 });
        marker.addTo(air);
      });
    }

    // 2. Water Layer
    water.clearLayers();
    if (visibleLayers.water) {
      waterStations.forEach(s => {
        const visuals = getWaterVisuals(s.latestStatus);
        const marker = L.circleMarker([s.lat, s.lng], { radius: 12, color: visuals.color, weight: 3, fillOpacity: 0.9 });
        const popupEl = document.createElement("div");
        createRoot(popupEl).render(
          <PopupCard title={s.name} subtitle={s.waterBody} icon={<Droplets className="h-4 w-4 text-cyan-300" />} status={s.latestStatus} tone={s.latestStatus === "SATISFACTORY" ? "compliant" : "violation"} readings={[{label:"DO", value:formatValue(s.latestDO,"mg/L")}, {label:"BOD", value:formatValue(s.latestBOD,"mg/L")}]} footerLeft={s.city} footerRight={s.latestPeriod} />
        );
        marker.bindPopup(popupEl, { maxWidth: 320 });
        marker.addTo(water);
      });
    }

    // 3. Noise Layer
    noise.clearLayers();
    if (visibleLayers.noise) {
      noiseStations.forEach(s => {
        const visuals = getNoiseVisuals(s.status);
        const marker = L.circleMarker([s.lat, s.lng], { radius: 8, color: visuals.color, weight: 2, fillOpacity: 0.8, className: "noise-glow" });
        const popupEl = document.createElement("div");
        createRoot(popupEl).render(
          <PopupCard title={s.name} subtitle={s.city} icon={<Volume2 className="h-4 w-4 text-violet-300" />} status={s.status} tone={s.status === "WITHIN LIMIT" ? "compliant" : "violation"} readings={[{label:"Noise", value:`${s.avgDb} dB`}, {label:"Limit", value:`${s.limit} dB`}]} footerLeft="Noise Pollution" footerRight={s.zone === "Industrial" ? "Industrial Zone" : "Residential"} />
        );
        marker.bindPopup(popupEl, { maxWidth: 320 });
        marker.addTo(noise);
      });
    }

    // 4. Crisis Layer
    crisis.clearLayers();
    crisisZones.forEach(z => {
      const circle = L.circle([z.lat, z.lng], { radius: 25000, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 2, className: "crisis-pulse" });
      const popupEl = document.createElement("div");
      createRoot(popupEl).render(
        <div className="w-[300px] rounded-2xl border border-red-500/20 bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h4 className="font-bold">CRISIS ZONE DETECTED</h4>
          </div>
          <p className="text-xs text-slate-400 mb-3">35km radius cluster of overlapping violations detected.</p>
          <div className="space-y-2">
            {z.air && <div className="text-xs p-2 bg-red-500/5 rounded">Air: {z.air.name} (AQI {z.air.aqi})</div>}
            {z.water && <div className="text-xs p-2 bg-red-500/5 rounded">Water: {z.water.name} ({z.water.latestStatus})</div>}
          </div>
          <Badge className="mt-3 bg-red-500/10 text-red-400 border-red-500/20">GOD MODE OVERLAP</Badge>
        </div>
      );
      circle.bindPopup(popupEl, { maxWidth: 320 });
      circle.addTo(crisis);
    });

    // Fit Bounds
    const allPoints = [
      ...(visibleLayers.air ? airStations.map(s => [s.lat, s.lng] as [number, number]) : []),
      ...(visibleLayers.water ? waterStations.map(s => [s.lat, s.lng] as [number, number]) : []),
      ...(visibleLayers.noise ? noiseStations.map(s => [s.lat, s.lng] as [number, number]) : [])
    ];
    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 9 });
    }
  }, [visibleLayers, airStations, waterStations, noiseStations, crisisZones]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-800/70 bg-slate-950 shadow-[0_24px_100px_rgba(2,6,23,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_32%)]" />

      <div className="relative border-b border-slate-800/80 bg-slate-950/90 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2">
              <Badge className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.24em] text-cyan-200">COMMAND CENTER</Badge>
              <Badge className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.24em] text-red-200">
                {crisisZones.length} CRISIS ZONES
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-inner"><MapPinned className="h-6 w-6 text-cyan-300" /></div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Environmental Intelligence Map</h2>
                <p className="mt-2 text-sm text-slate-400">Pure Leaflet geospatial engine with live monitoring fusion.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[440px]">
            <MetricPill label="Total Senders" value={(airStations.length+waterStations.length+noiseStations.length).toString()} tone="cyan" />
            <MetricPill label="Air Violations" value={airStations.filter(s=>s.compliance==="VIOLATION").length.toString()} tone="emerald" />
            <MetricPill label="Water Alerts" value={waterStations.filter(s=>s.latestStatus!=="SATISFACTORY").length.toString()} tone="blue" />
            <MetricPill label="Industrial Noise" value={noiseStations.filter(s=>s.status==="EXCEEDS").length.toString()} tone="violet" />
          </div>
        </div>
      </div>

      <div className="relative h-[650px]">
        <div className="absolute left-6 top-6 z-[1000] w-64 space-y-3">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Filters</p>
              <Button size="sm" variant="ghost" onClick={() => setVisibleLayers({air:true,water:true,noise:true})} className="h-6 text-[10px] text-slate-400">RESET</Button>
            </div>
            <div className="space-y-3">
              <LayerToggle layer="air" checked={visibleLayers.air} count={airStations.length} onChange={(v) => setVisibleLayers(p => ({...p, air: v}))} />
              <LayerToggle layer="water" checked={visibleLayers.water} count={waterStations.length} onChange={(v) => setVisibleLayers(p => ({...p, water: v}))} />
              <LayerToggle layer="noise" checked={visibleLayers.noise} count={noiseStations.length} onChange={(v) => setVisibleLayers(p => ({...p, noise: v}))} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Health Legends</p>
            <div className="space-y-2 text-[10px] text-slate-300">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> <span>Compliant / Good</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" /> <span>Moderate</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> <span>Heavy Violation</span></div>
            </div>
          </div>
        </div>

        <div ref={mapRef} className="h-full w-full" />
      </div>

      <div className="relative border-t border-slate-800/80 bg-slate-950/85 px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Powered by PrithviNet Vanilla Engine • Low Latency Geospatial Sync</p>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[9px] border-slate-800">2025 DATASET</Badge>
          <Badge variant="outline" className="text-[9px] border-slate-800">RAIGARH CORE</Badge>
        </div>
      </div>
    </section>
  );
}
