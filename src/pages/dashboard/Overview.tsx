import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Factory, MapPin, Wind, CheckCircle } from "lucide-react";

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
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewViolationLogs = !!user && ["monitoring_team", "regional_officer", "admin"].includes(user.role);
  const canViewIndustryNames = !!user && ["monitoring_team", "regional_officer", "admin"].includes(user.role);
  const canViewAllStationData = !!user && ["monitoring_team", "admin"].includes(user.role);
  const canViewRegionScopedData = user?.role === "regional_officer";
  const isIndustryUser = user?.role === "industry_user";

  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.alerts.list({ limit: "10" }),
      api.industries.list(),
      api.locations.list(),
      api.data.list({ limit: "20" }),
    ])
      .then(([a, i, l, d]) => {
        let scopedAlerts = a;
        let scopedIndustries = i;
        let scopedLocations = l;
        let scopedData = d;

        if (isIndustryUser && user?.email) {
          scopedIndustries = i.filter((industry: any) => industry.contact_email === user.email);
          const allowedIndustryIds = new Set(scopedIndustries.map((industry: any) => industry.id));
          scopedLocations = l.filter((location: any) => location.industry_id && allowedIndustryIds.has(location.industry_id));
          const allowedLocationIds = new Set(scopedLocations.map((location: any) => location.id));
          scopedAlerts = a.filter((alert: any) =>
            (alert.industry_id && allowedIndustryIds.has(alert.industry_id)) ||
            (alert.location_id && allowedLocationIds.has(alert.location_id))
          );
          scopedData = d.filter((row: any) =>
            (row.industry_id && allowedIndustryIds.has(row.industry_id)) ||
            (row.location_id && allowedLocationIds.has(row.location_id))
          );
        } else if (canViewRegionScopedData && user?.name) {
          const officerRegion = user.name;
          scopedIndustries = i.filter((industry: any) =>
            industry.region?.toLowerCase().includes(officerRegion.toLowerCase())
          );
          const allowedIndustryIds = new Set(scopedIndustries.map((industry: any) => industry.id));
          scopedLocations = l.filter((location: any) =>
            location.region?.toLowerCase().includes(officerRegion.toLowerCase())
          );
          const allowedLocationIds = new Set(scopedLocations.map((location: any) => location.id));
          scopedAlerts = a.filter((alert: any) =>
            (alert.industry_id && allowedIndustryIds.has(alert.industry_id)) ||
            (alert.location_id && allowedLocationIds.has(alert.location_id))
          );
          scopedData = d.filter((row: any) =>
            (row.industry_id && allowedIndustryIds.has(row.industry_id)) ||
            (row.location_id && allowedLocationIds.has(row.location_id))
          );
        }

        setAlerts(scopedAlerts);
        setIndustries(scopedIndustries);
        setLocations(scopedLocations);
        setData(scopedData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [canViewRegionScopedData, isIndustryUser, user?.email, user?.name]);

  const activeAlerts = alerts.filter(a => a.status === "active").length;
  const violating = industries.filter(i => i.status === "violating").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayReadings = data.filter(d => d.recorded_at?.slice(0, 10) === today).length;

  const overviewTitle = useMemo(() => {
    if (user?.role === "monitoring_team") return "Monitoring Team Overview";
    if (user?.role === "industry_user") return "Industry Overview";
    if (user?.role === "regional_officer") return "Regional Overview";
    return "Dashboard Overview";
  }, [user?.role]);

  const overviewSubtitle = useMemo(() => {
    if (user?.role === "monitoring_team") return "Field-access summary for assigned operational features";
    if (user?.role === "industry_user") return "Your organization’s compliance and monitoring summary";
    if (user?.role === "regional_officer") return "Region-scoped environmental monitoring summary";
    return "Real-time environmental monitoring summary";
  }, [user?.role]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">{overviewTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">{overviewSubtitle}</p>
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
                  <p className="text-sm text-gray-800 truncate">
                    {canViewViolationLogs ? a.message : "Violation details are restricted for your role."}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.alert_type?.toUpperCase()} · {new Date(a.created_at).toLocaleString()}
                  </p>
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
                  <p className="text-sm font-medium text-gray-800">
                    {canViewIndustryNames ? i.name : "Restricted industry"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {i.region} · {isIndustryUser ? "Own Only" : canViewAllStationData ? i.industry_type : "Restricted"}
                  </p>
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
