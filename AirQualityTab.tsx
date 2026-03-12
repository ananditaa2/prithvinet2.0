import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle, MapPin } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from "recharts";
import KPICard from "./KPICard";
import {
  CITIES,
  getFilteredData,
  getAverageAQI,
  getViolations,
  getComplianceRate,
  getCityComparison,
  getAqiTrendData,
  getPollutantAverages,
  getLatestReadings,
  prescribedLimits,
} from "@/data/aqiData";
import type { CityKey } from "@/data/types";
import { useWebSocket } from "@/context/WebSocketContext";

function getAQIColor(aqi: number) {
  if (aqi <= 50) return "text-emerald-600";
  if (aqi <= 100) return "text-green-600";
  if (aqi <= 200) return "text-amber-600";
  if (aqi <= 300) return "text-orange-600";
  if (aqi <= 400) return "text-red-600";
  return "text-red-800";
}

function getAQIBg(aqi: number) {
  if (aqi <= 50) return "bg-emerald-100 text-emerald-700";
  if (aqi <= 100) return "bg-green-100 text-green-700";
  if (aqi <= 200) return "bg-amber-100 text-amber-700";
  if (aqi <= 300) return "bg-orange-100 text-orange-700";
  if (aqi <= 400) return "bg-red-100 text-red-700";
  return "bg-red-200 text-red-800";
}

const BAR_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AirQualityTab() {
  const [selectedCity, setSelectedCity] = useState<CityKey | "all">("all");

  const data = getFilteredData(selectedCity);
  const avgAQI = getAverageAQI(data.emissions);
  const violations = getViolations(data.emissions);
  const complianceRate = getComplianceRate(data.emissions);
  const trendData = getAqiTrendData(data.emissions);
  const pollutantAvgs = getPollutantAverages(data.emissions);
  const latestReadings = getLatestReadings(data.emissions, data.stations);
  const cityComparison = getCityComparison();

  // Inject real-time WebSocket data into the chart
  const { liveDataPayload } = useWebSocket();
  const liveTrendData = [...trendData];
  
  // If we have live data matching this component, append a new data point
  if (liveDataPayload && liveDataPayload.type === 'AIR_QUALITY_SPIKE') {
    liveTrendData.push({
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      AQI: liveDataPayload.AQI,
      category: liveDataPayload.category,
    });
  }

  return (
    <div className="space-y-6">
      {/* City Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCity("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCity === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
        >
          All Cities
        </button>
        {CITIES.map((city) => (
          <button
            key={city.key}
            onClick={() => setSelectedCity(city.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCity === city.key ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {city.label}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Average AQI"
          value={avgAQI}
          subtitle={`Across ${data.stations.length} stations`}
          icon={<Activity className="h-5 w-5 text-blue-600" />}
          colorClass={getAQIColor(avgAQI)}
          bgClass="bg-blue-50"
        />
        <KPICard
          title="Compliance Rate"
          value={`${complianceRate}%`}
          subtitle={`${violations.length} violations detected`}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          colorClass={complianceRate >= 70 ? "text-emerald-600" : "text-red-600"}
          bgClass="bg-emerald-50"
        />
        <KPICard
          title="Total Violations"
          value={violations.length}
          subtitle="Exceeding NAAQS limits"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
        <KPICard
          title="Monitoring Stations"
          value={data.stations.length}
          subtitle={`${data.industries.length} industries tracked`}
          icon={<MapPin className="h-5 w-5 text-violet-600" />}
          colorClass="text-violet-700"
          bgClass="bg-violet-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AQI Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">AQI Trend Over Time</h3>
          <p className="text-xs text-slate-400 mb-4">Daily average AQI from monitoring stations</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveTrendData.slice(-30)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Poor", fill: "#ef4444", fontSize: 11 }} />
                <Area type="monotone" dataKey="AQI" stroke="#3b82f6" fill="url(#aqiGrad)" strokeWidth={2} name="AQI" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pollutant Averages vs Limits */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">Pollutant Levels vs. NAAQS Limits</h3>
          <p className="text-xs text-slate-400 mb-4">Average concentrations compared to prescribed limits</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pollutantAvgs} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="pollutant" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="average" name="Avg Level" radius={[4, 4, 0, 0]}>
                  {pollutantAvgs.map((entry, index) => (
                    <Cell key={entry.pollutant} fill={entry.average > entry.limit ? "#ef4444" : BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="limit" fill="#e2e8f0" name="NAAQS Limit" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* City comparison */}
      {selectedCity === "all" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">City-wise Comparison</h3>
          <p className="text-xs text-slate-400 mb-4">AQI, violations, and compliance across Chhattisgarh</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityComparison} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="city" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="avgAQI" fill="#6366f1" name="Avg AQI" radius={[4, 4, 0, 0]} />
                <Bar dataKey="violations" fill="#ef4444" name="Violations" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Station Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Station Monitoring Data</h3>
          <p className="text-xs text-slate-400 mt-0.5">Latest readings from CPCB & CECB monitoring stations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Station</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Region</th>
                <th className="px-4 py-3 font-semibold text-slate-600">AQI</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Last Date</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestReadings.map((station) => (
                <tr key={station.station_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{station.name}</span>
                    <p className="text-xs text-slate-400">{station.type}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{station.region}</td>
                  <td className="px-4 py-3">
                    {station.latestAQI != null ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getAQIBg(station.latestAQI)}`}>
                        {station.latestAQI}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{station.latestCategory}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{station.latestDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      station.compliance === "COMPLIANT" ? "bg-emerald-50 text-emerald-700" :
                      station.compliance === "VIOLATION" ? "bg-red-50 text-red-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {station.compliance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
