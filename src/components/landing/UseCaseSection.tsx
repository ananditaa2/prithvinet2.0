import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, MapPin, ClipboardCheck } from "lucide-react";

const steps = [
  {
    icon: TrendingUp,
    label: "Data Ingestion",
    desc: "Industry submits daily emissions via portal or IoT sensors. Data is validated in real-time.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: AlertTriangle,
    label: "Breach Detection",
    desc: "Platform automatically detects when limits are exceeded and triggers an instant compliance alert.",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  {
    icon: MapPin,
    label: "Risk Mapping",
    desc: "Industry is flagged on the geo-spatial heatmap and regional risk score is updated live.",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    icon: ClipboardCheck,
    label: "Action & Inspection",
    desc: "Regional Officer is notified. An inspection is scheduled with priority escalation tracking.",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-100",
  },
];

const UseCaseSection = () => {
  return (
    <section className="py-24 bg-white" id="how-it-works">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block rounded-full border border-green-200 bg-green-50 px-4 py-1 text-sm font-semibold text-green-700 mb-4">
            In Action
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            How PrithviNet Works
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg">
            From data ingestion to enforcement — a transparent, end-to-end compliance workflow.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[3.25rem] left-[calc(12.5%+1.5rem)] right-[calc(12.5%+1.5rem)] h-0.5 bg-slate-200 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step circle */}
                <div className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 ${step.border} ${step.bg} mb-5`}>
                  <step.icon className={`h-6 w-6 ${step.color}`} />
                </div>
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full border ${step.border} ${step.bg} text-xs font-bold ${step.color} z-20`}>
                  {i + 1}
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 w-full">
                  <h3 className="font-bold text-slate-800 mb-2">{step.label}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCaseSection;
