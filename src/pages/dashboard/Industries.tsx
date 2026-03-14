import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, Trash2, X, Search, ShieldAlert, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const statusColor: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  compliant: "bg-green-100 text-green-700",
  violating: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

const WRITE_ROLES = ["admin", "regional_officer"];
const OWN_VIEW_ROLES = ["industry_user"];

interface Industry {
  id: number;
  name: string;
  industry_type: string;
  address: string;
  region: string;
  latitude?: number;
  longitude?: number;
  contact_email: string;
  registration_number: string;
  status: "active" | "compliant" | "violating" | "suspended";
}

export default function Industries() {
  const { user } = useAuth();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<Industry>>({
    name: "", industry_type: "manufacturing", address: "", region: "",
    latitude: undefined, longitude: undefined, contact_email: "", registration_number: "", status: "active"
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detailIndustry, setDetailIndustry] = useState<Industry | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown>[]>([]);
  const [detailAlerts, setDetailAlerts] = useState<Record<string, unknown>[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const canWrite = !!user && WRITE_ROLES.includes(user.role);
  const canViewOwnOnly = !!user && OWN_VIEW_ROLES.includes(user.role);
  const canDelete = user?.role === "admin";

  const load = () => {
    setLoading(true);
    api.industries.list().then(res => setIndustries(res as unknown as Industry[])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visibleIndustries = useMemo(() => {
    if (!user) return [];
    if (canViewOwnOnly) {
      return industries.filter(i => i.contact_email?.toLowerCase() === user.email.toLowerCase());
    }
    return industries;
  }, [industries, user, canViewOwnOnly]);

  const set = (k: keyof Industry, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { 
    setForm({
      name: "", industry_type: "manufacturing", address: "", region: "",
      latitude: undefined, longitude: undefined, contact_email: "", registration_number: "", status: "active"
    }); 
    setModal("create"); 
    setError(""); 
  };
  const openEdit = (ind: Industry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setForm({ ...ind });
    setEditId(ind.id); setModal("edit"); setError("");
  };

  const openDetail = (ind: Industry) => {
    setDetailIndustry(ind);
    setDetailData([]);
    setDetailAlerts([]);
    setDetailLoading(true);
  };

  const closeDetail = () => setDetailIndustry(null);

  useEffect(() => {
    if (!detailIndustry) return;
    Promise.all([
      api.data.list({ industry_id: String(detailIndustry.id), limit: "100" }),
      api.alerts.complianceHistory(detailIndustry.id).catch(() => ({ alerts: [] })),
    ]).then(([data, comp]) => {
      setDetailData(Array.isArray(data) ? data : []);
      setDetailAlerts(Array.isArray((comp as { alerts?: unknown[] }).alerts) ? (comp as { alerts: Record<string, unknown>[] }).alerts : []);
    }).finally(() => setDetailLoading(false));
  }, [detailIndustry]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null };
      if (modal === "create") await api.industries.create(payload as Record<string, unknown>);
      else if (editId) await api.industries.update(editId, payload as Record<string, unknown>);
      setModal(null); load();
    } catch (e: unknown) { 
      setError(e instanceof Error ? e.message : "An error occurred"); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Delete this industry?")) return;
    try { 
      await api.industries.delete(id); 
      load(); 
    } catch (e: unknown) { 
      alert(e instanceof Error ? e.message : "An error occurred"); 
    }
  };

  const emissionChartData = useMemo(() => {
    if (!detailData.length) return [];
    const byDate: Record<string, { date: string; pm25: number; pm10: number; aqi: number; count: number }> = {};
    detailData.forEach((row) => {
      const type = (row.data_type as string)?.toLowerCase();
      if (type !== "air") return;
      const date = (row.recorded_at as string)?.slice(0, 10) || "";
      if (!byDate[date]) byDate[date] = { date: date.slice(5), pm25: 0, pm10: 0, aqi: 0, count: 0 };
      const d = byDate[date];
      d.pm25 += (row.pm25 as number) || 0;
      d.pm10 += (row.pm10 as number) || 0;
      d.aqi += (row.aqi as number) || 0;
      d.count++;
    });
    return Object.values(byDate)
      .map((d) => ({ ...d, pm25: d.count ? d.pm25 / d.count : 0, pm10: d.count ? d.pm10 / d.count : 0, aqi: d.count ? d.aqi / d.count : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [detailData]);

  const filtered = visibleIndustries.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Industry Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canViewOwnOnly
              ? `${visibleIndustries.length} industry record${visibleIndustries.length === 1 ? "" : "s"} linked to your role`
              : `${industries.length} registered industries`}
          </p>
        </div>
        {canWrite && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Industry
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or region…" />
      </div>

      {canViewOwnOnly && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Limited role access enabled</p>
            <p className="text-amber-700">As an industry user, you can only view your own industry record.</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Type", "Region", "Reg. No.", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No industries found.</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openDetail(i)}>
                  <td className="px-4 py-3">
                    <button type="button" className="font-medium text-gray-900 hover:text-blue-700 text-left flex items-center gap-1.5 group w-full">
                      {i.name}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{i.industry_type}</td>
                  <td className="px-4 py-3 text-gray-600">{i.region}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i.registration_number}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[i.status] || "bg-gray-100 text-gray-600"}`}>{i.status}</span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {canWrite && <button onClick={(e) => openEdit(i, e)} className="text-blue-600 hover:text-blue-800 transition-colors"><Pencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={(e) => handleDelete(i.id, e)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Industry Detail Sheet */}
      <Sheet open={!!detailIndustry} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailIndustry?.name}</SheetTitle>
          </SheetHeader>
          {detailIndustry && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[detailIndustry.status] || "bg-gray-100"}`}>{detailIndustry.status}</span>
                <span className="text-sm text-gray-600">{detailIndustry.industry_type} · {detailIndustry.region}</span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Historical Emission Trends</h3>
                {detailLoading ? (
                  <div className="h-48 flex items-center justify-center text-gray-400">Loading…</div>
                ) : emissionChartData.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No air quality data for this industry yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={emissionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="aqi" stroke="#ef4444" strokeWidth={2} name="AQI" dot={false} />
                      <Line type="monotone" dataKey="pm25" stroke="#10b981" strokeWidth={2} name="PM2.5" dot={false} />
                      <Line type="monotone" dataKey="pm10" stroke="#06b6d4" strokeWidth={2} name="PM10" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Industrial Monitoring Logs</h3>
                {detailLoading ? (
                  <div className="py-4 text-gray-400 text-sm">Loading…</div>
                ) : detailData.length === 0 ? (
                  <p className="text-sm text-gray-500">No environmental readings recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detailData.slice(0, 20).map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600 capitalize">{row.data_type as string}</span>
                        <span className="text-gray-400 text-xs">
                          {row.data_type === "air" && row.aqi != null && `AQI ${row.aqi}`}
                          {row.data_type === "water" && row.ph != null && `pH ${row.ph}`}
                          {row.data_type === "noise" && row.decibel_level != null && `${row.decibel_level} dB`}
                        </span>
                        <span className="text-gray-400 text-xs">{(row.recorded_at as string)?.slice(0, 16)}</span>
                      </div>
                    ))}
                    {detailData.length > 20 && <p className="text-xs text-gray-400 pt-2">+ {detailData.length - 20} more</p>}
                  </div>
                )}
              </div>

              {detailAlerts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Alerts ({detailAlerts.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailAlerts.slice(0, 10).map((a, idx) => (
                      <div key={idx} className="text-sm p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <p className="text-gray-800">{(a as { message?: string }).message}</p>
                        <p className="text-xs text-gray-500 mt-1">{(a as { severity?: string }).severity} · {(a as { created_at?: string }).created_at?.slice(0, 10)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{modal === "create" ? "Add Industry" : "Edit Industry"}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
              {[
                { k: "name", label: "Industry Name", ph: "Tata Steel Ltd." },
                { k: "registration_number", label: "Registration No.", ph: "MH-IND-2024-001" },
                { k: "address", label: "Address", ph: "MIDC, Pune" },
                { k: "region", label: "Region", ph: "Maharashtra" },
                { k: "contact_email", label: "Contact Email", ph: "env@company.in" },
                { k: "latitude", label: "Latitude", ph: "18.5204" },
                { k: "longitude", label: "Longitude", ph: "73.8567" },
              ].map(({ k, label, ph }) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={(form as Record<string, unknown>)[k] as string} onChange={e => set(k as keyof Industry, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={ph} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.industry_type} onChange={e => set("industry_type", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {["manufacturing","mining","chemical","textile","power","pharmaceutical","other"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => set("status", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {["active","compliant","violating","suspended"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
