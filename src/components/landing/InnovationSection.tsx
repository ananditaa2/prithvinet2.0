import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Brain } from "lucide-react";

const innovations = [
  {
    icon: TrendingUp,
    title: "Multi-Step Forecasting",
    desc: "Generate 24–72 hour forecasts of key environmental parameters for each station or region using advanced time-series models.",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Uncertainty Prediction",
    desc: "Output both point forecasts and prediction intervals with probabilistic estimates — so you know the confidence behind every number.",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    icon: Brain,
    title: "AI Compliance Copilot",
    desc: "Ask what-if questions: 'If industry X reduces SO₂ by 30%, what happens to regional risk?' Powered by Groq Llama-3 AI.",
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
];

const InnovationSection = () => {
  return (
    <section className="py-24 bg-slate-50" id="innovation">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-sm font-semibold text-violet-700 mb-4">
            AI Innovation
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Advanced AI Capabilities
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg">
            Beyond standard monitoring — predictive intelligence that enables proactive environmental governance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {innovations.map((inn, i) => (
            <motion.div
              key={inn.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white border border-slate-100 rounded-xl p-8 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${inn.bg} mx-auto mb-5`}>
                <inn.icon className={`h-7 w-7 ${inn.color}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">{inn.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{inn.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InnovationSection;
