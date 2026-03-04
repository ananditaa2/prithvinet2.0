import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnomalyAlerts from "./AnomalyAlerts";
import ForecastChart from "./ForecastChart";
import PollutionMap from "./PollutionMap";

const FEATURES = [
    {
        value: "map",
        label: "Geo Heatmap",
        icon: MapPin,
        description: "Live pollution intensity across monitored industrial zones",
        color: "text-blue-700",
        bgColor: "bg-blue-50",
    },
    {
        value: "forecast",
        label: "AQI Forecast",
        icon: TrendingUp,
        description: "3-day AI-powered Air Quality Index prediction",
        color: "text-amber-700",
        bgColor: "bg-amber-50",
    },
    {
        value: "anomaly",
        label: "Anomaly Detection",
        icon: AlertTriangle,
        description: "ML-driven outlier detection on sensor readings",
        color: "text-red-700",
        bgColor: "bg-red-50",
    },
];

export default function AnalyticsSection() {
    return (
        <section className="py-20 bg-white" id="analytics">
            <div className="container px-4 md:px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center text-center mb-12"
                >
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 font-medium mb-4">
                        <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
                        Advanced AI & Geospatial Analytics
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Real-Time Intelligence Dashboard
                    </h2>
                    <p className="max-w-2xl text-slate-500 text-lg">
                        Powered by Machine Learning and geospatial data to provide actionable insights on pollution patterns, future trends, and data integrity.
                    </p>
                </motion.div>

                {/* Feature Summary Cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-10">
                    {FEATURES.map((feat, i) => (
                        <motion.div
                            key={feat.value}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="flex items-start gap-4 p-5 rounded-xl border border-slate-100 bg-slate-50 shadow-sm"
                        >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${feat.bgColor}`}>
                                <feat.icon className={`h-5 w-5 ${feat.color}`} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">{feat.label}</h3>
                                <p className="text-xs text-slate-500 mt-1">{feat.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Tabbed Interface */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
                >
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h3 className="font-bold text-slate-800">Environmental Analytics Suite</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Select a module to explore detailed analysis</p>
                    </div>

                    <Tabs defaultValue="map" className="w-full">
                        <div className="border-b border-slate-200 px-6 py-3">
                            <TabsList className="bg-slate-100 p-1">
                                {FEATURES.map((feat) => (
                                    <TabsTrigger
                                        key={feat.value}
                                        value={feat.value}
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5"
                                    >
                                        <feat.icon className="h-3.5 w-3.5" />
                                        {feat.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="map" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-800">National Pollution Heatmap</h4>
                                    <p className="text-sm text-slate-500">10 industrial zones actively monitored. Click any marker for details.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-100 rounded px-2 py-0.5">🔴 Severe</span>
                                    <span className="flex items-center gap-1 text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-0.5">🟠 Unhealthy</span>
                                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">🟡 Moderate</span>
                                    <span className="flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-100 rounded px-2 py-0.5">⚠️ Anomaly</span>
                                </div>
                            </div>
                            <PollutionMap />
                        </TabsContent>

                        <TabsContent value="forecast" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="mb-4">
                                <h4 className="font-bold text-slate-800">72-Hour AQI Forecast</h4>
                                <p className="text-sm text-slate-500">Historical data feeds our predictive model for a 3-day rolling forecast.</p>
                            </div>
                            <ForecastChart />
                            <div className="mt-4 grid sm:grid-cols-3 gap-3">
                                {[
                                    { day: "Mar 05", val: 87, trend: "Moderate" },
                                    { day: "Mar 06", val: 92, trend: "Moderate" },
                                    { day: "Mar 07", val: 95, trend: "Unhealthy for Sensitive" },
                                ].map(({ day, val, trend }) => (
                                    <div key={day} className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
                                        <p className="text-xs font-medium text-slate-500">{day}</p>
                                        <p className="text-2xl font-bold text-amber-600">{val}</p>
                                        <p className="text-xs text-slate-600">{trend} AQI</p>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="anomaly" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-bold text-slate-800">AI Anomaly Detection (IsolationForest)</h4>
                                    <p className="text-sm text-slate-500">Sensor readings scanned for statistical outliers in real-time.</p>
                                </div>
                            </div>
                            <AnomalyAlerts />
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>
        </section>
    );
}
