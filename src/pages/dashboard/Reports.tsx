import { useState } from "react";
import { api } from "@/lib/api";
import { FileBarChart2, BarChart3, Building2 } from "lucide-react";

function Stat({ label, value, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const [reportTab, setReportTab] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError(""); setData(null);
    try {
      const result = reportTab === "monthly"
        ? await api.reports.monthly(year, month)
        : await api.reports.yearly(year);
      setData(result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Environmental Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Monthly and yearly pollution summaries</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["monthly","Monthly"],["yearly","Yearly"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setReportTab(id); setData(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${reportTab === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        {reportTab === "monthly" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{new Date(2024,m-1).toLocaleString("default",{month:"long"})}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          <FileBarChart2 className="w-4 h-4" />
          {loading ? "Loading…" : "Generate Report"}
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Readings" value={data.total_readings} />
            <Stat label="Total Alerts" value={data.total_alerts ?? data.alerts_triggered} />
            {data.critical_alerts !== undefined && <Stat label="Critical Alerts" value={data.critical_alerts} />}
            {data.industries_in_violation !== undefined && <Stat label="Industries Violating" value={data.industries_in_violation} />}
          </div>

          {/* Air */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-sky-500" />
              <h2 className="font-semibold text-gray-900">Air Quality Averages</h2>
              <span className="ml-auto text-xs text-gray-400">{data.air_quality.readings} readings</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["AQI","avg_aqi"],["PM2.5","avg_pm25"],["PM10","avg_pm10"],["SO2","avg_so2"]].map(([n,k]) => (
                <div key={k} className="bg-sky-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-sky-600 font-medium">{n}</p>
                  <p className="text-xl font-bold text-sky-800 mt-1">{data.air_quality[k] ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Water */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-gray-900">Water Quality Averages</h2>
              <span className="ml-auto text-xs text-gray-400">{data.water_quality.readings} readings</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["pH","avg_ph"],["BOD","avg_bod"],["COD","avg_cod"],["DO","avg_do"]].map(([n,k]) => (
                <div key={k} className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">{n}</p>
                  <p className="text-xl font-bold text-blue-800 mt-1">{data.water_quality[k] ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Noise */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900">Noise Averages</h2>
              <span className="ml-auto text-xs text-gray-400">{data.noise.readings} readings</span>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {[["Avg dB","avg_decibel"],["Peak dB","avg_peak_decibel"]].map(([n,k]) => (
                <div key={k} className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-600 font-medium">{n}</p>
                  <p className="text-xl font-bold text-purple-800 mt-1">{data.noise[k] ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <FileBarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Select a period and click Generate Report</p>
        </div>
      )}
    </div>
  );
}
