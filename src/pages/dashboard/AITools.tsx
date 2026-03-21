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
interface CopilotResult {
  answer: string;
}

interface SimulateResult {
  scenario: {
    current_risk_score: number;
    region?: string;
    industry?: string;
    pollutant?: string;
    reduction_percentage?: number;
  };
  baseline_calculation: {
    estimated_new_score: number;
    note: string;
  };
  penalty_impact?: {
    current_risk_band: string;
    new_risk_band: string;
    estimated_reduction_lakh: number;
    cpcb_reference: string;
  };
  ai_analysis: string;
}

interface PredictResult {
  horizon_hours: number;
  predictions: {
    [key: string]: number | string | undefined;
    note?: string;
  };
  narrative: string;
}

export default function AITools() {
  const { user } = useAuth();
  const allowedTabs = useMemo(
    () => (TAB_ACCESS[user?.role as keyof typeof TAB_ACCESS] as unknown as string[]) ?? [],
    [user?.role]
  );
  const [tab, setTab] = useState("copilot");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  // Copilot
  const [question, setQuestion] = useState("");

  // Risk simulation
  const [simForm, setSimForm] = useState({
    region: "", industry: "", pollutant: "PM2.5",
    reduction_percentage: 20, current_risk_score: 65,
  });

  interface Location {
  id: number;
  name: string;
  region: string;
}

// Prediction
  const [locations, setLocations] = useState<Location[]>([]);
  const [predForm, setPredForm] = useState({ location_id: "", hours: 24 });

  useEffect(() => {
    if (!allowedTabs.includes("predict")) return;
    api.locations.list().then((data) => setLocations(data as unknown as Location[])).catch(() => {});
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
        console.log("Calling AI Copilot with question:", question);
        const r = await api.ai.copilot(question);
        console.log("AI Copilot response:", r);
        setResult(r || { answer: "No response from AI." });
      } else if (tab === "simulate") {
        try {
          const r = await api.ai.simulateRisk(simForm);
          setResult(r);
        } catch (err) {
          console.warn("AI Backend unavailable, using client-side estimation:", err);
          
          const reduction = simForm.reduction_percentage / 100;
          const currentRisk = simForm.current_risk_score;
          const newRisk = Math.max(0, Math.round(currentRisk * (1 - (reduction * 1.2))));
          
          const getBand = (score: number) => score > 80 ? "Critical" : score > 60 ? "High" : score > 40 ? "Moderate" : "Low";
          const currentBand = getBand(currentRisk);
          const newBand = getBand(newRisk);
          const savings = Math.round((currentRisk - newRisk) * 1.5);

          const fallbackResult: SimulateResult = {
            scenario: {
              current_risk_score: currentRisk,
              region: simForm.region,
              industry: simForm.industry,
              pollutant: simForm.pollutant,
              reduction_percentage: simForm.reduction_percentage
            },
            baseline_calculation: {
              estimated_new_score: newRisk,
              note: `Based on a ${simForm.reduction_percentage}% simulated reduction in ${simForm.pollutant || "emissions"}.`
            },
            penalty_impact: {
              current_risk_band: currentBand,
              new_risk_band: newBand,
              estimated_reduction_lakh: savings,
              cpcb_reference: "Schedule VI, Environment (Protection) Rules"
            },
            ai_analysis: `**Simulation Fallback (Offline Mode)**\n\nThe ${simForm.reduction_percentage}% reduction in ${simForm.pollutant || "target pollutants"} could successfully lower the overall risk profile from **${currentRisk}** to **${newRisk}**.\n\n- **Compliance Shift:** Moving from ${currentBand} to ${newBand} risk tier.\n- **Economic Impact:** Potential savings of ₹${savings} Lakhs in monthly environmental compensation penalties.\n- **Actionable Next Step:** Implement continuous monitoring to verify sustained reduction levels.`
          };
          setResult(fallbackResult);
        }
      } else {
        if (!predForm.location_id) throw new Error("Select a location first");
        const r = await api.ai.predict(Number(predForm.location_id), predForm.hours);
        setResult(r);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
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
          { id: "predict", label: "Forecasting", icon: TrendingUp },
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
                <input value={(simForm as Record<string, unknown>)[k] as string} onChange={e => setSimForm(f => ({...f, [k]: e.target.value}))}
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
                <ReactMarkdown>{(result as CopilotResult).answer}</ReactMarkdown>
              </div>
            )}

            {tab === "simulate" && (
              <>
                <div className="flex items-center gap-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Current Risk</p>
                    <p className="text-3xl font-bold text-red-600">
                      {(result as SimulateResult).scenario.current_risk_score}
                    </p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Estimated New Risk</p>
                    <p className="text-3xl font-bold text-green-600">
                      {(result as SimulateResult).baseline_calculation.estimated_new_score}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 ml-auto">
                    {(result as SimulateResult).baseline_calculation.note}
                  </p>
                </div>
                {(result as SimulateResult).penalty_impact && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">Penalty Impact</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-amber-700">Current exposure</p>
                        <p className="font-bold">{(result as SimulateResult).penalty_impact!.current_risk_band}</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Post-reduction</p>
                        <p className="font-bold">{(result as SimulateResult).penalty_impact!.new_risk_band}</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Est. reduction</p>
                        <p className="font-bold text-green-700">{(result as SimulateResult).penalty_impact!.estimated_reduction_lakh} lakh ₹</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-amber-700 text-xs">CPCB reference</p>
                        <p className="text-xs font-medium">{(result as SimulateResult).penalty_impact!.cpcb_reference}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown>{(result as SimulateResult).ai_analysis}</ReactMarkdown>
                </div>
              </>
            )}

            {tab === "predict" && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Predicted Values ({(result as PredictResult).horizon_hours}h)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries((result as PredictResult).predictions)
                      .filter(([k]) => k !== "note")
                      .map(([k, v]) => (
                        <div key={k} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center min-w-20">
                          <p className="text-xs text-gray-500 uppercase">{k}</p>
                          <p className="text-lg font-bold text-blue-700">{Number(v).toFixed(1)}</p>
                        </div>
                      ))}
                    {(result as PredictResult).predictions.note && (
                      <p className="text-sm text-gray-500 italic">
                        {(result as PredictResult).predictions.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown>{(result as PredictResult).narrative}</ReactMarkdown>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
