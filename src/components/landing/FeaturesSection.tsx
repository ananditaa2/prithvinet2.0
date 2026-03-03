import { motion } from "framer-motion";
import {
  Activity, Droplets, Volume2, Brain,
  Bell, MapPin, BarChart3, Shield
} from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Air Quality Monitoring",
    desc: "Real-time AQI tracking with pollutant-level breakdowns across all monitoring stations.",
  },
  {
    icon: Droplets,
    title: "Water Quality Analysis",
    desc: "Continuous water parameter monitoring — pH, BOD, DO, heavy metals — with trend analysis.",
  },
  {
    icon: Volume2,
    title: "Noise Level Mapping",
    desc: "Geo-tagged noise monitoring with dB thresholds and zone-based compliance checks.",
  },
  {
    icon: Brain,
    title: "AI Compliance Copilot",
    desc: "Ask what-if questions, simulate interventions, and get predictive risk assessments.",
  },
  {
    icon: Bell,
    title: "Smart Alerts & Escalation",
    desc: "Auto-alerts on limit breaches, missing reports, and non-compliance with escalation workflows.",
  },
  {
    icon: MapPin,
    title: "Geo-Spatial Heatmaps",
    desc: "Interactive pollution heatmaps with regional risk scoring and hotspot detection.",
  },
  {
    icon: BarChart3,
    title: "Predictive Forecasting",
    desc: "24-72 hour forecasts with uncertainty estimates using ML models and weather integration.",
  },
  {
    icon: Shield,
    title: "Compliance Dashboard",
    desc: "Industry-wise compliance tracking, inspection scheduling, and regulatory reporting.",
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
    <section className="py-24 relative" id="features">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase">Core Capabilities</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">
            Complete Environmental
            <br />
            <span className="text-gradient-primary">Intelligence Suite</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From real-time sensor data to AI-driven compliance — everything pollution control boards need in one platform.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="glass-card glow-border p-6 group hover:bg-card/80 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
