import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";

const severityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border border-red-200",
  high: "bg-orange-100 text-orange-700 border border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low: "bg-blue-100 text-blue-700 border border-blue-200",
};

const CPCB_REF: Record<string, string> = {
  air: "CPCB National AQI (2014) | EPA 1986 §5 & §15",
  water: "Water Act 1974 | CPCB Effluent Standards",
  noise: "Noise Pollution Rules 2000",
  pm25: "CPCB PM2.5: 60 µg/m³ (24h) industrial",
  pm10: "CPCB PM10: 100 µg/m³ (24h) industrial",
  bod: "CPCB BOD: 30 mg/L effluent",
  ph: "CPCB pH: 6.5–8.5",
};
function cpcbRef(alertType: string, pollutant?: string): string {
  return CPCB_REF[pollutant || ""] || CPCB_REF[alertType || ""] || "EPA 1986 §15";
}
const severityBorder: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

const RESOLVE_ROLES = ["admin", "regional_officer", "monitoring_team"];
const ALERT_ACCESS_ROLES = ["admin", "regional_officer", "monitoring_team", "industry_user"];
const COMPLIANCE_ACCESS_ROLES = ["admin", "regional_officer", "super_admin"];
interface Alert {
  id: number;
  severity: "critical" | "high" | "medium" | "low";
  alert_type: string;
  status: "active" | "resolved";
  message: string;
  location_id: number;
  industry_id?: number;
  created_at: string;
  pollutant?: string;
  measured_value?: number;
  threshold_value?: number;
}

interface ComplianceIndustry {
  id: number;
  name: string;
  region: string;
  type: string;
  registration_number: string;
  active_alerts: number;
}

interface ComplianceData {
  count: number;
  violating_industries: ComplianceIndustry[];
}

export default function Alerts() {
  const { user } = useAuth();
  const canViewAlerts = !!user && ALERT_ACCESS_ROLES.includes(user.role);
  const canViewCompliance = !!user && COMPLIANCE_ACCESS_ROLES.includes(user.role);
  const availableTabs = useMemo(
    () => [
      ...(canViewAlerts ? [{ id: "alerts", label: "Active Alerts" }] : []),
      ...(canViewCompliance ? [{ id: "compliance", label: "Compliance" }] : []),
    ],
    [canViewAlerts, canViewCompliance]
  );

  const [tab, setTab] = useState<string>(canViewAlerts ? "alerts" : canViewCompliance ? "compliance" : "");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const canResolve = !!user && RESOLVE_ROLES.includes(user.role);

  const loadAlerts = () => {
    setLoading(true);
    api.alerts.list({ status: "active", limit: "100" })
      .then(setAlerts).finally(() => setLoading(false));
  };

  const loadCompliance = () => {
    setLoading(true);
    api.alerts.compliance().then(setCompliance).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!availableTabs.length) return;
    if (!availableTabs.some((t) => t.id === tab)) {
      setTab(availableTabs[0].id);
    }
  }, [availableTabs, tab]);

  useEffect(() => {
    if (tab === "alerts" && canViewAlerts) loadAlerts();
    else if (tab === "compliance" && canViewCompliance) loadCompliance();
  }, [tab, canViewAlerts, canViewCompliance]);

  const handleResolve = async (id: number) => {
    try {
      await api.alerts.resolve(id);
      loadAlerts();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      alert(message);
    }
  };
  const handleAck = async (id: number) => {
    try {
      await api.alerts.acknowledge(id);
      loadAlerts();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      alert(message);
    }
  };

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);

  if (!canViewAlerts && !canViewCompliance) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Alerts & Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor environmental violations and industry compliance</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Shield className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Access restricted for your role</p>
          <p className="text-sm text-gray-400 mt-1">You do not have permission to view alerts or compliance data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Alerts & Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor environmental violations and industry compliance</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {availableTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}{t.id === "alerts" && alerts.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{alerts.length}</span>}
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <>
          {/* Severity filter */}
          <div className="flex gap-2 flex-wrap">
            {["all","critical","high","medium","low"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === s ? "bg-blue-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)} {s !== "all" && `(${alerts.filter(a => a.severity === s).length})`}
              </button>
            ))}
          </div>

          {loading ? <div className="py-12 text-center text-gray-400">Loading…</div>
            : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No active alerts</p>
                <p className="text-sm text-gray-400 mt-1">All monitored parameters are within safe limits.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a: Alert) => (
                  <div key={a.id} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${severityBorder[a.severity] || "border-l-gray-300"} shadow-sm p-5`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${a.severity === "critical" ? "text-red-500" : a.severity === "high" ? "text-orange-500" : a.severity === "medium" ? "text-yellow-500" : "text-blue-500"}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge[a.severity]}`}>{a.severity}</span>
                            <span className="text-xs text-gray-500 uppercase font-medium">{a.alert_type}</span>
                            {a.pollutant && <span className="text-xs text-gray-400">· {a.pollutant}</span>}
                          </div>
                          <p className="text-sm text-gray-800">{a.message}</p>
                          <p className="text-xs text-amber-700 mt-1 font-medium">📜 {cpcbRef(a.alert_type, a.pollutant)}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>📍 Loc #{a.location_id}</span>
                            {a.industry_id && <span>🏭 Ind #{a.industry_id}</span>}
                            <span>🕐 {new Date(a.created_at).toLocaleString()}</span>
                            {a.measured_value && <span>📊 {a.measured_value} (threshold: {a.threshold_value})</span>}
                          </div>
                        </div>
                      </div>
                      {canResolve && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleAck(a.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            <Clock className="w-3.5 h-3.5" /> Ack
                          </button>
                          <button onClick={() => handleResolve(a.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" /> Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      )}

      {tab === "compliance" && (
        <div>
          {loading ? <div className="py-12 text-center text-gray-400">Loading…</div>
            : !compliance ? <div className="py-12 text-center text-gray-400">Could not load compliance data.</div>
            : (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Industries in Violation</p>
                    <p className="text-3xl font-bold text-red-600">{compliance.count}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {compliance.violating_industries?.map((i: ComplianceIndustry) => (
                    <div key={i.id} className="bg-white rounded-xl border border-red-200 border-l-4 border-l-red-500 shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{i.name}</h3>
                          <p className="text-sm text-gray-500">{i.region} · {i.type}</p>
                          <p className="text-xs text-gray-400 mt-1">Reg: {i.registration_number}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Violating</span>
                          <p className="text-xs text-gray-500 mt-1">{i.active_alerts} active alerts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {compliance.violating_industries?.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">All industries are compliant!</p>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      )}
    </div>
  );
}
