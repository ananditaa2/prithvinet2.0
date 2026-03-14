import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, Trash2, X, MapPin, Map } from "lucide-react";

const emptyForm = { name: "", region: "", latitude: "", longitude: "", location_type: "general", assigned_team: "" };

const CREATE_ROLES = ["admin", "regional_officer", "monitoring_team"];
const EDIT_ROLES = ["admin", "regional_officer"];
const DELETE_ROLES = ["admin"];

interface Location {
  id: number;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  location_type: string;
  assigned_team: string;
  is_active: boolean;
  industry_id?: number;
}

export default function Locations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<Location>>({ 
    name: "", region: "", latitude: undefined, longitude: undefined, location_type: "general", assigned_team: "" 
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate = !!user && CREATE_ROLES.includes(user.role);
  const canEdit = !!user && EDIT_ROLES.includes(user.role);
  const canDelete = !!user && DELETE_ROLES.includes(user.role);

  const load = () => {
    setLoading(true);
    api.locations.list().then(res => setLocations(res as unknown as Location[])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof Location, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { 
    setForm({ name: "", region: "", latitude: undefined, longitude: undefined, location_type: "general", assigned_team: "" }); 
    setModal("create"); 
    setError(""); 
  };
  const openEdit = (loc: Location) => {
    setForm({ ...loc });
    setEditId(loc.id); setModal("edit"); setError("");
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
      if (modal === "create") await api.locations.create(payload as Record<string, unknown>);
      else if (editId) await api.locations.update(editId, payload as Record<string, unknown>);
      setModal(null); load();
    } catch (e: unknown) { 
      setError(e instanceof Error ? e.message : "An error occurred"); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete location?")) return;
    try { 
      await api.locations.delete(id); 
      load(); 
    } catch (e: unknown) { 
      alert(e instanceof Error ? e.message : "An error occurred"); 
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Monitoring Locations</h1>
          <p className="text-sm text-gray-500 mt-1">{locations.length} active stations</p>
        </div>
        {canCreate && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Location
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-gray-400 col-span-3 py-12 text-center">Loading…</p>
          : locations.length === 0 ? <p className="text-gray-400 col-span-3 py-12 text-center">No locations registered yet.</p>
          : locations.map(loc => (
            <div key={loc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{loc.name}</h3>
                    <p className="text-xs text-gray-500">{loc.region}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {canEdit && <button onClick={() => openEdit(loc)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3.5 h-3.5" /></button>}
                  {canDelete && <button onClick={() => handleDelete(loc.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <p className="flex items-center gap-2">
                  📍 {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
                  <Link
                    to={`/dashboard/heatmap?lat=${loc.latitude}&lng=${loc.longitude}&zoom=14`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline ml-1"
                  >
                    <Map className="w-3.5 h-3.5" /> View on Map
                  </Link>
                </p>
                <p>🏷 {loc.location_type}</p>
                {loc.assigned_team && <p>👥 {loc.assigned_team}</p>}
              </div>
              <div className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${loc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {loc.is_active ? "Active" : "Inactive"}
              </div>
            </div>
          ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-900">{modal === "create" ? "Add Location" : "Edit Location"}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
              {[
                { k: "name", label: "Station Name", ph: "Andheri Monitoring Station" },
                { k: "region", label: "Region", ph: "Mumbai, Maharashtra" },
                { k: "latitude", label: "Latitude", ph: "19.1197" },
                { k: "longitude", label: "Longitude", ph: "72.8468" },
                { k: "assigned_team", label: "Assigned Team", ph: "Team Alpha" },
              ].map(({ k, label, ph }) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={((form as Record<string, unknown>)[k] as string) || ""} onChange={e => set(k as keyof Location, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={ph} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.location_type} onChange={e => set("location_type", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {["general","industrial","residential","commercial","forest","river","noise"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
