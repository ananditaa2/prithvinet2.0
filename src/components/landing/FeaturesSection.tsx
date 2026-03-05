import { motion } from "framer-motion";
import { Activity, Droplets, Volume2, Brain, Bell, MapPin } from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Real-time Air Monitoring",
    desc: "Continuous AQI tracking with pollutant-level breakdowns across all 2,400+ monitoring stations.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Droplets,
    title: "Water Quality Tracking",
    desc: "Live water parameter monitoring — pH, BOD, DO, heavy metals — with instant compliance alerts.",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    icon: Volume2,
    title: "Noise Level Monitoring",
    desc: "Geo-tagged noise monitoring with dB thresholds and zone-based compliance enforcement.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Brain,
    title: "AI-Powered Forecasting",
    desc: "24–72 hour pollution forecasts with uncertainty estimates using ML models and weather data.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: MapPin,
    title: "Geo-Spatial Heatmaps",
    desc: "Interactive pollution heatmaps with regional risk scoring and real-time hotspot detection.",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: Bell,
    title: "Automated Compliance Alerts",
    desc: "Auto-alerts on limit breaches, missing reports, and non-compliance with escalation workflows.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-white" id="features">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-semibold text-blue-700 mb-4">
            Core Platform Capabilities
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Complete Environmental Intelligence Suite
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            From live sensor data to AI-driven compliance — everything pollution control boards need in one unified platform.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group flex gap-4 p-6 rounded-xl border border-slate-100 bg-slate-50 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${f.bg}`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
