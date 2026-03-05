import { motion } from "framer-motion";
import { ArrowRight, Activity, Droplets, Volume2, ShieldCheck, CheckCircle } from "lucide-react";

const stats = [
  { label: "Monitoring Stations", value: "2,400+", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Water Sources Tracked", value: "850+", icon: Droplets, color: "text-cyan-600", bg: "bg-cyan-50" },
  { label: "Noise Zones Mapped", value: "1,200+", icon: Volume2, color: "text-violet-600", bg: "bg-violet-50" },
];

const highlights = [
  "Real-time AI compliance monitoring",
  "Automated breach detection & alerts",
  "What-if scenario simulation",
];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-50 pt-20">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-100 opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="container relative z-10 px-4 md:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* Left: Headline */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 mb-8 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">Official Environmental Compliance</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-slate-900">
              National Center for<br />
              <span className="text-blue-700">Environmental Intelligence</span>
            </h1>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              PrithviNet provides comprehensive, real-time tracking of air, water, and noise pollution. Enforce compliance, analyze trends, and simulate policy impact with our advanced AI suite.
            </p>

            <ul className="space-y-2.5 mb-10">
              {highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-slate-700">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium">{h}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4">
              <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-800 transition-all">
                Access Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#innovation" className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
                Try AI Copilot ↓
              </a>
            </div>
          </motion.div>

          {/* Right: Live Stats Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-blue-700 px-6 py-5">
                <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Live Network Status</p>
                <h3 className="text-white font-extrabold text-xl">Active Monitoring Coverage</h3>
              </div>

              <div className="divide-y divide-slate-100">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-5 px-6 py-5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center">
                  Data refreshed every 15 minutes · Last updated: Today, 22:44 IST
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
