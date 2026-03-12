import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertTriangle, Factory, MapPin, Wind, TrendingDown, TrendingUp, CheckCircle } from "lucide-react";

function StatCard({ icon: Icon, label, value, color, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const severityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function Overview() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.alerts.list({ limit: "10" }),
      api.industries.list(),
      api.locations.list(),
      api.data.list({ limit: "20" }),
    ]).then(([a, i, l, d]) => {
      setAlerts(a);
      setIndustries(i);
      setLocations(l);
      setData(d);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeAlerts = alerts.filter(a => a.status === "active").length;
  const violating = industries.filter(i => i.status === "violating").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayReadings = data.filter(d => d.recorded_at?.slice(0, 10) === today).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time environmental monitoring summary</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Active Alerts" value={activeAlerts}
          color="bg-red-50 text-red-600" sub={`${alerts.filter(a => a.severity === "critical" && a.status === "active").length} critical`} />
        <StatCard icon={Factory} label="Industries" value={industries.length}
          color="bg-indigo-50 text-indigo-600" sub={`${violating} violating`} />
        <StatCard icon={MapPin} label="Monitoring Locations" value={locations.length}
          color="bg-teal-50 text-teal-600" sub="Active stations" />
        <StatCard icon={Wind} label="Readings Today" value={todayReadings}
          color="bg-green-50 text-green-600" sub="Air, Water & Noise" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Alerts</h2>
            <a href="/dashboard/alerts" className="text-xs text-blue-600 hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.slice(0, 6).map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${severityColor[a.severity] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {a.severity}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.alert_type?.toUpperCase()} · {new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">No alerts — all systems normal!</p>
              </div>
            )}
          </div>
        </div>

        {/* Industry Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Industry Status</h2>
            <a href="/dashboard/industries" className="text-xs text-blue-600 hover:underline">Manage →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {industries.slice(0, 6).map(i => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{i.name}</p>
                  <p className="text-xs text-gray-400">{i.region} · {i.industry_type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  i.status === "violating" ? "bg-red-100 text-red-700" :
                  i.status === "compliant" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{i.status}</span>
              </div>
            ))}
            {industries.length === 0 && <p className="p-8 text-center text-sm text-gray-400">No industries registered yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
