import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { LiveAnomalyFeed } from "@/components/dashboard/LiveAnomalyFeed";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import {
  AlertTriangle,
  Droplets,
  MapPinned,
  Volume2,
  Wind,
  Wifi,
  WifiOff,
  Zap,
  Play,
  Bug,
} from "lucide-react";

type LayerKey = "air" | "water" | "noise";
type PopupTone = "compliant" | "warning" | "violation";

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
  source: string;
  note: string;
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

const CHHATTISGARH_CENTER: [number, number] = [21.2787, 81.8661];
const DEFAULT_ZOOM = 7;
const CARTO_DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const LAYER_META: Record<LayerKey, { label: string; icon: typeof Wind; border: string; accent: string }> = {
  air: { label: "Air Quality", icon: Wind, border: "border-emerald-400/30", accent: "from-emerald-400/25 via-cyan-400/20 to-transparent" },
  water: { label: "Water Quality", icon: Droplets, border: "border-cyan-400/30", accent: "from-cyan-400/25 via-blue-400/20 to-transparent" },
  noise: { label: "Noise Pollution", icon: Volume2, border: "border-violet-400/30", accent: "from-violet-400/25 via-fuchsia-400/20 to-transparent" },
};

function getAqiVisuals(aqi: number | null) {
  if (aqi === null) return { color: "#94a3b8", label: "Unknown" };
  if (aqi <= 50) return { color: "#22c55e", label: "Good" };
  if (aqi <= 100) return { color: "#84cc16", label: "Satisfactory" };
  if (aqi <= 200) return { color: "#f59e0b", label: "Moderate" };
  if (aqi <= 300) return { color: "#f97316", label: "Poor" };
  if (aqi <= 400) return { color: "#ef4444", label: "Very Poor" };
  return { color: "#b91c1c", label: "Severe" };
}

function getAirStatus(aqi: number | null): { category: string; status: string; tone: PopupTone } {
  if (aqi === null) return { category: "Unknown", status: "UNKNOWN", tone: "warning" };
  if (aqi <= 100) return { category: getAqiVisuals(aqi).label, status: "COMPLIANT", tone: "compliant" };
  if (aqi <= 200) return { category: "Moderate", status: "WATCHLIST", tone: "warning" };
  return { category: getAqiVisuals(aqi).label, status: "VIOLATION", tone: "violation" };
}

function getAirEvidence(pm10: number | undefined, aqi: number | null) {
  if (typeof pm10 === "number") {
    return {
      metricLabel: "PM10",
      metricValue: `${pm10.toFixed(1)} ug/m3`,
      limitLabel: "NAAQS Limit",
      limitValue: "100 ug/m3",
      status: pm10 > 100 ? "VIOLATION" : "COMPLIANT",
      tone: (pm10 > 100 ? "violation" : "compliant") as PopupTone,
    };
  }
  const airStatus = getAirStatus(aqi);
  return {
    metricLabel: "AQI",
    metricValue: aqi != null ? aqi.toString() : "—",
    limitLabel: "Category",
    limitValue: airStatus.category,
    status: airStatus.status,
    tone: airStatus.tone,
  };
}

function getAirSourceLabel(source: string | null | undefined, note: string | null | undefined) {
  const text = `${source || ""} ${note || ""}`.toLowerCase();
  if (text.includes("cecb") || text.includes("namp") || text.includes("emission_logs")) {
    return "CECB NAMP Report";
  }
  if (source?.startsWith("json:air:")) return "Imported Government Dataset";
  return source || "Unknown Source";
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "Unknown Date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWaterVisuals(status: string) {
  return status === "SATISFACTORY" ? { color: "#10b981", label: "Compliant" } : { color: "#ef4444", label: "Violation" };
}

function getNoiseVisuals(status: string) {
  return status === "WITHIN LIMIT" ? { color: "#8b5cf6", label: "Compliant" } : { color: "#ef4444", label: "Violation" };
}

function getNoiseLimit(zone: string | null | undefined) {
  const normalized = (zone || "residential").toLowerCase();
  if (normalized === "industrial") return 75;
  if (normalized === "commercial") return 65;
  if (normalized === "silent" || normalized === "silence") return 50;
  return 55;
}

function formatValue(value: number | null, unit: string) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value} ${unit}`;
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

function PopupCard({ title, subtitle, icon, status, tone, readings, footerLeft, footerRight }: { 
  title: string; subtitle: string; icon: React.ReactNode; status: string; tone: PopupTone; 
  readings: { label: string; value: string }[]; footerLeft: string; footerRight: string;
}) {
  const statusClass = tone === "compliant"
    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
    : tone === "warning"
      ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
      : "border-red-400/30 bg-red-500/15 text-red-200";
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
  const layers = useRef<Record<string, L.LayerGroup | any>>({});
  const airMarkerRefs = useRef<Record<string, L.CircleMarker>>({});
  const heatLayerRef = useRef<any>(null);
  const pendingAirFocusId = useRef<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>({ air: true, water: true, noise: true });

  // WebSocket State
  const [wsConnected, setWsConnected] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [alertStations, setAlertStations] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  // API Data State
  const [airStations, setAirStations] = useState<AirMarkerPoint[]>([]);
  const [waterStations, setWaterStations] = useState<WaterMarkerPoint[]>([]);
  const [noiseStations, setNoiseStations] = useState<NoiseMarkerPoint[]>([]);

  // Data Loading — each fetch is independent so one failure doesn't kill others
  useEffect(() => {
    // Air quality (public - no auth needed)
    api.public.airQuality().then((airRes: any) => {
      const airData = airRes?.data || [];
      const airMapped = airData
        .filter((s: any) => s.location?.lat != null && s.location?.lng != null)
        .map((s: any) => {
          const aqi = s.aqi ?? null;
          const airStatus = getAirStatus(aqi);
          const evidence = getAirEvidence(s.pm10, aqi);
          return {
            id: String(s.location?.id || Math.random()),
            name: s.location?.name || "Unknown Air Station",
            type: "Air Monitoring",
            region: s.location?.region || "Unknown",
            lat: s.location.lat, lng: s.location.lng,
            aqi,
            category: airStatus.category,
            compliance: evidence.status,
            date: s.recorded_at || "Recent",
            pollutants: { pm25: s.pm25, pm10: s.pm10 },
            source: s.source || "",
            note: s.notes || "",
          };
        });
      setAirStations(airMapped);
      console.log(`✅ Air: ${airMapped.length} stations loaded`);
    }).catch((e: any) => console.error("Air load failed:", e));

    // Water quality (public - no auth needed)
    api.public.waterQuality().then((waterRes: any) => {
      const waterData = waterRes?.data || [];
      const waterMapped = waterData
        .filter((s: any) => s.location?.lat != null && s.location?.lng != null)
        .map((s: any) => ({
          id: String(s.location?.id || Math.random()),
          name: s.location?.name || "Unknown Water Station",
          type: "Water Monitoring",
          city: s.location?.region || "Unknown",
          waterBody: "Local Water Body",
          lat: s.location.lat,
          lng: s.location.lng,
          latestDO: s.dissolved_oxygen ?? null,
          latestBOD: s.bod ?? null,
          latestFC: null, latestTC: null,
          latestStatus: ((s.bod ?? 0) > 5 || (s.dissolved_oxygen ?? 99) < 4) ? "VIOLATION" : "SATISFACTORY",
          latestPeriod: s.recorded_at || "Recent",
        }));
      setWaterStations(waterMapped);
      console.log(`✅ Water: ${waterMapped.length} stations loaded`);
    }).catch((e: any) => console.error("Water load failed:", e));

    // Noise (authenticated endpoint) — load locations first then join
    Promise.all([
      api.data.list({ data_type: "noise", limit: "2000" }),
      api.locations.list(),
    ]).then(([noiseRows, locations]) => {
      const locationById = new Map((locations || []).map((loc: any) => [loc.id, loc]));
      const noiseData = (noiseRows || []).filter((d: any) => {
        const loc = locationById.get(d.location_id);
        return loc?.latitude != null && loc?.longitude != null;
      });
      const noiseByLoc = new Map<number, any>();
      noiseData.forEach((d: any) => {
        if (!noiseByLoc.has(d.location_id) || new Date(d.recorded_at) > new Date(noiseByLoc.get(d.location_id).recorded_at)) {
          noiseByLoc.set(d.location_id, d);
        }
      });
      const noiseMapped = Array.from(noiseByLoc.values()).map((s: any) => ({
        id: String(s.location_id),
        name: locationById.get(s.location_id)?.name || "Unknown Noise Station",
        city: locationById.get(s.location_id)?.region || "Unknown",
        zone: s.noise_location_type || locationById.get(s.location_id)?.location_type || "Residential",
        lat: locationById.get(s.location_id)?.latitude,
        lng: locationById.get(s.location_id)?.longitude,
        avgDb: s.decibel_level ?? 0,
        limit: getNoiseLimit(s.noise_location_type || locationById.get(s.location_id)?.location_type),
        violations: (s.decibel_level ?? 0) > getNoiseLimit(s.noise_location_type || locationById.get(s.location_id)?.location_type) ? 1 : 0,
        status: ((s.decibel_level ?? 0) > getNoiseLimit(s.noise_location_type || locationById.get(s.location_id)?.location_type) ? "EXCEEDS" : "WITHIN LIMIT") as "EXCEEDS" | "WITHIN LIMIT",
      }));
      setNoiseStations(noiseMapped);
      console.log(`✅ Noise: ${noiseMapped.length} stations loaded`);
    }).catch((e: any) => console.error("Noise load failed:", e));
  }, []);

  // Crisis Zones
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
          score: [a, w, n].filter(Boolean).length, air: a, water: w, noise: n
        });
      }
    });
    return zones;
  }, [airStations, waterStations, noiseStations, visibleLayers]);

  const featuredAirStation = useMemo(
    () => airStations.find((station) =>
      station.region.toLowerCase().includes("raigarh") &&
      (station.name.toLowerCase().includes("jindal industrial park") || station.name.toLowerCase().includes("punjipathra"))
    ) || null,
    [airStations]
  );

  function focusFeaturedViolation() {
    const map = leafletMap.current;
    if (!map || !featuredAirStation) return;
    pendingAirFocusId.current = featuredAirStation.id;
    setVisibleLayers((current) => ({ ...current, air: true }));
  }

  // WebSocket Connection
  useEffect(() => {
    const connectWebSocket = () => {
      // Use environment variable or fallback to localhost
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('https://', '').replace('http://', '')
        : `${window.location.hostname}:8000`;
      const wsUrl = `${wsProtocol}//${wsHost}/ws/dashboard`;
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("🗺️ HeatmapView WebSocket connected to", wsUrl);
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        console.log("🗺️ WebSocket message received:", event.data);
        try {
          const data = JSON.parse(event.data);
          console.log("🗺️ Parsed data:", data);
          if (data.type === "ANOMALY_ALERT") {
            console.log("🚨 ANOMALY_ALERT received!");
            setActiveAlert(data);
            if (data.location?.id) {
              setAlertStations(prev => new Set(prev).add(String(data.location.id)));
              const marker = airMarkerRefs.current[String(data.location.id)];
              if (marker && leafletMap.current) {
                marker.setStyle({ fillColor: '#ef4444', color: '#b91c1c', fillOpacity: 0.9, weight: 3 });
                if (data.severity === 'CRITICAL') {
                  leafletMap.current.flyTo([data.location.lat, data.location.lng], 12, { animate: true, duration: 1.5 });
                }
              }
            }
            setTimeout(() => setActiveAlert(null), 30000);
          }
          if (data.type === "DEMO_RESET") {
            setActiveAlert(null);
            setAlertStations(new Set());
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    };

    connectWebSocket();
    return () => wsRef.current?.close();
  }, []);

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
        .leaflet-heatmap-legend { display: none !important; }
        .leaflet-control-attribution { display: none !important; }
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

    // Air Layer
    air.clearLayers();
    airMarkerRefs.current = {};
    if (visibleLayers.air && airStations.length > 0) {
      const heatData = airStations.filter(s => s.aqi !== null && s.aqi > 0).map(s => {
        const intensity = Math.min(s.aqi! / 500, 1);
        return [s.lat, s.lng, intensity] as [number, number, number];
      });

      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = (L as any).heatLayer(heatData, {
        radius: 35, blur: 25, maxZoom: 10, minOpacity: 0.4, maxOpacity: 0.9,
        gradient: { 0.0: '#22c55e', 0.2: '#84cc16', 0.4: '#f59e0b', 0.6: '#f97316', 0.8: '#ef4444', 1.0: '#b91c1c' }
      }).addTo(map);

      airStations.forEach(s => {
        const evidence = getAirEvidence(s.pollutants.pm10, s.aqi);
        const isAlert = alertStations.has(s.id);
        const marker = L.circleMarker([s.lat, s.lng], {
          radius: isAlert ? 12 : 8,
          color: isAlert ? '#ef4444' : 'transparent',
          fillColor: isAlert ? '#ef4444' : 'transparent',
          fillOpacity: isAlert ? 0.9 : 0,
          weight: isAlert ? 3 : 0,
          className: isAlert ? "air-alert-marker" : "air-hit-target"
        });
        const popupEl = document.createElement("div");
        createRoot(popupEl).render(
          <PopupCard title={s.name} subtitle={s.region} icon={<Wind className="h-4 w-4 text-emerald-300" />} status={evidence.status} tone={evidence.tone}
            readings={[{ label: evidence.metricLabel, value: evidence.metricValue }, { label: evidence.limitLabel, value: evidence.limitValue }]}
            footerLeft={getAirSourceLabel(s.source, s.note)} footerRight={formatDisplayDate(s.date)} />
        );
        marker.bindPopup(popupEl, { maxWidth: 320 });
        airMarkerRefs.current[s.id] = marker;
        marker.addTo(air);
      });
    } else if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Water Layer
    water.clearLayers();
    if (visibleLayers.water) {
      waterStations.forEach(s => {
        const visuals = getWaterVisuals(s.latestStatus);
        const marker = L.circleMarker([s.lat, s.lng], { radius: 12, color: visuals.color, weight: 3, fillOpacity: 0.9 });
        const popupEl = document.createElement("div");
        createRoot(popupEl).render(
          <PopupCard title={s.name} subtitle={s.waterBody} icon={<Droplets className="h-4 w-4 text-cyan-300" />} status={s.latestStatus} tone={s.latestStatus === "SATISFACTORY" ? "compliant" : "violation"}
            readings={[{ label: "DO", value: formatValue(s.latestDO, "mg/L") }, { label: "BOD", value: formatValue(s.latestBOD, "mg/L") }]} footerLeft={s.city} footerRight={s.latestPeriod} />
        );
        marker.bindPopup(popupEl, { maxWidth: 320 });
        marker.addTo(water);
      });
    }

    // Noise Layer
    noise.clearLayers();
    if (visibleLayers.noise) {
      noiseStations.forEach(s => {
        const visuals = getNoiseVisuals(s.status);
        const marker = L.circleMarker([s.lat, s.lng], { radius: 8, color: visuals.color, weight: 2, fillOpacity: 0.8, className: "noise-glow" });
        const popupEl = document.createElement("div");
        createRoot(popupEl).render(
          <PopupCard title={s.name} subtitle={s.city} icon={<Volume2 className="h-4 w-4 text-violet-300" />} status={s.status} tone={s.status === "WITHIN LIMIT" ? "compliant" : "violation"}
            readings={[{ label: "Noise", value: `${s.avgDb} dB` }, { label: "Limit", value: `${s.limit} dB` }]} footerLeft="Noise Pollution" footerRight={s.zone === "Industrial" ? "Industrial Zone" : "Residential"} />
        );
        marker.bindPopup(popupEl, { maxWidth: 320 });
        marker.addTo(noise);
      });
    }

    // Crisis Layer
    crisis.clearLayers();
    crisisZones.forEach(z => {
      const circle = L.circle([z.lat, z.lng], { radius: 25000, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 2, className: "crisis-pulse" });
      const popupEl = document.createElement("div");
      createRoot(popupEl).render(
        <div className="w-[300px] rounded-2xl border border-red-500/20 bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-3"><AlertTriangle className="h-5 w-5 text-red-400" /><h4 className="font-bold">CRISIS ZONE DETECTED</h4></div>
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
    if (allPoints.length > 0) map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 9 });
  }, [visibleLayers, airStations, waterStations, noiseStations, crisisZones, alertStations]);

  // Focus Effect
  useEffect(() => {
    const map = leafletMap.current;
    const focusId = pendingAirFocusId.current;
    if (!map || !focusId) return;
    const station = airStations.find((item) => item.id === focusId);
    const marker = airMarkerRefs.current[focusId];
    if (!station || !marker || !visibleLayers.air) return;
    pendingAirFocusId.current = null;
    map.flyTo([station.lat, station.lng], 11, { animate: true, duration: 1.2 });
    window.setTimeout(() => marker.openPopup(), 700);
  }, [airStations, visibleLayers]);

  // DEMO: Manually trigger alert for testing
  const triggerDemoAlert = () => {
    const demoAnomaly = {
      type: "ANOMALY_ALERT",
      severity: "CRITICAL",
      message: "🚨 CRITICAL: PM10 Limit Breached at Korba Super Thermal Power Station!",
      location: { 
        id: 999, 
        name: "Korba Super Thermal Power Station", 
        region: "Korba", 
        lat: 22.3603, 
        lng: 82.7500 
      },
      data: { 
        aqi: 339, 
        pm25: 146.0, 
        pm10: 192.0, 
        status: "HAZARDOUS" 
      },
      escalation_timer: 300,
      demo_mode: true,
    };

    // Show toast
    toast.error(demoAnomaly.message, {
      description: `AQI: ${demoAnomaly.data.aqi} | Location: ${demoAnomaly.location.name}`,
      duration: 10000,
      action: {
        label: "View on Map",
        onClick: () => {
          if (leafletMap.current) {
            leafletMap.current.flyTo([demoAnomaly.location.lat, demoAnomaly.location.lng], 12, { animate: true, duration: 1.5 });
          }
        },
      },
    });

    // Set active alert
    setActiveAlert(demoAnomaly);
    
    // Add to alert stations
    setAlertStations(prev => new Set(prev).add(String(demoAnomaly.location.id)));
    
    // Try to find and highlight the marker
    const marker = airMarkerRefs.current[String(demoAnomaly.location.id)];
    if (marker) {
      marker.setStyle({ fillColor: '#ef4444', color: '#b91c1c', fillOpacity: 0.9, weight: 3 });
    }
    
    // Fly to location
    if (leafletMap.current) {
      leafletMap.current.flyTo([demoAnomaly.location.lat, demoAnomaly.location.lng], 12, { animate: true, duration: 1.5 });
    }

    console.log("🎯 DEMO ALERT TRIGGERED:", demoAnomaly);
  };
  const handleClearAlert = useCallback((locationId: number) => {
    setAlertStations(prev => {
      const next = new Set(prev);
      next.delete(String(locationId));
      return next;
    });
    const marker = airMarkerRefs.current[String(locationId)];
    if (marker) {
      marker.setStyle({ fillColor: 'transparent', color: 'transparent', fillOpacity: 0, weight: 0 });
    }
  }, []);

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
                <p className="mt-2 text-sm text-slate-400">Real-time monitoring with live anomaly detection</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[440px]">
            <MetricPill label="Total Stations" value={(airStations.length + waterStations.length + noiseStations.length).toString()} tone="cyan" />
            <MetricPill label="Air Violations" value={airStations.filter(s => s.compliance === "VIOLATION").length.toString()} tone="emerald" />
            <MetricPill label="Water Alerts" value={waterStations.filter(s => s.latestStatus !== "SATISFACTORY").length.toString()} tone="blue" />
            <MetricPill label="Noise Violations" value={noiseStations.filter(s => s.status === "EXCEEDS").length.toString()} tone="violet" />
          </div>
        </div>

        {/* Alert Banner - REMOVED */}
      </div>

      <div className="relative h-[650px]">
        <div className="absolute left-6 top-6 z-[1000] w-72 space-y-3">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Filters</p>
              <Button size="sm" variant="ghost" onClick={() => setVisibleLayers({ air: true, water: true, noise: true })} className="h-6 text-[10px] text-slate-400">RESET</Button>
            </div>
            <Button size="sm" onClick={focusFeaturedViolation} disabled={!featuredAirStation} className="mb-3 w-full justify-start rounded-xl border border-red-400/25 bg-red-500/12 text-[11px] font-semibold text-red-100 hover:bg-red-500/18 disabled:opacity-50">
              <AlertTriangle className="mr-2 h-3.5 w-3.5" />
              Focus Raigarh Violation
            </Button>
            <div className="space-y-3">
              <LayerToggle layer="air" checked={visibleLayers.air} count={airStations.length} onChange={(v) => setVisibleLayers(p => ({ ...p, air: v }))} />
              <LayerToggle layer="water" checked={visibleLayers.water} count={waterStations.length} onChange={(v) => setVisibleLayers(p => ({ ...p, water: v }))} />
              <LayerToggle layer="noise" checked={visibleLayers.noise} count={noiseStations.length} onChange={(v) => setVisibleLayers(p => ({ ...p, noise: v }))} />
            </div>
          </div>

          {/* DEMO TRIGGER BUTTON */}
          <div className="rounded-2xl border border-red-500/50 bg-red-950/30 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-2">Demo Controls</p>
            <Button 
              onClick={triggerDemoAlert}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 animate-pulse"
            >
              <Zap className="w-4 h-4" />
              TRIGGER DEMO ALERT
            </Button>
            <p className="text-[9px] text-red-300/70 mt-2 text-center">
              Click to simulate live anomaly
            </p>
          </div>

          {/* Live Anomaly Feed - REMOVED */}

          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Health Legends</p>
            <div className="space-y-2 text-[10px] text-slate-300">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> <span>Compliant / Good</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" /> <span>Moderate</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> <span>Heavy Violation</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> <span>Live Alert</span></div>
            </div>
          </div>
        </div>

        <div ref={mapRef} className="h-full w-full" />
      </div>

      <div className="relative border-t border-slate-800/80 bg-slate-950/85 px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Powered by PrithviNet • WebSocket Real-Time Sync • Demo Ready</p>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[9px] border-slate-800">2025 DATASET</Badge>
          <Badge variant="outline" className="text-[9px] border-purple-500/50 text-purple-400">LIVE DEMO MODE</Badge>
        </div>
      </div>
    </section>
  );
}
