import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Landmark, Wind, Droplets, Volume2, AlertTriangle, Factory, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const tabs = [
  { id: "air", label: "Air Quality", icon: Wind, color: "sky" },
  { id: "water", label: "Water Quality", icon: Droplets, color: "blue" },
  { id: "alerts", label: "Active Alerts", icon: AlertTriangle, color: "red" },
  { id: "industries", label: "Industries", icon: Factory, color: "indigo" },
];

const aqiColor = (aqi: number | null) => {
  if (!aqi) return "bg-gray-100 text-gray-500";
  if (aqi < 50) return "bg-green-100 text-green-700";
  if (aqi < 100) return "bg-yellow-100 text-yellow-700";
  if (aqi < 150) return "bg-orange-100 text-orange-700";
  if (aqi < 200) return "bg-red-100 text-red-700";
  return "bg-purple-100 text-purple-700";
};

const aqiLabel = (aqi: number | null) => {
  if (!aqi) return "Unknown";
  if (aqi < 50) return "Good";
  if (aqi < 100) return "Moderate";
  if (aqi < 150) return "Unhealthy (Sensitive)";
  if (aqi < 200) return "Unhealthy";
  return "Very Unhealthy";
};

const sevColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};
const indStatus: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  compliant: "bg-green-100 text-green-700",
  violating: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-500",
};

export default function CitizenPortal() {
  const [tab, setTab] = useState("air");
  const [airData, setAirData] = useState<any>(null);
  const [waterData, setWaterData] = useState<any>(null);
  const [alertsData, setAlertsData] = useState<any>(null);
  const [industryData, setIndustryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadTab = async (t: string) => {
    setLoading(true);
    try {
      if (t === "air" && !airData) setAirData(await api.public.airQuality());
      if (t === "water" && !waterData) setWaterData(await api.public.waterQuality());
      if (t === "alerts" && !alertsData) setAlertsData(await api.public.alerts());
      if (t === "industries" && !industryData) setIndustryData(await api.public.industries());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadTab(tab); }, [tab]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Gov bar */}
      <div className="bg-blue-900 text-white text-xs py-1.5 px-6 flex justify-between items-center">
        <span>Official Environment Monitoring Portal | Government of Bharat</span>
        <Link to="/login" className="hover:underline">Officer Login →</Link>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900 font-heading">PrithviNet Citizen Portal</h1>
            <p className="text-xs text-gray-500">Public Environmental Transparency Dashboard</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <Globe className="w-3.5 h-3.5" /> Public Access — No login required
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${tab === t.id ? "bg-blue-700 text-white shadow-blue-200" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Air Quality */}
        {tab === "air" && airData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {airData.data?.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">No air quality data available yet.</p>}
            {airData.data?.map((d: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.location.name}</h3>
                    <p className="text-xs text-gray-500">{d.location.region}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${aqiColor(d.aqi)}`}>
                    AQI {d.aqi?.toFixed(0) ?? "—"}
                  </span>
                </div>
                <p className={`text-sm font-medium mb-3 ${aqiColor(d.aqi)} px-2 py-1 rounded-lg inline-block`}>
                  {aqiLabel(d.aqi)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>PM2.5: <b className="text-gray-700">{d.pm25 ?? "—"}</b></span>
                  <span>PM10: <b className="text-gray-700">{d.pm10 ?? "—"}</b></span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Updated: {d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "—"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Water Quality */}
        {tab === "water" && waterData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {waterData.data?.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">No water quality data available yet.</p>}
            {waterData.data?.map((d: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">{d.location.name}</h3>
                  <p className="text-xs text-gray-500">{d.location.region}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>pH: <b className={d.ph && (d.ph < 6.5 || d.ph > 8.5) ? "text-red-600" : "text-gray-700"}>{d.ph ?? "—"}</b></span>
                  <span>BOD: <b className="text-gray-700">{d.bod ?? "—"}</b> mg/L</span>
                  <span>DO: <b className={d.dissolved_oxygen && d.dissolved_oxygen < 4 ? "text-red-600" : "text-gray-700"}>{d.dissolved_oxygen ?? "—"}</b> mg/L</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Updated: {d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "—"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {tab === "alerts" && alertsData && (
          <div className="space-y-3">
            {alertsData.alerts?.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-green-600 font-semibold text-lg">✅ No active pollution alerts</p>
                <p className="text-gray-400 text-sm mt-1">All monitored areas are within safe limits.</p>
              </div>
            )}
            {alertsData.alerts?.map((a: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${a.severity === "critical" ? "text-red-500" : a.severity === "high" ? "text-orange-500" : "text-yellow-500"}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sevColor[a.severity]}`}>{a.severity}</span>
                      <span className="text-xs text-gray-500 uppercase">{a.alert_type}</span>
                    </div>
                    <p className="text-sm text-gray-800">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Industries */}
        {tab === "industries" && industryData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {industryData.industries?.map((i: any) => (
              <div key={i.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{i.name}</h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${indStatus[i.status] || "bg-gray-100 text-gray-600"}`}>{i.status}</span>
                </div>
                <p className="text-xs text-gray-500">{i.type} · {i.region}</p>
                {i.lat && <p className="text-xs text-gray-400 mt-1">📍 {i.lat.toFixed(3)}, {i.lng.toFixed(3)}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
