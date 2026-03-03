import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Brain } from "lucide-react";

const innovations = [
  {
    icon: TrendingUp,
    title: "Multi-Step Forecasting",
    desc: "Formulate next 24–72 hour forecasts of key environmental parameters for each station or region using advanced time-series models.",
  },
  {
    icon: BarChart3,
    title: "Uncertainty Prediction",
    desc: "Output both point forecasts and prediction intervals with probabilistic estimates — so you know the confidence behind every number.",
  },
  {
    icon: Brain,
    title: "AI Compliance Copilot",
    desc: "Ask what-if questions like 'If industry X reduces SO₂ by 30%, what happens to regional risk?' — powered by causal models and learned surrogates.",
  },
];

const InnovationSection = () => {
  return (
    <section className="py-24 bg-muted/30" id="innovation">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent tracking-widest uppercase">🧠 Innovation</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">
            Advanced AI
            <span className="text-gradient-accent"> Capabilities</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
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
              className="glass-card glow-border p-8 text-center group hover:bg-card/80 transition-colors"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-5 group-hover:bg-accent/20 transition-colors">
                <inn.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-3">{inn.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{inn.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InnovationSection;
