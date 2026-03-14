import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FileText, Copy, Check, Building2, AlertTriangle } from "lucide-react";

interface CaseItem {
  alert_id: number;
  industry: { id: number; name: string; region: string; registration_number: string };
  severity: string;
  alert_type: string;
  pollutant: string | null;
  message: string;
  measured_value: number | null;
  threshold_value: number | null;
  cpcb_reference: string;
  draft_show_cause: string;
  created_at: string | null;
}

export default function CasesToAct() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.alerts.casesToAct(region || undefined)
      .then((r) => setCases((r as { cases: CaseItem[] }).cases || []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, [region]);

  const copyDraft = (c: CaseItem) => {
    navigator.clipboard.writeText(c.draft_show_cause);
    setCopiedId(c.alert_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sevBadge: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Cases to Act On</h1>
        <p className="text-sm text-gray-500 mt-1">
          Critical & high-severity violations with draft show-cause notice templates
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Filter by region..."
          className="max-w-xs px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No cases requiring action</p>
          <p className="text-sm text-gray-400 mt-1">All critical/high alerts resolved or none found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <div
              key={c.alert_id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{c.industry.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sevBadge[c.severity] || "bg-gray-100"}`}>
                        {c.severity}
                      </span>
                      <span className="text-xs text-gray-500 uppercase">{c.alert_type}</span>
                      {c.pollutant && <span className="text-xs text-gray-400">· {c.pollutant}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{c.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Reg: {c.industry.registration_number} · {c.industry.region}
                    </p>
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      📜 {c.cpcb_reference}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {c.measured_value != null && (
                      <p className="text-sm">Measured: <strong>{c.measured_value}</strong></p>
                    )}
                    {c.threshold_value != null && (
                      <p className="text-sm">Threshold: <strong>{c.threshold_value}</strong></p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Draft Show-Cause Notice</p>
                  <button
                    onClick={() => copyDraft(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                  >
                    {copiedId === c.alert_id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === c.alert_id ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                  {c.draft_show_cause}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          EPA §15 — Compliance Workflow
        </p>
        <p className="mt-1 text-amber-700">
          Draft notices cite CPCB norms. Review, edit, and issue via your official channels.
        </p>
      </div>
    </div>
  );
}
