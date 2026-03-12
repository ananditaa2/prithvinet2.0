import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, Trash2, X, Search, ShieldAlert } from "lucide-react";

const statusColor: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  compliant: "bg-green-100 text-green-700",
  violating: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

const WRITE_ROLES = ["admin", "regional_officer"];
const OWN_VIEW_ROLES = ["industry_user"];

const emptyForm = {
  name: "", industry_type: "manufacturing", address: "", region: "",
  latitude: "", longitude: "", contact_email: "", registration_number: "", status: "active"
};

export default function Industries() {
  const { user } = useAuth();
  const [industries, setIndustries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canWrite = !!user && WRITE_ROLES.includes(user.role);
  const canViewOwnOnly = !!user && OWN_VIEW_ROLES.includes(user.role);
  const canDelete = user?.role === "admin";

  const load = () => {
    setLoading(true);
    api.industries.list().then(setIndustries).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visibleIndustries = useMemo(() => {
    if (!user) return [];
    if (canViewOwnOnly) {
      return industries.filter(i => i.contact_email?.toLowerCase() === user.email.toLowerCase());
    }
    return industries;
  }, [industries, user, canViewOwnOnly]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(emptyForm); setModal("create"); setError(""); };
  const openEdit = (ind: any) => {
    setForm({ ...ind, latitude: ind.latitude ?? "", longitude: ind.longitude ?? "", contact_email: ind.contact_email ?? "" });
    setEditId(ind.id); setModal("edit"); setError("");
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null };
      if (modal === "create") await api.industries.create(payload);
      else if (editId) await api.industries.update(editId, payload);
      setModal(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this industry?")) return;
    try { await api.industries.delete(id); load(); } catch (e: any) { alert(e.message); }
  };

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
                <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{i.industry_type}</td>
                  <td className="px-4 py-3 text-gray-600">{i.region}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i.registration_number}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[i.status] || "bg-gray-100 text-gray-600"}`}>{i.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canWrite && <button onClick={() => openEdit(i)} className="text-blue-600 hover:text-blue-800 transition-colors"><Pencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => handleDelete(i.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                  <input value={form[k]} onChange={e => set(k, e.target.value)}
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
