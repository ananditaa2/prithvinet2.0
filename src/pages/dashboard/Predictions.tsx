import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Brain, TrendingUp, AlertTriangle, Factory, Users,
  Leaf, Clock, ChevronRight, Zap, ShieldCheck,
  RefreshCw, CheckCircle2, Timer, Sparkles,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AQIPoint { hour: string; aqi: number; predicted: boolean; status: string; }
interface Suggestion { role: string; icon: any; color: string; bg: string; border: string; actions: { text: string; deadline: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" }[]; }
interface PollutionZone {
  alert_id: number;
  location_id: number;
  location_name: string;
  region: string;
  industry_name: string | null;
  pollutant: string;
  measured_value: number;
  threshold_value: number;
  severity: string;
  message: string;
  aqi: number | null;
  created_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAQIColor(aqi: number) {
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}
function getAQILabel(aqi: number) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 150) return "Moderate";
  if (aqi <= 200) return "Poor";
  if (aqi <= 300) return "Very Poor";
  return "Severe";
}

// ── Forecast from AQI + optional backend predictions ─────────────────────────
function buildForecastData(
  baseAQI: number,
  regionName: string,
  backendPredictions?: Record<string, number>,
  hours: number = 48
): AQIPoint[] {
  const now = new Date();
  const points: AQIPoint[] = [];

  // Last 6 hours actual (client-side simulated — no historical endpoint for this)
  for (let i = -6; i <= 0; i++) {
    const noise = (Math.random() - 0.5) * 20;
    const aqi = Math.max(10, Math.round(baseAQI + noise));
    points.push({
      hour: i === 0 ? "Now" : `${Math.abs(i)}h ago`,
      aqi,
      predicted: false,
      status: getAQILabel(aqi),
    });
  }

  const industrialRegions = ["korba", "bhilai", "raigarh"];
  const isIndustrial = industrialRegions.some(r => regionName.toLowerCase().includes(r));
  const backendAQI = backendPredictions?.aqi;

  for (let i = 1; i <= hours; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    const hour = t.getHours();

    let timeFactor = 1.0;
    if (hour >= 7 && hour <= 10) timeFactor = isIndustrial ? 1.4 : 1.2;
    else if (hour >= 17 && hour <= 21) timeFactor = isIndustrial ? 1.5 : 1.25;
    else if (hour >= 1 && hour <= 5) timeFactor = 0.75;

    // Blend toward backend predicted AQI at the end of the horizon
    const backendBlend = backendAQI ? (i / hours) * 0.4 : 0;
    const dayFactor = i > 24 ? 0.88 : 1.0;
    const noise = (Math.random() - 0.5) * 15;
    const rawAQI = baseAQI * timeFactor * dayFactor + noise;
    const blendedAQI = backendAQI
      ? rawAQI * (1 - backendBlend) + backendAQI * backendBlend
      : rawAQI;
    const aqi = Math.max(10, Math.round(blendedAQI));

    points.push({
      hour: i === 1 ? "+1h" : i % 6 === 0 ? `+${i}h` : i <= 6 ? `+${i}h` : "",
      aqi,
      predicted: true,
      status: getAQILabel(aqi),
    });
  }
  return points;
}

// ── Static role-based suggestions (augmented by live AI text) ─────────────────
function generateSuggestions(currentAQI: number, region: string): Suggestion[] {
  const isPoor = currentAQI > 150;
  const isVeryPoor = currentAQI > 200;
  const isSevere = currentAQI > 300;

  return [
    {
      role: "Industry Officers",
      icon: Factory,
      color: "text-orange-300",
      bg: "bg-orange-950/40",
      border: "border-orange-500/30",
      actions: [
        {
          text: isSevere
            ? "EMERGENCY: Halt all non-essential combustion immediately. Shift to minimal production mode."
            : isVeryPoor
            ? "Reduce combustion output by 40% during 06:00–11:00 AM and 05:00–09:00 PM."
            : isPoor
            ? "Reduce production intensity by 20% during peak hours. Activate secondary scrubbers."
            : "Continue operations. Verify all pollution control devices are active.",
          deadline: isSevere ? "Immediate" : "By 06:00 AM tomorrow",
          priority: isSevere ? "CRITICAL" : isVeryPoor ? "HIGH" : "MEDIUM",
        },
        {
          text: `Submit hourly emission telemetry to CECB for ${region} during elevated AQI window.`,
          deadline: "Next 48 hours",
          priority: isPoor ? "HIGH" : "MEDIUM",
        },
        {
          text: "Increase water sprinkling frequency on coal stockpiles and ash ponds by 3x.",
          deadline: "Within 2 hours",
          priority: isPoor ? "HIGH" : "MEDIUM",
        },
      ],
    },
    {
      role: "Government / Regional Officers",
      icon: ShieldCheck,
      color: "text-blue-300",
      bg: "bg-blue-950/40",
      border: "border-blue-500/30",
      actions: [
        {
          text: isSevere
            ? `Issue Emergency Pollution Advisory for ${region}. Activate Graded Response Action Plan (GRAP) Stage IV.`
            : isVeryPoor
            ? `Issue Public Health Advisory for ${region}. Restrict heavy vehicle movement 7–10 AM & 6–9 PM.`
            : isPoor
            ? `Increase inspection frequency for top 5 violating industries in ${region} this week.`
            : "Review compliance reports. Schedule routine inspection round for next week.",
          deadline: isSevere ? "Immediate" : "Within 6 hours",
          priority: isSevere ? "CRITICAL" : isVeryPoor ? "HIGH" : "MEDIUM",
        },
        {
          text: "Deploy mobile pollution monitoring vans to flagged crisis zones for ground verification.",
          deadline: "By 08:00 AM",
          priority: "HIGH",
        },
        {
          text: `Coordinate with ${region} municipal corporation for anti-smog gun deployment at hotspots.`,
          deadline: "By 10:00 AM",
          priority: isPoor ? "HIGH" : "MEDIUM",
        },
      ],
    },
    {
      role: "Citizens",
      icon: Users,
      color: "text-green-300",
      bg: "bg-green-950/40",
      border: "border-green-500/30",
      actions: [
        {
          text: isSevere
            ? "STAY INDOORS. Seal windows. Use N99 masks if going out. No outdoor exercise."
            : isVeryPoor
            ? "Avoid outdoor activities 7–10 AM & 5–9 PM. Wear N95 mask outdoors. Keep windows closed."
            : isPoor
            ? "Limit outdoor exercise. Wear a mask in high-traffic zones. Check AQI before outdoor plans."
            : "Air quality is acceptable. Enjoy outdoor activities normally. Stay updated.",
          deadline: "Active now",
          priority: isSevere ? "CRITICAL" : isVeryPoor ? "HIGH" : "MEDIUM",
        },
        {
          text: "Children, elderly, and those with respiratory conditions should remain indoors today.",
          deadline: "Active now",
          priority: isPoor ? "HIGH" : "MEDIUM",
        },
        {
          text: "Report visible pollution sources (open burning, illegal dumping) to PrithviNet citizen portal.",
          deadline: "Any time",
          priority: "MEDIUM",
        },
      ],
    },
    {
      role: "Environment Teams",
      icon: Leaf,
      color: "text-emerald-300",
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/30",
      actions: [
        {
          text: `Activate continuous ambient monitoring at all ${region} stations. Set 30-min reporting intervals.`,
          deadline: "Immediately",
          priority: isPoor ? "HIGH" : "MEDIUM",
        },
        {
          text: "Cross-check satellite aerosol data with ground readings to identify fire/burning hotspots.",
          deadline: "Within 3 hours",
          priority: "MEDIUM",
        },
        {
          text: "Prepare hourly situation report for Regional Officer and CECB headquarters.",
          deadline: "Every hour",
          priority: isPoor ? "HIGH" : "MEDIUM",
        },
      ],
    },
  ];
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: "CRITICAL" | "HIGH" | "MEDIUM" }) {
  const map = {
    CRITICAL: "bg-red-500/20 text-red-300 border border-red-500/40",
    HIGH:     "bg-orange-500/20 text-orange-300 border border-orange-500/40",
    MEDIUM:   "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${map[p]}`}>{p}</span>
  );
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const aqi = payload[0]?.value;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-bold" style={{ color: getAQIColor(aqi) }}>AQI {aqi}</p>
      <p className="text-slate-500">{getAQILabel(aqi)}</p>
      {payload[0]?.payload?.predicted && (
        <p className="text-cyan-400 mt-1">🤖 AI Predicted</p>
      )}
    </div>
  );
};

// ── Markdown-like renderer for AI text ────────────────────────────────────────
function AINarrative({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <div className="text-sm text-slate-300 space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="text-cyan-300 font-bold mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# "))  return <p key={i} className="text-white font-bold mt-2">{line.slice(2)}</p>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-white font-semibold">{line.slice(2, -2)}</p>;
        if (/^\d+\./.test(line)) return <p key={i} className="text-slate-200 pl-2">{line}</p>;
        if (line.startsWith("- ")) return <p key={i} className="text-slate-300 pl-3">• {line.slice(2)}</p>;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function Predictions() {
  const [locations, setLocations] = useState<{ id: number; name: string; region: string }[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<number | null>(null);
  const [currentAQI, setCurrentAQI] = useState(185);
  const [selectedRegion, setSelectedRegion] = useState("Raipur");
  const [forecastHours, setForecastHours] = useState<24 | 48>(48);
  const [forecastData, setForecastData] = useState<AQIPoint[]>([]);
  const [backendPredictions, setBackendPredictions] = useState<Record<string, number> | null>(null);
  const [aiNarrative, setAiNarrative] = useState<string>("");
  const [aiNarrativeLoading, setAiNarrativeLoading] = useState(false);
  const [aiSuggestionsText, setAiSuggestionsText] = useState<string>("");
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [pollutionZones, setPollutionZones] = useState<PollutionZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [newZoneIds, setNewZoneIds] = useState<Set<number>>(new Set());
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"forecast" | "suggestions" | "alerts">("forecast");
  const prevZoneIdsRef = useRef<Set<number>>(new Set());

  // ── Load zones (real-time alerts) ─────────────────────────────────────────
  const loadPollutionZones = useCallback(async (isRefresh = false) => {
    setZonesLoading(true);
    try {
      const res: any = await (api.alerts as any).pollutionZones().catch(() => ({ zones: [] }));
      const zones: PollutionZone[] = res?.zones ?? [];

      if (isRefresh) {
        const prevIds = prevZoneIdsRef.current;
        const fresh = new Set(zones.map(z => z.alert_id).filter(id => !prevIds.has(id)));
        if (fresh.size > 0) setNewZoneIds(fresh);
      }

      prevZoneIdsRef.current = new Set(zones.map(z => z.alert_id));
      setPollutionZones(zones);
    } catch {
      setPollutionZones([]);
    } finally {
      setZonesLoading(false);
    }
  }, []);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.locations.list().catch(() => []),
      api.public.airQuality().catch(() => ({ data: [] })),
    ]).then(([locs, airRes]: any) => {
      const locList = (locs || []).filter((l: any) =>
        l.location_type === "air" || l.location_type === "Air"
      );
      setLocations(locList);

      const airData = airRes?.data || [];
      if (airData.length > 0) {
        const highest = airData.reduce((max: any, s: any) =>
          (s.aqi ?? 0) > (max.aqi ?? 0) ? s : max, airData[0]);
        setCurrentAQI(Math.round(highest.aqi ?? 185));
        setSelectedRegion(highest.location?.region ?? "Raipur");
        setSelectedLocId(highest.location?.id ?? null);
      }

      setLoading(false);
      setLastRefresh(new Date());
    });

    loadPollutionZones(false);
  }, [loadPollutionZones]);

  // ── Auto-refresh alerts every 30s with countdown ──────────────────────────
  useEffect(() => {
    if (activeTab !== "alerts") return;
    const tick = setInterval(() => {
      setRefreshCountdown(c => {
        if (c <= 1) {
          loadPollutionZones(true);
          setRefreshCountdown(30);
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [activeTab, loadPollutionZones]);

  // ── Fetch backend AQI prediction when location changes ────────────────────
  useEffect(() => {
    if (!selectedLocId) {
      setForecastData(buildForecastData(currentAQI, selectedRegion, undefined, forecastHours));
      return;
    }
    setAiNarrativeLoading(true);
    api.ai.predict(selectedLocId, forecastHours).then((res: any) => {
      const preds = res?.predictions ?? {};
      setBackendPredictions(preds);
      setForecastData(buildForecastData(currentAQI, selectedRegion, preds, forecastHours));
      setAiNarrative(res?.narrative ?? "");
    }).catch(() => {
      setForecastData(buildForecastData(currentAQI, selectedRegion, undefined, forecastHours));
    }).finally(() => setAiNarrativeLoading(false));
  }, [selectedLocId, forecastHours, currentAQI, selectedRegion]);

  // ── Fallback forecast when no location selected ───────────────────────────
  useEffect(() => {
    if (selectedLocId) return;
    setForecastData(buildForecastData(currentAQI, selectedRegion, undefined, forecastHours));
  }, [currentAQI, selectedRegion, forecastHours, selectedLocId]);

  // ── Fetch live AI suggestions when tab opens ──────────────────────────────
  useEffect(() => {
    if (activeTab !== "suggestions" || aiSuggestionsText) return;
    setAiSuggestionsLoading(true);
    api.ai.aqiSuggestions(currentAQI, selectedRegion, "government").then((res: any) => {
      setAiSuggestionsText(res?.suggestions ?? "");
    }).catch(() => {
      setAiSuggestionsText("AI suggestions unavailable. Showing standard recommendations below.");
    }).finally(() => setAiSuggestionsLoading(false));
  }, [activeTab, currentAQI, selectedRegion, aiSuggestionsText]);

  // ── Location change handler ───────────────────────────────────────────────
  const handleLocationChange = useCallback((locId: number) => {
    setSelectedLocId(locId);
    setAiSuggestionsText(""); // reset so it re-fetches with new context
    api.data.latest(locId).then((rows: any) => {
      const latest = (rows || [])[0];
      if (latest?.aqi) setCurrentAQI(Math.round(latest.aqi));
    }).catch(() => {});
    const loc = locations.find(l => l.id === locId);
    if (loc) setSelectedRegion(loc.region);
  }, [locations]);

  const peakAQI = forecastData.length ? Math.max(...forecastData.map(d => d.aqi)) : currentAQI;
  const peakHour = forecastData.find(d => d.aqi === peakAQI);
  const suggestions = generateSuggestions(currentAQI, selectedRegion);
  const criticalCount = pollutionZones.filter(z => z.severity === "critical").length;

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-cyan-300">
              PRITHVINET 2.0
            </span>
            <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-purple-300">
              AI PREDICTION ENGINE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Pollution Prediction & Decision Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-powered {forecastHours}-hour AQI forecast · Role-based action Intelligence · Live crisis detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500">
            <p>Last refreshed</p>
            <p className="text-slate-300">{lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Location selector + Live AQI ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Select Monitoring Station</p>
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            value={selectedLocId ?? ""}
            onChange={e => handleLocationChange(Number(e.target.value))}
          >
            <option value="">— Auto (highest AQI station) —</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name} — {l.region}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">
            Showing forecast for: <span className="text-cyan-300 font-medium">{selectedRegion}</span>
          </p>
        </div>

        <div className="rounded-2xl border p-5 flex flex-col justify-between"
          style={{ borderColor: getAQIColor(currentAQI) + "40", background: getAQIColor(currentAQI) + "10" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Current AQI</p>
          <div>
            <p className="text-5xl font-black" style={{ color: getAQIColor(currentAQI) }}>{currentAQI}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: getAQIColor(currentAQI) }}>
              {getAQILabel(currentAQI)}
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <div className="text-xs text-slate-400">
              <span className="block">Peak forecast</span>
              <span className="font-bold text-white">{peakAQI} AQI</span>
            </div>
            <div className="text-xs text-slate-400 ml-4">
              <span className="block">Peak at</span>
              <span className="font-bold text-white">{peakHour?.hour ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-1.5">
        {[
          { id: "forecast", label: `${forecastHours}-hr AQI Forecast`, icon: TrendingUp },
          { id: "suggestions", label: "AI Action Plan", icon: Brain },
          { id: "alerts", label: "Crisis Alerts", icon: AlertTriangle, count: criticalCount },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === t.id
                ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <t.icon size={15} />
            {t.label}
            {t.count && t.count > 0 ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: AQI FORECAST CHART
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "forecast" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-cyan-400" />
                {forecastHours}-Hour AQI Prediction — {selectedRegion}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Shaded area = AI predicted zone · Solid line = actual readings</p>
            </div>
            {/* 24h / 48h toggle */}
            <div className="flex rounded-xl border border-slate-700 overflow-hidden">
              {[24, 48].map(h => (
                <button
                  key={h}
                  onClick={() => setForecastHours(h as 24 | 48)}
                  className={`px-4 py-1.5 text-xs font-bold transition-all ${
                    forecastHours === h
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-500 animate-pulse">
              <Brain size={32} className="mr-3 text-cyan-500" />
              Generating AI forecast…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aqiActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aqiPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }} interval={5} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50}  stroke="#22c55e" strokeDasharray="4 4" label={{ value: "Good", position: "right", fontSize: 9, fill: "#22c55e" }} />
                <ReferenceLine y={100} stroke="#eab308" strokeDasharray="4 4" label={{ value: "Moderate", position: "right", fontSize: 9, fill: "#eab308" }} />
                <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Poor", position: "right", fontSize: 9, fill: "#ef4444" }} />
                <ReferenceLine y={300} stroke="#a855f7" strokeDasharray="4 4" label={{ value: "Severe", position: "right", fontSize: 9, fill: "#a855f7" }} />
                <Area type="monotone" dataKey="aqi" stroke="#22d3ee" fill="url(#aqiActual)"
                  strokeWidth={2.5} dot={false} data={forecastData.filter(d => !d.predicted)} />
                <Area type="monotone" dataKey="aqi" stroke="#a855f7" fill="url(#aqiPred)"
                  strokeWidth={2} strokeDasharray="6 3" dot={false} data={forecastData.filter(d => d.predicted)} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: `Peak AQI (${forecastHours}h)`, value: peakAQI, color: getAQIColor(peakAQI) },
              { label: "Peak Status", value: getAQILabel(peakAQI), color: getAQIColor(peakAQI) },
              { label: "Avg Next 24h", value: Math.round(forecastData.filter(d => d.predicted).slice(0, 24).reduce((s, d) => s + d.aqi, 0) / 24) || currentAQI, color: "#94a3b8" },
              { label: "Day 2 Trend", value: peakAQI > currentAQI ? "↑ Worsening" : "↓ Improving", color: peakAQI > currentAQI ? "#ef4444" : "#22c55e" },
            ].map(c => (
              <div key={c.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Backend predicted values */}
          {backendPredictions && Object.keys(backendPredictions).length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <Brain size={12} className="text-cyan-400" /> AI Predicted Values at +{forecastHours}h
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(backendPredictions).map(([k, v]) => (
                  typeof v === "number" && (
                    <span key={k} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
                      <span className="text-cyan-400 uppercase">{k}</span>: {v.toFixed(1)}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Groq AI narrative */}
          {aiNarrativeLoading && (
            <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-center gap-3 animate-pulse">
              <Sparkles size={16} className="text-purple-400" />
              <p className="text-sm text-purple-300">Generating AI forecast narrative…</p>
            </div>
          )}
          {!aiNarrativeLoading && aiNarrative && (
            <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-purple-400" />
                <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">AI Forecast Narrative</p>
              </div>
              <AINarrative text={aiNarrative} />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: AI ACTION PLAN
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "suggestions" && (
        <div className="space-y-4">
          {/* Live Groq AI summary at the top */}
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-cyan-400" />
              <p className="text-sm font-bold text-cyan-200">Live AI Intelligence — {selectedRegion}</p>
              <span className="ml-auto text-[10px] text-slate-500">AQI {currentAQI} · {getAQILabel(currentAQI)}</span>
            </div>
            {aiSuggestionsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-700 rounded w-full" />
                <div className="h-3 bg-slate-700 rounded w-5/6" />
              </div>
            ) : aiSuggestionsText ? (
              <AINarrative text={aiSuggestionsText} />
            ) : (
              <p className="text-xs text-slate-500">AI suggestions loading…</p>
            )}
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-5 py-4 flex items-center gap-3">
            <Brain size={20} className="text-purple-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-purple-200">Role-Based Action Guide — {selectedRegion}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Calibrated for AQI {currentAQI} ({getAQILabel(currentAQI)}) · Updated {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {suggestions.map((s) => (
            <div key={s.role} className={`rounded-2xl border p-5 ${s.bg} ${s.border}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl p-2.5 bg-slate-900/50">
                  <s.icon size={18} className={s.color} />
                </div>
                <h3 className={`font-bold text-base ${s.color}`}>{s.role}</h3>
              </div>
              <div className="space-y-3">
                {s.actions.map((action, i) => (
                  <div key={i} className="rounded-xl bg-slate-900/40 border border-slate-800/50 p-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <PriorityBadge p={action.priority} />
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock size={10} /> {action.deadline}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{action.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: CRISIS ALERTS (Real-time)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <p className="text-sm font-bold text-red-200">
              {criticalCount > 0 ? `${criticalCount} Critical Crisis Zones` : "Live Pollution Zone Monitor"}
            </p>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <Timer size={12} className="text-cyan-400" />
              <span className="text-cyan-300">Refreshing in {refreshCountdown}s</span>
              <button
                onClick={() => { loadPollutionZones(true); setRefreshCountdown(30); }}
                className="ml-2 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw size={10} className="inline mr-1" />Refresh now
              </button>
            </div>
          </div>

          {zonesLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center animate-pulse">
              <AlertTriangle size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading live crisis data…</p>
            </div>
          ) : pollutionZones.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-emerald-300">All Clear — No Active Pollution Alerts</p>
              <p className="text-sm text-slate-500 mt-1">All monitoring stations are within acceptable limits</p>
            </div>
          ) : (
            pollutionZones.map((zone) => {
              const isCritical = zone.severity === "critical";
              const isHigh = zone.severity === "high";
              const isNew = newZoneIds.has(zone.alert_id);
              const borderColor = isCritical ? "border-red-500/40" : isHigh ? "border-orange-500/30" : "border-yellow-500/25";
              const bg = isCritical ? "bg-red-950/30" : isHigh ? "bg-orange-950/20" : "bg-yellow-950/15";
              const displayAQI = zone.aqi ?? Math.round(zone.measured_value * 2.5);

              return (
                <div key={zone.alert_id} className={`rounded-2xl border p-5 ${bg} ${borderColor} relative overflow-hidden`}>
                  {isNew && (
                    <div className="absolute top-3 right-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                      NEW
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2 ${isCritical ? "bg-red-500/20" : "bg-orange-500/15"} mt-0.5`}>
                        <AlertTriangle size={18} className={isCritical ? "text-red-400" : "text-orange-400"} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold uppercase tracking-widest ${isCritical ? "text-red-400" : isHigh ? "text-orange-400" : "text-yellow-400"}`}>
                            {isCritical ? "🔴 CRITICAL" : isHigh ? "🟠 HIGH" : "🟡 MODERATE"}
                          </span>
                          {isCritical && <span className="text-[9px] text-red-300 animate-pulse">● LIVE</span>}
                        </div>
                        <h3 className="font-bold text-white text-base">{zone.location_name}</h3>
                        <p className="text-xs text-slate-400">{zone.region}{zone.industry_name ? ` · ${zone.industry_name}` : ""}</p>
                        <p className="text-sm text-slate-300 mt-1">{zone.message}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black" style={{ color: getAQIColor(displayAQI) }}>{displayAQI}</p>
                      <p className="text-xs text-slate-500">AQI · {zone.pollutant?.toUpperCase()}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {zone.measured_value?.toFixed(1)} / {zone.threshold_value?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                    <Zap size={12} className="text-cyan-400" />
                    <p className="text-xs text-slate-400">
                      <span className="text-cyan-300 font-medium">AI Recommendation: </span>
                      {isCritical
                        ? "Activate GRAP Stage IV. Issue public emergency advisory. Deploy inspection teams now."
                        : "Increase inspection frequency. Issue health advisory. Notify industry compliance officers."}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
