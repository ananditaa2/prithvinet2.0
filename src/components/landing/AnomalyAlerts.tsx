import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MOCK_READINGS = [
    { id: "S001", sensor_type: "AQI", value: 85.2, timestamp: "2026-03-04T10:00:00Z" },
    { id: "S002", sensor_type: "AQI", value: 87.5, timestamp: "2026-03-04T10:15:00Z" },
    { id: "S003", sensor_type: "AQI", value: 90.1, timestamp: "2026-03-04T10:30:00Z" },
    { id: "S004", sensor_type: "AQI", value: 83.0, timestamp: "2026-03-04T10:45:00Z" },
    { id: "S005", sensor_type: "AQI", value: 88.3, timestamp: "2026-03-04T11:00:00Z" },
    { id: "S006", sensor_type: "AQI", value: 86.0, timestamp: "2026-03-04T11:15:00Z" },
    { id: "S007", sensor_type: "SO2", value: 0.0, timestamp: "2026-03-04T11:30:00Z" },  // Anomaly
    { id: "S008", sensor_type: "AQI", value: 89.4, timestamp: "2026-03-04T11:45:00Z" },
    { id: "S009", sensor_type: "SO2", value: 550.8, timestamp: "2026-03-04T12:00:00Z" }, // Anomaly
    { id: "S010", sensor_type: "AQI", value: 91.2, timestamp: "2026-03-04T12:15:00Z" },
];

interface AnomalyResult {
    id: string;
    value: number;
    reason: string;
}

interface DetectionResult {
    total_analyzed: number;
    anomalies_detected: number;
    anomalies: AnomalyResult[];
}

export default function AnomalyAlerts({ compact = false }: { compact?: boolean }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runDetection = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("http://127.0.0.1:8000/api/detect-anomalies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ readings: MOCK_READINGS }),
            });
            if (!response.ok) throw new Error("Server error");
            const data = await response.json();
            setResult(data);
        } catch (e) {
            setError("Could not connect to backend server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runDetection();
    }, []);

    const anomalyIds = new Set(result?.anomalies.map((a) => a.id) ?? []);

    return (
        <div className={compact ? "" : "py-10"}>
            {!compact && (
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-sm text-slate-500 mt-1">
                            IsolationForest ML detects impossible or statistically unusual sensor readings.
                        </p>
                    </div>
                    <button
                        onClick={runDetection}
                        disabled={loading}
                        className="flex items-center gap-2 text-sm bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Re-scan
                    </button>
                </div>
            )}

            {result && (
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-sm text-emerald-700 font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        {result.total_analyzed} readings analyzed
                    </div>
                    {result.anomalies_detected > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-1 text-sm text-red-700 font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            {result.anomalies_detected} anomalies flagged
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            <div className="space-y-2 overflow-y-auto max-h-72">
                {MOCK_READINGS.map((reading) => {
                    const isAnomaly = anomalyIds.has(reading.id);
                    return (
                        <div
                            key={reading.id}
                            className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${isAnomaly
                                    ? "bg-red-50 border-red-200"
                                    : "bg-slate-50 border-slate-100"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-slate-400">{reading.id}</span>
                                <span className="font-medium text-slate-700">{reading.sensor_type}</span>
                                <span className="text-slate-600">
                                    {reading.value.toFixed(1)}
                                    <span className="text-slate-400 ml-1">μg/m³</span>
                                </span>
                            </div>
                            <div>
                                {loading ? (
                                    <span className="text-xs text-slate-400">Scanning...</span>
                                ) : isAnomaly ? (
                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                                        <AlertTriangle className="h-3 w-3" /> ALERT
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                                        <ShieldCheck className="h-3 w-3" /> Normal
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
