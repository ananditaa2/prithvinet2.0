import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle, Factory, MapPin, Wind, CheckCircle,
  TrendingUp, Droplets, Volume2, ShieldAlert, Activity,
  Sparkles, Download, PhoneCall, Check, BellRing, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar
} from "recharts";

// ─── Color Maps ───────────────────────────────────────────────────────────────
const SEVERITY_STYLES: Record<string, { bar: string; dot: string; badge: string }> = {
  critical: { bar: "bg-red-500",    dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200" },
  high:     { bar: "bg-orange-500", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { bar: "bg-yellow-400", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:      { bar: "bg-blue-400",   dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700 border-blue-200" },
};

const DATA_TYPE_COLOR: Record<string, string> = {
  air:   "#10b981",
  water: "#06b6d4",
  noise: "#8b5cf6",
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, trend }: any) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 ${accent} -mr-8 -mt-8`} />
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{value ?? "—"}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Compliance Donut ──────────────────────────────────────────────────────────
function ComplianceDonut({ compliant, violating, inactive }: { compliant: number; violating: number; inactive: number }) {
  const data = [
    { name: "Compliant",  value: compliant,  color: "#10b981" },
    { name: "Violating",  value: violating,  color: "#ef4444" },
    { name: "Inactive",   value: inactive,   color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const total = compliant + violating + inactive;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Industry Compliance</h2>
          <p className="text-xs text-gray-400 mt-0.5">{total} industries total</p>
        </div>
        <a href="/dashboard/industries" className="text-xs text-blue-600 hover:underline font-medium">Manage →</a>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={64} paddingAngle={3} dataKey="value">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-extrabold text-gray-900">{total > 0 ? Math.round((compliant / total) * 100) : 0}%</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Compliant</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-sm text-gray-600">{d.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Alert Severity Bar Chart ──────────────────────────────────────────────────
function AlertSeverityChart({ alerts }: { alerts: any[] }) {
  const counts = ["critical", "high", "medium", "low"].map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    Active: alerts.filter(a => a.severity === sev && a.status === "active").length,
    Resolved: alerts.filter(a => a.severity === sev && a.status === "resolved").length,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Alert Severity Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Active vs. Resolved comparison</p>
        </div>
        <a href="/dashboard/alerts" className="text-xs text-blue-600 hover:underline font-medium">View all →</a>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={counts} barSize={20} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
          <Bar dataKey="Active"   fill="#ef4444" radius={[6,6,0,0]} />
          <Bar dataKey="Resolved" fill="#10b981" radius={[6,6,0,0]} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Data Type Readings Chart ──────────────────────────────────────────────────
function DataTypeChart({ data }: { data: any[] }) {
  const grouped = useMemo(() => {
    const last7: Record<string, any> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7[key] = { date: key.slice(5), air: 0, water: 0, noise: 0 };
    }
    data.forEach(row => {
      const day = row.recorded_at?.slice(0, 10);
      if (last7[day]) {
        const type = (row.data_type || "air").toLowerCase();
        if (type in last7[day]) last7[day][type]++;
      }
    });
    return Object.values(last7);
  }, [data]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h2 className="font-bold text-gray-900">Sensor Readings — Last 7 Days</h2>
        <p className="text-xs text-gray-400 mt-0.5">Air · Water · Noise data ingestion trend</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={grouped}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
          <Line type="monotone" dataKey="air"   stroke={DATA_TYPE_COLOR.air}   strokeWidth={2.5} dot={false} name="Air"   />
          <Line type="monotone" dataKey="water" stroke={DATA_TYPE_COLOR.water} strokeWidth={2.5} dot={false} name="Water" />
          <Line type="monotone" dataKey="noise" stroke={DATA_TYPE_COLOR.noise} strokeWidth={2.5} dot={false} name="Noise" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Recent Alerts Feed ────────────────────────────────────────────────────────
function AlertFeed({ alerts, canViewViolationLogs, locations }: { alerts: any[]; canViewViolationLogs: boolean; locations: any[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Live Alert Feed</h2>
          <p className="text-xs text-gray-400 mt-0.5">Color-coded by severity</p>
        </div>
        <a href="/dashboard/alerts" className="text-xs text-blue-600 hover:underline font-medium">View all →</a>
      </div>
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {alerts.slice(0, 8).map(a => {
          const styles = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.low;
          return (
            <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${styles.dot} ${a.status === "active" ? "shadow-[0_0_6px_currentColor]" : "opacity-50"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles.badge}`}>
                    {a.severity}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">{a.alert_type}</span>
                  {a.status === "active" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-50 text-red-500 font-semibold animate-pulse">LIVE</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1 truncate">
                  {(() => {
                    let msg = canViewViolationLogs ? a.message : "Violation details restricted for your role.";
                    // Replace "location #ID" with "location name" logically
                    const locMatch = msg.match(/location\s*#(\d+)/i);
                    if (locMatch) {
                      const loc = locations.find(l => l.id === parseInt(locMatch[1]));
                      if (loc) {
                        msg = msg.replace(locMatch[0], `${locMatch[0]} (${loc.name.trim()})`);
                      }
                    }
                    return msg;
                  })()}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString("en-IN")}</p>
                  {(a.alert_type === "missing_report" || (!a.message?.includes("threshold") && !a.message?.includes("index"))) && (
                    <Button variant="outline" size="sm" className="h-[22px] text-[10px] px-2 gap-1 py-0! rounded bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
                      <BellRing className="w-3 h-3 text-amber-500" /> Send Reminder
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="p-10 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p className="text-sm font-medium text-gray-500">All clear — no active alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Top Violations Bar ────────────────────────────────────────────────────────
function TopViolationsBar({ industries }: { industries: any[] }) {
  const violating = industries.filter(i => i.status === "violating");
  const data = violating.slice(0, 5).map(i => ({
    name: i.name?.length > 14 ? i.name.slice(0, 14) + "…" : i.name,
    region: i.region || "N/A",
    value: 1,
  }));

  if (violating.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center min-h-[160px]">
      <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
      <p className="text-sm font-medium text-gray-500">No violating industries</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Active Violations</h2>
          <p className="text-xs text-gray-400 mt-0.5">{violating.length} industries flagged</p>
        </div>
        <ShieldAlert className="w-5 h-5 text-red-500" />
      </div>
      <div className="space-y-3">
        {violating.slice(0, 5).map((industry, i) => (
          <div key={industry.id} className="group flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 truncate">{industry.name}</span>
                <span className="text-xs text-gray-400 ml-2">{industry.region}</span>
              </div>
              <div className="h-1.5 w-full bg-red-100 rounded-full">
                <div className="h-1.5 bg-red-500 rounded-full" style={{ width: `${Math.min(100, 40 + i * 15)}%` }} />
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 items-end ml-2">
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Escalate to Authorities" className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                  <PhoneCall className="w-3.5 h-3.5" />
                </button>
                <button title="Resolve Violation" className="p-1 rounded bg-green-50 hover:bg-green-100 text-green-600 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <a href="/dashboard/ai-tools" title="Run What-If Simulation" className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors">
                  <Wand2 className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Overview() {
  const { user } = useAuth();
  const [alerts, setAlerts]       = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [locations, setLocations]  = useState<any[]>([]);
  const [data, setData]            = useState<any[]>([]);
  const [loading, setLoading]      = useState(true);

  const canViewViolationLogs = !!user && ["monitoring_team", "regional_officer", "admin"].includes(user.role);
  const isIndustryUser       = user?.role === "industry_user";
  const canViewRegionScoped  = user?.role === "regional_officer";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.alerts.list({ limit: "50" }),
      api.industries.list(),
      api.locations.list(),
      api.data.list({ limit: "100" }),
    ]).then(([a, i, l, d]) => {
      let sa = a, si = i, sl = l, sd = d;
      if (isIndustryUser && user?.email) {
        si = i.filter((x: any) => x.contact_email === user.email);
        const ids = new Set(si.map((x: any) => x.id));
        sl = l.filter((x: any) => ids.has(x.industry_id));
        const lids = new Set(sl.map((x: any) => x.id));
        sa = a.filter((x: any) => ids.has(x.industry_id) || lids.has(x.location_id));
        sd = d.filter((x: any) => ids.has(x.industry_id) || lids.has(x.location_id));
      } else if (canViewRegionScoped && user?.name) {
        const r = user.name.toLowerCase();
        si = i.filter((x: any) => x.region?.toLowerCase().includes(r));
        const ids = new Set(si.map((x: any) => x.id));
        sl = l.filter((x: any) => x.region?.toLowerCase().includes(r));
        const lids = new Set(sl.map((x: any) => x.id));
        sa = a.filter((x: any) => ids.has(x.industry_id) || lids.has(x.location_id));
        sd = d.filter((x: any) => ids.has(x.industry_id) || lids.has(x.location_id));
      }
      setAlerts(sa); setIndustries(si); setLocations(sl); setData(sd);
    }).catch(console.error).finally(() => setLoading(false));
  }, [isIndustryUser, canViewRegionScoped, user?.email, user?.name]);

  // Derived stats
  const activeAlerts  = alerts.filter(a => a.status === "active").length;
  const criticalCount = alerts.filter(a => a.severity === "critical" && a.status === "active").length;
  const violating     = industries.filter(i => i.status === "violating").length;
  const compliant     = industries.filter(i => i.status === "compliant").length;
  const inactive      = industries.length - violating - compliant;
  const totalIndustries = industries.length;
  const today         = new Date().toISOString().slice(0, 10);
  const todayReadings = data.filter(d => d.recorded_at?.slice(0, 10) === today).length;
  const airReadings   = data.filter(d => (d.data_type || "").toLowerCase() === "air").length;
  const waterReadings = data.filter(d => (d.data_type || "").toLowerCase() === "water").length;
  const noiseReadings = data.filter(d => (d.data_type || "").toLowerCase() === "noise").length;

  const title = {
    monitoring_team:  "Monitoring Team Overview",
    industry_user:    "Industry Overview",
    regional_officer: "Regional Overview",
  }[user?.role ?? ""] ?? "System Overview";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time environmental intelligence · As of {new Date().toLocaleString("en-IN")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white bg-opacity-80 backdrop-blur-sm border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => window.print()}>
            <Download className="w-3.5 h-3.5" /> Daily Report
          </Button>
          <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-700 font-bold uppercase tracking-wide">Live</span>
          </div>
        </div>
      </div>

      {/* AI Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100/50 shadow-sm flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-500">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-indigo-900 mb-1">AI Executive Summary</h3>
          <p className="text-sm text-indigo-800/80 leading-relaxed">
            System is tracking <span className="font-semibold text-indigo-900">{activeAlerts} active alerts</span>. Immediate action is required for <span className="font-semibold text-indigo-900">{violating} violating industries</span>. Overall regional compliance rate sits at <span className="font-semibold text-indigo-900">{totalIndustries > 0 ? Math.round((compliant/totalIndustries)*100) : 0}%</span>.
          </p>
        </div>
        <a href="/dashboard/ai-tools" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-white/50 px-3 py-1.5 border border-indigo-100 rounded-full transition-colors flex-shrink-0">
          Ask Copilot →
        </a>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Active Alerts"          value={activeAlerts}      accent="bg-red-500 text-red-600"     sub={`${criticalCount} critical`}          trend={criticalCount > 0 ? criticalCount * 10 : undefined} />
        <StatCard icon={Factory}       label="Industries"             value={industries.length} accent="bg-indigo-500 text-indigo-600" sub={`${violating} violating`} />
        <StatCard icon={MapPin}        label="Monitoring Stations"    value={locations.length}  accent="bg-teal-500 text-teal-600"   sub="Active stations" />
        <StatCard icon={Activity}      label="Readings Today"         value={todayReadings}     accent="bg-green-500 text-green-600" sub="Air · Water · Noise" />
      </div>

      {/* Data Type Mini Pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Wind,     label: "Air Readings",   value: airReadings,   color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { icon: Droplets, label: "Water Readings",  value: waterReadings, color: "text-cyan-600 bg-cyan-50 border-cyan-100" },
          { icon: Volume2,  label: "Noise Readings",  value: noiseReadings, color: "text-violet-600 bg-violet-50 border-violet-100" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${color}`}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-xl font-extrabold tabular-nums">{value}</p>
              <p className="text-xs font-medium opacity-70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AlertSeverityChart alerts={alerts} />
        <ComplianceDonut compliant={compliant} violating={violating} inactive={inactive} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <DataTypeChart data={data} />
        </div>
        <TopViolationsBar industries={industries} />
      </div>

      {/* Alert Feed */}
      <AlertFeed alerts={alerts} canViewViolationLogs={canViewViolationLogs} locations={locations} />
    </div>
  );
}
