import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";

interface ForecastPoint {
    date: string;
    aqi: number | null;
    forecast: number | null;
}

const HISTORICAL_DATA: ForecastPoint[] = [
    { date: "Feb 26", aqi: 78, forecast: null },
    { date: "Feb 27", aqi: 82, forecast: null },
    { date: "Feb 28", aqi: 88, forecast: null },
    { date: "Mar 01", aqi: 91, forecast: null },
    { date: "Mar 02", aqi: 85, forecast: null },
    { date: "Mar 03", aqi: 93, forecast: null },
    { date: "Mar 04", aqi: 89, forecast: null },
    // Forecast zone starts here
    { date: "Mar 05", aqi: null, forecast: 87 },
    { date: "Mar 06", aqi: null, forecast: 92 },
    { date: "Mar 07", aqi: null, forecast: 95 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-2">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.dataKey} style={{ color: p.color }}>
                        {p.dataKey === "aqi" ? "Historical AQI" : "Forecasted AQI"}: <span className="font-semibold">{p.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function ForecastChart({ compact = false }: { compact?: boolean }) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={compact ? "" : "py-10"}>
            {!compact && (
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-sm text-blue-700 font-medium">
                        <TrendingUp className="h-4 w-4" />
                        72-Hour AQI Forecast
                    </div>
                    <p className="text-sm text-slate-500">
                        Predictive model based on 7-day rolling average
                    </p>
                </div>
            )}

            {!isLoaded ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={HISTORICAL_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <YAxis domain={[70, 105]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                formatter={(value) => (
                                    <span className="text-xs text-slate-600">
                                        {value === "aqi" ? "Historical AQI" : "AI Forecast"}
                                    </span>
                                )}
                            />
                            <ReferenceLine x="Mar 04" stroke="#cbd5e1" strokeDasharray="4 4" label={{ value: "Today", position: "top", fontSize: 10, fill: "#94a3b8" }} />
                            <Line
                                type="monotone"
                                dataKey="aqi"
                                stroke="#2563eb"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "#2563eb" }}
                                connectNulls={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="#f59e0b"
                                strokeWidth={2.5}
                                strokeDasharray="5 5"
                                dot={{ r: 4, fill: "#f59e0b" }}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-blue-600 rounded"></span>Actual</span>
                        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-amber-500"></span>Forecast</span>
                    </div>
                </div>
            )}
        </div>
    );
}
