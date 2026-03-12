import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Cpu, TrendingUp, MessageCircle, Zap, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";

const TAB_ACCESS = {
  admin: ["copilot", "simulate", "predict"],
  regional_officer: ["copilot", "simulate", "predict"],
  monitoring_team: [],
  industry_user: [],
  citizen: [],
} as const;

export default function AITools() {
  const { user } = useAuth();
  const allowedTabs = useMemo(
    () => TAB_ACCESS[user?.role as keyof typeof TAB_ACCESS] ?? [],
    [user?.role]
  );
  const [tab, setTab] = useState("copilot");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  // Copilot
  const [question, setQuestion] = useState("");

  // Risk simulation
  const [simForm, setSimForm] = useState({
    region: "", industry: "", pollutant: "PM2.5",
    reduction_percentage: 20, current_risk_score: 65,
  });

  // Prediction
  const [locations, setLocations] = useState<any[]>([]);
  const [predForm, setPredForm] = useState({ location_id: "", hours: 24 });

  useEffect(() => {
    if (!allowedTabs.includes("predict")) return;
    api.locations.list().then(setLocations).catch(() => {});
  }, [allowedTabs]);

  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setTab(allowedTabs[0] ?? "copilot");
    }
  }, [allowedTabs, tab]);

  const run = async () => {
    if (!allowedTabs.includes(tab)) {
      setError("Your role does not have access to AI tools.");
      return;
    }

    setLoading(true); setError(""); setResult(null);
    try {
      if (tab === "copilot") {
        const r = await api.ai.copilot(question);
        setResult(r);
      } else if (tab === "simulate") {
        const r = await api.ai.simulateRisk(simForm);
        setResult(r);
      } else {
        if (!predForm.location_id) throw new Error("Select a location first");
        const r = await api.ai.predict(Number(predForm.location_id), predForm.hours);
        setResult(r);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (!allowedTabs.length) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">AI Tools</h1>
          <p className="text-sm text-gray-500 mt-1">Groq-powered environmental intelligence</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <ShieldAlert className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Access restricted</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
            According to your role, AI Compliance Copilot and other AI tools are blocked.
            Only Regional Officer and Super Admin roles have full access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">AI Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Groq-powered environmental intelligence</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: "copilot", label: "AI Copilot", icon: MessageCircle },
          { id: "simulate", label: "Risk Simulation", icon: Zap },
          { id: "predict", label: "Pollution Prediction", icon: TrendingUp },
        ].filter(t => allowedTabs.includes(t.id)).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Inputs by tab */}
        {tab === "copilot" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ask about environmental compliance, pollution standards, or CPCB guidelines</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              className={`${inputCls} min-h-24 resize-none`} rows={3}
              placeholder="e.g. What are the CPCB limits for PM2.5 in industrial zones?" />
          </div>
        )}

        {tab === "simulate" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { k: "region", label: "Region", ph: "Maharashtra" },
              { k: "industry", label: "Industry Type", ph: "Steel Manufacturing" },
              { k: "pollutant", label: "Pollutant", ph: "PM2.5" },
            ].map(({ k, label, ph }) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input value={(simForm as any)[k]} onChange={e => setSimForm(f => ({...f, [k]: e.target.value}))}
                  className={inputCls} placeholder={ph} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Risk Score (0–100)</label>
              <input type="number" min={0} max={100} value={simForm.current_risk_score}
                onChange={e => setSimForm(f => ({...f, current_risk_score: Number(e.target.value)}))}
                className={inputCls} />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Reduction: {simForm.reduction_percentage}%</label>
              <input type="range" min={5} max={100} step={5} value={simForm.reduction_percentage}
                onChange={e => setSimForm(f => ({...f, reduction_percentage: Number(e.target.value)}))}
                className="w-full accent-blue-700" />
            </div>
          </div>
        )}

        {tab === "predict" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Location</label>
              <select value={predForm.location_id} onChange={e => setPredForm(f => ({...f, location_id: e.target.value}))}
                className={`${inputCls} bg-white`}>
                <option value="">Select location…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.region})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Horizon</label>
              <select value={predForm.hours} onChange={e => setPredForm(f => ({...f, hours: Number(e.target.value)}))}
                className={`${inputCls} bg-white`}>
                {[24,48,72].map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </div>
          </div>
        )}

        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        <button onClick={run} disabled={loading || (tab === "copilot" && !question.trim())}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-60">
          <Cpu className="w-4 h-4" />
          {loading ? "Analysing…" : "Run AI Analysis"}
        </button>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            Calling Groq AI…
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
            {tab === "copilot" && (
              <div className="prose prose-sm max-w-none text-gray-800">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
            )}

            {tab === "simulate" && (
              <>
                <div className="flex items-center gap-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Current Risk</p>
                    <p className="text-3xl font-bold text-red-600">{result.scenario.current_risk_score}</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Estimated New Risk</p>
                    <p className="text-3xl font-bold text-green-600">{result.baseline_calculation.estimated_new_score}</p>
                  </div>
                  <p className="text-xs text-gray-400 ml-auto">{result.baseline_calculation.note}</p>
                </div>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown>{result.ai_analysis}</ReactMarkdown>
                </div>
              </>
            )}

            {tab === "predict" && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Predicted Values ({result.horizon_hours}h)</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.predictions).filter(([k]) => k !== "note").map(([k, v]: any) => (
                      <div key={k} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center min-w-20">
                        <p className="text-xs text-gray-500 uppercase">{k}</p>
                        <p className="text-lg font-bold text-blue-700">{Number(v).toFixed(1)}</p>
                      </div>
                    ))}
                    {result.predictions.note && <p className="text-sm text-gray-500 italic">{result.predictions.note}</p>}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown>{result.narrative}</ReactMarkdown>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
